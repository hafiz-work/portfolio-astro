# UI reference: shadcn/ui + Great UI vs this repo

Research doc, 2026-10-08. Read `STYLE.md` first; this doc never overrides it.
Scope: what to borrow from shadcn/ui and Great UI **as patterns**, done with
our own atoms (`src/styles/index.css`), not by installing their code.

## 0. TL;DR

- **shadcn/ui gives us behaviour to copy, not looks.** Its anatomy (Field, Empty, AlertDialog, DataTable toolbar/footer, Combobox chips) and its keyboard/ARIA contracts are worth matching. Its tokens (`--primary`, `--muted`…), zinc/neutral palette, shadows and `rounded-md` look are not ours.
- **Great UI is an animation showcase, not a component system.** About 50 Motion-driven React components (page/theme transitions, scroll text, mockups, social cards), built for Next.js. Almost none of it maps to our admin or form needs. Most of it clashes with STYLE.md's "flat, hairline, whisper" line. Treat it as the do-not-adopt list, with one or two exceptions.
- **Our biggest gaps are accessibility and consistency, not visuals.** We have no `aria-describedby` anywhere (0 hits). `ConfirmModal` is a `div[role=dialog]` with no focus trap and no focus return. Dropdowns have no arrow-key navigation. Table sort headers have no `aria-sort`. Native `confirm()`/`alert()` is still called in 12 files (~35 sites: admin tables, profile, settings, policies, TextEditor; `form-guard.ts` / `UnsavedChangesModal` use it as a fallback).
- **The fix is mostly platform features.** Use native `<dialog>.showModal()`, as `CommandPalette.astro` already does: it gives a focus trap, `inert` background and Esc for free. Add one small roving-focus helper. Add a few new `.admin-*` atoms. No new dependencies are needed.
- **`index.css` carries dead legacy classes.** `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-text`, `.card`, `.card-hover`, `.badge`, `.badge-indigo`, `.badge-gray`, `.heading-gradient`, `.section-title`, `.text-body` and `.custom-scrollbar` use slate/blue, which STYLE.md bans, and have 0 usages in `src/`. Delete them.

## 1. Current UI inventory

