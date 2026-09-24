# Admin Project CMS Spec

**Status:** Draft (Phase 1)
**Depends on:** `backend-content-api-spec.md` (admin write API), data model in `admin-backend-implementation-plan.md` §Schema.
**Reuses existing admin primitives:** `PrivateLayout.astro` (always-dark), `AdminSidebar`, `AdminNavbar`, `AdminPageHeader.astro`, `DataTable` (TanStack table + virtual), `ui/Dropdown`, `ui/MultiDropdown`, `ui/Checkbox`, `ui/TextEditor` (TipTap), `lib/upload.ts` (R2), `lib/form-guard.ts`, `window.confirmModal`, `ui/admin/primitives` (`AdminBadge`, `RowActions`, `EditAction`, `DeleteAction`, etc.).

The CMS extends the existing `/admin/projects` screens - it does not replace the admin shell or theming.

---

## 1. Admin routes (Astro pages under `src/pages/admin/`)

| Route | Purpose |
|---|---|
| `/admin/projects` | Projects table/list (exists - extended). |
| `/admin/projects/new` | Create project (Basics-first; full editor after first save). |
| `/admin/projects/edit?id=` | Tabbed editor (exists - extended to tabs). |
| `/admin/projects/edit?id=&tab=media` | Deep-link to a specific editor tab. |
| `/admin/media` (optional v2) | Global media library (`media_assets`). |
| `/admin/tech-stacks` | Tech stack taxonomy manager. |
| `/admin/audit-logs` (optional v2) | Audit log viewer. |

All under `PrivateLayout` (locked dark). Auth identical to existing admin (httpOnly cookies + `jwtAuth` server-side; `session_active` flag client-side; 401 → refresh → `/login`).

## 2. Admin dashboard
Extend the existing `/admin` dashboard (`lib/dashboard.ts`) with project content-health tiles:
- counts: total / published / draft / archived / featured.
- **Needs attention**: projects missing cover image, missing alt text on public media, or with broken/`disabled` links.

## 3. Projects table/list
Built on the existing `ProjectsTable.tsx` (TanStack `DataTable`).

**Columns:** Project (title + slug), Type, Status, Featured order, Year, Updated, Actions.
**Search** (debounced, server-side `q=`): title, slug, summary, tech name.
**Filters:** status (`draft/published/archived`), type, featured (y/n), visibility (`public/private/confidential`).
**Sort:** `updated_at` (default), `published_at`, `featured_order`, `year`.
**Row actions** (`RowActions`): Edit · Preview (opens `/projects/{slug}?preview=1` in new tab) · Publish/Unpublish · Duplicate · Archive (soft, with `confirmModal`).
**Badges** (`AdminBadge`): Draft · Published · Featured · Confidential · **Missing media** · **Broken links** (computed from `project_links.status`/validation).
**Bulk actions** (checkbox column): Publish selected · Archive selected · Set featured · Reorder featured (drag handle on a featured-only view).

## 4. Create / edit form - tabbed
First save (new) only needs **Basics** (title, slug, summary, type) → creates a `draft`, then redirects to the full tabbed editor. Manual save per tab (autosave deferred). Reuse `form-guard` for unsaved-changes protection.

### Tab 1 - Basics
title*, slug* (auto-suggested from title, uniqueness-checked live), subtitle, summary* (≤ 280), description (short), `project_type`*, `project_scope`, year, `client_name` (+ "confidential" toggle), role, status, visibility (`is_public`, `is_confidential`).

### Tab 2 - Case Study
Rich-text (TipTap → sanitized HTML): `problem`, `solution`, `contribution`, `architecture_notes`, `result_summary`, plus a repeatable **`project_sections`** editor (type, title, body, sort_order, is_visible) for custom blocks. Drag to reorder.

### Tab 3 - Media Carousel
The **media manager** (§5).

