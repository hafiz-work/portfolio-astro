# Public Portfolio Audit - Phase 0

**Date:** 2026-06-16
**Branch:** `portfolio-admin-backend`
**Scope:** Repository + live-site diagnosis, critical public fixes before new features.
**Repos:** `portfolio-astro` (Astro 6 SSR + React islands, Cloudflare adapter), `hono-workers` (Hono + D1 + KV + R2 API at `https://api.hafizbahtiar.com/api/v1`).

---

## 1. Stack snapshot (verified)

| Area | Finding |
|---|---|
| Frontend | Astro 6 `output: "server"`, `@astrojs/cloudflare`, React 19 islands, Tailwind v4. Package manager **npm** (`package-lock.json`). |
| Canonical origin | `astro.config.mjs` `site: https://hafizbahtiar.com` (apex). Sitemap, `<link rel=canonical>`, `og:url` all emit apex - verified live. |
| Backend | Hono on Workers, D1 (`hono_workers_db`), KV, R2. Custom domain `api.hafizbahtiar.com`. Migrations `001`–`009`, runner `scripts/migrate.js` tracks `schema_migrations`. |
| Projects data | Flat `projects` table. `technologies`/`tags`/`features` stored as **JSON arrays inside columns**. No media gallery, no normalized tech, no sections, no links table. |
| Public data flow | `src/lib/public-content.ts` fetches API with 4 s timeout + curated fallback from `src/data/portfolio-content.ts` (never throws, never empty). |
| Auth | httpOnly cookie access/refresh tokens; owner routes behind `jwtAuth` + `requireAdmin`. |

---

## 2. Findings

### CRITICAL

**C1 - Broken public CTA links (live data).**
Verified 2026-06-16 against the production API + targets:

| Project | Link | Status |
|---|---|---|
| `com-invois` | `github.com/hafizbahtiar/invoice` (Source Code) | **404** |
| `com-invois` | `play.google.com/store/apps/details?id=com.invois` (Live Demo) | **404** |
| `fasttrack-system` | `github.com/hafizbahtiar/fasttrack-system` (Source Code) | **404** |
| `fasttrack-system` | `fasttrack-system.com` (Live Demo) | **unreachable (000)** |

These rendered as working "Source Code"/"Live Demo" buttons on the project detail pages - a recruiter clicking them hit dead ends. (Good links confirmed live: `qiubbx.com` 200.)
**Severity: Critical** (recruiter-facing dead links).
**Files:** `src/pages/projects/[slug]/index.astro`, source data in `hono-workers` DB / seed `001_initial_data.sql`.

**C2 - Duplicate content on project detail page.**
`project.description` was rendered **three times** (header dek, Overview "About this project", Case Study tab) and the Features list **twice** (Overview + Case Study). The "Case Study" tab held nothing but a verbatim copy of the description + features.
**Severity: Critical** (SEO duplicate-content + poor UX, explicitly flagged in the brief).
**Files:** `src/pages/projects/[slug]/index.astro`.

### HIGH

**H1 - Admin project create/update is broken for `fullDescription`.**
`ProjectForm.astro` posts a `fullDescription` field (TipTap rich text), but:
- the backend Zod validator `validators/projects.ts` is `.strict()` and has **no** `fullDescription` key → the request is rejected with a 400 (`Unrecognized key`), and
- there is **no** `full_description` column in the `projects` table and the public API never returns it.

So the rich-text editor in the admin form silently fails to persist (or fails the whole save). 
**Severity: High** (admin feature is non-functional). 
**Files:** `hono-workers/src/validators/projects.ts`, `hono-workers/src/services/projects.ts`, `hono-workers/src/database/schemas/projects.sql`, `src/components/admin/projects/ProjectForm.astro`. 
**Resolution:** folded into the schema redesign - see Phase 2 data model + Phase 4 Stage A/B. Not hot-patched in Phase 0 to avoid a throwaway column.

### MEDIUM

**M1 - www and non-www both serve `200` (duplicate hostnames).**
`curl -I` confirms `https://hafizbahtiar.com/` and `https://www.hafizbahtiar.com/` both return `200` with no redirect. SEO impact is **mitigated** because the canonical tag, `og:url`, and sitemap all point to the apex on both hosts - but two indexable hostnames is still undesirable.
**Severity: Medium (mitigated).**
**Files:** `src/middleware.ts` (code-level), Cloudflare dashboard (authoritative).

**M2 - No structured private/confidential project handling.**
Work/client projects (DBKL, Securiforce CIT systems) have no public repo/demo and no first-class "Case Study / Request Access / Contact" affordance - they simply showed no buttons. The schema has no `is_public` / `is_confidential` / link-status concept.
**Severity: Medium.**
**Files:** detail page + data model (Phase 2).

