# Admin + Backend Implementation Plan

**Status:** Draft (Phase 1) - execute on branch `portfolio-admin-backend` in both repos.
**Order rule:** schema → backend → admin → public. Do **not** build the public carousel UI until schema + seed + public read API + admin media ordering exist.
**Verification rule:** local D1 migrate + seed must pass before any `--remote`. Run `npm run build` (frontend) and `wrangler deploy --dry-run` (backend) before each stage's commit.

---

## Phase 2 - Data model (normalized, additive)

Target schema (SQLite/D1). `010_projects_cms.sql` **adds** columns/tables; it never drops existing data. Legacy JSON columns (`technologies`, `tags`, `features`) are retained until parity is verified.

### `projects` (extend existing)
Add: `subtitle TEXT`, `summary TEXT`, `project_scope TEXT`, `client_name TEXT`, `problem TEXT`, `solution TEXT`, `contribution TEXT`, `architecture_notes TEXT`, `result_summary TEXT`, `full_description TEXT`, `is_public INTEGER DEFAULT 1`, `is_confidential INTEGER DEFAULT 0`, `featured_order INTEGER DEFAULT 0`, `sort_order INTEGER DEFAULT 0`, `cover_image_id INTEGER`, `logo_image_id INTEGER`, `og_image_id INTEGER`, `published_at DATETIME`, `archived_at DATETIME`.
`status` extended to allow `draft|published|archived` (legacy values mapped to `published` on backfill).

### `project_sections`
`id PK, project_id FK→projects ON DELETE CASCADE, section_type TEXT, title TEXT, body TEXT (sanitized HTML), sort_order INTEGER, is_visible INTEGER DEFAULT 1, created_at, updated_at`.

### `project_features`
`id PK, project_id FK CASCADE, title TEXT, description TEXT, icon TEXT, sort_order INTEGER, is_visible INTEGER DEFAULT 1`.

### `media_assets`
`id PK, filename, original_filename, url, thumbnail_url, mime_type, width, height, size_bytes, alt_text, caption, storage_key, blurhash, created_at, updated_at`.

### `project_media`
`id PK, project_id FK CASCADE, media_asset_id FK→media_assets, media_type TEXT (screenshot|video|architecture_diagram|logo|cover|og), title, caption, device_frame TEXT (phone|tablet|desktop|browser|none), sort_order INTEGER, is_featured INTEGER DEFAULT 0, is_visible INTEGER DEFAULT 1`.

### `tech_stacks`
`id PK, name TEXT UNIQUE, category TEXT (backend|mobile|database|web|infra|language|tooling), proficiency TEXT, icon TEXT, color TEXT, created_at, updated_at`.

### `project_tech_stacks`
`id PK, project_id FK CASCADE, tech_stack_id FK→tech_stacks, sort_order INTEGER, is_primary INTEGER DEFAULT 0, UNIQUE(project_id, tech_stack_id)`.

### `project_links`
`id PK, project_id FK CASCADE, label TEXT, url TEXT, link_type TEXT (source|demo|app_store|play_store|case_study|contact|private), is_public INTEGER DEFAULT 1, sort_order INTEGER, status TEXT DEFAULT 'active' (active|hidden|disabled), created_at, updated_at`.

### `audit_logs`
`id PK, actor_id, action, entity_type, entity_id, before_json, after_json, ip_address, user_agent, created_at`.

### `admin_users`
Reuse the existing `owner`/`users` tables if they already model email/role/password_hash/last_login. Only add a table if a gap exists. (Audit references `actor_id` → owner/user id.)

**Indexes:** keep existing project indexes; add `idx_project_media_project (project_id, sort_order)`, `idx_project_tech_project (project_id)`, `idx_project_links_project (project_id)`, `idx_project_sections_project (project_id, sort_order)`, `idx_projects_published (status, is_public, archived_at)`, `idx_audit_entity (entity_type, entity_id)`.

**Hard rules:** no comma-separated tech in `projects`; no carousel images hardcoded in components; public read exposes only published+public; admin sees all; slug stable + unique; carousel order from admin; links validated/hideable; confidential supports sanitized content.

---

## Phase 4 - Coding order