| Component | File | Notes |
|---|---|---|
| Tokens / theme | `src/styles/index.css` (`@theme`, `:root`, `.dark`) | Named hex tokens: `canvas`, `pub-dark`, `surface-code(-rail)`, `family-canvas`; `--pattern-fg`. Dark mode is `@custom-variant dark (&:where(.dark, .dark *))`. Colours are Tailwind gray + sky used directly, not semantic tokens. |
| Page shell | `index.css` `.page-shell`, `.gutter`, `.pattern`, `.line-t/-b/-y`, `.container-main`, `.section-gap`, `.row-grid`, `.divided-grid`, `.frame`/`.frame-inner` | tailwindcss.com line: hatched gutters and full-bleed hairline rows. Depth comes from rings, not shadows. |
| Type | `.display`, `.eyebrow`, `.lead`, `.token`, `.annot`; `SectionHeader.astro`, `Annot.astro` | Inter for body; IBM Plex Mono for eyebrows and tags. |
| Buttons (public) | `.btn-pill` + `.btn-pill-primary` / `.btn-pill-ghost` | `rounded-full`, `focus-visible:outline-sky-500`, `disabled:opacity-60`. No loading or icon-only size. |
| Buttons (admin) | `.admin-btn` + `-primary` / `-secondary` / `-danger` | Same pill as public plus `min-h-10`. Icon-only buttons are done ad hoc (e.g. `!px-2` in `TechStacksManager.tsx`). |
| Row actions | `src/components/ui/admin/primitives.tsx` (`AdminAction`, `Edit/Delete/ViewAction`, `RowActions`) | Icon buttons in a row. No overflow menu. |
| Badge | `primitives.tsx` `AdminBadge` (6 variants, optional dot), `statusBadgeVariant()`; `.tag` (public, mono) | Good. It matches shadcn Badge semantics with our palette. |
| Input / textarea | `.field` (public), `.admin-input` (admin, identical), `.admin-label`, `.admin-help`, `.admin-error`; auto required `*` via `label:has(+ :required)` | Help and error text are **not** linked to the control (`aria-describedby` has 0 usages, `aria-invalid` is not styled). |
| Select | `Dropdown.astro` (Astro), `Select.tsx` (React); shared `.field-trigger`, `.menu`, `.menu-item` | Uses `aria-haspopup=listbox`, `aria-expanded` and `role=option` with `aria-selected`. **No arrow/Home/End/typeahead keys.** No search. |
| Multi-select | `MultiDropdown.astro` | Hidden JSON input. Shows "N selected" after 2 picks. No chips, no search, no arrow keys. |
| Date | `DateInput.astro` | Native date input styled as a field. Matches the native-first approach. |
| Rich text | `TextEditor.tsx` (Tiptap) | Still uses `window.alert` for a bad YouTube URL. |
| Confirm dialog | `ConfirmModal.astro` → `window.confirmModal.show()` | A `div` with `role=dialog` and `aria-modal`. Focuses the confirm button on open. **No focus trap, no focus return, background not `inert`.** The Esc listener is global even when the modal is closed. |
| Unsaved changes | `UnsavedChangesModal.astro` | Same div pattern. Falls back to `window.confirm`. |
| Native confirm/alert leftovers | `ExperiencesTable.tsx:58`, `BlogPostsTable.tsx:47-66`, `FamilyTreeBuilder.tsx:470,546`, `ContactsTable.tsx:60` | They bypass `confirmModal` and `AlertToast`. |
| Toast | `AlertToast.astro` (per page, `window.__uiAlerts[id]`) | One toast at a time, bottom-right, `role=alert` with `aria-live=polite` (these conflict: `role=alert` implies assertive). No stacking and no action/undo. |
| Data table | `DataTable.tsx` (TanStack Table, already installed) | Has a toolbar search, row selection, sort, page size, a pagination footer, a mobile card list, and empty and loading states. **No `aria-sort` on `<th>`.** Loading is a spinner, not a skeleton. |
| Empty state | Inline in `DataTable.tsx` (`emptyTitle`/`emptyDescription`); `.pattern` fill on public pages | No shared empty atom outside the table. |
| Command palette | `src/components/layout/CommandPalette.astro` | Native `<dialog>` with `showModal()`, a `combobox` input, a grouped `listbox`, arrow keys and ⌘K. **This is the best-built overlay in the repo; use it as the model.** |
| Tabs | Ad hoc `role="tablist"` in `pages/projects/[slug]/index.astro:314`, `admin/policies/{new,edit}.astro` | No shared tabs component. Arrow-key behaviour is not standardised. |
| Tooltip | None (`title=` attributes only) | Probably fine; see section 6. |
| Skeleton | None (`animate-pulse` only in `Hero.astro` and `map.tsx`) | |
| Pagination (public) | None. Admin pagination lives inside `DataTable.tsx` (`aria-label` Previous/Next). | |
| Filter chips | None as an atom | |
| Theme switch | `Footer.astro` (public, segmented pill), `AdminNavbar.astro` (toggle) | |

## 2. shadcn/ui summary

