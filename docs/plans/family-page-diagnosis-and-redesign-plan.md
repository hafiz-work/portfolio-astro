# Family Page Diagnosis & Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the public Family pages (`/family`, `/family/[slug]`) into a polished, server-rendered, responsive, accessible family-tree experience - removing the window-event/global-variable architecture, hardcoded data patches, cache-busting, and fake zoom, while keeping the admin family module working unchanged.

**Architecture:** Fetch family data server-side in Astro frontmatter (request-time SSR on Cloudflare, leaning on the API's KV + HTTP cache) and pass it as props to a single React island per page (`FamilyExplorer`) that owns toolbar, chart, search, person detail, and a mobile list fallback. The `family-chart` rendering core is extracted into a `useFamilyChart` hook shared by the new public explorer and the existing admin `FamilyTreeChart` wrapper.

**Tech Stack:** Astro 6 (SSR, `output: "server"`), React 19 islands, Tailwind CSS v4, `family-chart` 0.9.0 (d3-based), Hono + D1 backend (separate repo, mostly untouched).

---

## Part A - Diagnosis

### A1. Current state summary

**Files involved today**

| Area | File | Lines | Role |
|---|---|---|---|
| Public page | `src/pages/family/index.astro` | 375 | Combined-family page; client-side fetch + 150-line inline merge script |
| Public page | `src/pages/family/[slug]/index.astro` | 414 | Single-tree page; Astro Dropdowns populated via `innerHTML` injection |
| Component | `src/components/family/FamilyTreeChart.tsx` | 762 | Monolith: data transform + chart lifecycle + window-event bus + cross-tree navigation + inline-edit wiring |
| Component | `src/components/family/PublicFamilyExplorer.tsx` | 115 | Fetch-then-render wrapper used only on `[slug]` page |
| Component | `src/components/family/CombinedFamilyExplorer.tsx` | 188 | **Unused on any page** - duplicate of the merge script in `index.astro` |
| Component | `src/components/family/PersonInfoPanel.tsx` | 118 | Reads selection from window events + `window.__familyDetail` |
| Service | `src/lib/family.ts` | 139 | `FamilyService` - public + admin endpoints, forces `noCache=1&_=Date.now()` on every public call |
| Types | `src/types/family.ts` | 100 | Clean, matches backend |
| Admin | `src/components/admin/family/*` (4 files) | ~2,800 | Tree CRUD + visual builder; reuses `FamilyTreeChart` |
| Backend | `hono-workers/src/routes/v1/public/family.ts` | - | KV-cached (120 s TTL) public endpoints with `Cache-Control: max-age=60, SWR 600` |
| Backend | `hono-workers/src/database/schemas/family_chart.sql` | - | `family_trees` / `family_people` / `family_relationships` |

**Headline problems**

1. **Three communication mechanisms used at once** - React props, `window` CustomEvents (`family:set-main`, `family:set-data`, `family:on-main-changed`, `family:on-spouses`, `family:zoom-*`, …), and window globals (`window.__combinedFamilyDetail`, `window.__familyDetail`, `window.familyChartApi`). Zoom/fit/center logic is implemented **twice** inside `FamilyTreeChart.tsx` (once on `window.familyChartApi`, once as event listeners).
2. **Personal data hardcoded in code** - `addParentRelIfMissing("Mohd Bahtiar", "Muhamad Nurhafiz")`, `addParentRelIfMissing("Zarina", …)`, and "muhamad nurhafiz" centering live in *two* places (`index.astro` script and `CombinedFamilyExplorer.tsx`). Data fixes belong in the database.
3. **The entire combined-merge algorithm is duplicated** (~140 lines) between the inline `<script>` of `index.astro` and the unused `CombinedFamilyExplorer.tsx`. They have already drifted (different descriptions).
4. **Every public fetch busts every cache** - `withNoCache` appends `noCache=1&_=Date.now()`, which skips the backend KV cache **and** makes the URL unique so browser/CDN HTTP caching is impossible. The backend's caching design is fully defeated by its only consumer.
5. **Pages are `prerender = false` but fetch client-side anyway** - worst of both worlds: SSR cost without SSR benefit, plus loading skeletons, race guards (`familyLoadRunning`), and FOUC. (CLAUDE.md still claims these pages prerender at build time - stale.)
6. **Fake zoom** - the +/− buttons change `setCardXSpacing/setCardYSpacing` (node spacing) instead of zooming. The library exports real programmatic zoom (`handlers.manualZoom`, `zoomTo`); native wheel/pinch zoom already works on the canvas, so buttons and gestures disagree about what "zoom" means.
7. **Cross-tree navigation is an N+1 storm** - every card click with no `globalKey` fetches **all trees + all tree details** (each cache-busted) just to decide whether to jump trees. This also runs in the admin builder (`enableCrossTreeNavigation` defaults to `true`). With the combined view existing, this feature is redundant.
8. **Orphan page** - `/family` is not linked from the public Navbar (Projects/Skills/Experience only). See Open Decisions.
9. **Debug artifacts in production UI** - yellow "Live data will be loaded in the browser for this family." banner on `[slug]`; `console.error`-only failure paths.
10. **CLAUDE.md drift** - rendering model and family sections describe behavior that no longer matches the code.

### A2. Package / library analysis - `family-chart` 0.9.0

- **Identity:** `family-chart` by donatso, v0.9.0 - which is the **latest published version** (verified via npm). D3.js-based, TypeScript types shipped, MIT/ISC-style licensed.
- **Size:** ESM bundle 220 KB raw (106 KB min) **plus** a hard dependency on full `d3` v7 (~870 KB unpacked). It is already loaded via dynamic `import("family-chart")` inside the component, so it's code-split and only downloaded on family pages. CSS is imported statically (fine, tiny).
- **SSR:** Not SSR-compatible (touches DOM/d3 on import path usage); must stay a client island with dynamic import - current usage is correct on this point.

**Capability matrix vs. requirements**

| Requirement | Supported? | Notes / current usage |
|---|---|---|
| Zoom / pan | ✅ native d3 wheel/drag/pinch + `handlers.manualZoom({amount, svg})`, `zoomTo(svg, level)`, `getCurrentZoom` | **Misused** - buttons change card spacing instead |
| Expand / collapse | ⚠️ partial | Global `setAncestryDepth` / `setProgenyDepth`; `setDuplicateBranchToggle`; **no true per-branch collapse API** |
| Spouse / children rels | ✅ | `rels: {parents, spouses, children}` - correctly mapped from the relationship edge list |
| Multiple generations | ✅ | depth-limited; currently 6/5 on combined view |
| Mobile responsiveness | ⚠️ | Canvas resizes; touch pan/pinch work; cards/controls are our responsibility |
| Custom node UI | ✅ | `setCardHtml()`, `setStyle("imageCircleRect" \| "imageCircle" \| …)`, `setCardImageField("avatar")`, `setDefaultPersonIcon`, `setOnCardUpdate` - **avatars currently unused** (`label`-only cards) |
| Search | ✅ built-in `setPersonDropdown` | unused; we'll build our own combobox for styling/a11y consistency |
| Kinship labels | ✅ `calculateKinships(id)` | unused - would give "relationship to main" labels for free |
| Privacy | ✅ `setPrivateCardsConfig` | unused |
| Lazy / large-tree perf | ⚠️ | No virtualization; fine for this dataset (3 trees, ~30 people seeded); depth limits are the lever |
| SSR w/ Astro | ❌ by design | dynamic import already in place ✅ |

**Verdict: keep `family-chart`.** It is current, capable, and *under*-used - the problems are in our integration, not the library. Alternatives (react-family-tree, relatives-tree, GoJS, yFiles) are either abandoned, can't model spouses+multi-generation as well, or are commercial. Replacement is not justified.

### A3. UI/UX diagnosis

| Area | Finding |
|---|---|
| Layout | `[slug]`: `flex gap-4 h-[580px]` with fixed `w-64` side panel - panel never collapses; on a 375 px phone the chart gets ~90 px. Fixed 580 px heights everywhere regardless of viewport. |
| Visual hierarchy | Toolbar on `[slug]` is a flat row of 8 same-weight buttons ("Vertical Horizontal − + Center Main Fit") with no grouping or icons. |
| Card design | Label-only dark cards; no avatars, no birth years on combined view, no deceased indicator, no "you are here" affordance. |
| Empty states | Decent on `index` ("Family data unavailable"); `[slug]` has none for the chart itself. |
| Loading states | `index` has skeletons (only needed because fetching is client-side); `[slug]` shows raw slug as title + "Loading family details..." text that can stick forever on error. |
| Error states | Generic red box; no retry; `[slug]` can show error box *and* stale toolbar simultaneously. |
| Responsive | Toolbar buttons wrap awkwardly; side panel fixed-width; no mobile alternative view. |
| Dark/light | Chart canvas is **always dark** (`--color-family-canvas: #212121`) inside a light page - jarring in light mode. family-chart ships dark-styled cards only. |
| Mobile usability | Pinch/pan works (library), but +/− buttons do spacing-not-zoom; person info panel unreachable (squeezed); dropdowns are desktop-sized. |
| Accessibility | Buttons labeled literally "+" / "−" with no `aria-label`; dropdown options injected as raw HTML strings; no focus management; no keyboard path to select a person; no reduced-motion handling (1000 ms transitions). |
| Touch gestures | Native d3 pinch-zoom OK; no affordance hinting the canvas is interactive. |
| Large-tree readability | Depth caps exist (good); no search-to-person (must hunt by panning); no breadcrumb of who is "main". |
| Consistency | Yellow debug banner; mixed Astro-Dropdown + React islands on one toolbar; the rest of the portfolio is clean slate/cyan - family pages feel like a lab. |

### A4. Functional gap list

| Concern | Status today |
|---|---|
| Missing profile photos | No avatars rendered at all (label-only cards); `PersonInfoPanel` shows no photo either |
| Unknown members | `gender: "unknown"` maps to `"M"` silently in `mapGender` |
| Duplicate names | Combined merge **keys people by lowercased displayName** when `globalKey` is missing → two relatives with the same name get merged into one person (data corruption in the view) |
| Spouse rels | ✅ mapped; "No Spouse" filter exists ([slug] only) |
| Parent-child rels | ✅ mapped incl. adoptive; **sibling rows in DB are accepted by the API but never rendered** (library derives siblings from shared parents only) |
| Deceased/living | In data + info panel; not on cards |
| Search/filter | ❌ none (library support exists) |
| Zoom/reset | ⚠️ fake zoom; Fit exists; no reset-to-default |
| Expand/collapse branch | ❌ only fixed depth props; no UI control |
| Person detail panel | Desktop-only, event-coupled, no photo, no kinship label, race-prone (`window.__familyDetail` may arrive after first event) |
| Shareable link | ❌ no `?person=` deep link; main-person selection lost on reload |
| Mobile fallback view | ❌ none |
| Large-tree perf | Acceptable now; cross-tree N+1 is the real perf bug |
| Invalid/malformed data | Relationship endpoints referencing missing people are skipped (good); cyclic data unguarded (library may hang - low risk, admin-controlled data) |
| Empty family data | Handled on `index`; partial on `[slug]` |

### A5. Data model review

The backend model (`family_trees`, `family_people`, `family_relationships` edge table) is **sound and scalable** - people and typed directional relationships with `UNIQUE(tree_id, person_id, related_person_id, relationship_type)` and proper FKs/indexes. Keep it. Gaps, in priority order:

1. **`global_key` is the cross-tree identity but is optional** → display-name fallback merging (duplicate-name hazard, hardcoded patches). *Fix: backfill `global_key` for every person appearing in >1 tree, and add the missing bridge relationships as data (Phase 0).* Long-term: make it NOT NULL.
2. **`birth_order` lives in untyped `metadata` JSON (sometimes string-encoded)** - the chart sorter has to try/catch-parse it. *Recommended (optional backend phase): promote to `birth_order INTEGER` column.*
3. **No per-person privacy** - full names + birth years of living relatives are public. *Recommended (optional backend phase): `visibility TEXT CHECK(visibility IN ('public','members','private')) DEFAULT 'public'` + filter in the public service; frontend pairs with `setPrivateCardsConfig`.* Until then, an interim frontend rule (hide exact birth dates of living people, show year only) is included in Phase 3.
4. **Relationship direction convention is implicit** (`parent`: personId=parent → relatedPersonId=child; `child` rows are the inverse duplicate). Document it; the transform already handles both.

Frontend `FamilyPerson` / `FamilyRelationship` types are fine as-is; no changes needed beyond what the new components consume.

### A6. Performance review

| Issue | Impact | Fix (phase) |
|---|---|---|
| `noCache=1&_=Date.now()` on all public fetches | Defeats KV + HTTP + CDN caching; every visit hits D1 | Remove cache-busters (P1) |
| Client-side waterfall: page → trees list → N tree details | 1+N sequential-ish round trips before first paint of the tree | SSR fetch in frontmatter; one HTML response with data inlined (P1) |
| Cross-tree nav fetch storm per card click | N+1 requests per click, also in admin | Delete the feature (P2) |
| Combined merge runs in every browser | CPU + duplicated code | Merge once per request on the server (P1) |
| `FamilyTreeChart` island mounted (hidden) before data exists | Hydrates React + listeners for nothing | Single island receives data as props (P3) |
| `family-chart`+d3 in initial island chunk | already dynamic-imported ✅ keep | - |
| Avatars (when added) | - | `loading="lazy"`, fixed dims, R2 URLs (P3) |
| 1000 ms tree transitions | Feels sluggish; ignores reduced-motion | 300 ms default; 0 when `prefers-reduced-motion` (P3/P4) |

---

## Part B - Proposed design

### B1. Page layout

```
┌──────────────────────────────────────────────────────────────┐
│ Family                                       (page header)   │
│ Short intro · context line                                   │
│ [All Families] [Hafiz] [Bahtiar] [Azhari]    (tree tabs)     │
├──────────────────────────────────────────────────────────────┤
│ ┌ Toolbar ────────────────────────────────────────────────┐  │
│ │ 🔍 Search person…   | ⊞ Tree ☰ List | 🧭 V/H | − + ⛶ ⌖ │  │
│ └─────────────────────────────────────────────────────────┘  │
│ ┌ Canvas (65vh, min 420px) ───────────────┐ ┌ Person ─────┐  │
│ │                                         │ │ [avatar]    │  │
│ │        ● ─── ●                          │ │ Name        │  │
│ │        │                                │ │ b. 1998 ·   │  │
│ │   ● ─ [●] ─ ●     (pan/zoom/touch)      │ │ Living      │  │
│ │        │                                │ │ Relations:  │  │
│ │        ●  ●  ●                          │ │  Father →   │  │
│ └─────────────────────────────────────────┘ └─────────────┘  │
│  (mobile: person panel becomes a bottom sheet;               │
│   List view replaces canvas when toggled)                    │
└──────────────────────────────────────────────────────────────┘
```

- **`/family`** = combined tree (default experience) + tabs linking to each individual tree page.
- **`/family/[slug]`** = same explorer, single tree, back link.
- Empty/error states are **server-rendered** (no skeleton needed for data; only the chart canvas shows a brief mount placeholder).

### B2. Component & folder structure

```
src/
  data/family.ts                      # combined-view config (slug, title, main person globalKey)
  lib/family.ts                       # service - withNoCache removed
  lib/family-merge.ts                 # pure mergeFamilyTrees() (server-side)
  components/family/
    FamilyExplorer.tsx                # island root: state, layout, URL sync
    FamilyToolbar.tsx                 # search, view toggle, orientation, zoom, fit/reset
    PersonSearch.tsx                  # accessible combobox over people
    PersonDetailPanel.tsx             # photo, dates, notes, clickable relations (panel/bottom-sheet)
    FamilyListView.tsx                # mobile/a11y fallback list
    FamilyTreeCanvas.tsx              # thin mount point using useFamilyChart
    useFamilyChart.ts                 # chart lifecycle hook (create/update/destroy, api ref)
    chart-data.ts                     # buildChartData() transform (moved out of FamilyTreeChart)
    FamilyTreeChart.tsx               # SLIMMED legacy wrapper - admin only, same props/events
  styles/family-chart-theme.css      # .f3 light/dark token overrides
  pages/family/index.astro            # SSR fetch + merge → <FamilyExplorer client:load />
  pages/family/[slug]/index.astro     # SSR fetch → <FamilyExplorer client:load />
```

Deleted at the end of Phase 4: `CombinedFamilyExplorer.tsx`, `PublicFamilyExplorer.tsx`, `PersonInfoPanel.tsx`.

**State flow (public pages):** Astro frontmatter fetch → `detail` prop → `FamilyExplorer` React state (`selectedPersonId`, `view`, `orientation`) → `useFamilyChart` api ref. No window events, no globals. Admin keeps the existing `FamilyTreeChart` event contract untouched.

### B3. Mobile / responsive strategy

- Grid `lg:grid-cols-[minmax(0,1fr)_300px]`; below `lg` the person panel becomes a bottom sheet (fixed, `translate-y` transition, Escape/backdrop closes).
- Canvas `h-[65vh] min-h-[420px] lg:h-[580px]`; native pinch/pan retained.
- Toolbar: icon buttons with labels hidden below `sm` (`aria-label` always set); search full-width row on mobile.
- **List view** toggle = guaranteed-usable fallback: searchable person cards (avatar, name, years, relation count) → tap opens detail sheet. Also the accessible alternative to the SVG canvas.

### B4. Light / dark mode strategy

- Replace single `--color-family-canvas: #212121` with themed tokens in `index.css` (`:root` light values, `.dark` overrides).
- New `family-chart-theme.css` overrides `.f3` card/link/text classes using those tokens so cards follow the site palette (white/slate-800 cards, cyan accent for main person, slate links).
- Buttons/panels reuse the documented slate/cyan palette from CLAUDE.md.

### B5. Performance strategy

Summarized from A6: SSR data + props (zero client data fetching on happy path), caches restored (KV 120 s + `max-age=60, SWR 600` now actually used), merge on server, one island, dynamic-import chart kept, cross-tree storm deleted, lazy avatars, 300 ms/0 ms transitions.

### B6. Accessibility checklist (acceptance criteria for Phase 4)

- [ ] All toolbar controls have `aria-label` + visible `focus-visible` ring
- [ ] Search is a real combobox (`role="combobox"`, `aria-expanded`, arrow-key + Enter, `aria-activedescendant`)
- [ ] Person detail sheet: `role="dialog"`, `aria-modal`, focus moved in on open, returned on close, Escape closes
- [ ] List view reachable by keyboard; every person focusable; selection works without pointer
- [ ] Canvas region has `role="application"` + `aria-label="Interactive family tree"`; List view referenced as alternative
- [ ] Avatars have meaningful `alt` (person name); decorative icons `aria-hidden`
- [ ] `prefers-reduced-motion` → chart transitions 0 ms, sheet transition none
- [ ] Color contrast AA for card text on themed backgrounds (check light mode especially)
- [ ] No information conveyed by color alone (deceased = label, not just dimming)

---

## Part C - Implementation phases

> **Verification baseline:** this project has no test runner or linter. Per CLAUDE.md, `npm run build` (runs `@astrojs/check` TypeScript checks + Vite bundling) is the verification step, plus manual checks against `npm run dev`. ECONNREFUSED build noise is expected when the local API isn't running. Work happens on the `dev` branch (current branch, clean); **no push to main**.

### Phase 0 - Data fix in D1 (hono-workers) - *prerequisite, no code changes*

**Files:** none in portfolio-astro; SQL run against hono-workers D1 (local first, then remote).

- [ ] **Step 0.1: Inventory cross-tree identities and the missing bridge relationships**

Run (in `/Users/hafiz/Developments/hono-workers`):

```bash
npx wrangler d1 execute hono_workers_db --local --command \
"SELECT p.id, p.tree_id, t.slug, p.display_name, p.global_key
 FROM family_people p JOIN family_trees t ON t.id = p.tree_id
 ORDER BY lower(p.display_name), p.tree_id;"
```

Expected: every person appearing in more than one tree (e.g. Muhamad Nurhafiz, Mohd Bahtiar, Zarina) shares the same non-null `global_key`. List any row where duplicates have NULL/differing keys.

- [ ] **Step 0.2: Backfill missing `global_key`s** (template - substitute real IDs from 0.1)

```sql
UPDATE family_people SET global_key = 'muhamad-nurhafiz' WHERE id IN (<ids>);
UPDATE family_people SET global_key = 'mohd-bahtiar'     WHERE id IN (<ids>);
UPDATE family_people SET global_key = 'zarina'           WHERE id IN (<ids>);
```

- [ ] **Step 0.3: Add the bridge relationships as data** (replaces the hardcoded `addParentRelIfMissing` calls). In whichever tree holds all three people (expected: hafiz-family, tree_id `<T>`):

```sql
INSERT OR IGNORE INTO family_relationships
  (tree_id, person_id, related_person_id, relationship_type, is_primary)
VALUES
  (<T>, <id of Mohd Bahtiar in T>, <id of Muhamad Nurhafiz in T>, 'parent', 1),
  (<T>, <id of Zarina in T>,        <id of Muhamad Nurhafiz in T>, 'parent', 1);
```

- [ ] **Step 0.4: Verify, then repeat 0.2–0.3 with `--remote`**

```bash
npx wrangler d1 execute hono_workers_db --local --command \
"SELECT * FROM family_relationships WHERE relationship_type='parent' AND related_person_id IN (<hafiz ids>);"
```

Expected: both parent rows present. Then run the same statements with `--remote`. (KV cache TTL is 120 s - changes appear publicly within 2 minutes.)

---

### Phase 1 - Server-side data layer

#### Task 1: Remove cache-busting from the public family service

**Files:**
- Modify: `src/lib/family.ts:16-44`

- [ ] **Step 1.1: Delete `withNoCache` and use plain endpoints**

Replace lines 16–44 of `src/lib/family.ts` with:

```ts
export class FamilyService extends ApiClient {
  constructor() {
    super(API_BASE_URL);
  }

  async getPublicTrees(): Promise<FamilyTree[]> {
    const result = await this.get<FamilyTree[]>("family");
    return result || [];
  }

  async getPublicTreeBySlug(slug: string): Promise<FamilyTreeDetail | null> {
    return this.get<FamilyTreeDetail>(`family/${slug}`);
  }

  async getPublicPersonById(id: number): Promise<FamilyPerson | null> {
    return this.get<FamilyPerson>(`family/person/${id}`);
  }

  async getPublicTreesByGlobalKey(key: string): Promise<FamilyTree[]> {
    const result = await this.get<FamilyTree[]>(
      `family/trees-by-global/${encodeURIComponent(key)}`,
    );
    return result || [];
  }
```

(The `const withNoCache = …` block at the top of the file is deleted; everything from `getAdminTrees()` down is unchanged.)

- [ ] **Step 1.2: Verify no other callers**

Run: `grep -rn "withNoCache\|noCache" src/`
Expected: only hits left are in `src/pages/family/*.astro` (removed in Tasks 3–4).

- [ ] **Step 1.3: Build check**

Run: `npm run build`
Expected: completes with no TypeScript errors (ECONNREFUSED warnings OK).

- [ ] **Step 1.4: Commit**

```bash
git add src/lib/family.ts
git commit -m "perf(family): stop cache-busting public family API calls"
```

#### Task 2: Extract the combined-merge into a pure server-side module + config

**Files:**
- Create: `src/data/family.ts`
- Create: `src/lib/family-merge.ts`

- [ ] **Step 2.1: Create `src/data/family.ts`**

```ts
/** Configuration for the synthesized combined family view on /family. */
export const COMBINED_FAMILY = {
  slug: "combined-family",
  name: "Big Family (Combined)",
  description:
    "Combined view of Hafiz, Bahtiar, and Azhari families, centered for full ancestry.",
  /** globalKey of the person the combined view centers on (must exist in D1). */
  mainPersonGlobalKey: "muhamad-nurhafiz",
} as const;
```

- [ ] **Step 2.2: Create `src/lib/family-merge.ts`**

This is the algorithm from `CombinedFamilyExplorer.tsx:6-152`, made pure, with the hardcoded `addParentRelIfMissing` name patches **removed** (Phase 0 moved them into data) and main-person selection driven by `globalKey`:

```ts
import type {
  FamilyPerson,
  FamilyRelationship,
  FamilyTreeDetail,
} from "../types/family";

export interface CombinedFamilyConfig {
  slug: string;
  name: string;
  description: string;
  mainPersonGlobalKey: string;
}

const personKey = (p: FamilyPerson) => {
  const gk = (p.globalKey || "").trim().toLowerCase();
  if (gk.length > 0) return gk;
  // Fallback for people without a globalKey. Same-named people without
  // keys WILL be merged - Phase 0 backfills keys to prevent this.
  return p.displayName.trim().toLowerCase();
};

/** Merge multiple public tree details into one synthetic combined detail. */
export function mergeFamilyTrees(
  details: FamilyTreeDetail[],
  config: CombinedFamilyConfig,
): FamilyTreeDetail {
  const personByKey = new Map<string, FamilyPerson>();
  const keyToNewId = new Map<string, number>();
  let nextId = 1;

  for (const d of details) {
    for (const p of d.people) {
      const key = personKey(p);
      const existing = personByKey.get(key);
      if (!existing) {
        personByKey.set(key, { ...p, id: nextId, treeId: 0 });
        keyToNewId.set(key, nextId);
        nextId += 1;
      } else {
        existing.firstName = existing.firstName ?? p.firstName ?? null;
        existing.lastName = existing.lastName ?? p.lastName ?? null;
        existing.photoUrl = existing.photoUrl ?? p.photoUrl ?? null;
        existing.notes = existing.notes ?? p.notes ?? null;
        existing.gender =
          existing.gender === "unknown" ? p.gender : existing.gender;
        existing.birthDate = existing.birthDate ?? p.birthDate ?? null;
        existing.deathDate = existing.deathDate ?? p.deathDate ?? null;
        existing.isLiving = existing.isLiving || p.isLiving;
        existing.metadata = existing.metadata ?? p.metadata ?? null;
      }
    }
  }

  const combinedPeople = Array.from(personByKey.values());

  const relKey = (r: Pick<FamilyRelationship, "relationshipType" | "personId" | "relatedPersonId">) =>
    `${r.relationshipType}:${r.personId}->${r.relatedPersonId}`;
  const relSet = new Set<string>();
  const combinedRelationships: FamilyRelationship[] = [];

  for (const d of details) {
    const peopleById = new Map(d.people.map((p) => [p.id, p]));
    for (const r of d.relationships) {
      const left = peopleById.get(r.personId);
      const right = peopleById.get(r.relatedPersonId);
      if (!left || !right) continue;
      const newLeftId = keyToNewId.get(personKey(left));
      const newRightId = keyToNewId.get(personKey(right));
      if (!newLeftId || !newRightId) continue;
      const newRel: FamilyRelationship = {
        ...r,
        id: combinedRelationships.length + 1,
        treeId: 0,
        personId: newLeftId,
        relatedPersonId: newRightId,
      };
      const k = relKey(newRel);
      if (!relSet.has(k)) {
        relSet.add(k);
        combinedRelationships.push(newRel);
      }
    }
  }

  const mainKey = config.mainPersonGlobalKey.trim().toLowerCase();
  const main =
    combinedPeople.find((p) => personKey(p) === mainKey) ||
    combinedPeople[0] ||
    null;

  const now = new Date().toISOString();
  return {
    tree: {
      id: 0,
      slug: config.slug,
      name: config.name,
      description: config.description,
      isPublic: true,
      createdByUserId: null,
      defaultMainPersonId: main ? main.id : null,
      createdAt: now,
      updatedAt: now,
    },
    people: combinedPeople,
    relationships: combinedRelationships,
  };
}
```

- [ ] **Step 2.3: Build check**

Run: `npm run build` - Expected: clean type check.

- [ ] **Step 2.4: Commit**

```bash
git add src/data/family.ts src/lib/family-merge.ts
git commit -m "feat(family): extract pure server-side tree merge with config-driven main person"
```

---

### Phase 2 - Chart core refactor (shared with admin)

#### Task 3: Extract `buildChartData` into `chart-data.ts`

**Files:**
- Create: `src/components/family/chart-data.ts`
- Modify: `src/components/family/FamilyTreeChart.tsx:32-119` (delete moved code, import instead)

- [ ] **Step 3.1: Create `src/components/family/chart-data.ts`** - move `mapGender`, `splitDisplayName`, `buildChartData` verbatim from `FamilyTreeChart.tsx:32-119`, exporting all three, with one behavior fix: keep gender `"unknown"`/`"other"` out of the `F` bucket but record the original on data for the detail panel (the library only accepts M/F):

```ts
import type { Data } from "family-chart";
import type { FamilyTreeDetail } from "../../types/family";

export const mapGender = (gender: string): "M" | "F" =>
  gender === "female" ? "F" : "M";

export const splitDisplayName = (displayName: string) => {
  const parts = displayName.trim().split(/\s+/);
  if (parts.length <= 1) return { firstName: displayName.trim(), lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
};

export const buildChartData = (detail: FamilyTreeDetail): Data => {
  // …identical body to FamilyTreeChart.tsx:48-119 (person map, relationship
  // mapping incl. adoptive types, de-dup of rels arrays)…
};
```

(Copy the existing body exactly; it is correct. Only the imports/exports are new.)

- [ ] **Step 3.2: Update `FamilyTreeChart.tsx`** - delete lines 32–119, add `import { buildChartData } from "./chart-data";`.

- [ ] **Step 3.3: Build check** - `npm run build`, expected clean.

- [ ] **Step 3.4: Commit**

```bash
git add src/components/family/chart-data.ts src/components/family/FamilyTreeChart.tsx
git commit -m "refactor(family): extract chart data transform into chart-data.ts"
```

#### Task 4: Delete cross-tree navigation from `FamilyTreeChart`

**Files:**
- Modify: `src/components/family/FamilyTreeChart.tsx` (remove lines ~420–540 cross-tree block, `enableCrossTreeNavigation` prop/refs, and the now-unused `getPublicFamilyTree*` imports)

- [ ] **Step 4.1: Remove the feature** - in `setOnCardClick`, everything after the `family:on-spouses` dispatch and `addRelative` call (the `if (!enableCrossTreeNavigationRef.current)` block through the end of the handler) is deleted. Delete the prop, its ref, its effect, and imports `getPublicFamilyTreeBySlug, getPublicFamilyTrees, getPublicFamilyTreesByGlobalKey` from `../../lib/family`.

- [ ] **Step 4.2: Check call sites**

Run: `grep -rn "enableCrossTreeNavigation" src/`
Expected: zero hits after edit (admin never passed it explicitly - verified: `FamilyManager.tsx:609`, `FamilyTreeBuilder.tsx:1159` pass other props only).

- [ ] **Step 4.3: Build + admin smoke test**

Run: `npm run build`; then `npm run dev`, open `/admin/family`, edit a tree in the builder, click cards. Expected: selection/centering still work; **no** network requests to `/family?…` on card clicks (check devtools Network).

- [ ] **Step 4.4: Commit**

```bash
git add src/components/family/FamilyTreeChart.tsx
git commit -m "perf(family): remove cross-tree navigation fetch storm from chart"
```

#### Task 5: Create `useFamilyChart` hook

**Files:**
- Create: `src/components/family/useFamilyChart.ts`

- [ ] **Step 5.1: Write the hook**

```ts
import { useEffect, useRef } from "react";
import type { Chart, Data } from "family-chart";
import "family-chart/styles/family-chart.css";

export interface FamilyChartApi {
  setMain: (id: string) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  fit: () => void;
  centerMain: () => void;
  setOrientation: (vertical: boolean) => void;
}

interface Options {
  data: Data;
  mainId: string | null;
  ancestryDepth?: number;
  progenyDepth?: number;
  showSiblings?: boolean;
  onSelect?: (id: string) => void;
}

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function useFamilyChart({
  data, mainId, ancestryDepth, progenyDepth, showSiblings, onSelect,
}: Options) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<Chart | null>(null);
  const handlersRef = useRef<typeof import("family-chart").handlers | null>(null);
  const apiRef = useRef<FamilyChartApi | null>(null);
  const onSelectRef = useRef(onSelect);
  useEffect(() => { onSelectRef.current = onSelect; }, [onSelect]);

  const t = prefersReducedMotion() ? 0 : 300;

  // create once
  useEffect(() => {
    const container = containerRef.current;
    if (!container || data.length === 0 || chartRef.current) return;
    let destroyed = false;

    (async () => {
      const f3 = await import("family-chart");
      if (destroyed || !containerRef.current) return;
      handlersRef.current = f3.handlers;
      container.innerHTML = "";

      const chart = f3.createChart(container, data)
        .setTransitionTime(t)
        .setCardXSpacing(250)
        .setCardYSpacing(150)
        .setShowSiblingsOfMain(showSiblings ?? true)
        .setDuplicateBranchToggle(true);
      if (typeof ancestryDepth === "number") chart.setAncestryDepth(ancestryDepth);
      if (typeof progenyDepth === "number") chart.setProgenyDepth(progenyDepth);

      const card = chart.setCardHtml();
      card.setStyle("imageCircleRect");
      card.setCardImageField("avatar");
      card.setCardDisplay([["label"], ["birthday"]]);
      card.setCardDim({ h: 80, w: 220 });
      card.setOnHoverPathToMain();
      card.setOnCardClick((_e: MouseEvent, d: any) => {
        const id = String(d?.id ?? d?.data?.id ?? "");
        if (!id) return;
        chart.updateMainId(id);
        chart.updateTree({ tree_position: "main_to_middle", transition_time: t });
        onSelectRef.current?.(id);
      });

      chartRef.current = chart;
      apiRef.current = {
        setMain: (id) => {
          chart.updateMainId(id);
          chart.updateTree({ tree_position: "main_to_middle", transition_time: t });
        },
        zoomIn: () => f3.handlers.manualZoom({ amount: 1.25, svg: chart.svg, transition_time: t }),
        zoomOut: () => f3.handlers.manualZoom({ amount: 0.8, svg: chart.svg, transition_time: t }),
        fit: () => chart.updateTree({ tree_position: "fit", transition_time: t }),
        centerMain: () =>
          chart.updateTree({ tree_position: "main_to_middle", transition_time: t }),
        setOrientation: (vertical) => {
          vertical ? chart.setOrientationVertical() : chart.setOrientationHorizontal();
          chart.updateTree({ tree_position: "fit", transition_time: t });
        },
      };

      chart.setOrientationVertical();
      if (mainId) chart.updateMainId(mainId);
      chart.updateTree({ initial: true, tree_position: "fit", transition_time: t });
    })().catch((err) => console.error("family chart init failed:", err));

    return () => {
      destroyed = true;
      chartRef.current = null;
      apiRef.current = null;
      if (container) container.innerHTML = "";
    };
  // chart is created once per mounted dataset; FamilyExplorer remounts the
  // canvas (key=tree slug) when the dataset changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  // follow external main-person changes
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !mainId) return;
    chart.updateMainId(mainId);
    chart.updateTree({ tree_position: "main_to_middle", transition_time: t });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mainId]);

  return { containerRef, apiRef };
}
```

> Dev-verify during Task 9: `setStyle("imageCircleRect")` + `setCardImageField("avatar")` render the photo with the default person icon as fallback; if dims look off, tune `setCardDim` then - values are a starting point, not gospel.

- [ ] **Step 5.2: Build check** - `npm run build`, expected clean.

- [ ] **Step 5.3: Commit**

```bash
git add src/components/family/useFamilyChart.ts
git commit -m "feat(family): add useFamilyChart hook with real zoom and reduced-motion support"
```

---

### Phase 3 - Public explorer UI

#### Task 6: `PersonSearch` combobox

**Files:**
- Create: `src/components/family/PersonSearch.tsx`

- [ ] **Step 6.1: Write the component**

```tsx
import React, { useId, useMemo, useRef, useState } from "react";
import type { FamilyPerson } from "../../types/family";

interface Props {
  people: FamilyPerson[];
  onSelect: (person: FamilyPerson) => void;
}

export const PersonSearch = ({ people, onSelect }: Props) => {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return people
      .filter((p) => p.displayName.toLowerCase().includes(q))
      .slice(0, 8);
  }, [people, query]);

  const pick = (p: FamilyPerson) => {
    onSelect(p);
    setQuery("");
    setOpen(false);
    inputRef.current?.blur();
  };

  return (
    <div className="relative w-full sm:w-64">
      <svg aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" />
      </svg>
      <input
        ref={inputRef}
        type="text"
        role="combobox"
        aria-expanded={open && matches.length > 0}
        aria-controls={listId}
        aria-activedescendant={open && matches[active] ? `${listId}-${matches[active].id}` : undefined}
        aria-label="Search family members"
        placeholder="Search person…"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); setActive(0); }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, matches.length - 1)); }
          else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
          else if (e.key === "Enter" && matches[active]) { e.preventDefault(); pick(matches[active]); }
          else if (e.key === "Escape") setOpen(false);
        }}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 pl-9 pr-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
      />
      {open && matches.length > 0 && (
        <ul id={listId} role="listbox" className="absolute z-20 mt-1 w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg overflow-hidden">
          {matches.map((p, i) => (
            <li
              key={p.id}
              id={`${listId}-${p.id}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => { e.preventDefault(); pick(p); }}
              onMouseEnter={() => setActive(i)}
              className={`px-3 py-2 text-sm cursor-pointer ${i === active ? "bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-300" : "text-slate-700 dark:text-slate-300"}`}
            >
              {p.displayName}
              {p.birthDate && <span className="ml-2 text-xs text-slate-400">b. {new Date(p.birthDate).getFullYear()}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
```

- [ ] **Step 6.2: Build check + commit**

```bash
npm run build
git add src/components/family/PersonSearch.tsx
git commit -m "feat(family): accessible person search combobox"
```

#### Task 7: `PersonDetailPanel` (panel + mobile bottom sheet)

**Files:**
- Create: `src/components/family/PersonDetailPanel.tsx`

- [ ] **Step 7.1: Write the component** (replaces `PersonInfoPanel`; props-driven, no window events; photo + initials fallback; living-person birth dates shown as year only - interim privacy rule from A5.3; relations clickable):

```tsx
import React, { useEffect, useMemo, useRef } from "react";
import type { FamilyPerson, FamilyTreeDetail } from "../../types/family";

const REL_LABEL: Record<string, string> = {
  parent: "Parent", adoptive_parent: "Adoptive parent",
  child: "Child", adopted_child: "Adopted child",
  spouse: "Spouse", sibling: "Sibling",
};

const initials = (name: string) =>
  name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");

const formatDate = (iso: string | null, yearOnly: boolean) => {
  if (!iso) return "-";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return yearOnly
    ? String(d.getFullYear())
    : d.toLocaleDateString("en-MY", { year: "numeric", month: "short", day: "numeric" });
};

interface Props {
  detail: FamilyTreeDetail;
  person: FamilyPerson | null;
  onSelectPerson: (id: number) => void;
  onClose?: () => void;   // present → rendered as mobile sheet with close button
  asSheet?: boolean;
}

export const PersonDetailPanel = ({ detail, person, onSelectPerson, onClose, asSheet }: Props) => {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (asSheet && person) closeRef.current?.focus(); }, [asSheet, person]);
  useEffect(() => {
    if (!asSheet || !person) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose?.(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [asSheet, person, onClose]);

  const nameById = useMemo(
    () => new Map(detail.people.map((p) => [p.id, p.displayName])),
    [detail],
  );
  const relations = useMemo(() => {
    if (!person) return [];
    return detail.relationships
      .filter((r) => r.personId === person.id || r.relatedPersonId === person.id)
      .map((r) => {
        const otherId = r.personId === person.id ? r.relatedPersonId : r.personId;
        return {
          label: REL_LABEL[r.relationshipType] ?? r.relationshipType,
          name: nameById.get(otherId) ?? `#${otherId}`,
          id: otherId,
        };
      });
  }, [detail, person, nameById]);

  if (!person) {
    return (
      <div className="h-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 flex items-center justify-center text-center text-sm text-slate-400 dark:text-slate-500">
        Select a person in the tree to see their details
      </div>
    );
  }

  const body = (
    <>
      <div className="flex items-center gap-3">
        {person.photoUrl ? (
          <img src={person.photoUrl} alt={person.displayName} width={56} height={56} loading="lazy"
               className="w-14 h-14 rounded-full object-cover border border-slate-200 dark:border-slate-600" />
        ) : (
          <div aria-hidden="true" className="w-14 h-14 rounded-full bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300 flex items-center justify-center font-semibold">
            {initials(person.displayName)}
          </div>
        )}
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 truncate">{person.displayName}</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {person.isLiving ? "Living" : "Deceased"}
          </p>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
        <div>
          <dt className="text-xs text-slate-500 dark:text-slate-400">Born</dt>
          <dd className="text-slate-800 dark:text-slate-200">{formatDate(person.birthDate, person.isLiving)}</dd>
        </div>
        {!person.isLiving && (
          <div>
            <dt className="text-xs text-slate-500 dark:text-slate-400">Died</dt>
            <dd className="text-slate-800 dark:text-slate-200">{formatDate(person.deathDate, false)}</dd>
          </div>
        )}
      </dl>

      {person.notes && (
        <p className="text-sm text-slate-600 dark:text-slate-300 border-t border-slate-100 dark:border-slate-700 pt-3">{person.notes}</p>
      )}

      {relations.length > 0 && (
        <div className="border-t border-slate-100 dark:border-slate-700 pt-3 space-y-1.5">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Relationships</p>
          {relations.map((r, i) => (
            <button key={i} type="button" onClick={() => onSelectPerson(r.id)}
              className="flex w-full items-baseline gap-2 text-sm text-left rounded px-1 -mx-1 hover:bg-slate-50 dark:hover:bg-slate-700/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500">
              <span className="shrink-0 text-xs text-slate-400 dark:text-slate-500 w-24">{r.label}</span>
              <span className="text-cyan-700 dark:text-cyan-400">{r.name}</span>
            </button>
          ))}
        </div>
      )}
    </>
  );

  if (asSheet) {
    return (
      <div role="dialog" aria-modal="true" aria-label={`Details for ${person.displayName}`} className="fixed inset-0 z-40 lg:hidden">
        <button aria-label="Close details" className="absolute inset-0 bg-black/40" onClick={onClose} />
        <div className="absolute inset-x-0 bottom-0 max-h-[70vh] overflow-y-auto rounded-t-2xl bg-white dark:bg-slate-800 p-5 space-y-4 motion-safe:transition-transform">
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Close details"
            className="absolute right-4 top-4 rounded-md p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500">
            <svg aria-hidden="true" className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
          {body}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 overflow-y-auto space-y-4">
      {body}
    </div>
  );
};
```

- [ ] **Step 7.2: Build check + commit**

```bash
npm run build
git add src/components/family/PersonDetailPanel.tsx
git commit -m "feat(family): person detail panel with avatar, privacy-aware dates, mobile sheet"
```

#### Task 8: `FamilyListView`, `FamilyToolbar`, `FamilyTreeCanvas`

**Files:**
- Create: `src/components/family/FamilyListView.tsx`
- Create: `src/components/family/FamilyToolbar.tsx`
- Create: `src/components/family/FamilyTreeCanvas.tsx`

- [ ] **Step 8.1: `FamilyListView.tsx`**

```tsx
import React from "react";
import type { FamilyTreeDetail } from "../../types/family";

const initials = (name: string) =>
  name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");

interface Props {
  detail: FamilyTreeDetail;
  selectedId: number | null;
  onSelect: (id: number) => void;
}

export const FamilyListView = ({ detail, selectedId, onSelect }: Props) => {
  const relCount = new Map<number, number>();
  for (const r of detail.relationships) {
    relCount.set(r.personId, (relCount.get(r.personId) ?? 0) + 1);
    relCount.set(r.relatedPersonId, (relCount.get(r.relatedPersonId) ?? 0) + 1);
  }
  const people = [...detail.people].sort((a, b) =>
    a.displayName.localeCompare(b.displayName),
  );

  return (
    <ul className="grid gap-2 sm:grid-cols-2" aria-label="Family members list">
      {people.map((p) => (
        <li key={p.id}>
          <button
            type="button"
            onClick={() => onSelect(p.id)}
            aria-current={selectedId === p.id ? "true" : undefined}
            className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 ${
              selectedId === p.id
                ? "border-cyan-500/60 bg-cyan-50 dark:bg-cyan-900/15"
                : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-cyan-500/40"
            }`}
          >
            {p.photoUrl ? (
              <img src={p.photoUrl} alt="" width={40} height={40} loading="lazy" className="w-10 h-10 rounded-full object-cover" />
            ) : (
              <span aria-hidden="true" className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 flex items-center justify-center text-sm font-medium">
                {initials(p.displayName)}
              </span>
            )}
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium text-slate-900 dark:text-slate-100">{p.displayName}</span>
              <span className="block text-xs text-slate-500 dark:text-slate-400">
                {p.birthDate ? `b. ${new Date(p.birthDate).getFullYear()}` : ""}
                {!p.isLiving ? " · deceased" : ""}
                {` · ${relCount.get(p.id) ?? 0} relations`}
              </span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
};
```

- [ ] **Step 8.2: `FamilyToolbar.tsx`**

```tsx
import React from "react";
import type { FamilyPerson } from "../../types/family";
import { PersonSearch } from "./PersonSearch";

export type ExplorerView = "tree" | "list";

interface Props {
  people: FamilyPerson[];
  view: ExplorerView;
  vertical: boolean;
  onSelectPerson: (p: FamilyPerson) => void;
  onViewChange: (v: ExplorerView) => void;
  onOrientationChange: (vertical: boolean) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
  onCenterMain: () => void;
}

const iconBtn =
  "inline-flex items-center justify-center rounded-md border border-slate-300 dark:border-slate-600 w-9 h-9 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 disabled:opacity-40";

const segBtn = (active: boolean) =>
  `px-3 py-1.5 text-sm rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 ${
    active
      ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm"
      : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
  }`;

export const FamilyToolbar = (p: Props) => {
  const treeMode = p.view === "tree";
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 flex flex-wrap items-center gap-3">
      <PersonSearch people={p.people} onSelect={p.onSelectPerson} />

      <div role="group" aria-label="View mode" className="flex rounded-lg bg-slate-100 dark:bg-slate-900/60 p-1">
        <button type="button" className={segBtn(treeMode)} aria-pressed={treeMode} onClick={() => p.onViewChange("tree")}>Tree</button>
        <button type="button" className={segBtn(!treeMode)} aria-pressed={!treeMode} onClick={() => p.onViewChange("list")}>List</button>
      </div>

      <div role="group" aria-label="Tree controls" className="flex items-center gap-1.5 ml-auto">
        <button type="button" className={iconBtn} aria-label="Toggle orientation" disabled={!treeMode}
          onClick={() => p.onOrientationChange(!p.vertical)} title={p.vertical ? "Switch to horizontal" : "Switch to vertical"}>
          <svg aria-hidden="true" className={`w-4 h-4 transition-transform ${p.vertical ? "" : "rotate-90"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m-6-6l6 6 6-6" /></svg>
        </button>
        <button type="button" className={iconBtn} aria-label="Zoom out" disabled={!treeMode} onClick={p.onZoomOut}>
          <svg aria-hidden="true" className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeWidth="2" d="M5 12h14" /></svg>
        </button>
        <button type="button" className={iconBtn} aria-label="Zoom in" disabled={!treeMode} onClick={p.onZoomIn}>
          <svg aria-hidden="true" className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeWidth="2" d="M12 5v14M5 12h14" /></svg>
        </button>
        <button type="button" className={iconBtn} aria-label="Fit tree to view" disabled={!treeMode} onClick={p.onFit}>
          <svg aria-hidden="true" className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V5a1 1 0 011-1h3m8 0h3a1 1 0 011 1v3m0 8v3a1 1 0 01-1 1h-3m-8 0H5a1 1 0 01-1-1v-3" /></svg>
        </button>
        <button type="button" className={iconBtn} aria-label="Center on selected person" disabled={!treeMode} onClick={p.onCenterMain}>
          <svg aria-hidden="true" className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3" strokeWidth="2" /><path strokeLinecap="round" strokeWidth="2" d="M12 2v4m0 12v4M2 12h4m12 0h4" /></svg>
        </button>
      </div>
    </div>
  );
};
```

- [ ] **Step 8.3: `FamilyTreeCanvas.tsx`**

```tsx
import React from "react";
import type { Data } from "family-chart";
import { useFamilyChart, type FamilyChartApi } from "./useFamilyChart";

interface Props {
  data: Data;
  mainId: string | null;
  ancestryDepth?: number;
  progenyDepth?: number;
  onSelect: (id: string) => void;
  apiRefOut: React.MutableRefObject<FamilyChartApi | null>;
}

export const FamilyTreeCanvas = ({ data, mainId, ancestryDepth, progenyDepth, onSelect, apiRefOut }: Props) => {
  const { containerRef, apiRef } = useFamilyChart({ data, mainId, ancestryDepth, progenyDepth, onSelect });
  // expose api upward without re-renders
  apiRefOut.current = apiRef.current;
  React.useEffect(() => { apiRefOut.current = apiRef.current; });

  return (
    <div
      role="application"
      aria-label="Interactive family tree. Drag to pan, scroll or pinch to zoom. Use the List view for keyboard access."
      className="h-full w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-family-canvas overflow-hidden"
    >
      <div ref={containerRef} className="f3 h-full w-full" />
    </div>
  );
};
```

- [ ] **Step 8.4: Build check + commit**

```bash
npm run build
git add src/components/family/FamilyListView.tsx src/components/family/FamilyToolbar.tsx src/components/family/FamilyTreeCanvas.tsx
git commit -m "feat(family): list view, toolbar, and tree canvas components"
```

#### Task 9: `FamilyExplorer` island

**Files:**
- Create: `src/components/family/FamilyExplorer.tsx`

- [ ] **Step 9.1: Write the island root**

```tsx
import React, { useMemo, useRef, useState } from "react";
import type { FamilyPerson, FamilyTreeDetail } from "../../types/family";
import { buildChartData } from "./chart-data";
import { FamilyToolbar, type ExplorerView } from "./FamilyToolbar";
import { FamilyTreeCanvas } from "./FamilyTreeCanvas";
import { FamilyListView } from "./FamilyListView";
import { PersonDetailPanel } from "./PersonDetailPanel";
import type { FamilyChartApi } from "./useFamilyChart";

interface Props {
  detail: FamilyTreeDetail;
  ancestryDepth?: number;
  progenyDepth?: number;
}

/** Resolve ?p= deep link: globalKey first, then numeric id. */
const resolveDeepLink = (detail: FamilyTreeDetail): number | null => {
  if (typeof window === "undefined") return null;
  const raw = new URLSearchParams(window.location.search).get("p");
  if (!raw) return null;
  const byKey = detail.people.find(
    (x) => (x.globalKey || "").toLowerCase() === raw.toLowerCase(),
  );
  if (byKey) return byKey.id;
  const idNum = Number(raw);
  return detail.people.some((x) => x.id === idNum) ? idNum : null;
};

export const FamilyExplorer = ({ detail, ancestryDepth, progenyDepth }: Props) => {
  const chartData = useMemo(() => buildChartData(detail), [detail]);
  const [view, setView] = useState<ExplorerView>("tree");
  const [vertical, setVertical] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(
    () => resolveDeepLink(detail) ?? detail.tree.defaultMainPersonId ?? detail.people[0]?.id ?? null,
  );
  const [sheetOpen, setSheetOpen] = useState(false);
  const apiRef = useRef<FamilyChartApi | null>(null);

  const selected = useMemo(
    () => detail.people.find((p) => p.id === selectedId) ?? null,
    [detail, selectedId],
  );

  const syncUrl = (p: FamilyPerson | null) => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (p) url.searchParams.set("p", p.globalKey || String(p.id));
    else url.searchParams.delete("p");
    window.history.replaceState(null, "", url);
  };

  const selectPerson = (id: number, { center = true, openSheet = false } = {}) => {
    setSelectedId(id);
    const p = detail.people.find((x) => x.id === id) ?? null;
    syncUrl(p);
    if (center) apiRef.current?.setMain(String(id));
    if (openSheet) setSheetOpen(true);
  };

  if (detail.people.length === 0) {
    return (
      <div className="h-[420px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-sm text-slate-500 dark:text-slate-400">
        No family members have been added yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <FamilyToolbar
        people={detail.people}
        view={view}
        vertical={vertical}
        onSelectPerson={(p) => selectPerson(p.id, { openSheet: true })}
        onViewChange={setView}
        onOrientationChange={(v) => { setVertical(v); apiRef.current?.setOrientation(v); }}
        onZoomIn={() => apiRef.current?.zoomIn()}
        onZoomOut={() => apiRef.current?.zoomOut()}
        onFit={() => apiRef.current?.fit()}
        onCenterMain={() => apiRef.current?.centerMain()}
      />

      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-4">
        <div className={view === "tree" ? "h-[65vh] min-h-[420px] lg:h-[580px]" : ""}>
          {view === "tree" ? (
            <FamilyTreeCanvas
              key={detail.tree.slug}
              data={chartData}
              mainId={selectedId !== null ? String(selectedId) : null}
              ancestryDepth={ancestryDepth}
              progenyDepth={progenyDepth}
              onSelect={(id) => selectPerson(Number(id), { center: false, openSheet: true })}
              apiRefOut={apiRef}
            />
          ) : (
            <FamilyListView detail={detail} selectedId={selectedId} onSelect={(id) => selectPerson(id, { center: false, openSheet: true })} />
          )}
        </div>

        {/* Desktop side panel */}
        <div className="hidden lg:block lg:h-[580px]">
          <PersonDetailPanel detail={detail} person={selected} onSelectPerson={(id) => selectPerson(id)} />
        </div>
      </div>

      {/* Mobile bottom sheet */}
      {sheetOpen && selected && (
        <PersonDetailPanel
          detail={detail}
          person={selected}
          asSheet
          onClose={() => setSheetOpen(false)}
          onSelectPerson={(id) => selectPerson(id)}
        />
      )}
    </div>
  );
};
```

- [ ] **Step 9.2: Build check + commit**

```bash
npm run build
git add src/components/family/FamilyExplorer.tsx
git commit -m "feat(family): FamilyExplorer island with deep links, list view, mobile sheet"
```

#### Task 10: Theme tokens + family-chart light/dark CSS

**Files:**
- Modify: `src/styles/index.css` (replace the single `--color-family-canvas` definition)
- Create: `src/styles/family-chart-theme.css`

- [ ] **Step 10.1: Theme the canvas token** - in `src/styles/index.css`, change `--color-family-canvas: #212121;` to a light value and add a dark override alongside the existing dark-mode pattern:

```css
/* in the :root / @theme block */
--color-family-canvas: #f1f5f9;   /* slate-100 - light mode canvas */

/* with the other .dark overrides */
.dark { --color-family-canvas: #1a1f29; }
```

(If the project's Tailwind v4 `@theme` block can't be overridden per-class, define `--color-family-canvas` as a plain CSS custom property on `:root`/`.dark` and keep the `bg-family-canvas` utility mapped to `var(--color-family-canvas)`.)

- [ ] **Step 10.2: Create `src/styles/family-chart-theme.css`** and import it from `index.css` (`@import "./family-chart-theme.css";`):

```css
/* Light/dark theming for family-chart (.f3) to match the portfolio palette. */
.f3 {
  --f3-card-bg: #ffffff;
  --f3-card-text: #0f172a;        /* slate-900 */
  --f3-card-sub: #64748b;         /* slate-500 */
  --f3-card-border: #e2e8f0;      /* slate-200 */
  --f3-card-main: #0891b2;        /* cyan-600 - main person accent */
  --f3-link: #94a3b8;             /* slate-400 connectors */
}
.dark .f3 {
  --f3-card-bg: #1e293b;          /* slate-800 */
  --f3-card-text: #f1f5f9;
  --f3-card-sub: #94a3b8;
  --f3-card-border: #334155;
  --f3-card-main: #22d3ee;        /* cyan-400 */
  --f3-link: #475569;
}

.f3 .card-inner, .f3 .card_cont .card { /* verify exact class names in dev */
  background: var(--f3-card-bg);
  color: var(--f3-card-text);
  border: 1px solid var(--f3-card-border);
}
.f3 .link { stroke: var(--f3-link); }
.f3 .card_main .card-inner { border-color: var(--f3-card-main); box-shadow: 0 0 0 1px var(--f3-card-main); }
```

> **Dev-verify step:** open the page, inspect rendered `.f3` DOM, and adjust the selector names to what `family-chart/styles/family-chart.css` actually emits (`.card_cont`, `.card-inner`, `.card_main`, `.link` are the expected ones for HTML cards - confirm and fix in place). Check text contrast in light mode.

- [ ] **Step 10.3: Build + visual check** - `npm run build`; `npm run dev` → `/family` in both themes. Expected: light canvas/cards in light mode, dark in dark.

- [ ] **Step 10.4: Commit**

```bash
git add src/styles/index.css src/styles/family-chart-theme.css
git commit -m "feat(family): light/dark theme for family chart canvas and cards"
```

#### Task 11: Rewrite `/family` (combined page, SSR)

**Files:**
- Rewrite: `src/pages/family/index.astro`

- [ ] **Step 11.1: Replace the page**

```astro
---
export const prerender = false;
import PublicLayout from "../../layouts/PublicLayout.astro";
import { FamilyExplorer } from "../../components/family/FamilyExplorer";
import { getPublicFamilyTrees, getPublicFamilyTreeBySlug } from "../../lib/family";
import { mergeFamilyTrees } from "../../lib/family-merge";
import { COMBINED_FAMILY } from "../../data/family";
import type { FamilyTree, FamilyTreeDetail } from "../../types/family";

let trees: FamilyTree[] = [];
let detail: FamilyTreeDetail | null = null;
let loadError = false;

try {
  trees = await getPublicFamilyTrees();
  const details = (
    await Promise.all(trees.map((t) => getPublicFamilyTreeBySlug(t.slug)))
  ).filter((d): d is FamilyTreeDetail => d !== null);
  if (details.length > 0) detail = mergeFamilyTrees(details, COMBINED_FAMILY);
} catch (err) {
  console.error("Failed to load family data:", err);
  loadError = true;
}
---

<PublicLayout title="Family">
  <section class="container-main py-24 space-y-8">
    <div class="space-y-3">
      <h1 class="text-4xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
        {COMBINED_FAMILY.name}
      </h1>
      <p class="text-slate-500 dark:text-slate-400 max-w-2xl">
        {COMBINED_FAMILY.description}
      </p>
      {trees.length > 0 && (
        <nav aria-label="Individual family trees" class="flex flex-wrap gap-2 pt-1">
          {trees.map((t) => (
            <a
              href={`/family/${t.slug}`}
              class="rounded-md px-3 py-2 text-sm text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-cyan-500/50 hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
            >{t.name}</a>
          ))}
        </nav>
      )}
    </div>

    {loadError && (
      <div role="alert" class="rounded-xl border border-red-200 dark:border-red-900/20 bg-red-50 dark:bg-red-900/5 p-4 text-sm text-red-600 dark:text-red-400">
        Failed to load family data. Please refresh to try again.
      </div>
    )}

    {!loadError && !detail && (
      <div class="h-[420px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-sm text-slate-500 dark:text-slate-400">
        Family data is not available yet.
      </div>
    )}

    {detail && (
      <FamilyExplorer client:load detail={detail} ancestryDepth={6} progenyDepth={5} />
    )}
  </section>
</PublicLayout>
```

(The entire 260-line inline script - fetch, merge, hardcoded patches, skeleton toggling - is gone.)

- [ ] **Step 11.2: Manual check** - `npm run dev` with the local API running (`npm run dev` in hono-workers): `/family` renders the merged tree server-side, no `/api/v1/family` requests from the browser on load (devtools Network), search/zoom/list/sheet all work, `?p=` updates on selection and restores on reload.

- [ ] **Step 11.3: Build + commit**

```bash
npm run build
git add src/pages/family/index.astro
git commit -m "feat(family): SSR combined family page using FamilyExplorer"
```

#### Task 12: Rewrite `/family/[slug]` (single tree, SSR)

**Files:**
- Rewrite: `src/pages/family/[slug]/index.astro`

- [ ] **Step 12.1: Replace the page**

```astro
---
export const prerender = false;
import PublicLayout from "../../../layouts/PublicLayout.astro";
import { FamilyExplorer } from "../../../components/family/FamilyExplorer";
import { getPublicFamilyTreeBySlug } from "../../../lib/family";
import type { FamilyTreeDetail } from "../../../types/family";

const slug = Astro.params.slug ?? "";
let detail: FamilyTreeDetail | null = null;
let loadError = false;

try {
  detail = await getPublicFamilyTreeBySlug(slug);
} catch (err) {
  console.error(`Failed to load family tree "${slug}":`, err);
  loadError = true;
}

if (!detail && !loadError) {
  Astro.response.status = 404;
}
---

<PublicLayout title={detail ? detail.tree.name : "Family"}>
  <section class="container-main py-24 space-y-8">
    <div class="space-y-3">
      <a href="/family" class="inline-flex items-center gap-1.5 text-sm text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 transition-colors group">
        <svg aria-hidden="true" class="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
        All families
      </a>
      <h1 class="text-4xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
        {detail ? detail.tree.name : "Family tree not found"}
      </h1>
      {detail?.tree.description && (
        <p class="text-slate-500 dark:text-slate-400 max-w-3xl">{detail.tree.description}</p>
      )}
    </div>

    {loadError && (
      <div role="alert" class="rounded-xl border border-red-200 dark:border-red-900/20 bg-red-50 dark:bg-red-900/5 p-4 text-sm text-red-600 dark:text-red-400">
        Failed to load this family tree. Please refresh to try again.
      </div>
    )}

    {!loadError && !detail && (
      <div class="h-[320px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex flex-col items-center justify-center gap-2 text-sm text-slate-500 dark:text-slate-400">
        <p>There's no family tree at this address.</p>
        <a href="/family" class="text-cyan-600 dark:text-cyan-400 hover:underline">Browse all families</a>
      </div>
    )}

    {detail && <FamilyExplorer client:load detail={detail} />}
  </section>
</PublicLayout>
```

(Removes: yellow banner, Astro-Dropdown DOM injection, both inline scripts, fixed `w-64` panel, the "No Spouse" checkbox - spouse links are core information; YAGNI for a public viewer.)

- [ ] **Step 12.2: Manual check** - `/family/hafiz-family` works; `/family/nonexistent` returns 404 status with friendly state; mobile layout sane at 375 px.

- [ ] **Step 12.3: Build + commit**

```bash
npm run build
git add "src/pages/family/[slug]/index.astro"
git commit -m "feat(family): SSR single-tree page with proper 404 and responsive explorer"
```

---

### Phase 4 - Cleanup, accessibility pass, docs

#### Task 13: Delete dead components

**Files:**
- Delete: `src/components/family/CombinedFamilyExplorer.tsx`
- Delete: `src/components/family/PublicFamilyExplorer.tsx`
- Delete: `src/components/family/PersonInfoPanel.tsx`

- [ ] **Step 13.1: Verify nothing imports them**

Run: `grep -rn "CombinedFamilyExplorer\|PublicFamilyExplorer\|PersonInfoPanel" src/`
Expected: no hits outside the three files themselves.

- [ ] **Step 13.2: Delete, build, commit**

```bash
rm src/components/family/CombinedFamilyExplorer.tsx src/components/family/PublicFamilyExplorer.tsx src/components/family/PersonInfoPanel.tsx
npm run build
git add -A src/components/family
git commit -m "chore(family): remove superseded explorer/panel components"
```

#### Task 14: Accessibility verification pass

**Files:** touch-ups only in components from Phase 3 as findings require.

- [ ] **Step 14.1:** Walk the B6 checklist on `/family` and `/family/[slug]` (keyboard only, then VoiceOver spot-check, then `prefers-reduced-motion` emulation in devtools). Fix findings in place.
- [ ] **Step 14.2:** Lighthouse a11y audit in devtools - target ≥ 95 on both pages. Note remaining items (the SVG tree itself won't be fully screen-reader navigable; List view is the documented alternative).
- [ ] **Step 14.3:** Commit fixes: `git commit -am "fix(family): accessibility pass findings"`

#### Task 15: Update CLAUDE.md (stale sections)

**Files:**
- Modify: `CLAUDE.md` (sections "Family tree", "Public family pages")

- [ ] **Step 15.1: Rewrite the two family sections** to describe reality: SSR request-time fetching in frontmatter, `FamilyExplorer` island and props-based state, `useFamilyChart` hook, themed canvas, the admin-only window-event contract retained in `FamilyTreeChart`, merge in `src/lib/family-merge.ts` + config in `src/data/family.ts`.

- [ ] **Step 15.2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md family architecture sections"
```

---

### Phase 5 (OPTIONAL, separate approval - backend changes in hono-workers)

Not required for the redesign to ship; listed for completeness per the data-model review:

1. Migration `008_family_quality.sql`: `ALTER TABLE family_people ADD COLUMN birth_order INTEGER;` + backfill from metadata; `ALTER TABLE family_people ADD COLUMN visibility TEXT CHECK(visibility IN ('public','private')) DEFAULT 'public';`
2. Public service filters `visibility = 'public'`; admin UI exposes both fields.
3. Frontend: sort children by `birthOrder` column; pass private people to `setPrivateCardsConfig` (if ever exposed to members-only views).

---

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| family-chart card image/style API details differ from plan code (`setStyle`, `setCardDim` keys, `.f3` CSS class names) | Medium | Tasks 5/10 include explicit dev-verify steps; adjust in place - the API surface is confirmed from shipped `.d.ts` files, only cosmetic params may need tuning |
| Phase 0 data fix happens in production D1; mistakes affect the live site | Medium | Run `--local` first, verify with SELECTs, KV cache gives a 2-min grace; statements are `INSERT OR IGNORE`/targeted UPDATEs |
| Combined-view merged person IDs are unstable across data changes → `?p=` links break | Low | Deep links prefer `globalKey`; numeric id is only a fallback |
| Admin regression via shared `FamilyTreeChart` edits (Tasks 3–4) | Medium | Props/events kept identical; explicit admin smoke test in Task 4.3; cross-tree deletion verified unused by grep |
| SSR fetch adds TTFB; API cold/unreachable → error page | Low | API is KV-cached (120 s) + HTTP SWR; server-rendered error state is honest and instant; previously the page failed client-side anyway |
| Same-named people without `global_key` still merge incorrectly | Low after Phase 0 | Phase 0 backfills keys; fallback documented in `family-merge.ts` |
| `prerender = false` on Cloudflare means every visit hits the worker | Accepted | Matches the rest of the site's model; data freshness wanted |

## Testing checklist (final, before review)

- [ ] `npm run build` - zero TypeScript/build errors
- [ ] `/family`: tree renders SSR-fast; tabs link to slug pages; search → select centers person; zoom buttons actually zoom (not spacing); Fit/Center work; orientation toggle works
- [ ] `/family/[slug]`: valid slug renders; bogus slug → 404 + friendly state; back link works
- [ ] Deep link: select person → URL gains `?p=`; reload restores selection; link with `?p=<globalKey>` works on combined view
- [ ] Mobile (375 px, devtools + real device if possible): toolbar wraps cleanly, pinch/pan works, person sheet opens/closes (tap, Escape, backdrop), List view usable
- [ ] Light + dark mode: canvas/cards themed correctly, AA contrast on card text
- [ ] Empty state: temporarily point `PUBLIC_API_URL` at a dead port → server-rendered error state on both pages (no infinite skeleton)
- [ ] Admin smoke: `/admin/family` list, builder chart click/select/inline-add still work; no public-API fetch storm on card clicks
- [ ] Reduced motion: emulate in devtools → no chart animation
- [ ] Lighthouse: a11y ≥ 95; perf check that no `family*noCache*` requests appear anywhere

## Files expected to change

**portfolio-astro (this repo)**

| Change | File |
|---|---|
| Modify | `src/lib/family.ts` |
| Create | `src/lib/family-merge.ts`, `src/data/family.ts` |
| Create | `src/components/family/chart-data.ts`, `useFamilyChart.ts`, `FamilyExplorer.tsx`, `FamilyToolbar.tsx`, `PersonSearch.tsx`, `PersonDetailPanel.tsx`, `FamilyListView.tsx`, `FamilyTreeCanvas.tsx` |
| Modify (slim) | `src/components/family/FamilyTreeChart.tsx` |
| Delete | `src/components/family/CombinedFamilyExplorer.tsx`, `PublicFamilyExplorer.tsx`, `PersonInfoPanel.tsx` |
| Rewrite | `src/pages/family/index.astro`, `src/pages/family/[slug]/index.astro` |
| Modify | `src/styles/index.css`; Create `src/styles/family-chart-theme.css` |
| Modify | `CLAUDE.md` |

**hono-workers:** no code changes required (Phase 0 is data-only via wrangler d1; Phase 5 optional).

## Open decisions (need your call before/while implementing)

1. **Navbar link** - `/family` is currently unlisted (reachable only by URL). Intentional privacy choice, or should "Family" be added to the public nav? Plan does not add it by default.
2. **Public exposure of living relatives** - interim rule in Task 7 shows year-only birth dates for living people. OK, or do you want full dates / or the Phase 5 `visibility` column prioritized?
3. **Phase 5 backend work** - approve separately or drop.

---

## Codex Execution Status - 2026-06-13

Branch: `codex/family-page-phase-0-4`

### Phase 0 - Data Fix

Status: partially done.

- Done: inspected the readable backend schema/seed files in `/Users/hafiz/Developments/hono-workers`.
- Done: confirmed the backend seed already contains stable `global_key` values for the seeded cross-tree people and parent rows for `mohd-bahtiar -> muhamad-nurhafiz` and `zarina -> muhamad-nurhafiz` in `bahtiar-family`.
- Done: added `docs/reports/family-page-phase-0-d1-verification.sql` with idempotent verification/remediation SQL.
- Skipped: no local or remote D1 write was performed from this portfolio branch. The backend repo is outside this writable workspace, and production data should be reviewed/applied separately.
- Note: `hafiz-family` does not contain the parent people in the seed, so inserting those two parent rows there would not be valid without adding people. The frontend now relies on keyed cross-tree merging rather than name patches.

### Phase 1 - Server-Side Data Layer

Status: done.

- Removed public cache-busting from `src/lib/family.ts`.
- Public family reads now use a scoped `publicGet` helper without `noCache`, timestamp params, credentials, or `cache: "no-store"` so backend KV/HTTP cache behavior is preserved.
- Added `src/data/family.ts`.
- Added pure keyed merge logic in `src/lib/family-merge.ts`.
- Added `src/lib/family-privacy.ts` so public SSR props are strict whitelist DTOs. Public island payloads now contain only tree slug/name/description/default main id, person id/display name/global key/gender/year-only living birth date/deceased death date/living status/photo URL, and relationship endpoints/type.
- Stripped notes, metadata/raw JSON blobs, first/last names, tree IDs, relationship IDs, timestamps, relationship dates, `isPrimary`, `isPublic`, `createdByUserId`, and other backend/admin-only fields from public island payloads.
- Removed frontend hardcoded person-name matching from the public family flow.

### Phase 2 - Chart Core Refactor

Status: mostly done.

- Added framework-independent chart transform in `src/lib/chart-data.ts`.
- Added reusable public chart hook in `src/hooks/useFamilyChart.ts`.
- Public chart controls now use real `family-chart` zoom handlers.
- Legacy/admin `FamilyTreeChart.tsx` also uses real zoom for its existing event API and `window.familyChartApi`.
- Removed the cross-tree N+1 fetch/navigation block from `FamilyTreeChart.tsx`.
- Kept `enableCrossTreeNavigation?: boolean` as a deprecated no-op prop to avoid breaking current admin builder props.
- Skipped: deeper shared-hook migration of the legacy admin chart. The admin chart still owns its inline-add/event behavior to reduce regression risk.

### Phase 3 - New UI

Status: done for code; pending manual QA.

- Replaced both public pages with request-time SSR data loading and one `FamilyExplorer` island per page.
- Added toolbar search, tree/list toggle, orientation, zoom in/out, fit, reset view, and center controls.
- Added desktop details panel and mobile bottom sheet with Escape/backdrop close and focus return.
- Added mobile/keyboard list fallback.
- Added avatar card support in the public chart hook and avatar/initial fallbacks in details/list views.
- Added `?p=<globalKey>` deep-link syncing/restoration and fixed chart initialization so deep links selected before async chart load still center correctly.
- Added 404, empty, and error states.
- Removed the yellow debug banner and fixed-width public side panel.
- Kept `/family` unlisted from the public navbar.
- Skipped: expand/depth controls in the UI because `family-chart` only provides global depth settings and no clean per-branch collapse API.

### Phase 4 - Cleanup, Accessibility, Docs

Status: done for code/docs; pending manual accessibility audit.

- Deleted superseded public components after confirming imports were removed:
  - `src/components/family/CombinedFamilyExplorer.tsx`
  - `src/components/family/PublicFamilyExplorer.tsx`
  - `src/components/family/PersonInfoPanel.tsx`
- Updated stale `CLAUDE.md` family architecture notes.
- Added this execution status and the handoff report at `docs/reports/family-page-codex-handoff.md`.
- Accessibility implemented in code: labels on icon buttons, combobox roles/keyboard support, dialog role/Escape close/focus return for mobile sheet, list fallback, focus rings, reduced-motion handling in chart hook.
- Broader public payload sensitive-field minimization is done in code through the strict public DTO sanitizer.
- Not manually completed: browser/VoiceOver/Lighthouse responsive audits. Build passes, but visual and assistive-tech verification should be done by the next reviewer.

### Verification

- `npm run build`: passed.
- Follow-up `npm run build` after final local patches: passed.
- Privacy DTO follow-up `npm run build`: passed.
- Privacy DTO follow-up `git diff --check`: passed.
- `npm run`: confirmed no `lint`, `typecheck`, or test scripts exist.
- Manual browser testing: not completed in this pass.
