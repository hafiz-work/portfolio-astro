# Family Page Review - Senior Astro/React, Frontend Architecture, QA & Privacy

**Branch:** `codex/family-page-phase-0-4`
**Reviewed commit:** `f72858faa7a0b8160a6578a84d0c886eac3c983c` - _refactor family page explorer and SSR data flow_
**Reviewer pass date:** 2026-06-13
**Backend used for runtime checks:** production read-only API `https://api.hafizbahtiar.com/api/v1` (GET only, no mutation)

---

## 1. Overall verdict

**APPROVE - safe to push after applying the small review-fix patch in this pass.**

Codex's Phase 0–4 refactor is solid. The public family pages now load data in Astro frontmatter
(SSR at request time), pass a single sanitized DTO into one `FamilyExplorer` React island, use real
`family-chart` d3 zoom, and the strict privacy whitelist holds up against real production data. Admin
compatibility is preserved. I found and patched one real (minor, timezone-dependent) display bug; no
blocking issues remain.

The implementation is **safe to push** once the 6 review-fix files below are committed. No remote D1
migration was run; no production/remote data was mutated; `/family` remains unlinked from the navbar.

---

## 2. Tested routes / what I tested

End-to-end SSR rendering was exercised by running the dev server against the **production read-only API**
and inspecting the actual rendered HTML and the serialized island payload.

| Route / scenario | Result |
|---|---|
| `GET /family` (combined) | 200, exactly **1** `FamilyExplorer` island, full sanitized payload |
| `GET /family/hafiz-family` (single tree) | 200, exactly **1** island, `detail` prop present |
| `GET /family/does-not-exist-xyz` | **HTTP 404** + "no family tree at this address" UI state |
| `GET /family?p=muhamad-nurhafiz` (deep link) | 200, renders; deep-link resolution reviewed in code |
| Privacy: island payload field audit vs. real data | All fields match the allowed whitelist exactly |
| Privacy: living-person date sanitization (69 living / 8 deceased) | All living year-only birth + null death; deceased keep full dates |
| `npm run build` | exit 0, no errors |
| `git diff --check` | clean |
| Chart/zoom API names vs. installed `family-chart@0.9.0` | `manualZoom`, `zoomTo`, and all `Chart` methods exist |
| Admin consumers (`FamilyManager`, `FamilyTreeBuilder`) prop compatibility | verified statically |

Confirmed structurally:
- SSR data loaded in Astro frontmatter (`src/pages/family/index.astro`, `[slug]/index.astro`).
- The old browser-side fetch waterfall is gone (no client `fetch` of family API in the public island).
- Cache-buster params are gone - `FamilyService.publicGet()` uses a plain `fetch` with no `noCache`
  query param and bypasses the no-store `ApiClient` path (keeps backend KV/HTTP cache effective).
- Empty / error / 404 states all render correctly (page-level and island-level empty states exist).
- Exactly one `FamilyExplorer` island per page (verified by parsing `<astro-island>` elements).

---

## 3. Bugs found

1. **Timezone-dependent birth-year display (real, minor).** Browser-side display helpers re-parsed
   already-sanitized year strings with `new Date(value).getFullYear()`. For viewers **west of UTC**, a
   living person whose public birth date is the year-only string `"2022"` would render as `2021`
   (`new Date("2022")` is UTC midnight, shifted back across the year boundary). Same off-by-one applies
   to deceased full dates at Jan-1 boundaries. SSR runs on Cloudflare (UTC) so the privacy reduction
   itself is correct; this was a **display-value** bug for non-UTC visitors. Affected:
   `chart-data.ts`, `FamilyListView.tsx`, `PersonSearch.tsx`, `PersonDetailPanel.tsx`.
   The SSR privacy reducer `yearOnly()` in `family-privacy.ts` was also `Date`-first, which would
   produce a wrong (but still year-only, so non-leaking) value if SSR ever ran outside UTC.

2. **Dev-only transient - NOT a bug.** A one-time `Invalid hook call` / `Cannot read properties of null
   (reading 'useMemo')` appeared in the Vite dev log during dependency re-optimization (`optimized
   dependencies changed. reloading`). Every request after deps settled returned 200 with a fully
   rendered island and correct props. This is known Vite SSR dep-optimization flakiness, not a code
   defect; `npm run build` is clean.

