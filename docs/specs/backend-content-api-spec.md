# Backend Content API Spec

**Status:** Draft (Phase 1)
**Repo:** `hono-workers` (Hono + D1 + KV + R2 on Cloudflare Workers).
**Convention alignment:** This spec follows the **existing** route scheme - public reads live at `/api/v1/<resource>` (folder `routes/v1/public/`), admin writes at `/api/v1/owner/<resource>` (folder `routes/v1/owner/`, behind `jwtAuth` + `requireAdmin`). The brief's `/api/public/*` and `/api/admin/*` map onto these respectively. We do **not** introduce a parallel URL scheme.

---

## 1. Response envelope (unchanged)
```jsonc
{ "success": true,  "data": <T>, "message"?: "..." }
{ "success": false, "error": "human message", "field"?: "slug", "requestId": "..." }
```
Errors via the class-based `onError` handler: `ValidationError` → 400 (with `field`), `HTTPException` → its status, anything else → 500 (message redacted in production, `requestId` always included).

## 2. Auth assumptions (unchanged)
- httpOnly cookies: `access_token` (JWT, 15 m), `refresh_token` (KV session id, 7 d), `session_active` (JS-readable flag). `SameSite=None; Secure` in prod.
- `jwtAuth` accepts `access_token` cookie **or** `Authorization: Bearer`. `requireAdmin()` gates all owner routes.
- CSRF middleware on `/api/*`: `Origin` must be in `ALLOWED_ORIGINS`; in production a missing `Origin` on mutations is also blocked.

## 3. Public read API (no auth, cacheable)
All public GETs set `Cache-Control: public, max-age=60, stale-while-revalidate=600` and return only **published + public** projects (`status='published' AND is_public=1 AND archived_at IS NULL`).

| Method | Path | Notes |
|---|---|---|
| GET | `/api/v1/profile` | existing |
| GET | `/api/v1/projects` | list; query: `featured`, `type`, `tech`, `limit`, `page` |
| GET | `/api/v1/projects/:slug` | full case study (sections, media, features, tech, public links) |
| GET | `/api/v1/projects/:slug/policy` | existing privacy/terms |

**Public project DTO (detail)** - composed, no internal/admin fields:
```jsonc
{
  "id", "slug", "title", "subtitle", "summary", "description",
  "projectType", "projectScope", "status", "year", "role",
  "clientName": null,            // null when is_confidential
  "isConfidential": false,
  "featured": true, "featuredOrder": 1,
  "cover":  { "url", "alt", "width", "height", "blurhash" } | null,
  "ogImage":{ "url" } | null,
  "media":  [ { "id","type","url","alt","caption","deviceFrame","width","height","blurhash","sortOrder" } ],
  "problem", "solution", "contribution", "architectureNotes", "resultSummary",
  "sections": [ { "type","title","body","sortOrder" } ],   // body = sanitized HTML
  "features": [ { "title","description","icon","sortOrder" } ],
  "techStacks": [ { "name","category","icon","color","isPrimary","sortOrder" } ],
  "links":  [ { "label","url","linkType","sortOrder" } ],   // is_public=1 AND status='active' ONLY
  "createdAt", "updatedAt", "publishedAt"
}
```
The **public list DTO** is a lighter projection (no rich sections; cover + summary + tech names + up to 3 featured media).

> Note (carried from the family module): the public *backend* API is the privacy boundary for projects - the public DTO must be assembled server-side so confidential client names / private links never leave the Worker. Do not rely on the frontend to strip them.

## 4. Admin write API (`/api/v1/owner/...`, `jwtAuth` + `requireAdmin`)

### Projects
| Method | Path | Body / notes |
|---|---|---|
| GET | `/owner/projects/all` | admin list (all statuses); query: `q`, `status`, `type`, `featured`, `visibility`, `page`, `limit`, `sort` |
| GET | `/owner/projects/:id` | full admin record (all fields, all statuses) |
| POST | `/owner/projects` | create (Basics min); returns 201 |
| PATCH | `/owner/projects/:id` | partial update (use PATCH semantics; existing PUT kept as alias during transition) |
| POST | `/owner/projects/:id/publish` | sets `status=published`, `published_at` |
| POST | `/owner/projects/:id/unpublish` | sets `status=draft` |
| POST | `/owner/projects/:id/archive` | sets `archived_at` (soft) |
| POST | `/owner/projects/:id/duplicate` | deep-copy → new draft, slug `-copy` |
| DELETE | `/owner/projects/:id` | hard delete (double-confirmed client-side); cascades child rows |
| GET/PUT | `/owner/projects/:id/policy` | existing |

### Project children
| Method | Path |
|---|---|
| POST `/owner/projects/:id/media` · PATCH `/owner/project-media/:id` · DELETE `/owner/project-media/:id` · POST `/owner/projects/:id/media/reorder` |
| POST `/owner/projects/:id/sections` · PATCH `/owner/project-sections/:id` · DELETE · reorder |
| POST `/owner/projects/:id/features` · PATCH `/owner/project-features/:id` · DELETE · reorder |
| POST `/owner/projects/:id/links` · PATCH `/owner/project-links/:id` · DELETE · reorder · POST `…/links/:id/validate` |
| PUT `/owner/projects/:id/tech-stacks` (set full list with is_primary + order) |

