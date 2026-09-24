# Resume Download Button + Click Tracking - Design

**Date:** 2026-06-23
**Status:** Implemented (2026-09-24) - see "Implementation notes" at the end
**Repos affected:** `portfolio-astro` (frontend - built here), `hono-workers` (backend - specified here for the separate backend agent; not edited from this repo)

## Goal

Add a "Download Resume" button to the public site and track each download
attempt - count, visitor IP address, country, device/user-agent, and time -
so the owner can see download activity from the admin dashboard.

The resume PDF already exists at:
`public/docs/hafizbahtiar-resume-4-3.pdf`

## Decisions (from brainstorming)

1. **Tracking model: log clicks via beacon.** The button is a normal download
   link to the static PDF. On click, the browser sends a fire-and-forget beacon
   directly to the backend, which records the request. Accepted trade-offs:
   counts *click intent* (not byte-level completion), and anyone with the direct
   `/docs/...pdf` URL bypasses tracking. Acceptable for a portfolio.
2. **Stats UI: admin dashboard card.** A "Resume downloads" KPI card (total)
   plus a "Recent downloads" list on the existing `/admin` dashboard. No
   dedicated admin page.
3. **Button placement: Hero section** (`src/components/home/Hero.astro`).
4. **Admin read: extend the existing dashboard endpoint** rather than add a new
   admin route.

## Why backend + frontend (not either/or)

- **IP can only be captured server-side.** Browser JS has no access to the
  visitor's IP; on Cloudflare the server reads `CF-Connecting-IP`. Tracking must
  involve a server.
- **Persistent storage is the backend.** D1 lives in `hono-workers`; the
  frontend Astro Worker has no database.
- The beacon goes **browser → backend directly**, so `CF-Connecting-IP` on that
  request is the real visitor (not a chained Worker). No IP is ever sent from
  client JS - the server reads it from request headers.

## Data flow

```
Visitor clicks "Download Resume" (Hero.astro)
   ├─► browser downloads /docs/hafizbahtiar-resume-4-3.pdf   (static asset, unchanged)
   └─► navigator.sendBeacon → POST {PUBLIC_API_URL}/public/resume-download
          backend reads CF-Connecting-IP, CF-IPCountry, User-Agent, Referer
          → INSERT into resume_downloads (D1)

Admin opens /admin → existing dashboard fetch → overview now includes
   resumeDownloads: { total, recent[] } → KPI card + recent list
```

## Data captured per download

Read server-side from request headers (never trusted from the client body):

| Field        | Source                         | Notes                         |
|--------------|--------------------------------|-------------------------------|
| `ip_address` | `CF-Connecting-IP`             | Real visitor IP               |
| `country`    | `CF-IPCountry`                 | Free 2-letter code from CF    |
| `user_agent` | `User-Agent`                   | Attacker-controlled (display-escape) |
| `referer`    | `Referer`                      | Nullable                      |
| `source`     | beacon body (e.g. `"hero"`)    | Nullable; which button        |
| `created_at` | server time (ISO)              | DEFAULT now                   |

## Frontend changes (this repo - `portfolio-astro`)

### 1. `src/components/home/Hero.astro`
- Add a "Download Resume" CTA styled to the established aesthetic
  (blue/professional, minimal). Anchor:
  `<a href="/docs/hafizbahtiar-resume-4-3.pdf" download="Hafiz-Bahtiar-Resume.pdf">`.
- Inline `<script>` (re-registered on `astro:page-load`, per project pattern)
  attaches a click listener that fires the beacon:
  - Primary: `navigator.sendBeacon(url, blob)` where the body is a **`text/plain`**
    blob (CORS-safelisted content type → no preflight cross-origin). Body carries
    a tiny `source` string only; all sensitive fields are read server-side.
  - Fallback: `fetch(url, { method: "POST", body, keepalive: true })` with no
    custom headers (keeps it a "simple request" → no preflight).
  - `url` = `` `${API_BASE_URL}/public/resume-download` `` using the existing
    `API_BASE_URL` export from `src/lib/config.ts` (already includes `/api/v1`).
- **No CSP change needed:** `connect-src` in `src/middleware.ts` already allows
  `https://api.hafizbahtiar.com` (prod) and `http://localhost:8787` (dev).
- The beacon is fire-and-forget: failure never blocks the download.

### 2. `src/lib/dashboard.ts`
- Extend the dashboard overview TypeScript types with:
  ```ts
  resumeDownloads: {
    total: number;
    recent: Array<{
      createdAt: string;
      ipAddress: string;
      country: string | null;
      userAgent: string;
    }>;
  }
  ```

### 3. `src/pages/admin/index.astro`
- Add a "Resume downloads" KPI card showing `resumeDownloads.total`.
- Add a "Recent downloads" list (time · IP · country · device) next to the
  existing recent projects/messages.
- **Render every dynamic value with `textContent` only** (never `innerHTML`):
  `user_agent` and `referer` are fully attacker-controlled, so this follows the
  existing safe dashboard pattern (see the contact-name/subject rendering at
  `src/pages/admin/index.astro:236-309`). The `timeAgo()` and `setText()` helpers
  already present should be reused.