No correctness, privacy, merge, admin, or accessibility blockers were found.

---

## 4. What I patched

Applied a tight, scoped fix for bug #1 only:

- **Added `src/lib/family-format.ts`** - `displayYear(value)`: extracts the leading 4-digit year
  textually (regex), with no `Date`/timezone interpretation.
- **`src/lib/chart-data.ts`** - chart `birthday`/`death` now use `displayYear(...)`.
- **`src/components/family/FamilyListView.tsx`** - list birth-year via `displayYear(...)`.
- **`src/components/family/PersonSearch.tsx`** - combobox birth-year via `displayYear(...)`.
- **`src/components/family/PersonDetailPanel.tsx`** - `formatDate(..., yearOnly=true)` via `displayYear(...)`.
- **`src/lib/family-privacy.ts`** - hardened `yearOnly()` to be regex-first (timezone-safe) with a
  `Date` fallback, so the living-person reduction is correct regardless of SSR runtime timezone.

All changes are pure/string-level and scoped to the family module. `npm run build` passes; `git diff --check` clean.

---

## 5. Files changed (this review pass)

```
A  src/lib/family-format.ts
M  src/lib/chart-data.ts
M  src/lib/family-privacy.ts
M  src/components/family/FamilyListView.tsx
M  src/components/family/PersonSearch.tsx
M  src/components/family/PersonDetailPanel.tsx
```

