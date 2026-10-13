# Quotes Module Spec

**Status:** Draft (agent-ready) - **not implemented**. No open decisions (2026-10-08: categories are dynamic free text, `displayOrder` dropped, full scope).
**Repos:** `portfolio-astro` (this repo, frontend) + `hono-workers` (backend - implemented in its own session/repo; specified here, never edited from this repo).
**Read alongside:** `API_CONTRACT.md`, `docs/specs/backend-content-api-spec.md`, `STYLE.md`.
**Reuses existing primitives:** `src/layouts/` (`PublicLayout.astro`, `PrivateLayout.astro`); `src/components/layout/` (`SectionHeader.astro`, `Navbar.astro`, `Footer.astro`, `CommandPalette.astro`); `src/components/admin/` (`AdminSidebar.astro`, `AdminPageHeader.astro`); `src/components/ui/` (`DataTable`, `MultiDropdown`, `Select`, `AlertToast`, `admin/primitives` - `AdminBadge`, `RowActions`, `EditAction`, `DeleteAction`, `CellPrimary`, `CellSecondary`, `CellText`); `src/lib/` (`form-guard.ts`, `admin-ui.ts` - `showToast`, `confirmDialog`); `window.confirmModal`.

> **For the implementing agent:** read §0 first. This doc is the contract - if reality forces a deviation, update this doc (and its Status) in the same change instead of silently drifting. Report status strictly (DONE / PARTIAL / BLOCKED / NOT DONE).

A standalone content module: a curated quotes collection at `/quotes`, managed from `/admin/quotes`, with a shared tag taxonomy (`/admin/quote-tags`) modelled on the existing **tech stack ("skill table") pattern**: a `quote_tags` table where each row is a specific tag (`naruto`, `muqaddimah`, `motivasi`) carrying a broad **category** - free text slug typed by the admin (e.g. `personal`, `anime`, `books`); no category table, no code constant. A quote links many tags; the public page filters by category.

---

## 0. Agent guide

### 0.1 Context in 30 seconds

- Astro SSR site (`output: 'server'`, Cloudflare adapter) + React islands + Tailwind v4; admin under `/admin` (PrivateLayout).
- Public pages fetch at request time via raw-`fetch` loaders in `src/lib/public-content.ts`. Content pages that opt out of fallback (like `/blog`, and `/quotes` here) render a friendly empty state instead - visitors never see loading spinners or errors.
- Admin pages fetch client-side through service classes extending `ApiClient` (`src/lib/api-client.ts`) - the Worker cannot forward the auth cookie during SSR. Writes throw; GET 404 returns `null`.
- Backend is a **separate repo** (`hono-workers`, Hono + D1 on Cloudflare Workers). Its work is specified in §3; it is not implemented from this repo.
- The tag/attach pattern to copy is the tech-stack taxonomy: `TechStacksManager.tsx` (manager page) + `TechManager.tsx` (attach/inline-create UI) + `owner/tech-stacks` endpoints.

### 0.2 Who reads what

| Session | Read first | Build from | Copy templates |
|---|---|---|---|
| Backend (`hono-workers`) | §2, §3 | Phase 1 (§8) | existing blog/experiences routes; tech-stack taxonomy = `services/tech-stacks.ts` + the `/tech-stacks` handlers inside `routes/v1/owner/project-children.ts` |
| Frontend data layer | §2, §4 (loader), §5 (service) | Phase 2 | `src/lib/experiences.ts`, `src/lib/projects-cms.ts` (tech-stack methods), `src/lib/public-content.ts` |
| Public `/quotes` | §4 | Phase 3 | `src/pages/blog/index.astro` (empty state + rows); filter sketch in §4 |
| Admin quotes | §5 | Phase 4 | `src/pages/admin/experiences/*`, `src/components/admin/experiences/*` |
| Admin tag manager | §5.3 | Phase 4 | `src/components/admin/TechStacksManager.tsx` + `src/pages/admin/tech-stacks/index.astro` |
| End-to-end verify | §9 | Phase 5 | - |

### 0.3 Ground rules (hard)