| Aspect | Finding (from fetched pages) |
|---|---|
| What it is | "Open Source. Open Code." The component source goes into your repo. You can use the CLI (`shadcn add …`) and registry (flat-file `registry.json` schema) or copy the code by hand. Licence: **MIT** (GitHub README). |
| Primitives | The docs now ship **Radix, Base UI and React Aria variants** (`/docs/components/radix/…`, `/base/…`, `/aria/…`). Repo topics list `radix-ui`, `base-ui` and `react-aria`. |
| Catalog (64) | Accordion, Alert, Alert Dialog, Aspect Ratio, Attachment, Avatar, Badge, Breadcrumb, Bubble, Button, Button Group, Calendar, Card, Carousel, Chart, Checkbox, Collapsible, Combobox, Command, Context Menu, Data Table, Date Picker, Dialog, Direction, Drawer, Dropdown Menu, Empty, Field, Hover Card, Input, Input Group, Input OTP, Item, Kbd, Label, Marker, Menubar, Message, Message Scroller, Native Select, Navigation Menu, Pagination, Popover, Progress, Questionnaire, Radio Group, Resizable, Scroll Area, Select, Separator, Sheet, Sidebar, Skeleton, Slider, Spinner, Switch, Table, Tabs, Textarea, Toast (deprecated → Sonner), Toggle, Toggle Group, Tooltip, Typography |
| Theming | Semantic CSS variables paired as `x` / `x-foreground`: `background`, `card`, `popover`, `primary`, `secondary`, `muted`, `accent`, `destructive`, `border`, `input`, `ring`, `chart-1..5`, `sidebar-*`. Values are in `oklch()`. Variables are redefined under `.dark` and mapped with `@theme inline { --color-primary: var(--primary) }`. One `--radius` (0.625rem) derives `--radius-sm…4xl` (0.6× to 2.6×). |
| Button | Variants `default/outline/secondary/ghost/destructive/link`. Sizes `xs/sm/default/lg` plus `icon`, `icon-xs/sm/lg`. Loading = `<Spinner data-icon="inline-start">` inside the button. Uses `data-icon` for icon spacing and `asChild` to render a link. Restores `cursor:pointer` on buttons, since Tailwind v4 defaults buttons to `cursor: default`. |
| Field | `Field` (`role=group`, `data-invalid`, orientation `vertical/horizontal/responsive` via container queries), `FieldLabel`, `FieldDescription`, `FieldError` (takes an `errors[]` array and renders a list), `FieldSet`/`FieldLegend`, `FieldGroup`, `FieldSeparator`. `aria-invalid` goes on the control. The page does not document `aria-describedby`. |
| Combobox | Simple: Input → Content → Empty and List → Item. Multi: `ComboboxChips` (chips + chips input). Supports groups, separators, `showClear`, `autoHighlight`, `disabled` and `aria-invalid`. |
| Alert Dialog | Header (optional Media, Title, Description) and Footer (Cancel, Action). `size="sm"`. Destructive is just a destructive button in the Action slot. Radix: focus trapped, Esc closes and **returns focus to the trigger**, WAI-ARIA alertdialog pattern. |
| Data Table | Recipe, not a component: TanStack Table plus `<Table>`. Toolbar: filter input on the left, "Columns" visibility menu on the right. Row checkbox and header checkbox. Per-row actions dropdown. Right-aligned formatted currency. Footer: "0 of N row(s) selected" on the left, Previous/Next (disabled at the ends) on the right. The reusable version adds rows-per-page, "Page X of Y" and first/last. |
| Empty | `Empty` → `EmptyHeader` (`EmptyMedia` variant `default`/`icon`, `EmptyTitle`, `EmptyDescription`) → `EmptyContent` (primary + secondary action, then a quiet "Learn more" link; for a 404, a search input). |
| Tabs | List → Trigger, Content. `variant="line"`, `orientation="vertical"`, disabled trigger. Radix: Tab moves into the active trigger then into the panel; arrows move and activate (automatic mode); Home/End; looping. |
| Pagination | Link-based (`<a>`). Content, Item, Link(`isActive`), Previous/Next (label hidden on small screens, `aria-label="Go to previous page"`), Ellipsis. |
| Toast | Radix Toast is deprecated; use **Sonner** (`<Toaster />` + `toast()`), with types default/success/info/warning/error/promise, an optional description and 6 positions. |
| Does especially well | Consistent anatomy names. Strict state contracts through `data-*`/`aria-*` attributes (`data-state`, `data-invalid`, `aria-invalid`). Every overlay gets a focus trap and focus return. Data-table toolbar/footer layout. Empty-state structure. |

## 3. Great UI summary

| Aspect | Finding |
|---|---|
| What it is | "Production-grade React & Tailwind CSS components" by Saurabh Sharma (srbh.site). Repo `Saurabh-2607/GreatUI`, about 265 stars, one contributor. |
| Stack | Next.js 16, React 19, Tailwind v4, TypeScript, **Motion** (Framer Motion). |
| Usage model / licence | Copy and paste ("Not a dependency. You own the code."). The README shows a "shadcn registry" badge but no command. **MIT**: "feel free to use these components in personal and commercial projects." |
| Accessibility | The README claims "WAI-ARIA compliant", but `prefers-reduced-motion` is **not mentioned**. Unverified. |
| Catalog (about 50) | **Social Cards** (GitHub, Instagram, Facebook, X, LinkedIn); **Visuals** (Scroll Flying Cards, Pixel To ASCII Image, Image Hover Reveal, Terminal Loader, Animated Link, Floating Menu, Macbook Mockup, Mobile Mockup, Floating Dock Menu, Radial Gooey Menu, Animated Path); **Typography** (Word Focus Scroll, Blur Scroll Reveal, Split Line Fly In, Multilingual Quote, Text On Path Scroll, Scrambled Install Command, Text Reveal, Pixel Swipe Text); **Page Transitions** ×11 (CrossBlur, Venetian Blinds, Cascade, Sine Wave, Pixel, Sweep, Interlocking, Curtain, Color Wipe, Staggered, Pixel Swipe); **Theme Transitions** ×4 (Blur Fade, Split, Circular, Swipe); **Buttons** (Aceternity Button, Minimal Buttons, Button); **Layout & Cards** (Team Section, Card, Revision Timeline, Diagonal Marquee Carousel, Avatar Stack, Vinyl Album Card, Deployment Checklist, Accordion). |
| Not verified | Individual component pages render client-side. `great-ui.com/components/minimal-buttons` returned only "Loading layout…", so per-component anatomy, props and states **could not be read**. Nothing here describes them. |
| Does especially well | Showpiece motion for marketing pages. The **Multilingual Quote** and **Revision/Deployment Checklist** ideas are the only ones near our content (the quotes module, project timelines). |

