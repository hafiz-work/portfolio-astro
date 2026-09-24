# Family Module - Architecture

> Technical architecture, end-to-end data flow, module boundaries, and a file-by-file map.
> Companion to `../brain/family-module-brain.md` (context) and
> `../brain/family-module-agent-rules.md` (rules). Paths without a repo prefix are in
> `portfolio-astro`; backend paths are in `hono-workers`.

---

## 1. Stack & boundaries

- **Frontend:** Astro 6 (`output: "server"`, `@astrojs/cloudflare`) + React 19 islands +
  Tailwind v4. Public family pages are `prerender = false` (fetch at request time).
- **Backend:** Hono on Cloudflare Workers + D1 (SQLite) + KV (cache). Web APIs only.
- **Library:** `family-chart@0.9.0` (d3-based tree layout/rendering).
- **Trust boundary:** the browser. Everything server-side may hold full data; only the sanitized
  `PublicFamilyTreeDetail` may cross into a React island.

---

## 2. End-to-end data flow

```
D1 (family_trees / family_people / family_relationships)
  │   SELECT (is_public = 1 gate for public reads)
  ▼
hono-workers FamilyService  ── full rows, NO field filtering ──┐
  │                                                            │  ⚠ public API
  ▼                                                            │  exposes full PII
Public API  GET /api/v1/family[, /:slug, /person/:id, ...]     │  (see brain §7)
  │   (KV cache 120s; HTTP cache 60s + swr 600s)               │
  ▼
Astro SSR frontmatter (prerender=false)
  src/lib/family.ts publicGet()  ── plain fetch, no cache-buster, no no-store ──
  │
  ├─ /family:  getPublicFamilyTrees() → N× getPublicFamilyTreeBySlug()
  │            → mergeFamilyTrees(details, COMBINED_FAMILY)   [full data]
  │
  ▼
sanitizeFamilyDetailForPublic()   ◀── PRIVACY BOUNDARY (frontend-only)
  │   → PublicFamilyTreeDetail (whitelist; living birth year-only; living death null)
  ▼
<FamilyExplorer client:load detail={...} />   [Astro serializes DTO into <astro-island props>]
  │
  ▼ (in browser)
buildChartData(detail)  → family-chart Data[]
  │
  ▼
useFamilyChart()  → createChart() + real d3 zoom (manualZoom/zoomTo)
  │
  ▼
family-chart SVG render  ←→  selection / search / deep link / zoom / fit / list fallback
  │
  ▼
PersonDetailPanel (desktop side panel + mobile bottom sheet)
```

**Why this shape:**
- SSR-in-frontmatter replaced an old **browser-side fetch waterfall** (the previous combined page
  did N+1 cross-tree fetches in the browser). One server-side fetch+merge is faster, avoids the
  waterfall, and - crucially - lets us sanitize **before** serialization.
- The sanitizer exists because the **backend returns full rows** (privacy is enforced here, on the
  way into the island). See brain §7 for the gap this leaves at the raw-API layer.

---

## 3. Interaction model (frontend internals)

- **Selection:** `FamilyExplorer.selectPerson(id, {center, openSheet})` drives `selectedId`
  (single source of truth), URL `?p=`, optional chart centering, optional mobile sheet.
- **Deep link:** `resolveDeepLink()` reads `?p=` → globalKey (case-insensitive) then numeric id →
  fails safe to `null`.
- **URL sync:** `syncUrl()` writes `?p = globalKey || id` via `replaceState` (prefers globalKey).
- **Chart control API** (`FamilyChartApi`, from `useFamilyChart`): `setMain`, `zoomIn`, `zoomOut`,
  `fit`, `resetView`, `centerMain`, `setOrientation` - handed to the toolbar via `apiRef`.
- **List fallback:** `view === "list"` renders `FamilyListView` (keyboard-accessible) instead of the
  canvas; toolbar chart controls disable in list mode.
- **Reduced motion:** transition time forced to 0.

## 4. Admin vs public (module boundary)

- **Public** is read-only, props/state-driven, sanitized. Root `FamilyExplorer.tsx`, chart via
  `useFamilyChart`/`FamilyTreeCanvas`.
- **Admin** is authenticated CRUD. Root `FamilyTreeBuilder.tsx` (new/edit) / `FamilyTreesTable.tsx` (index), chart via the
  **legacy** `FamilyTreeChart.tsx`, controlled by **window events** and supporting inline add/edit
  through `chart.editTree()`.
- **Shared** code: `chart-data.ts` (transform), `FamilyTreeChart.tsx` (admin chart), family types.
  Touching shared code requires an admin smoke test.

---

## 5. File map (frontend - `portfolio-astro`)

