# Admin Family Chart - Layout & Theme Fix

> Fixes the `/admin/family/new` + `/admin/family/edit` visual builder: the chart now defaults to a
> readable, person-centered view (instead of an unreadably tiny full-tree fit), responds to container
> resize, and has an intentional, higher-contrast dark theme. Scoped to the admin chart + theme.
> Date: 2026-06-14 · Branch: `main`.

---

## Actual root cause (two distinct problems)

The previous fix only added a fixed-height wrapper (`h-[70vh]`) in `FamilyTreeBuilder.tsx`. That fixed
the *container collapse* (the box is now large), but two separate problems remained:

### 1. "Tiny nodes" - wrong default zoom strategy (not a height problem)

`FamilyTreeChart.tsx` initialized the chart with `tree_position: "fit"` (and `initial: true`, which
**forces** a fit). Reading the library source (`family-chart@0.9.0`):

```js
// calculateTreeFit(svg_dim, tree_dim)
let k = Math.min(svg_dim.width / tree_dim.width, svg_dim.height / tree_dim.height);
if (k > 1) k = 1;   // never zooms in past 1:1
```

`fit` scales the **entire** tree into the viewport. The admin builder renders deep trees
(`ancestryDepth = 6`, `progenyDepth = 5`, siblings + spouses), so `tree_dim` is large, `k` becomes a
small fraction, and every card is drawn at that tiny scale - regardless of how big the box is. **More
height does not help**: a bigger viewport still divides into a much bigger tree.

The public `/family` page happens to look acceptable with `fit` because of its viewport, but for an
**editing** tool the correct default is to center on the person being edited at a readable scale.

### 2. Washed-out theme - cards blend into the canvas

The admin area is always-dark (`PrivateLayout` locks `.dark`). The shared theme set card background
`#1e293b` on a canvas of `#1a1f29` - nearly identical - so cards read as low-contrast gray boxes, and
links (`#475569`) were nearly invisible. HTML cards also weren't given any gender/main accent.

## Why the previous height-only fix was insufficient

Height fixed the *container collapse* (a real, separate bug - `min-height` doesn't give percentage-
height children a definite height). But the "tiny" symptom is caused by the **fit zoom math**, not by
the container size. With `tree_position: "fit"`, a large family always renders tiny no matter how tall
the box is. The real fix is to change the default view strategy and add resize handling, plus a proper
dark theme.

## Exact chart sizing / zoom / fit changes (`src/components/family/FamilyTreeChart.tsx`)

- **Default view = center the focused person at 1:1**, not fit-all. Added a module helper
  `centerOnMain(chart, t)` → `chart.updateTree({ tree_position: "main_to_middle", scale: 1, transition_time: t })`.
  At `scale: 1`, `cardToMiddle` applies a 100% zoom, so cards render at their natural size
  (deterministically readable) centered on the main person. The library's `ViewProps.scale` is typed,
  so this is type-safe.
- **Init sequence**: render once (`updateTree({ initial: true, transition_time: 0 })`) then
  `centerOnMain(chart, 0)`. Removed the old `applyZoom(chart, "fit")` and the `initial + fit` call.
- **ResizeObserver** on the chart container: re-centers the main person (debounced via
  `requestAnimationFrame`, ignores sub-2px noise and zero sizes) when the canvas is first laid out or
  resized (window resize, sidebar toggle). This also covers the "initialized before the container had
  real dimensions" case. Cleaned up (`disconnect`) on unmount.
- **Orientation toggle** (both the `setOrientation` API and the `family:set-orientation` event) now
  `centerOnMain(...)` instead of `fit`, so flipping vertical/horizontal stays readable.
- **Explicit card size** `card.setCardDim({ w: 220, h: 80 })` for consistent, readable admin cards.
- **Preserved**: the toolbar **Fit** control (`family:fit`) still does a full fit-all on demand;
  **Center Main**, **Zoom in/out**, card-click re-center, inline add/edit, and the entire window-event
  contract are unchanged.

## Exact theme / color changes

- `src/components/family/FamilyTreeChart.tsx`: the chart container now carries a
  **`family-chart--admin`** class (and no longer relies on `bg-family-canvas`).
- `src/styles/family-chart-theme.css`: appended an admin-scoped block (all selectors prefixed
  `.family-chart--admin`, so the public `.f3` chart is untouched):
  - Canvas: deliberate `#0b1220` with a faint dotted grid (intentional, not flat gray).
  - Cards: lighter `#1e2a3d` on the dark canvas with a `#3a4d6b` border, rounded, subtle shadow →
    clear separation and contrast.
  - Subtle **gender accent** stripe (`card-male` blue, `card-female` mauve, genderless slate).
  - **Selected/main** card: cyan ring (`#22d3ee`).
  - **Add-relative** placeholder cards: calm dashed cyan (visible, not neon).
  - Brighter connector links; styled avatar placeholder icon.

## Manual verification checklist (requires an authenticated admin session + a tree with people)

- [ ] `/admin/family/edit` (real tree): chart fills the canvas; cards are **readable** (≈100%),
      centered on the default/selected person - not tiny.
- [ ] `/admin/family/new`: empty/seed state renders sanely.
- [ ] Click a card → it re-centers on that person at a readable scale.
- [ ] **Fit** → zooms out to show the whole tree (intended). **Center Main** → returns to the person.
- [ ] **Vertical/Horizontal** toggle → re-centers readable in the new orientation.
- [ ] **Add Father / Mother / Spouse / Son / Daughter** still open the inline form and create relatives.
- [ ] Resize the window / toggle the sidebar → chart re-centers, stays readable.
- [ ] Theme: cards clearly stand out from the canvas; main person has a cyan ring; links visible.
- [ ] Public `/family` unchanged (light + dark).

## Verification performed here

- `npm run build` → exit 0, no errors. `git diff --check` → clean.
- Root cause and fix confirmed against `family-chart@0.9.0` source (`calculateTreeFit`, `cardToMiddle`,
  `ViewProps`). At `scale: 1` there is **no** code path that yields a tiny render - cards draw at their
  natural size.
- Public no-regression confirmed: dev server vs the prod read-only API → `/family` 200, renders the
  `FamilyExplorer` island, and `family-chart--admin` appears **only** as bundled CSS selectors (0
  element-applied occurrences on public). Public chart code (`useFamilyChart`/`FamilyTreeCanvas`)
  imports none of the changed files.

## Remaining limitations / risks

- **Not visually verified in the live admin page** - that route needs an authenticated session and a
  populated tree, which this environment cannot reach. The sizing fix is backed by deterministic
  library-source analysis; the theme is standard scoped CSS. Final visual sign-off is the one manual
  step above. (Per instruction, no synthetic repro was used as proof this time.)
- Admin is **always-dark** by design (`PrivateLayout`), so the admin chart theme targets dark only;
  the public page retains full light/dark support.
- The builder **chrome** (add-action buttons, inputs, inspector panel) still uses its existing
  `bg-gray-900/30` / accent styling. The chart canvas + cards (the main complaint) are addressed;
  a broader builder-chrome polish was intentionally left out of scope to avoid unverifiable churn.
- The ResizeObserver re-centers on the main person on resize; if a user has manually panned/zoomed and
  then resizes, the view re-centers (acceptable for an editor; resizes are infrequent).