- **No:** slug/detail pages, status/draft workflow, seed migration, fallback fixture, image fields, public search/pagination, filter query params, inline tag-create in the quote form (deferred), manual ordering (`displayOrder`), a category table or category constant, new dependencies.
- **Categories are dynamic:** a slug string on the tag row (`^[a-z0-9-]{1,30}$`, normalised lowercase, default `other`). The set of categories = distinct values across tags. Nothing to keep in sync between repos.
- **Tag names are unique** (case-insensitive duplicate check, client + server) and admin-managed; renaming a tag updates every quote automatically (tags are referenced by id).
- **Reuse only the listed primitives**; no ad-hoc classes - styling follows `STYLE.md`.
- Touch only the files listed in §4-§6 (plus the spec/TODO if a deviation is agreed).
- Run the §8 **Verify** steps before claiming a phase done.

### 0.4 Status ledger

| Layer | Status |
|---|---|
| Spec | ✅ this document |
| Tag category model | ✅ decided - dynamic free-text slug on the tag row (§2.2) |
| Backend: migrations / validators / services / routes (quotes + tags) | ✅ local (2026-10-08, branch `feat/quotes-module`, uncommitted): type-check clean, 016 migrated locally, all §3.5 items exercised incl. 401/403/CSRF/cascade/audit |
| Backend remote migrate / deploy | ❌ not started |
| Frontend: types / services / loader | ✅ (2026-10-08) build + `astro check` clean |
| Public `/quotes` + nav wiring | ⚠️ SSR verified against local API (empty state, order, chips, tag order, sitemap URL); chip click / no-JS not browser-tested |
| Admin quotes CRUD + tag manager + sidebar wiring | ⚠️ builds; not browser-tested (CRUD UI round trip pending) |
| End-to-end verification | ❌ not started |

Do not upgrade a ❌ without the matching §8 verification actually run.

## 1. Scope & principles

- Public surface is **one list page** `/quotes`. No detail routes, no slug.
- Quotes are **plain text** - no rich HTML, no images.
- Taxonomy (researched standard, §2.2): **broad categories + specific tags**. The broad dimension lives on the tag row (`category`), exactly like tech stacks; a quote can span categories through its tags.
- SSR; an empty dataset renders a blog-style empty state - **no curated fallback fixture** for this module.
- Category filtering happens **client-side over already-rendered rows** - no API parameters, no re-fetch, cached SSR output stays intact.

**Out of scope (YAGNI):** detail pages / slugs, draft-published workflow, seed data, fallback quotes, image fields, public search or pagination, URL-synced filters, tag-level public filtering (v1 filters by category only), inline tag creation inside the quote form, random/featured quote widget, i18n.

## 2. Data model

### 2.1 Records

Naming contract (source of truth for every layer):

| UI label | DTO field | D1 column | Rules |
|---|---|---|---|
| Quote text | `text` | `text` | string, 1-500, required |
| Author | `author` | `author` | string, 1-120, required |
| Source | `source` | `source` | string, ≤120, nullable; empty string → `null` |
| Tags | `tags` / `tagIds` | via `quote_tag_links` | read: embedded `tags: QuoteTag[]`; write: `tagIds: number[]` (full replace) |
| - | `id` | `id` | server-owned |
| - | `createdAt` / `updatedAt` | `created_at` / `updated_at` | server-owned ISO strings |
| Tag name | `name` | `quote_tags.name` | string, 1-60, required, unique (case-insensitive) |
| Tag category | `category` | `quote_tags.category` | slug `^[a-z0-9-]{1,30}$`, trimmed + lowercased, default `other` (§2.2) |

TypeScript (`src/types/quotes.ts`, mirrors `src/types/experiences.ts` + `TechStack` in `src/types/project-cms.ts`):

```ts
export interface QuoteTag {
    id: number;
    name: string;
    category: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface Quote {
    id: number;
    text: string;
    author: string;
    source: string | null;
    tags: QuoteTag[];
    createdAt: string;
    updatedAt: string;
}

export interface CreateQuotePayload {
    text: string;
    author: string;
    source?: string | null;
    tagIds?: number[];
}

export type UpdateQuotePayload = Partial<CreateQuotePayload>;

export interface QuoteTagInput {
    name?: string;
    category?: string | null;
}
```