## 4. Gap analysis

Legend: **Have** = today in repo; **They** = the better pattern (S = shadcn, G = Great UI); **Do** = recommendation inside our constraints.

| Category | Have | They do better | Do |
|---|---|---|---|
| Buttons | `.btn-pill-*`, `.admin-btn-*` | S: icon-only sizes, a loading spinner slot, `cursor:pointer` restore, `link` variant | Add `.admin-btn-icon` (square pill, `size-10 p-0`) to replace `!px-2`. Loading: `aria-busy="true"` + `disabled` + lucide `Loader2 animate-spin`. Add `button:not(:disabled){cursor:pointer}` in `@layer base` if it isn't already there. |
| Input / textarea | `.field`, `.admin-input`, `.admin-help`, `.admin-error` | S Field: `aria-invalid` on the control, `data-invalid` on the group, an error list, fieldset/legend | Style `aria-invalid:outline-red-500` in `.admin-input` and `.field`. Wire `aria-describedby` to the help/error ids in forms. Use native `<fieldset>`/`<legend>` for grouped sections. |
| Select | `Dropdown.astro`, `Select.tsx` | S/Radix: arrow keys, Home/End, typeahead, scroll the active option into view | Add one roving-focus helper (about 30 lines) shared by Dropdown, MultiDropdown and Select. Copy the keyboard model from `CommandPalette.astro`. Consider `Native Select` (S has one too) for simple enums: a styled `<select class="field">`. |
| Combobox / multi-select / tags | `MultiDropdown.astro` ("N selected") | S Combobox chips: removable chips plus a type-to-filter input, empty row, clear button | When a list goes above about 10 options, add a filter input at the top of `.menu` and show selected values as `.tag` chips with an `X` remove button (`aria-label="Remove {name}"`). No library needed. |
| Dialog / confirm | `ConfirmModal.astro`, `UnsavedChangesModal.astro` (div-based) | S AlertDialog: focus trap, Esc, focus return, Media/Title/Description/Footer anatomy | **Rebuild both on native `<dialog>` + `showModal()`.** Keep the `window.confirmModal.show()` API. Remember `document.activeElement` and restore it on close. Use `aria-labelledby` and `aria-describedby`. Focus Cancel by default for danger dialogs. Replace the native `confirm()` calls (section 1) with `confirmModal.show({variant:"danger"})`. |
| Toast | `AlertToast.astro` (single, per page) | S/Sonner: global toaster, stacking, types, description, promise/loading | Mount one toaster in `PrivateLayout`. Use a `role="status"` live region (polite) and keep `role="alert"` for errors only. Optionally queue up to 3. Replace the `alert()` calls. **Do not add `sonner`**: it's a React dependency and most admin chrome is Astro scripts. |
| Table / data table | `DataTable.tsx` (TanStack) | S: column visibility menu, "x of y selected" footer, row action overflow menu, right-aligned numbers | We already have most of this. Add `aria-sort` on sortable `<th>`. Add `tabular-nums text-right` for numeric columns. Use an overflow menu for 3 or more row actions (see Dropdown menu). Skip the column-visibility menu (YAGNI for our small tables). |
| Tabs | Ad hoc `role=tablist` in 3 pages | S/Radix: `line` variant, arrow/Home/End, `aria-controls`, roving tabindex | Write one small Astro `Tabs` script, or a shared `setupTabs()` like the other `setup*()` helpers, for those 3 sites. Visual: the `line` variant (sky underline) fits the hairline style. |
| Badge | `AdminBadge`, `.tag` | Parity | Nothing. Optionally move `AdminBadge` variant classes into a CSS `.badge-*` atom so Astro pages can use it too, after deleting the dead `.badge*`. |
| Card | `.frame`/`.frame-inner`, `.admin-card` | S Card anatomy: Header/Title/Description/Action/Content/Footer | Keep our classes. Optionally add `.admin-card-footer` (hairline top, actions on the right) to mirror `.admin-card-title`. |
| Empty state | Inline in `DataTable.tsx`; `.pattern` | S Empty: media → title → description → primary/secondary actions → quiet link | Extract an `.empty` atom (centred, `.pattern` background, lucide icon in a ringed square, `.admin-btn-*` actions). Reuse it in DataTable and on public lists such as quotes and blog search. |
| Command palette | `CommandPalette.astro` (native dialog) | S Command: `Kbd` hints, empty row, group headings | Already good. Optional: an empty "No results" row and `<kbd>` styling for ↵/Esc hints. |
| Dropdown menu | None (row actions are inline icons) | S/Radix: `role=menu`, arrow keys, typeahead, Esc returns focus | Only if row actions grow past 3. Reuse `.menu`/`.menu-item` with `role="menu"`/`menuitem` and the roving helper. |
| Tooltip | `title=` attributes | S/Radix Tooltip | Use `aria-label` on icon buttons, which we mostly already do. Skip a tooltip component: hover-only UI doesn't work on touch, and it would add chrome. |
| Skeleton / loading | Spinner in DataTable; `animate-pulse` in 2 places | S Skeleton (shape-matched placeholders) | Add a `.skeleton` atom (`animate-pulse rounded-md bg-gray-950/5 dark:bg-white/10`, `motion-reduce:animate-none`). Use it for DataTable first-load rows and SSR-island hydration gaps. |
| Pagination (public) | None (admin inside DataTable) | S Pagination: link-based, `isActive`, ellipsis | When blog or quotes lists paginate, use `<nav aria-label="Pagination">` with `<a aria-current="page">` and `.btn-pill-ghost` items, link-based so it works with SSR. |
| Filter chips | None | S Toggle Group / Badge-as-button | Use `.tag` as `<button aria-pressed>` with `aria-pressed:bg-sky-500/10 aria-pressed:text-sky-700 dark:aria-pressed:text-sky-300`. Good for the quotes tag filter and blog tags. |

