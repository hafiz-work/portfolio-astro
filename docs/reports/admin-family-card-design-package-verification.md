# Admin Family Card Design - Package Verification

> Date: 2026-06-14 · Branch: `main` · Scope: admin Family chart person-card styling only.
> No push, deploy, remote D1 migration, or data mutation was performed.

## Opus patch reviewed

Opus changed `src/components/family/FamilyTreeChart.tsx` so the admin chart now mirrors the public
chart API:

- `chart.setCardHtml()`
- `card.setStyle("imageCircleRect")`
- `card.setCardImageField("avatar")`
- `card.setOnHoverPathToMain()`
- `card.setCardDim({ w: 220, h: 80 })`

Opus also scoped the new admin CSS under `.family-chart--admin` in
`src/styles/family-chart-theme.css`, so the public `/family` chart is not targeted by the admin-only
rules.

## `family-chart@0.9.0` source verification

Verified in `node_modules/family-chart/dist/family-chart.esm.js` and package types:

- `CardHtml.style` supports `"imageCircleRect"` in
  `node_modules/family-chart/dist/types/core/cards/card-html.d.ts`.
- `imageCircleRect` calls `cardInnerImageCircle(d)` only when
  `d.data.data[props.cardImageField]` exists; otherwise it calls `cardInnerRect(d)`.
- `_new_rel_data` cards created by the edit flow have no `avatar`, so they also render through the
  rect path, with classes including `.card-new-rel` plus `.card-male` or `.card-female`.
- `setCardImageField("avatar")` is correct for this app because
  `src/lib/chart-data.ts` maps `person.photoUrl` to `data.avatar`.
- `setOnHoverPathToMain()` adds `.f3-path-to-main` to `div.card-inner` and connector links on hover.
- `editTree().addRelative(datum)` activates `AddRelative`, which calls
  `addDatumRelsPlaceholders(...)` and adds `_new_rel_data` placeholders for father, mother, spouse,
  son, and daughter when allowed.
- Clicking a `_new_rel_data` card is handled by the admin `setOnCardClick` path, which opens the
  package form with `editTreeRef.current.open(d.data)`.

Relevant generated class names:

- Normal person cards: `.card`, `.card-male` / `.card-female` / `.card-genderless`,
  `.card-depth-*`.
- Person with avatar under `imageCircleRect`: `.card-inner.card-image-circle`.
- Person without avatar under `imageCircleRect`: `.card-inner.card-rect`.
- Add-relative cards: `.card.card-new-rel` with `.card-inner.card-rect`.
- Empty/to-add package cards: `.card.card-to-add` with `.card-inner.card-rect`.
- Selected main card: `.card.card-main`.
- Hover path: `.f3-path-to-main` on `div.card-inner` and `.link`.

## Findings

Opus was directionally correct: `imageCircleRect`, `avatar`, and hover-path-to-main are the same
package APIs used by the public chart in `src/hooks/useFamilyChart.ts`.

One fix was needed. `setCardDim({ w: 220, h: 80 })` is emitted as inline dimensions on every HTML
card inner, including `.card-image-circle`. Without an admin CSS override, avatar cards become a
220x80 oval/pill instead of a true circular card. The package CSS defaults circles to 90x90, but
inline styles win.

The code comment in `FamilyTreeChart.tsx` also needed correction: missing-avatar cards in
`imageCircleRect` are rounded text rects, not silhouette avatar cards.

## Patch applied

Patched only Family frontend/admin chart styling and the related comment:

- Kept Opus' `FamilyTreeChart.tsx` API changes.
- Forced admin `.card-image-circle` to `92px` square with `!important`, preserving a true circular
  avatar despite package inline dimensions.
- Tuned admin circular-card label background, text color, and width to keep names readable.
- Kept gender accent stripes off circular avatar cards via `:not(.card-image-circle)`.
- Added explicit admin styles for `.card-new-rel` and `.card-to-add` so add-relative cards remain
  dashed, action-like, visible, clickable, and distinct from real person cards.
- Added gender-tinted add-relative borders/text for male/female add cards without adding a stripe to
  circular avatar cards.
- Left public `/family` behavior untouched; admin-only selectors remain scoped under
  `.family-chart--admin`.

## Add-relative preservation check

Static/package verified:

- `FamilyTreeBuilder.tsx` renders `FamilyTreeChart` with `enableInlineAdd={true}` and
  `onInlineCreateRelative={handleCanvasInlineCreateRelative}`.
- `FamilyTreeChart.tsx` calls `chart.editTree()` only when `enableInlineAdd` is true.
- It sets add-relative labels for Father, Mother, Spouse, Son, and Daughter.
- It calls `editTreeRef.current.addRelative(mainDatum)` on initial render, on selected-person
  changes, on data refresh, and on `family:set-main`.
- Package `AddRelative` creates `_new_rel_data` placeholders for father, mother, spouse, son, and
  daughter.
- Admin click handling checks `d?.data?._new_rel_data` before normal person selection and opens the
  package form.
- Submit handling maps package form fields back to the admin create flow, including `avatar` to
  `photoUrl`.

No CSS rule added here disables pointer events, changes z-index, hides add cards, or removes dashed
add-card borders.

## Manual verification checklist

Requires authenticated admin access and a real tree:

- [ ] Open `/admin/family/edit?id=<treeId>`.
- [ ] Select a real person card; inspector selection updates.
- [ ] Confirm people with `photoUrl` render as circular avatar cards.
- [ ] Confirm people without `photoUrl` render as rounded rectangle cards with readable text.
- [ ] Confirm selected/main person has a visible cyan ring.
- [ ] Confirm hover path highlights cards/connectors without making text unreadable.
- [ ] Confirm add-relative cards appear around selected person.
- [ ] Click and create Add Father.
- [ ] Click and create Add Mother.
- [ ] Click and create Add Spouse.
- [ ] Click and create Add Son.
- [ ] Click and create Add Daughter.
- [ ] Check add-card hover/click affordance and dashed styling.
- [ ] Check Fit, Center Main, Vertical, and Horizontal controls.
- [ ] Check admin chart in the existing dark admin shell and, if theme toggling is possible, light
      mode contrast.
- [ ] Open public `/family` and confirm the public chart still renders.

## Remaining risks

- Static/package verified only; authenticated admin visual confirmation is still required.
- The package hybrid style lays out the tree using the configured card dimensions, while CSS forces
  photo cards visually square. This keeps rect cards readable and photo cards circular, but final
  spacing aesthetics still need human visual sign-off in the real admin canvas.
- Public chart has existing global `.f3` theme rules outside this patch. This change did not alter
  public hook behavior or public DTO/privacy behavior.