D1 migration `src/database/migrations/016_quotes.sql` (next after `015_visits_and_counters.sql`; canonical schema `src/database/schemas/quotes.sql`; shape only - align with the backend repo's existing table/migration conventions):

```sql
CREATE TABLE IF NOT EXISTS quotes (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    text          TEXT NOT NULL,
    author        TEXT NOT NULL,
    source        TEXT,
    created_at    TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS quote_tags (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL UNIQUE COLLATE NOCASE,
    category   TEXT NOT NULL DEFAULT 'other',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS quote_tag_links (
    quote_id INTEGER NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
    tag_id   INTEGER NOT NULL REFERENCES quote_tags(id) ON DELETE CASCADE,
    PRIMARY KEY (quote_id, tag_id)
);
CREATE INDEX IF NOT EXISTS idx_quote_tag_links_tag ON quote_tag_links (tag_id);
CREATE INDEX IF NOT EXISTS idx_quotes_created ON quotes (created_at DESC);
```

- **No seed migration.** All content and tags are created through the admin; the public page shows the empty state until then.
- No status column, no slug, no manual order; quotes list newest first; a quote's tags are returned ordered by name (case-insensitive) - deterministic for rendering.

### 2.2 Tag categories (dynamic, decided 2026-10-08)

Research check (2026-10): the professional standard is **both** - broad categories for structure, specific tags for detail ([WordPress.com](https://wordpress.com/support/posts/categories-vs-tags/), [Crocoblock](https://crocoblock.com/blog/difference-between-taxonomies-categories-and-tags/)). This module implements that the **tech-stack way**: one taxonomy (`quote_tags`), where the broad grouping is the `category` column on the tag row - no second per-quote category field.

Categories are **admin-typed free text**, not a table and not a code constant:

- Stored as a slug: trimmed, lowercased, `^[a-z0-9-]{1,30}$` (no spaces - the public filter splits `data-quote-category` on spaces). Client lowercases and turns spaces into `-` before sending; server is authoritative.
- Missing/empty → `other`.
- The category list anywhere (admin grouping, public chips, form suggestions) = distinct `category` values of existing tags. A category disappears when no tag uses it.
- Suggestions: tag manager inputs use a native `<input list="quote-tag-categories">` + `<datalist>` built from existing categories - no dropdown component.
- UI label = slug with `-` → space and first letter capitalised (`self-help` → `Self help`); null groups under "Other".
- Renaming a category = editing each tag that uses it (accepted: tag count is small). <!-- ponytail: no category table; add `quote_tag_categories` only if bulk rename / per-category ordering is ever needed -->

Starting suggestions (not enforced): `personal`, `anime`, `books`, `history`, `work`, `other`.

## 3. Backend specification (for the backend agent)

Repo: `hono-workers`, branch off `main`. Follows `API_CONTRACT.md` + `backend-content-api-spec.md` (§1-2 envelope/auth, §5 validation). The tag endpoints mirror the existing `owner/tech-stacks` taxonomy routes.

### 3.1 Routes

| Method | Path | Notes |
|---|---|---|
| GET | `/api/v1/quotes` | public: full list, ordered `created_at DESC, id DESC`, each quote embeds `tags`; `Cache-Control: public, max-age=60, stale-while-revalidate=600` |
| GET | `/api/v1/owner/quotes` | admin list (same DTO) |
| GET | `/api/v1/owner/quotes/:id` | single; 404 envelope when missing |
| POST | `/api/v1/owner/quotes` | create → **201** |
| PATCH | `/api/v1/owner/quotes/:id` | partial update (`tagIds` replaces the full link set) |
| DELETE | `/api/v1/owner/quotes/:id` | hard delete (link rows cascade) |
| GET | `/api/v1/owner/quote-tags` | tag list (full `QuoteTag` rows) |
| POST | `/api/v1/owner/quote-tags` | create → **201**; duplicate name → 400 |
| PATCH | `/api/v1/owner/quote-tags/:id` | rename / recategorise |
| DELETE | `/api/v1/owner/quote-tags/:id` | delete; link rows cascade (removed from any quote that used it) |

All `/api/v1/owner/*` routes require `jwtAuth` + `requireAdmin` (existing owner-router middleware); mutations are CSRF/Origin-checked and audit-logged.

Files to add: `src/routes/v1/public/quotes.ts`, `src/routes/v1/owner/quotes.ts` (quotes **and** `/quote-tags` handlers in one router - same as tech-stacks living in `project-children.ts`), `src/validators/quotes.ts`, `src/services/quotes.ts`, migration `src/database/migrations/016_quotes.sql`, schema `src/database/schemas/quotes.sql`. Register in `src/routes/v1.ts` next to blog/experiences; export from `services/index.ts` / `validators/index.ts` like siblings.

### 3.2 Public list DTO

```jsonc
{
  "success": true,
  "data": [
    {
      "id": 1,
      "text": "The best way out is always through.",
      "author": "Robert Frost",
      "source": "A Servant to Servants",          // nullable
      "tags": [                                    // embedded; ordered by name
        { "id": 3, "name": "muqaddimah", "category": "books" }
      ],
      "createdAt": "2026-10-06T00:00:00.000Z",
      "updatedAt": "2026-10-06T00:00:00.000Z"
    }
  ]
}
```

Public tag shape = `{ id, name, category }` (no timestamps); owner tag list returns the full `QuoteTag`.

### 3.3 Validation (Zod `.strict()` + shared `parse` helper)

```ts
const categorySlug = z.string().trim().toLowerCase().regex(/^[a-z0-9-]{1,30}$/);

export const QuoteCreateSchema = z.object({
    text: z.string().trim().min(1).max(500),
    author: z.string().trim().min(1).max(120),
    source: z.string().trim().max(120).optional().nullable(),
    tagIds: z.array(z.number().int().positive()).max(20).default([]),
}).strict();
// Quote update = all fields optional; `tagIds` (when present) replaces the full set.

export const QuoteTagCreateSchema = z.object({
    name: z.string().trim().min(1).max(60),
    category: categorySlug.default("other"),
}).strict();
// Tag update = partial; unknown ids in `tagIds` → 400 { field: "tagIds" }.
```

- Empty-string `source` maps to `null` (blog cover-image precedent).
- Missing / `""` / `null` `category` → `other`; responses always carry a string category.
- Shared `parse` helper (`validators/common.ts`) reports the first unknown key as `field` for `.strict()` errors (applies to every module; additive).
- Deleting a tag still used by quotes is allowed (links cascade) - unlike tech-stacks, which refuses.
- Duplicate tag name (case-insensitive) → `400 { field: "name" }`; `:id` parsed with `parseIdParam`.
- Every mutation writes an `audit_logs` row; CSRF `Origin` check applies via existing middleware.

### 3.4 Behavior details

- Ordering and caching exactly as §3.1; **no query parameters** in v1 (filtering is client-side).
- Tag rename/recategorise propagates automatically (quotes read tags by id).
- Deleting a tag removes its link rows only; quotes themselves are untouched.
- `updated_at` refreshed on every update; `created_at` immutable.
- Public DTO is exactly §3.2 - no extra/internal fields.

### 3.5 Verify (local)

- `db:migrate` locally, then exercise all 10 routes with the repo's dev script/curl.
- Create tags, attach two to a quote → public `/quotes` payload embeds both, ordered by name; rename a tag → reflected; delete a tag → gone from quotes, quote rows remain.
- Unknown key in POST body → `400` with `field`; over-length `text` → `400`; duplicate tag name → `400 { field: "name" }`; unknown `tagIds` id → `400`.
- Owner route without a session → 401; with a non-admin session → 403.

## 4. Public page `/quotes`

| File | Action |
|---|---|
| `src/pages/quotes.astro` | **create** - SSR list page |
| `src/lib/public-content.ts` | extend - add `getPublicQuotes()` |
| `src/components/layout/Navbar.astro` | extend - link + active-path branch |
| `src/components/layout/Footer.astro` | extend - "Writing" column link |
| `src/components/layout/CommandPalette.astro` | extend - Pages entry |

**Page contract**

- `export const prerender = false;` + `PublicLayout` (title `Quotes | Hafiz Bahtiar`, one-line description).
- Header via `SectionHeader` (`eyebrow="Quotes"`, `as="h1"`, description).
- Empty state (blog-style, mirrors `src/pages/blog/index.astro`): when `quotes.length === 0`, render one message row instead of the grid.
- Grid: `.row-grid` (1 → 2 → 3 columns, full-bleed row hairlines). Each quote is a `<figure data-quote-category={categories.join(" ")}>`:
  - `<blockquote>` - quote text, `whitespace-pre-line`, Astro-escaped;
  - `<figcaption>` - author (primary), `source` (secondary, when present);
  - tags: tag names as small mono labels (`title` = category), unique categories per quote computed as `quote.tags.map((t) => t.category ?? "other")`.

**Loader** - `getPublicQuotes()` in `src/lib/public-content.ts`:

- `(await fetchJson<Quote[]>("quotes")) ?? []` - same contract as `getPublicPosts()` (blog): returns `[]` on failure, the page renders the empty state;
- trusts the API order (`createdAt DESC`); no client re-sort.

**Category filter (client-side, no refetch)**

- Chips rendered from the distinct categories present in the rendered quotes' tags (dynamic - no constant, no empty chips), sorted alphabetically with "Other" last, "All" first; labels per §2.2.
- `<button type="button" aria-pressed>` inside a `role="group"` labelled `Filter quotes by category`; chips styled as the site's grey pills, active state sky-tinted.
- Reference sketch (adapt classes to `STYLE.md`; re-init on `astro:page-load` is safe because navigation replaces the DOM):

```html
<div role="group" aria-label="Filter quotes by category">
  <button type="button" data-quote-filter="all" aria-pressed="true">All</button>
  {presentCategories.map((cat) => (
    <button type="button" data-quote-filter={cat} aria-pressed="false">{label(cat)}</button>
  ))}
</div>
```

```ts
const initQuoteFilter = () => {
  const chips = document.querySelectorAll<HTMLButtonElement>("[data-quote-filter]");
  const quotes = document.querySelectorAll<HTMLElement>("[data-quote-category]");
  if (!chips.length) return;
  const apply = (cat: string) => {
    chips.forEach((c) =>
      c.setAttribute("aria-pressed", String(c.dataset.quoteFilter === cat)),
    );
    quotes.forEach((q) => {
      const cats = (q.dataset.quoteCategory ?? "").split(" ").filter(Boolean);
      q.hidden = cat !== "all" && !cats.includes(cat);
    });
  };
  chips.forEach((c) =>
    c.addEventListener("click", () => apply(c.dataset.quoteFilter ?? "all")),
  );
};

initQuoteFilter();
document.addEventListener("astro:page-load", initQuoteFilter);
```

- A quote shows under every category one of its tags carries; untagged quotes appear under "All" only.
- Progressive enhancement: without JS every quote stays visible; chips keep the server-rendered default state (`All` active).
- Filtering must issue **zero network requests** (verify in devtools).

**SEO**

- Sitemap: no config change - `@astrojs/sitemap` enumerates path-based routes (it already lists `/blog/` and `/projects/`); `/quotes` is not in `SITEMAP_EXCLUDE`.

## 5. Admin

### 5.1 Quotes CMS `/admin/quotes`

| File | Action |
|---|---|
| `src/types/quotes.ts` | **create** |
| `src/lib/quotes.ts` | **create** - `QuotesService extends ApiClient` |
| `src/pages/admin/quotes/index.astro` | **create** |
| `src/pages/admin/quotes/new.astro` | **create** |
| `src/pages/admin/quotes/edit.astro` | **create** (`?id=`) |
| `src/components/admin/quotes/QuotesTable.tsx` | **create** |
| `src/components/admin/quotes/QuoteForm.astro` | **create** |

Template copy map:

| Create | Copy from | Change |
|---|---|---|
| `QuotesTable.tsx` | `ExperiencesTable.tsx` | columns (Quote + author, Tags badges, Source, Actions), service calls, empty copy, delete toast wiring |
| `QuoteForm.astro` | `ExperienceForm.astro` | fields per table below; drop DateInput / TextEditor / MapPicker; add Tags `MultiDropdown` |
| `index.astro` | `experiences/index.astro` | titles, button href `/admin/quotes/new`, table component, mount `<AlertToast id="admin-alert" />` |
| `new.astro` / `edit.astro` | `experiences/new.astro`, `edit.astro` | form component, service methods, normalize map, alert id (`quote-alert`), redirect to `/admin/quotes` |
| `src/lib/quotes.ts` | `src/lib/experiences.ts` + tech-stack methods in `src/lib/projects-cms.ts` | method names + endpoints |

**Service:** quotes - `getAdminQuotes()`, `getAdminQuoteById(id)`, `createQuote(data)`, `updateQuote(id, data)` (`this.patch`), `deleteQuote(id): Promise<boolean>` (try/catch); tags - `listQuoteTags(): Promise<QuoteTag[]>`, `createQuoteTag(data)`, `updateQuoteTag(id, data)` (`this.patch`), `deleteQuoteTag(id)`. Endpoints `owner/quotes`, `owner/quote-tags` (+ `/:id`). ApiClient contract: writes throw on failure; GET 404 → `null`.

**Table:** columns Quote (truncated text, author as `CellSecondary`), Tags (up to 3 `AdminBadge` + `+n`), Source, Actions (`RowActions` + `EditAction` → `/admin/quotes/edit?id=`, `DeleteAction`). Delete confirms with `confirmDialog()`, removes the row from local state on success, `showToast()` on failure. Shared `DataTable` supplies search/sort/pagination; `emptyTitle="No quotes yet"`.

**Form fields:**

| Field | Control | Rules |
|---|---|---|
| Quote text | `<textarea name="text" required>` | 1-500 chars; red `*` comes from the global `label:has(+ :required)` rule - never add one manually |
| Author | `<input name="author" required>` | 1-120 chars (auto red `*`) |
| Source | `<input name="source">` + `admin-help` | optional, ≤120; empty → `null` |
| Tags | `MultiDropdown` (`name="tagIds"`, `values` = ids) | optional; many; options are all tags, label `${name} · ${categoryLabel}` |

**Flows:**

- Props: `submitLabel`, `submitButtonId = "submit-btn"`.
- new/edit pages clone the experiences flow: `setupFormGuard(form)`, normalize `FormData` (trim; `""` → `null`; `tagIds` via the existing `parseJsonArray` helper → number array), service call, map `error.data.field` to focus + error toast, `formGuard.updateInitialState()` + toast + redirect on success.
- **Tag options are client-side data**: before submitting/hydrating, populate the MultiDropdown list from `quotesService.listQuoteTags()` using the `updateProjectOptions()` technique in `experiences/new.astro` (`.tech-multi-dropdown-container[data-name="tagIds"]` → rebuild `<li><button class="dropdown-item" data-value="…">` → `window.setupMultiDropdowns?.()`). Empty list → show a `admin-help` line linking to `/admin/quote-tags`.
- edit hydration order: populate tag options first, then `setMultiDropdownValues("tagIds", quote.tags.map(t => t.id))` (same helper as `experiences/edit.astro`), then `formGuard.updateInitialState()`.

### 5.2 Tag manager `/admin/quote-tags`

| File | Action |
|---|---|
| `src/pages/admin/quote-tags/index.astro` | **create** |
| `src/components/admin/quotes/QuoteTagsManager.tsx` | **create** |

- Clone `src/pages/admin/tech-stacks/index.astro` (`PrivateLayout`, `AdminPageHeader`, `<AlertToast id="admin-alert" />`) and `TechStacksManager.tsx`, adapting:
  - `cmsService` → `quotesService` (tag methods); `TechStack` → `QuoteTag`; drop `TechCategory` enum and `proficiency` (name + category only).
  - One `<datalist id="quote-tag-categories">` built from the distinct categories of the loaded tags.
  - Add card: name input (`placeholder="e.g. naruto"`) + category `<input list="quote-tag-categories" placeholder="e.g. anime">` (normalise per §2.2) + Add.
  - List grouped by the distinct categories present (`label()` per §2.2, null → "Other", "Other" last), rows: name input (autosave on blur, case-insensitive duplicate guard), category input with the same datalist (autosave on blur), delete (`confirmDialog`, message: `Delete "…"? It is also removed from any quote that uses it.`).
  - Search + empty copy; help text: `Shared across all quotes - name + category.`
- No inline create inside `QuoteForm` in v1 (link to this page instead).

## 6. Wiring

| Surface | Change |
|---|---|
| `AdminSidebar.astro` | add `{ text: "Quotes", href: "/admin/quotes", icon: Quote }` and `{ text: "Quote Tags", href: "/admin/quote-tags", icon: Tags }` after Blog; widen the Content group slice `links.slice(1, 7)` → `links.slice(1, 9)` |
| `Navbar.astro` | add `{ text: "Quotes", href: "/quotes", reload: false, spy: "quotes" }` after Blog; extend the active-link check with a `/quotes` branch (mirrors the `/blog` branch) |
| `Footer.astro` | "Writing" column: add `{ text: "Quotes", href: "/quotes" }` |
| `CommandPalette.astro` | Pages: add `{ label: "Quotes", hint: "/quotes", href: "/quotes", keywords: "quotes sayings anime books history" }` |
| `astro.config.mjs` | none |
| `src/middleware.ts` | none - the `/admin/*` guard already covers both admin routes |

`Quote` and `Tags` icons exist in lucide-react (same import block as the other sidebar icons).

## 7. Security & privacy

- Owner routes (quotes + tags) behind `jwtAuth` + `requireAdmin`; mutations CSRF/Origin-guarded and audit-logged (backend side).
- Public payload contains exactly what the page renders - nothing internal beyond the §3.2 DTO.
- Plain-text storage and Astro escaping: no HTML injection surface; no sanitization library needed.
- Length caps enforced server-side (authoritative) and mirrored client-side; `tagIds` validated against existing tags.

## 8. Implementation phases (later sessions)

### Phase 1 - Backend (`hono-workers` session)

- **Files:** `src/database/migrations/016_quotes.sql` (3 tables), `src/database/schemas/quotes.sql`, `src/validators/quotes.ts`, `src/services/quotes.ts`, `src/routes/v1/public/quotes.ts`, `src/routes/v1/owner/quotes.ts` (quotes + quote-tags), registration in `src/routes/v1.ts`.
- **Template:** `routes/v1/{public,owner}/experiences.ts`, `services/experiences.ts`, `validators/experiences.ts`; tag CRUD from `services/tech-stacks.ts` + `/tech-stacks` handlers in `routes/v1/owner/project-children.ts`.
- **Verify:** §3.5 checklist (migrate local, all routes, strict rejection, duplicate tag name, auth guards, ordering, cascade on tag delete).
- **Done when:** all §3.5 items pass and the backend half of §9 item 5 holds.

### Phase 2 - Frontend data layer

- **Files:** create `src/types/quotes.ts`, `src/lib/quotes.ts`; extend `src/lib/public-content.ts` (`getPublicQuotes`).
- **Template:** `src/lib/experiences.ts`, tech-stack methods in `src/lib/projects-cms.ts`, `getPublicPosts` in `src/lib/public-content.ts`.
- **Verify:** `npm run build` clean.
- **Done when:** build passes; types/services/loader importable by later phases.

### Phase 3 - Public page + nav wiring

- **Files:** create `src/pages/quotes.astro`; extend `Navbar.astro`, `Footer.astro`, `CommandPalette.astro`.
- **Template:** `src/pages/blog/index.astro` (empty state + row layout); filter sketch §4.
- **Verify:** `npm run build`; with **no data** → blog-style empty state renders; with tagged data (local API or manual fixtures in dev) → category chips filter with zero network requests (devtools); JS disabled → all quotes visible.
- **Done when:** §9 items 1-2 hold.

### Phase 4 - Admin quotes + tag manager + sidebar wiring

- **Files:** create `src/pages/admin/quotes/{index,new,edit}.astro`, `src/components/admin/quotes/{QuotesTable.tsx,QuoteForm.astro}`, `src/pages/admin/quote-tags/index.astro`, `src/components/admin/quotes/QuoteTagsManager.tsx`; extend `AdminSidebar.astro`.
- **Template:** `src/pages/admin/experiences/*`, `src/components/admin/experiences/*`, `TechStacksManager.tsx` + `tech-stacks/index.astro`.
- **Verify:** `npm run build`; CRUD round trip against the local backend: create tag → attach two tags to a quote → rename tag reflects → delete tag removes it from quotes; empty-field validation toast; delete confirm modals.
- **Done when:** §9 items 3-4 hold.

### Phase 5 - End-to-end

- **Verify:** create/edit/delete in admin → `/quotes` reflects after ≤60 s (cache TTL); category chips match data; `npm run build`; built sitemap contains `https://hafizbahtiar.com/quotes/` (check `dist/client/sitemap-*.xml`).
- **Done when:** all §9 items hold.

## 9. Acceptance criteria

- [ ] `/quotes` renders all quotes SSR, each with author/source/tags; empty dataset → blog-style empty state (no loading/error).
- [ ] Category chips filter instantly client-side; a quote appears under every category its tags carry; all quotes visible without JS; `aria-pressed` correct.
- [ ] `/admin/quotes` CRUD works; tag multi-select populated from the tag library; validation errors map to the right field; delete is confirmed.
- [ ] `/admin/quote-tags` supports add / rename / recategorise (autosave) / delete with case-insensitive duplicate guard; deleting a tag removes it from quotes.
- [ ] Categories are dynamic (typed in the tag manager with datalist suggestions, invalid slug → 400 `{ field: "category" }`); null categories group under "Other" and never break rendering; public API returns only the §3.2 DTO with owner routes auth-guarded and audited.
- [ ] `npm run build` passes; `/quotes` appears in the sitemap; no other page changes behavior.