## 5. Top 5 ranked recommendations

| # | Change | Why | Effort | Files |
|---|---|---|---|---|
| 1 | Rebuild `ConfirmModal` and `UnsavedChangesModal` on native `<dialog>.showModal()`, add focus return, and replace native `confirm()`/`alert()` with `confirmModal` / toast | Real a11y bug (no focus trap or return). Native dialogs look inconsistent. The platform covers it with no dependency. | M | `src/components/ui/ConfirmModal.astro`, `src/components/ui/UnsavedChangesModal.astro`, `src/components/admin/experiences/ExperiencesTable.tsx`, `src/components/admin/blog/BlogPostsTable.tsx`, `src/components/admin/family/FamilyTreeBuilder.tsx`, `src/components/admin/contact/ContactsTable.tsx`, `src/components/ui/TextEditor.tsx`, `src/pages/admin/profile.astro`, `src/pages/admin/settings/{general,security/password,security/maintenance}.astro`, `src/pages/admin/policies/{new,edit}.astro`, `src/lib/form-guard.ts` (fallback) |
| 2 | Field a11y contract: `aria-invalid` styling in `.field`/`.admin-input`, plus `aria-describedby` → `.admin-help`/`.admin-error` ids | 0 `aria-describedby` today, so screen readers never hear errors. The CSS change is one line and every form inherits it. | S (CSS) + M (wire forms) | `src/styles/index.css`, admin form components (`src/components/admin/**/*Form.astro`, `ProjectEditor.tsx`) |
| 3 | Shared keyboard model for listbox widgets (arrows, Home/End, Enter, Esc, typeahead), ported from `CommandPalette.astro` | Dropdown, MultiDropdown and Select are mouse-only today. | M | `src/components/ui/Dropdown.astro`, `src/components/ui/MultiDropdown.astro`, `src/components/ui/Select.tsx` |
| 4 | Delete dead legacy CSS, then add 3 atoms: `.skeleton`, `.empty`, `.admin-btn-icon` | Removes banned slate/blue from the source of truth. The new atoms replace ad-hoc code (`!px-2`, inline empty states). | S | `src/styles/index.css`, `src/components/ui/DataTable.tsx`, `src/components/admin/TechStacksManager.tsx`, `src/components/admin/quotes/QuoteTagsManager.tsx` |
| 5 | DataTable polish (`aria-sort`, `tabular-nums` right-aligned numeric columns, skeleton rows on first load) and one global toaster (`role=status` queue) in `PrivateLayout` | Matches the shadcn data-table and Sonner behaviours that matter, without new dependencies. | M | `src/components/ui/DataTable.tsx`, `src/components/ui/AlertToast.astro`, `src/layouts/PrivateLayout.astro` |