### LOW

**L1 - Missing-media fallback on detail page.** When a project had neither a banner nor a logo image, the detail page rendered no media element at all (layout felt incomplete). Cards already have an icon fallback.
**Severity: Low.** **Files:** `src/pages/projects/[slug]/index.astro`.

**L2 - `fullDescription` exists in the frontend `Project` type but not the backend type/DB.** Type drift between the two repos.
**Severity: Low.** **Files:** `src/types/project.ts` vs `hono-workers/src/types/projects.ts`.

**L3 - Detail page used the admin `ApiClient` (`no-store`, `credentials: include`) for a public read,** bypassing the curated/cacheable public loader used everywhere else.
**Severity: Low.** **Files:** `src/pages/projects/[slug]/index.astro`, `src/lib/public-content.ts`.

---

## 3. Fixed immediately in Phase 0

All fixes are on branch `portfolio-admin-backend`, frontend build verified green (`npm run build`).

| ID | Fix | Files |
|---|---|---|
| C1 | Added `PROJECT_LINK_OVERRIDES` (per-slug) to sanitize the four broken links to "hidden", applied through a shared `curateProject()` helper. Broken CTAs no longer render. **Reversible, fallback-safe stopgap** until the `project_links` model ships. | `src/data/portfolio-content.ts`, `src/lib/public-content.ts` |
| C1 | Added a safe fallback CTA: when a project exposes no working public link, show "Request a walkthrough" (client work) / "Discuss this project" → `/#contact` instead of a dead end. | `src/pages/projects/[slug]/index.astro` |
| C2 | Removed the duplicated description (3→1, kept in header) and Features (2→1, kept in Overview); deleted the redundant "Case Study" tab (now Overview + Tech Stack). | `src/pages/projects/[slug]/index.astro` |
| L1 | Added a "Media coming soon" placeholder when a project has no banner/logo. | `src/pages/projects/[slug]/index.astro` |
| L3 | Detail page now reads through the curated `getPublicProjectBySlug()` (timeout + static fallback), consistent with the list/home loaders. | `src/lib/public-content.ts`, `src/pages/projects/[slug]/index.astro` |
| M1 | Added a `www.hafizbahtiar.com` → apex `301` in `src/middleware.ts` for SSR HTML. | `src/middleware.ts` |

### Verified OK (no change needed)
- Every project **card** already wraps the whole card in an absolute anchor to `/projects/[slug]` (`ProjectCard.astro`) - clear link to detail. ✓
- Canonical / `og:url` / sitemap already emit the apex host on both www and non-www. ✓
- Public loaders never throw / never show empty or error states (curated fallback). ✓
- `robots.txt` + `sitemap-index.xml` present and apex-hosted. ✓

---

## 4. Remaining work (deferred to specs + admin/backend phases)

| ID | Item | Phase |
|---|---|---|
| C1 (proper) | Replace the link-override stopgap with the admin-managed **`project_links`** table (`link_type`, `status: active/hidden/disabled`, `is_public`). Validate links in admin; never render a broken/private link as a public CTA. | 2 / 4 |
| H1 | Add structured case-study content (`full_description` / `project_sections`) to schema + validator + service; wire the admin rich-text editor to a persisted, **server-sanitized** field. | 4 |
| C2 (proper) | Rebuild the detail page as a real case-study layout (hero → summary → media carousel → problem → contribution → architecture → features → challenges → results → CTA) driven by structured data. | 4 / 5 |
| M1 (authoritative) | Add a Cloudflare **Redirect Rule** `www.hafizbahtiar.com/*` → `https://hafizbahtiar.com/$1` (301) so static assets are covered too (middleware only covers SSR HTML). *Cannot be done from the repo - requires the Cloudflare dashboard.* | infra |
| M2 | `is_public` / `is_confidential` + sanitized confidential case studies; "Request access" treated as a first-class link type. | 2 / 4 |
| - | Evidence-driven screenshot/media carousel (App/Play-Store-inspired). | 5 |

### Verification gaps (stated honestly)
- The www→apex `301` is implemented and the build is green, **but it cannot be verified in production from here** (no deploy in this session). It only fires for SSR HTML responses; static assets need the Cloudflare Redirect Rule above.
- C1's broken links live in the **production D1 database**, not the repo. Phase 0 hides them at the presentation layer (frontend override); the durable fix is correcting/adding the data via the admin once the `project_links` model exists. No production DB writes were performed in Phase 0.
