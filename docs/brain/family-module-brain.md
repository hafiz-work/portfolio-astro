# Family Module - Memory Brain

> **Purpose.** This is the long-term "brain" for the Family module. If you are an AI
> agent (Opus/Codex/etc.) about to touch anything related to `/family`, read this first,
> then `family-module-agent-rules.md`, then `../architecture/family-module-architecture.md`.
> It exists so future sessions continue from accumulated understanding instead of
> re-deriving the module from scratch.
>
> **Honesty note.** Items are marked ✅ verified, ⚠️ partially verified / risky, or
> ❌ not tested. Do not upgrade these markers without doing the work.

---

## 0. Two repos, one module

| Concern | Repo | Path |
|---|---|---|
| Frontend (Astro + React island + family-chart) | `portfolio-astro` | `/Users/hafiz/Developments/portfolio-astro` |
| Backend (Hono + Workers + D1 + KV) | `hono-workers` | `/Users/hafiz/Developments/hono-workers` |

These docs live in the **frontend** repo (`docs/brain`, `docs/architecture`) but describe
**both** sides. Backend file paths below are relative to the `hono-workers` repo.

**API base URLs** (frontend `src/lib/config.ts`):
- Local: `http://localhost:8787/api/v1`
- Production: `https://api.hafizbahtiar.com/api/v1`
- (The `hono-workers.hafizbahtiar98.workers.dev` host is **not** the family API origin - it 404s.)

---

## 1. What the Family module is

A public, read-only family-tree explorer plus a private admin builder.

- **Public** `/family` - a synthetic **combined** tree merging every public family tree
  (currently 5: `azhari-family`, `bahtiar-family`, `basri-family`, `hafiz-family`,
  `hamid-family`), centered on `muhamad-nurhafiz`.
- **Public** `/family/[slug]` - a single public tree by slug.
- **Admin** `/admin/family`, `/admin/family/new`, `/admin/family/edit` - authenticated
  CRUD builder for trees / people / relationships, with an inline "add relative" canvas.

`/family` is intentionally **not linked from the public navbar** (privacy decision).

---

## 2. How `/family` (combined) works - exact sequence

File: `src/pages/family/index.astro` (`prerender = false`, SSR at request time).

1. `getPublicFamilyTrees()` → list of public `FamilyTree` (slug/name/etc.).
2. For each tree, `getPublicFamilyTreeBySlug(slug)` (parallel `Promise.all`) → full `FamilyTreeDetail`.
3. `mergeFamilyTrees(details, COMBINED_FAMILY)` (`src/lib/family-merge.ts`) → one synthetic combined `FamilyTreeDetail`.
4. `sanitizeFamilyDetailForPublic(merged)` (`src/lib/family-privacy.ts`) → `PublicFamilyTreeDetail` DTO. **This is the last step before the island and the privacy boundary.**
5. `<FamilyExplorer client:load detail={detail} ancestryDepth={6} progenyDepth={5} />`.
6. `trees[]` is *also* used to render server-side nav chips linking to each `/family/<slug>`. These chips render in HTML only (name + slug); the full `trees[]` objects are **not** passed into the island.
7. On any thrown error → `loadError = true` → red alert UI. If `details` is empty → "not available yet" empty state.

Merge happens on **full** (unsanitized) details so the merge can use `notes`/`metadata`/etc.
internally; sanitization strips them immediately afterward, so the browser never sees them.

## 3. How `/family/[slug]` works

File: `src/pages/family/[slug]/index.astro` (`prerender = false`).

1. `getPublicFamilyTreeBySlug(slug)` → `FamilyTreeDetail | null`.
2. If found → `sanitizeFamilyDetailForPublic()` → `<FamilyExplorer client:load detail={detail} />` (default depths).
3. If `null` and no error → `Astro.response.status = 404` + "no family tree at this address" UI (✅ verified returns HTTP 404).
4. On thrown error → red alert UI.

## 4. The React island (`FamilyExplorer.tsx`)

`src/components/family/FamilyExplorer.tsx` is the **single** public island per page (✅ verified exactly one `<astro-island>` of `FamilyExplorer`).

