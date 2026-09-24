# Admin Family Builder - Light Mode Polish

> Date: 2026-06-14 · Branch: `main` · Scope: `/admin/family/new` and
> `/admin/family/edit` surrounding builder UI only. No push, deploy, remote D1 migration, or data
> mutation was performed.

## Root cause

The Family builder chrome was still mostly styled as a dark-only one-off UI. `FamilyTreeBuilder.tsx`
used hardcoded classes such as `bg-gray-900/50`, `bg-gray-800/40`, `border-gray-700`,
`text-white`, `text-gray-400`, and low-opacity dark overlays directly on sections, inputs, panels,
relationship rows, toolbar buttons, and inspector controls.

The admin shell, navbar, sidebar, shared `Select`, and global admin primitives already support
light/dark mode. The broken light-mode appearance came from the builder component bypassing those
patterns.

## Files changed

- `src/components/admin/family/FamilyTreeBuilder.tsx`
- `docs/reports/admin-family-light-mode-polish.md`

No public Family page files, backend/API files, privacy files, or chart package integration files
were changed.

## Theme strategy

- Kept styling component-local to `FamilyTreeBuilder.tsx`; no broad global admin overrides.
- Introduced local class constants for admin Family builder surfaces, inset panels, fields, labels,
  body text, toolbar buttons, empty/error states, and relation-action variants.
- Replaced dark-only gray surfaces with paired light/dark Tailwind classes:
  - Light: `bg-white`, `bg-slate-50`, `border-slate-200`, `text-slate-900`, `text-slate-600`.
  - Dark: existing deep slate surfaces via `dark:bg-slate-*`, `dark:border-slate-*`,
    `dark:text-slate-*`.
- Used controlled blue/rose/amber accents for relation actions in light mode, mapped to the previous
  cyan/pink/amber language in dark mode.
- Preserved the existing admin chart container and `FamilyTreeChart` behavior.

## UI areas fixed

- `/admin/family/new`:
  - Main create form shell.
  - Tree detail inputs and description textarea.
  - Public-tree toggle.
  - Starter Person inset panel.
  - Starter person inputs, date field, checkbox, metadata textarea.
  - Builder notes aside.
  - Error state.

- `/admin/family/edit`:
  - Loading, error, and missing-detail states.
  - Tree config section and stats cards.
  - Tree settings inputs and public-tree toggle.
  - Tree Canvas section header.
  - Fit, Center Main, Vertical, and Horizontal toolbar buttons.
  - Canvas Actions panel.
  - Add Father, Add Mother, Add Spouse, Add Son, and Add Daughter action cards.
  - Selected-person badge.
  - Chart wrapper surface around the already-polished chart.
  - Relationships panel and relationship rows.
  - Inspector panel, empty state, title/subtext.
  - Inspector quick-add buttons.
  - Person edit form inputs, date fields, notes, metadata textarea.
  - Quick relation create form.
  - Set As Main action.

## Dark mode preservation

- Dark variants intentionally keep deep slate surfaces and the existing cyan/pink/amber action
  language.
- Shared `admin-btn` classes remain in use for primary, secondary, and danger actions.
- The previous chart/card work is untouched; `FamilyTreeChart.tsx` and
  `src/styles/family-chart-theme.css` were not changed in this pass.
- Add-relative chart cards remain package-driven by `enableInlineAdd`, `editTree()`, and
  `_new_rel_data`.

## Verification performed

- Static audit of admin shell/layout/sidebar/navbar/header and shared `Select`.
- Static audit of `FamilyTreeBuilder.tsx` before/after for unpaired dark-only classes.
- Confirmed this patch does not touch public `/family` files or DTO/privacy/backend code.

## Manual verification checklist

Requires authenticated admin access and real data:

- [ ] `/admin/family/new` in light mode: white/slate surfaces, readable labels, inputs, helper text,
      and starter-person panel.
- [ ] `/admin/family/new` in dark mode: surfaces remain deep/readable.
- [ ] `/admin/family/edit?id=<treeId>` in light mode: tree config, canvas action section, toolbar,
      relationship panel, and inspector look like the admin dashboard rather than dark components.
- [ ] Same edit page in dark mode.
- [ ] Select a person and confirm inspector form readability.
- [ ] Check Add Father/Mother/Spouse/Son/Daughter action cards and quick inspector buttons.
- [ ] Confirm Fit, Center Main, Vertical, and Horizontal controls still dispatch chart events.
- [ ] Confirm inline add-relative cards still appear around selected chart person and remain usable.
- [ ] Confirm public `/family` still renders.

## Remaining risks

- Static verified only; authenticated admin visual confirmation is still required.
- This is a visual/chrome polish pass. It does not change data flow, chart package behavior, or
  backend persistence.
- Some broader admin pages may still have unrelated styling debt; this report only covers the Family
  builder pages requested here.