Optional dependency, not recommended now: `@radix-ui/react-*` primitives (Dialog, DropdownMenu, Tabs) would give the full WAI-ARIA behaviour in React islands. The trade-off: they only help React islands, while our overlays are mostly Astro `<script>` code. They also add a dependency and their own `data-state` styling conventions. Native `<dialog>` plus one roving helper covers our needs.

## 6. Do-not-adopt list

| Thing | Source | Why it clashes |
|---|---|---|
| shadcn semantic token set (`--primary`, `--muted`, `--accent`, `--card`…) or a second `--radius` scale | S | STYLE.md: `@theme` named tokens plus Tailwind gray/sky are the single source. A parallel token system splits the look. Borrow the `x`/`x-foreground` *idea* only if we ever add a real token. |
| shadcn default look (zinc/neutral palette, `rounded-md` squared buttons, `shadow-xs` on inputs and cards) | S | We use pill buttons, `rounded-lg` fields, hairline rings, and shadows only on floating chrome. |
| `npx shadcn add …` into this repo | S | It pulls in Radix and `class-variance-authority` and assumes `@/components/ui` with semantic tokens. Port the behaviour into our atoms instead. |
| Sonner, cmdk, vaul, react-day-picker | S dependencies | We already have toast, command palette and native date input. Adding these is dependency churn for what we have or a few lines would cover. |
| Tooltip / Hover Card everywhere | S | Hover-only, and more floating chrome. Use `aria-label` and visible text. |
| Page transitions (Pixel, Curtain, Venetian…), theme transitions (Circular, Swipe…) | G | We use Astro `<ClientRouter>` plus a theme init script. Heavy motion breaks "texture is a whisper" and needs Motion (a new dependency). Theme-switch animation also fights the no-flash init script. |
| Scroll-driven text (Word Focus, Blur Reveal, Split Line Fly In, Scrambled text) | G | The hero already has `.hero-stagger`, a one-time entrance. More scroll motion is noise, and its reduced-motion handling is unverified. |
| Social cards, Macbook/Mobile mockups, Vinyl card, Gooey/Dock menus | G | The brand and device frame are already defined (`ProjectPreview.astro`, brand SVGs). These would add a second visual language. |
| Gradients and glow (e.g. `bg-gradient-*` on Empty) | S/G | Only `ProjectPreview` gets a brand glow (STYLE.md exception). |
| Any slate/blue/cyan from copied snippets | both | Banned by STYLE.md and CLAUDE.md. Remap to gray/sky. |

## 7. Sources (fetched)

Fetched successfully:
- https://ui.shadcn.com/docs
- https://ui.shadcn.com/docs/components
- https://ui.shadcn.com/docs/theming
- https://ui.shadcn.com/docs/components/radix/button
- https://ui.shadcn.com/docs/components/radix/field
- https://ui.shadcn.com/docs/components/radix/combobox
- https://ui.shadcn.com/docs/components/radix/alert-dialog
- https://ui.shadcn.com/docs/components/radix/data-table
- https://ui.shadcn.com/docs/components/radix/empty
- https://ui.shadcn.com/docs/components/radix/tabs
- https://ui.shadcn.com/docs/components/radix/pagination
- https://ui.shadcn.com/docs/components/radix/toast (deprecation notice only)
- https://ui.shadcn.com/docs/components/radix/sonner
- https://ui.shadcn.com/docs/components/radix/skeleton (usage only; the implementation classes are hidden behind "View Code")
- https://github.com/shadcn-ui/ui (MIT)
- https://www.radix-ui.com/primitives/docs/components/alert-dialog
- https://www.radix-ui.com/primitives/docs/components/tabs
- https://www.great-ui.com/components
- https://github.com/Saurabh-2607/GreatUI (Great UI Custom License - not MIT; use OK, redistribution as a kit forbidden)
- https://raw.githubusercontent.com/Saurabh-2607/GreatUI/main/README.md

Fetched but not useful:
- https://www.great-ui.com/components/minimal-buttons: client-rendered, returned only "Loading layout…"

Search only (not fetched): a web search for the Great UI licence surfaced trendshift.io/repositories/95476 and 21st.dev/@saurabh-2607/library/great-ui.md (Motion stack, author). The licence was then confirmed from the repo README.