(Codex's commit `f72858f` itself is unchanged and not amended by this pass.)

---

## 6. Commands run / results

| Command | Result |
|---|---|
| `git status` / `git log --oneline -5` / `git show --stat f72858f` | inspected; clean tree on branch |
| `npm run build` (before patch) | exit 0 |
| `npm run build` (after patch) | exit 0, no errors |
| `git diff --check` | clean |
| `node` inspect `family-chart@0.9.0` types | `manualZoom`, `zoomTo`, all `Chart` setters present |
| `curl https://api.hafizbahtiar.com/api/v1/family` (+ `/family/hafiz-family`) | 200; inspected real field shape |
| `PUBLIC_API_URL=<prod> npm run dev` + `curl /family`, `/family/<slug>`, `/family/<bad>`, `?p=` | 200 / 200 / 404 / 200 |
| Python parse of `<astro-island>` props (Astro `[type,value]` decoded) | privacy audit passed |

Backend field shape confirmed the sanitizer is necessary: the raw API returns `treeId`, `firstName`,
`lastName`, `notes`, `metadata`, `createdAt`, `updatedAt` on people; `id`, `treeId`, `isPrimary`,
`startDate`, `endDate`, `notes`, timestamps on relationships; `createdByUserId`, `isPublic`, timestamps
on trees - **none of which appear in the island payload.**

---

## 7. Admin smoke-test result

Verified **statically** (admin routes require auth; no login attempted, no admin data touched):

- Both admin consumers still compile and pass compatible props:
  - `FamilyManager.tsx` → `<FamilyTreeChart detail currentSlug sortChildrenBy sortAscending />`.
  - `FamilyTreeBuilder.tsx` → adds `enableCrossTreeNavigation={false}` (now a **no-op**, kept for compat),
    `onSelectPerson`, `enableInlineAdd`, `onInlineCreateRelative`, depths, `showSiblings`.
- `FamilyTreeChart.tsx` retains the full inline add/edit flow and the window-event contract
  (`family:set-main`, `family:on-main-changed`, `family:on-spouses`, `family:zoom-in/out`,
  `family:fit`, `family:center-main`, `family:set-orientation`).
- The removed public cross-tree N+1 fetch storm left **no dangling references** (`family:set-data`,
  `__combinedFamilyDetail`, deleted components) - grep clean.
- Admin zoom was upgraded from fake card-spacing to **real `manualZoom`** (improvement, matches public).
- Shared `buildChartData` preserves `firstName`/`lastName`/`metadata` for the full (admin) detail, so
  card display and `metadata.birth_order` sorting still work.

**Remaining manual step:** click-through `/admin/family` (card selection, inline add father/mother/
spouse/son/daughter, fit/center/orientation) per the handoff checklist. Low risk, but not auto-verified.

---

## 8. Privacy review result - PASS

Audited the actual serialized island payload from real production data (77 people across 5 trees):

- **Person fields present:** exactly `id, displayName, globalKey, gender, birthDate, deathDate,
  isLiving, photoUrl` - matches the allowed whitelist.
- **Relationship fields present:** exactly `personId, relatedPersonId, relationshipType`.
- **Tree fields present:** exactly `slug, name, description, defaultMainPersonId`.
- **Stripped (confirmed absent):** `notes`, `metadata`, raw JSON blobs, `firstName`, `lastName`, tree
  `id`, person `treeId`, relationship `id`, `isPrimary`, relationship `startDate`/`endDate`/`notes`,
  `createdByUserId`, `isPublic`, all `createdAt`/`updatedAt`.
- **Living people (69):** every birthDate is year-only (`"1994"`, `"2022"`…); every deathDate is `null`.
- **Deceased people (8):** retain full birth/death dates as intended (e.g. `1938-01-01` / `2001-01-01`).
- Merge runs on full detail, then `sanitizeFamilyDetailForPublic` is the **last** step before the island,
  so internal merge data (notes/metadata) never reaches the browser. `buildChartData` derives names
  from `displayName` for public DTOs and never reads `firstName`/`lastName`/`metadata` when absent.

`/family` remains unlinked from the public navbar. No Phase 5 visibility schema was added.

---

## 9. D1 SQL review result - SAFE / not run

`docs/reports/family-page-phase-0-d1-verification.sql`:

- Clearly labeled "not applied", "run local first, then remote only after reviewing SELECT output."
- **Separates verification from remediation:** §1, §2, §4 are read-only `SELECT`s; §3, §5 are the
  remediation writes.
- §5 (parent bridge rows) uses `INSERT OR IGNORE` with JOIN guards scoped to `bahtiar-family` - idempotent.
- §3 backfill is idempotent (only fills `global_key IS NULL/''`).
- **One caveat to flag before running §3:** it matches by `lower(display_name)` **without tree scoping**,
  so if two genuinely distinct same-named people both lack a `global_key`, they'd be assigned the same
  key and would then **merge into one** in the combined `/family` view. The correct workflow is built in:
  run §2 first (it surfaces exactly these duplicate-name collisions), inspect, then apply §3 only if safe.
- **Not run by this pass.** No remote migration. Do not run remote until explicitly approved.

---

## 10. Remaining risks

- **Synthetic combined IDs:** combined-tree numeric IDs are assigned by merge order and can shift if data
  ordering changes; share links correctly prefer `globalKey` (numeric `id` is fallback only). Acceptable.
- **People without `globalKey`** are intentionally not merged across trees (kept distinct by `tree:id`),
  so a cross-tree person missing a `global_key` will appear twice until the D1 backfill is applied.
- **Full deceased dates** use `toLocaleDateString("en-MY", …)` on full ISO strings - could be off by one
  day for far-western timezones at midnight boundaries. Cosmetic, deceased-only, not patched (out of the
  year-only privacy path). Note for a future pass if a global audience matters.
- **Bottom sheet** does not implement full focus-trapping (Esc closes, focus enters/returns correctly).
  Acceptable for now; consider a focus trap if this becomes a primary mobile surface.
- **`family-chart` theme selectors** in `family-chart-theme.css` are conservative; spot-check in devtools
  for light/dark once the backend is wired locally.
- **Admin runtime click-through** is still manual (auth required) - see §7.

---

## 11. Recommended next commit / amend instruction

Create a **new review-fix commit** on top of Codex's commit (do **not** amend `f72858f` - keep the
handoff hash stable and the review traceable):

```
git add src/lib/family-format.ts \
        src/lib/chart-data.ts \
        src/lib/family-privacy.ts \
        src/components/family/FamilyListView.tsx \
        src/components/family/PersonSearch.tsx \
        src/components/family/PersonDetailPanel.tsx

git commit -m "fix(family): timezone-safe public birth-year display"
```

Then push the branch. Defer the D1 §3/§5 remediation to a separate, explicitly-approved step (run §1/§2
verification first). Admin click-through remains a manual gate before release.