| Path | Role | Notes |
|---|---|---|
| `src/pages/family/index.astro` | public-only | Combined `/family`. SSR fetch → merge → sanitize → island. |
| `src/pages/family/[slug]/index.astro` | public-only | Single tree. SSR fetch → sanitize → island; 404 handling. |
| `src/components/family/FamilyExplorer.tsx` | public-only | Island root: state, deep link, URL sync, selection. |
| `src/components/family/FamilyTreeCanvas.tsx` | public-only | Wraps `useFamilyChart`; `role="application"`. |
| `src/components/family/FamilyToolbar.tsx` | public-only | Search + view toggle + zoom/fit/reset/center/orientation (aria-labeled). |
| `src/components/family/FamilyListView.tsx` | public-only | Keyboard-accessible list fallback. |
| `src/components/family/PersonDetailPanel.tsx` | public-only | Desktop panel + mobile bottom sheet (dialog, Esc, focus mgmt). |
| `src/components/family/PersonSearch.tsx` | public-only | ARIA combobox, keyboard nav. |
| `src/components/family/FamilyTreeChart.tsx` | **shared/admin** ⚠ | Legacy chart; window-event contract; inline edit; real zoom. |
| `src/hooks/useFamilyChart.ts` | public-only ⚠ | Public chart lifecycle + d3 zoom; leak/duplicate-init risk. |
| `src/lib/chart-data.ts` | **shared** ⚠ | `buildChartData` used by public + admin. |
| `src/lib/family.ts` | shared service | `FamilyService` (public `publicGet` + admin Bearer methods) + helpers. |
| `src/lib/family-merge.ts` | public-only ⚠ | `mergeFamilyTrees`; identity invariants. |
| `src/lib/family-privacy.ts` | public-only ⚠ | `sanitizeFamilyDetailForPublic`; **privacy boundary**. |
| `src/lib/family-format.ts` | shared | `displayYear` (timezone-safe year). |
| `src/data/family.ts` | config | `COMBINED_FAMILY` (slug/name/desc/mainPersonGlobalKey). |
| `src/styles/family-chart-theme.css` | styling | Light/dark `.f3` theme; imported by `src/styles/index.css`. |
| `src/components/admin/family/FamilyTreeBuilder.tsx` | admin-only | Builder; passes `enableCrossTreeNavigation={false}` (no-op). |
| `src/components/admin/family/FamilyTreesTable.tsx` | admin-only | Trees table UI. |
| `src/pages/admin/family/{index,new,edit}.astro` | admin-only | Admin routes. |
| `docs/brain/*`, `docs/architecture/*` | docs-only | This memory brain. |

## 6. File map (backend - `hono-workers`)

| Path | Role | Notes |
|---|---|---|
| `src/routes/v1/public/family.ts` | public API ⚠ | `/`, `/:slug`, `/person/:id`, `/trees-by-global/:key`; KV cache; no field filtering. |
| `src/routes/v1/owner/family.ts` | admin API | `jwtAuth + requireAdmin`; CRUD. |
| `src/services/family.ts` | service ⚠ | `FamilyService` (public + admin); public reads gate on `is_public=1` only. |
| `src/types/family.ts` | types | `FamilyTree`/`FamilyPerson`/`FamilyRelationship`/`FamilyTreeDetail` + Create/Update. |
| `src/validators/family.ts` | validators | Zod `.strict()`; **no `globalKey` field** (not admin-settable). |
| `src/database/migrations/006_family_chart.sql` | schema | Tables + indexes. |
| `src/database/migrations/007_performance_indexes.sql` | schema | `global_key` index recreated `COLLATE NOCASE`. |
| `src/database/seeds/{004_setup_family,005_setup_basri,006_setup_hamid}.sql` | seed | Source of truth for `global_key`. |
| `scripts/migrate.js` | tooling | Migration runner (`schema_migrations`, idempotent ADD COLUMN). |

## 7. D1 schema (essentials)

```
family_trees(id PK, slug UNIQUE, name, description, is_public, created_by_user_id,
             default_main_person_id, created_at, updated_at)
family_people(id PK, tree_id FK→trees(CASCADE), first_name, last_name, display_name,
              global_key, gender CHECK(male|female|other|unknown), birth_date, death_date,
              is_living, photo_url, notes, metadata(TEXT json), created_at, updated_at)
family_relationships(id PK, tree_id FK, person_id FK, related_person_id FK,
              relationship_type CHECK(parent|child|spouse|sibling|adoptive_parent|adopted_child),
              is_primary, start_date, end_date, notes, created_at, updated_at,
              CHECK(person_id<>related_person_id),
              UNIQUE(tree_id, person_id, related_person_id, relationship_type))
```

Indexes on slug, created_by, default_main_person, people.tree_id, people.display_name,
people.global_key (NOCASE after 007), relationships.tree_id/person/related/type.

## 8. Caching

- **KV** (backend): `family_trees:list`, `family_tree_detail:${slug}`, TTL 120s. Malformed entries
  are purged, never 500. Bypass via `?noCache=1` or `Cache-Control: no-cache`.
- **HTTP** (backend): `Cache-Control: public, max-age=60, stale-while-revalidate=600` on public GETs.
- **Frontend** intentionally uses a plain `fetch` for public reads (no cache-buster, no `no-store`)
  so the backend KV/HTTP cache stays effective. Admin calls still use the authenticated `ApiClient`.