State:
- `view`: `"tree" | "list"`.
- `vertical`: chart orientation.
- `selectedId`: init `detail.tree.defaultMainPersonId ?? detail.people[0]?.id ?? null`.
- `sheetOpen`: mobile bottom-sheet visibility.
- `apiRef`: the chart control API handed up from `FamilyTreeCanvas`.

Behaviors:
- **Deep link** (`resolveDeepLink`): reads `?p=<value>` from `window.location.search`. Resolves by `globalKey` (case-insensitive) first, then numeric `id`. **Fails safe to `null`** (keeps default main) on unknown values. Runs in a `useEffect` after mount.
- **URL sync** (`syncUrl`): on selection, sets `?p=` to `globalKey || String(id)` via `history.replaceState`. **Prefers globalKey** so share links survive synthetic-id churn.
- `selectPerson(id, {center, openSheet})`: updates `selectedId`, syncs URL, optionally `apiRef.setMain()` (center), optionally opens the mobile sheet (storing focus to restore).
- Empty state when `detail.people.length === 0`.

Children: `FamilyToolbar`, `FamilyTreeCanvas` *or* `FamilyListView`, and `PersonDetailPanel`
(desktop side panel + mobile bottom sheet).

## 5. The chart (`useFamilyChart.ts` + `FamilyTreeCanvas.tsx`)

`src/hooks/useFamilyChart.ts` owns the **public** chart lifecycle around `family-chart@0.9.0`.