### Tab 4 - Tech Stack
Attach tech from the `tech_stacks` taxonomy via `MultiDropdown`; mark `is_primary`; drag to set `sort_order`. "Create new tech" inline (writes `tech_stacks`). No free-text comma lists.

### Tab 5 - Links & SEO
**Links manager** (§6) + SEO: `og_image_id` (pick from media), meta preview (title/description as they'll render), canonical preview.

### Tab 6 - Publish
Pre-publish checklist (§8 validation) with pass/fail; Publish / Unpublish / Schedule (`published_at`); Archive. Shows what's blocking publish.

## 5. Media manager (`media_assets` + `project_media`)
- Upload via existing `lib/upload.ts` (R2). On upload, create a `media_assets` row (filename, url, mime, width/height, size, optional blurhash) and a `project_media` link row.
- Per item: `media_type` (screenshot/video/architecture_diagram/logo/cover/og), `device_frame` (phone/tablet/desktop/browser/none), `title`, `caption`, **`alt_text`** (required for public), `is_featured`, `is_visible`, `sort_order`.
- **Drag-to-reorder** = carousel order on the public page (single source of truth - no hardcoded order).
- Set cover / OG from here (writes `projects.cover_image_id` / `og_image_id`).
- Validation: public publish blocked if any visible public media lacks `alt_text`.

## 6. Project links manager (`project_links`)
- Rows: `label`, `url`, `link_type` (source/demo/app_store/play_store/case_study/contact/private), `is_public`, `status` (active/hidden/disabled), `sort_order`.
- **URL validation** on save (format) + optional reachability check (best-effort HEAD via an admin action; failures flag the link `Broken links` badge but never auto-delete).
- This table is the durable replacement for the Phase 0 `PROJECT_LINK_OVERRIDES` stopgap.

## 7. Tech stack manager (`/admin/tech-stacks`)
DataTable of `tech_stacks`: name (unique), category, proficiency, icon, color. Create/edit/delete (delete blocked if referenced by a project - show usage count).

## 8. Validation rules
**Always:** title required; slug required, unique, `^[a-z0-9-]+$`; summary required.
**To publish (`status=published`):** ≥ 1 tech stack; cover image recommended (warn, not block); every visible public media has alt text; no `active` public link is known-broken; confidential projects have a sanitized public summary. `published_at` set on first publish.
Client-side mirrors server-side Zod; server is authoritative.

## 9. Deletion / archive behavior
- Default destructive action is **Archive** (soft): sets `archived_at`, removes from public API, keeps the row. Reversible.
- Hard **Delete** is a separate, double-confirmed action (`confirmModal` danger). Cascades `project_*` child rows; `media_assets` are *not* deleted (shared library) but their `project_media` links are.
- No content is ever silently lost.

## 10. Preview workflow
- "Preview" opens `/projects/{slug}?preview=1` in a new tab. With `preview=1` + a valid admin session, the public page renders **draft/unpublished/confidential** content (server checks auth; never exposes preview to anonymous users).
- Preview banner indicates non-public state.

## 11. Audit log behavior (`audit_logs`)
- Every admin mutation (create/update/publish/unpublish/archive/delete/media/link/tech changes) writes an `audit_logs` row: `actor_id`, `action`, `entity_type`, `entity_id`, `before_json`, `after_json`, `ip_address`, `user_agent`, `created_at`.
- Viewer (v2) at `/admin/audit-logs`, filterable by entity/actor/action. Write-side ships first (cheap, valuable); UI can follow.

## 12. Acceptance criteria
- [ ] Create draft → edit across tabs → publish, all from admin, no manual DB edits.
- [ ] Carousel order set by drag persists and drives the public page.
- [ ] Tech stack is normalized (no comma strings).
- [ ] Publish is blocked when required fields/alt text/links fail validation, with clear messaging.
- [ ] Archive hides from public and is reversible; hard delete is double-confirmed.
- [ ] Preview shows unpublished content only to authenticated admin.
- [ ] Every mutation produces an audit log row.