- Grid note: the KPI row is currently `lg:grid-cols-4`. Adding a 5th card is a
  minor layout detail to resolve during implementation (e.g. allow it to wrap, or
  restructure the row) - does not affect data flow.

## Backend specification (for the backend agent - `hono-workers`, NOT edited here)

### 1. Migration - new table `resume_downloads`
Follow the existing migration naming/sequence in
`src/database/migrations/`. Suggested schema:
```sql
CREATE TABLE resume_downloads (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  ip_address  TEXT,
  country     TEXT,
  user_agent  TEXT,
  referer     TEXT,
  source      TEXT
);
CREATE INDEX idx_resume_downloads_created_at ON resume_downloads (created_at);
```

### 2. Public write endpoint - `POST /api/v1/public/resume-download`
- Add alongside `src/routes/v1/public/contact.ts` (public write resource).
- Read headers server-side: `CF-Connecting-IP`, `CF-IPCountry`, `User-Agent`,
  `Referer`. Read optional `source` from the request body (best-effort; ignore on
  parse failure).
- Insert one row. Return `204 No Content` (or `200`).
- **Sit behind the existing rate-limit middleware** (`src/middleware/rate-limit.ts`)
  to prevent count inflation / spam.
- Must be covered by the existing public CORS config so the cross-origin beacon
  from the frontend origin is accepted (POST, no credentials required).

### 3. Admin read - extend `GET /api/v1/owner/dashboard/overview`
- In `src/routes/v1/owner/dashboard.ts` (and its service), add to the overview
  response returned by the `/overview` handler (this is the exact endpoint the
  frontend calls via `dashboardService.getOverview()`):
  ```jsonc
  "resumeDownloads": {
    "total": 87,
    "recent": [
      { "createdAt": "...", "ipAddress": "1.2.3.4", "country": "MY", "userAgent": "..." }
    ]
  }
  ```
- `total` = `COUNT(*)`; `recent` = latest N (e.g. 5–10) ordered by `created_at DESC`.
- No new admin route; the frontend dashboard already fetches this single overview.

## Security considerations

- **No client-supplied IP/UA trusted.** All identifying fields are read from
  request headers on the backend. The beacon body carries only a non-sensitive
  `source` hint.
- **Admin display is XSS-safe.** `user_agent`/`referer` are attacker-controlled;
  the dashboard renders them via `textContent`, consistent with the existing
  contact-message rendering.
- **Beacon uses a CORS-safelisted content type** (`text/plain`) so it works
  cross-origin without a preflight and without credentials.

## Privacy note (non-blocking)

Storing raw IPs is PII. Recommended (not required to ship):
- Add a line to the existing privacy policy noting that resume-download IPs are
  logged.
- Consider a retention cap later (e.g., delete rows older than N months).

## Error handling

- Beacon is fire-and-forget. If it fails, is blocked by an ad-blocker, or the
  backend errors, **the download still works** - it's a separate static link.
  Tracking must never block or delay the user.

## Out of scope (YAGNI)

- Byte-level "download complete" detection.
- Bypass prevention / serving the PDF through a tracked route.
- Dedicated `/admin/downloads` page or pagination.
- Geo/device enrichment beyond `CF-IPCountry` and raw user-agent.

## Verification

- `npm run build` passes (frontend).
- Manual: click the button → PDF downloads; a row appears (dev) / dashboard count
  increments. Direct `/docs/...pdf` access confirmed to *not* log (expected
  bypass).

---

## Implementation notes (2026-09-24)

Shipped as designed: migration `011_resume_downloads` (same columns as specified),
`POST /api/v1/public/resume-download` behind `strictRateLimit()` reading every
identifying field from request headers, `resumeDownloads: { total, recent[] }` in
`GET /owner/dashboard/overview`, KPI card + recent list on `/admin`, and the
`text/plain` beacon with a `keepalive` fetch fallback.

Deliberate deviations from the text above:

- **`referer` is not stored.** The `source` hint is more precise (hero, contact,
  footer, palette) and a column nobody reads is how `views_count` became dead
  data in the same schema.
- **No standalone beacon script per button.** The original plan attached the
  listener inside the button component, which only renders on the home page - so
  the footer link (present on *every* page) was never tracked. Binding now lives
  in `PublicLayout.astro` and matches resume links by href; the command palette
  (rows are `<li data-href>`, not anchors) calls the shared helper directly.
- **Retention added now rather than later** (the privacy note's "consider a
  retention cap"): a daily cron (`0 3 * * *`) prunes rows older than 180 days via
  `ResumeDownloadService.pruneOlderThan()`.
- `created_at` uses the repo's `DATETIME DEFAULT CURRENT_TIMESTAMP` convention
  instead of the spec's `TEXT DEFAULT (datetime('now'))`; the route always writes
  an ISO string, and the prune compares with `datetime()` so both formats order
  correctly.

Still open (not part of this feature): where to note the IP logging for visitors -
there is no site-level privacy page, only per-project `/projects/[slug]/privacy`.