### Taxonomy & media library & audit
| Method | Path |
|---|---|
| GET/POST `/owner/tech-stacks` · PATCH/DELETE `/owner/tech-stacks/:id` |
| GET `/owner/media` · POST `/owner/upload` (existing R2 route) · DELETE `/owner/media/:id` |
| GET `/owner/audit-logs` (query: `entityType`, `entityId`, `actorId`, `action`, `page`) |

## 5. Validation (Zod `.strict()` + shared `parse` helper)
New validators in `src/validators/projects.ts` (extend) + `media.ts`, `tech-stacks.ts`, `project-links.ts`, `project-sections.ts`. Reuse the existing `parse` pattern (collects all issues into one `; `-delimited message, throws `ValidationError(message, field)`). Use `<Out, In = Out>` for schemas with `.default()`. URL-param ids via `parseIdParam`.

## 6. Pagination / search / filtering
- `page` (1-based) + `limit` (default 20, max 100). Response includes `meta: { page, limit, total, totalPages }` for admin list (public list may stay simple).
- Search `q`: `LIKE` across title/slug/summary + a join to tech name. Filters are exact-match `WHERE` clauses. Sort is an allow-listed column map (no raw column from client).

## 7. Slug uniqueness
- `slug` `UNIQUE NOT NULL`, format `^[a-z0-9-]+$`. Create/update checks uniqueness and returns `400 { field: "slug" }` on conflict. Slug is stable: changing a published slug should be deliberate (warn in admin); consider a future `slug_redirects` table (out of scope v1).

## 8. Media upload / storage strategy
- R2 bucket `honoworkersobject`, public base `R2_PUBLIC_URL`. Existing `/owner/upload` returns a URL.
- On upload, also persist a `media_assets` row (filename, original_filename, url, mime, width/height, size_bytes, optional blurhash, storage_key). Image dimensions/blurhash computed client-side or via a follow-up (best-effort; nullable).
- Rich-text and section/feature HTML is **sanitized server-side at write time** (allowlist tags/attrs, strip `on*`, safe URLs only) before storage - the source of truth is clean. Mirrors the client `sanitizeRichHtml` allowlist.

## 9. Cache / revalidation strategy
- Public GETs keep `max-age=60, stale-while-revalidate=600` (Cloudflare edge + browser).
- On any admin mutation to a published project, **purge/refresh** the relevant KV cache keys (pattern already used by the family module's KV cache) and rely on the short TTL for edge. v1 acceptable: short TTL only (≤ 60 s propagation). v2: explicit KV invalidation per slug.

## 10. Database migration strategy (additive, non-destructive)
- New migration `010_projects_cms.sql` (next after `009`), applied via `scripts/migrate.js` (tracks `schema_migrations`; D1 has no `ADD COLUMN IF NOT EXISTS`, so the runner skips already-present columns - follow the `009` pattern).
- **Additive only:** add new columns to `projects` (subtitle, summary, project_scope, client_name, problem, solution, contribution, architecture_notes, result_summary, is_public, is_confidential, featured_order, sort_order, cover_image_id, logo_image_id, og_image_id, full_description, published_at, archived_at) with safe defaults; create new tables (`media_assets`, `project_media`, `project_sections`, `project_features`, `tech_stacks`, `project_tech_stacks`, `project_links`, `audit_logs`; `admin_users` if not already covered by `owner`/`users`).
- **Keep the existing JSON columns** (`technologies`, `tags`, `features`) during transition; a backfill migration/seed copies them into the normalized tables. Deprecate (not drop) JSON columns only after the public page reads exclusively from normalized data and a verification pass confirms parity.
- `status` gains `'draft' | 'published' | 'archived'` in addition to the legacy `'completed' | 'in-progress' | 'maintained'` (map legacy → `published` on backfill; preserve original in a `legacy_status` note or a section).

## 11. Seed strategy
- New seed `007_projects_cms_backfill.sql` (after existing seeds): backfill the 9 existing projects into normalized tables (tech → `tech_stacks` + `project_tech_stacks`; features → `project_features`; media → `media_assets` + `project_media` cover; links → `project_links`).
- Idempotent (`INSERT OR IGNORE`, tracked via `seed_versions`). Local-first (`db:seed`), then `db:seed:remote` only after local verification.
- The frontend `FALLBACK_PROJECTS` stays as the offline fallback and remains the parity reference for the backfill.

## 12. Security checks
- Owner routes: `jwtAuth` + `requireAdmin` (already enforced per-router).
- All bodies `.strict()` (reject unknown fields - this is also why H1's `fullDescription` 400s today; the field gets added properly here).
- Public DTO assembled server-side; confidential fields never serialized for `is_confidential` projects.
- URL fields validated; no SSRF from link-validation action (allowlist schemes http/https, timeout, no following to internal hosts).
- Audit log on every mutation.
- Preview access (`?preview=1`) requires a valid admin session checked server-side; never trust the query param alone.

## 13. Acceptance criteria
- [ ] Public API returns only published+public projects; confidential client names/links never appear.
- [ ] Admin API supports full CRUD + publish/unpublish/archive/duplicate + child-resource management.
- [ ] Migration is additive; existing 9 projects survive with no data loss; rollback path documented.
- [ ] All write endpoints validate with `.strict()` Zod and write an audit log row.
- [ ] `wrangler deploy --dry-run` (or build) passes; local D1 migrate + seed succeed before any remote apply.