### Stage A - Schema + migrations (`hono-workers`)
1. `src/database/schemas/projects_cms.sql` (reference schema, mirrors above).
2. `src/database/migrations/010_projects_cms.sql` - additive columns + new tables + indexes; ends with `INSERT OR IGNORE INTO schema_migrations`.
3. `npm run db:migrate` (local) → `npm run db:migrate:status`. **Do not** run `:remote` until Stage I.
4. Update `src/types/projects.ts` with the extended `Project`, child types, and `Create/Update` DTOs (+ media, tech, link, section types).
**Verify:** local migrate clean; `wrangler deploy --dry-run` typechecks.

### Stage B - Backend repository/service layer (`hono-workers`)
5. Extend `services/projects.ts`: compose detail (joins to media/sections/features/tech/links), enforce published+public for public reads, assemble the sanitized public DTO server-side.
6. New services: `media.ts`, `tech-stacks.ts`, `project-links.ts`, `project-sections.ts`, `project-features.ts` (or sub-modules), plus `audit.ts` (write helper) and a server-side `sanitizeHtml` util.
**Verify:** unit-level reasoning + dry-run; no route wiring yet (safe, additive).

### Stage C - Admin + public API routes (`hono-workers`)
7. Validators (Zod `.strict()`): extend `projects.ts`, add `media.ts`, `tech-stacks.ts`, `project-links.ts`, `project-sections.ts`.
8. Owner routes: publish/unpublish/archive/duplicate, child-resource CRUD + reorder, tech-stacks, media library, audit-logs. Add `PATCH` for projects (keep `PUT` alias).
9. Public routes: enrich `/projects` + `/projects/:slug` to return the composed DTO (still cached).
10. Mount in `routes/v1.ts`. Audit-log every mutation.
**Verify:** dry-run; manual `curl` against `wrangler dev` for representative endpoints; confirm confidential fields absent from public DTO.

### Stage D - Admin project table UI (`portfolio-astro`)
11. Extend `ProjectsTable.tsx`: server search/filter/sort, status/featured/confidential/missing-media/broken-link badges, row actions (Edit/Preview/Publish/Unpublish/Duplicate/Archive), bulk actions. Extend `lib/projects.ts` service for the new endpoints.
**Verify:** `npm run build`; table loads against `wrangler dev`.

### Stage E - Project create/edit form (`portfolio-astro`)
12. Convert `ProjectForm.astro` / `edit.astro` / `new.astro` to the 6-tab editor (Basics / Case Study / Media / Tech / Links & SEO / Publish). Reuse Dropdown/MultiDropdown/Checkbox/TextEditor/form-guard. Fix the H1 `fullDescription` bug (now a real field).
**Verify:** build; create→edit→publish round-trip against `wrangler dev`.

### Stage F - Media carousel data model + manager (`portfolio-astro`)
13. Media tab: upload (R2) → `media_assets` + `project_media`, per-item metadata, **drag-to-reorder**, set cover/OG, alt-text enforcement.
**Verify:** build; reorder persists and reads back.

### Stage G - Public pages read from structured data (`portfolio-astro`)
14. Rewire `/projects` + `/projects/[slug]` to the composed public DTO via `public-content.ts` (keep curated fallback). Render sections/features/tech/links per `public-project-case-study-spec.md`. Retire the `PROJECT_LINK_OVERRIDES` stopgap once `project_links` drives CTAs.
**Verify:** build; parity check vs current content for all 9 projects.

### Stage H - Migrate from static data to DB content (`both`)
15. Author + run `007_projects_cms_backfill.sql` locally; verify all 9 projects render from normalized data with parity to `FALLBACK_PROJECTS`. Then `db:seed:remote` / `db:migrate:remote` (Stage I gate).

### Stage I - Verification & polish
16. Public carousel UI (`public-media-carousel-spec.md`), accessibility pass, Lighthouse (CLS/LCP), SEO/OG checks, confidential-exposure check, then remote migrate/seed + deploy. Add the Cloudflare www→apex Redirect Rule (audit M1).

---

## Commit checkpoints (incremental)
A, B, C, D, E, F, G, H, I each land as ≥ 1 commit with its verification noted. Never commit to `main`. Remote DB writes only at Stage H/I after local parity.

## Risks / guards
- **Data loss:** additive migration + retained JSON columns + backfill parity check before deprecation.
- **Confidential exposure:** server-side DTO assembly is the boundary; add a test/curl asserting confidential client name/links are absent.
- **Remote D1:** never auto-apply; local-first, explicit remote step, status-checked.
- **Scope creep:** audit-log viewer + global media library are v2; write-side + per-project managers are v1.