- Dynamically `import("family-chart")`, `createChart(container, data)`, `setCardHtml()` with `imageCircleRect`, avatar field, `[["label"],["birthday"]]` display.
- **Real d3 zoom** via `f3.handlers.manualZoom({ amount, svg, transition_time })` and `f3.handlers.zoomTo(svg, 1)` - **not** fake card-spacing. (✅ both handlers confirmed to exist in the installed package types.)
- Exposed `FamilyChartApi`: `setMain`, `zoomIn` (×1.25), `zoomOut` (×0.8), `fit`, `resetView` (zoomTo 1 + fit), `centerMain` (`main_to_middle`), `setOrientation`.
- **Reduced motion**: `prefersReducedMotion()` → `transitionTime = 0` (✅ respected).
- Init effect deps: `[ancestryDepth, data, progenyDepth, showSiblings]` (callbacks held in refs so they don't re-init). A separate effect re-centers when `mainId` changes.
- **Cleanup**: sets `destroyed`, nulls refs, `onApiReady(null)`, `container.innerHTML = ""`. No `chart.destroy()` exists in the lib; clearing the container removes the SVG and its listeners.

`FamilyTreeCanvas.tsx` is the thin wrapper: `role="application"` with an aria-label telling
users to use List view for keyboard access; bridges the chart API up via `apiRefOut`.

## 6. Chart data transform (`chart-data.ts`)

`src/lib/chart-data.ts` `buildChartData(detail)` converts a `FamilyTreeDetail` **or**
`PublicFamilyTreeDetail` into family-chart `Data[]`. Shared by **both** the public hook and the
**admin** `FamilyTreeChart`.

- Person → `{ id, data: {...}, rels: {parents, spouses, children} }`.
- `metadata` is included **only if the object has it** (`"metadata" in person`) - public DTOs
  don't, so it resolves to `null` (no leak).
- `first name`/`last name` use the real fields if present, else derive from `displayName`
  (`splitDisplayName`). Public DTOs have no `firstName`/`lastName`, so they derive - again no leak.
- `birthday`/`death` use `displayYear()` (timezone-safe; see §8).
- Relationships → edges: `parent`/`adoptive_parent` and `child`/`adopted_child` populate
  parents/children; `spouse` populates spouses (both directions). **`sibling` rows are NOT turned
  into chart edges** - family-chart infers siblings from shared parents. (Sibling labels still
  appear in the detail panel relationship list.) All `rels` arrays are de-duplicated via `Set`.

## 7. Privacy model (read carefully)

**The privacy whitelist is enforced on the FRONTEND only**, in
`src/lib/family-privacy.ts::sanitizeFamilyDetailForPublic`. Allowed public payload:

- **Tree**: `slug`, `name`, `description`, `defaultMainPersonId`.
- **Person**: `id`, `displayName`, `globalKey`, `gender`, `birthDate`*, `deathDate`*, `isLiving`, `photoUrl`.
- **Relationship**: `personId`, `relatedPersonId`, `relationshipType`.

\* Date rules (`yearOnly()`, regex-first → timezone-safe):
- Living person `birthDate` → **year-only string** (e.g. `"1994"`).
- Living person `deathDate` → **forced `null`**.
- Deceased person → keeps **full** `birthDate`/`deathDate` (intended).

✅ **Verified against real production data**: rendered `/family` island payload contained exactly
the whitelist fields; 69 living people all year-only birth + null death; 8 deceased kept full dates;
no `notes`, `metadata`, `firstName`, `lastName`, `treeId`, relationship `id`/`isPrimary`/dates,
`createdByUserId`, or timestamps present.

⚠️ **RED FLAG - backend does not sanitize.** The public API
(`GET /api/v1/family/:slug`, `/family`, `/family/person/:id`) returns **full** rows: `notes`,
`metadata`, `firstName`, `lastName`, `treeId`, **full living birthdates**, relationship
`id`/`isPrimary`/`startDate`/`endDate`/`notes`, and timestamps. The only gate is `is_public = 1`
on the tree. So the whitelist protects the **rendered page**, *not* anyone who calls the API
directly. Treat moving sanitization (or a parallel public DTO) into the backend as the highest-value
future privacy improvement. **Do not assume the API is privacy-safe.**

## 8. Year handling (`family-format.ts`)

`src/lib/family-format.ts::displayYear(value)` extracts the leading 4-digit year **textually**
(regex), with no `Date` timezone interpretation. This fixed a real bug where
`new Date("2022").getFullYear()` rendered `2021` for viewers west of UTC. Used by `chart-data.ts`,
`FamilyListView.tsx`, `PersonSearch.tsx`, and `PersonDetailPanel.tsx`. The SSR `yearOnly()` in
`family-privacy.ts` is also regex-first for the same reason.

## 9. Merge logic & identity (`family-merge.ts` + `data/family.ts`)

`COMBINED_FAMILY` config (`src/data/family.ts`): `slug: "combined-family"`,
`name: "Big Family (Combined)"`, `mainPersonGlobalKey: "muhamad-nurhafiz"`.

`mergeFamilyTrees(details, config)`:
- **Identity key** (`personKey`): `globalKey` lowercased if present, else
  `tree:${treeId}:person:${id}`. **Never merges by display name.**
- Same person across trees (same `globalKey`) collapses to one node; fields filled
  first-non-null; `isLiving` is OR-ed; gender upgraded from `unknown`.
- Synthetic ids reassigned from `1`, `treeId = 0`. Relationships remapped to synthetic ids and
  de-duplicated by `type:left->right`; dangling refs (person not found) are dropped.
- Main person = match on `config.mainPersonGlobalKey`, else first person.

**Invariant:** a person **without** a `globalKey` stays distinct per tree (never merged), so two
different people who happen to share a display name will not corrupt each other. The price: a
cross-tree person *missing* a `globalKey` appears twice until the key is backfilled in D1.

## 10. Admin builder vs public page

| | Public | Admin |
|---|---|---|
| Island root | `FamilyExplorer.tsx` | `FamilyTreeBuilder.tsx` (new/edit) / `FamilyTreesTable.tsx` (index) |
| Chart | `useFamilyChart.ts` + `FamilyTreeCanvas.tsx` | `FamilyTreeChart.tsx` (legacy) |
| Data | sanitized `PublicFamilyTreeDetail` | full `FamilyTreeDetail` (auth) |
| Controls | props/state (`apiRef`) | **window events** (`family:set-main`, `family:on-main-changed`, `family:on-spouses`, `family:zoom-in/out`, `family:fit`, `family:center-main`, `family:set-orientation`) |
| Editing | none (read-only) | inline add/edit relatives via `chart.editTree()` |

`FamilyTreeChart.tsx` is **shared/legacy** and still used by admin. It now uses the shared
`buildChartData` and **real `manualZoom`**. `enableCrossTreeNavigation` is a **deprecated no-op**
kept for prop compatibility (the old public cross-tree N+1 fetch storm was removed). The admin chart
was deliberately **not** migrated onto the public hook to avoid regressing the inline builder.

## 11. Backend shape (hono-workers)

- **Public routes** `src/routes/v1/public/family.ts`: `GET /` (list), `GET /person/:id`,
  `GET /trees-by-global/:key`, `GET /:slug` (detail). KV cache: `family_trees:list` and
  `family_tree_detail:${slug}` (TTL 120s); HTTP `Cache-Control: public, max-age=60,
  stale-while-revalidate=600`. Bypass with `?noCache=1` or `Cache-Control: no-cache`. Malformed
  cache entries are purged, never 500.
- **Owner routes** `src/routes/v1/owner/family.ts`: all behind `jwtAuth + requireAdmin()`. CRUD for
  trees/people/relationships.
- **Service** `src/services/family.ts`: `FamilyService` implements both `PublicFamilyService` and
  `AdminFamilyService`. Public reads only gate on `is_public = 1`; **no field-level filtering** (see §7).
- **Validators** `src/validators/family.ts`: Zod `.strict()`. **`globalKey` is NOT a field** → it
  cannot be set/changed through the admin API or builder UI.
- **Schema** `src/database/migrations/006_family_chart.sql`: `family_trees`, `family_people`,
  `family_relationships`. Migration `007` recreates the `global_key` index with `COLLATE NOCASE`.
- **Seeds** `src/database/seeds/004_setup_family.sql`, `005_setup_basri.sql`, `006_setup_hamid.sql`
  - this is where `global_key` values are assigned.

**Consequence (important):** because `globalKey` is **seed/SQL-managed only**, cross-tree identity
and `?p=` deep-link stability depend on data that the admin UI cannot edit. Fixing/adding a
`globalKey` is a **D1 remediation task**, not an app feature - and must be verified (see
`docs/reports/family-page-phase-0-d1-verification.sql`) before any remote run.

## 12. Data model quick reference

- **Relationship types**: `parent`, `child`, `spouse`, `sibling`, `adoptive_parent`, `adopted_child`.
- **Gender**: `male`, `female`, `other`, `unknown` (chart maps to `M`/`F`, default `M`).
- Constraints: `UNIQUE(tree_id, person_id, related_person_id, relationship_type)`,
  `CHECK(person_id <> related_person_id)`, cascade deletes from tree → people → relationships.
- Synthetic combined-tree ids are **unstable** across data ordering → share links prefer `globalKey`.

## 13. What has / hasn't been tested (honesty ledger)

| Area | Status |
|---|---|
| `/family`, `/family/[slug]`, bad-slug 404, `?p=` SSR render | ✅ verified via dev server + curl against prod API |
| Public island payload privacy (whitelist, living year-only, deceased full) | ✅ verified against real prod data |
| Backend public API exposes full PII | ✅ verified (direct curl) - this is a gap, not a pass |
| `npm run build` | ✅ passes (exit 0) |
| family-chart zoom/method API names exist | ✅ verified in installed types |
| Deep-link interactive centering (visual) | ⚠️ code-reviewed + SSR 200; not visually confirmed |
| Admin builder click-through (card select, inline add, fit/center/orientation) | ❌ not tested (requires auth) |
| Light/dark chart theme in devtools | ❌ not visually verified |
| Accessibility (VoiceOver/Lighthouse/contrast) | ❌ not audited |
| Remote D1 `globalKey`/parent-bridge remediation | ❌ not run, not verified complete |

## 14. Pointers (read next)

- Strict do/don't: `docs/brain/family-module-agent-rules.md`
- Technical architecture + data flow + file map: `docs/architecture/family-module-architecture.md`
- Current-state audit: `docs/reports/family-module-current-state-audit.md`
- Prior history: `docs/plans/family-page-diagnosis-and-redesign-plan.md`,
  `docs/reports/family-page-codex-handoff.md`, `docs/reports/family-page-fable-review.md`,
  `docs/reports/family-page-phase-0-d1-verification.sql`
