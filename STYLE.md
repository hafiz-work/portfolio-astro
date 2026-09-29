# STYLE.md - Design language

**One line for the whole site.** Every surface - public pages and the `/admin`
panel behind `/login` - follows the tailwindcss.com styling line: flat canvas,
hatched gutter rails, full-bleed hairline rows, huge tight headings, pill
buttons, gray ink with a sky accent. Admin used to be a locked slate/blue/cyan
dark system; it was migrated on 2026-09-26 (see "Admin" below).

`src/styles/index.css` is the single source of truth. Raw hex only lives in the
`@theme` block as named tokens; markup must use token/utility classes, never
inlined `bg-[#...]`.

## Tokens (`src/styles/index.css` `@theme`)

| Token | Light | Dark |
|---|---|---|
| `--color-canvas` (page bg) | `#ffffff` (white) | - |
| `--color-pub-dark` (dark page bg) | - | `#030712` (= tailwind gray-950, `oklch(.13 .028 261.692)`) |
| `--color-surface-code` / `-rail` | - | `#0d1117` / `#161b22` (code & editor) |
| `--color-family-canvas` | `#f1f5f9` | `#1a1f29` |

`html.dark body` → `bg-pub-dark`; admin panels use the same pair.

## Public shell (`PublicLayout.astro` + `index.css`)

Mirrors tailwindcss.com (2025+):

- **Navbar**: sticky, flat canvas, `h-14`, full-bleed hairline bottom. Wordmark + "Available" pill left; right: `⌘K` search pill (opens `CommandPalette.astro`, also Ctrl/⌘+K), plain `text-sm` links, **Contact** in tailwind's "Plus" treatment (sky tint, dashed box, `+` corner marks), GitHub. No theme toggle here.
- **Shell**: `.page-shell` = `[gutter ≥2.5rem | column max 96rem | gutter ≥2.5rem]` on md+ - gutters absorb extra width, so there is never plain space at the screen edges. `.gutter` rails are hatched (`repeating-linear-gradient(315deg, var(--pattern-fg) 0 1px, transparent 0 50%)` at `10px`), bordered with `--pattern-fg`. Column is flat canvas (`#fff` / `#030712`).
- **Rows**: every content row is its own full-bleed hairline row - `.line-y` (top+bottom), `.line-t`, `.line-b`. Lines are 200vw pseudo-elements clipped by `.page-shell` (`overflow-x: clip`, keeps sticky working).
- **Annotations**: `Annot.astro` = faint mono class hint above a row, **live** like tailwindcss.com: it prints the classes in effect at the current breakpoint and theme (`text-5xl` → `text-7xl` → `text-8xl`, `text-gray-950` ↔ `text-white`) via CSS-toggled spans. Use `preset="display" | "lead" | "hero-lead"`; presets must match `.display` / `.lead` in `index.css`. Decorative, `aria-hidden`.
- **Section header**: use `SectionHeader.astro` (eyebrow row → heading row → annotation → lead row, optional `action` slot). Separate sections with `.section-gap` (plain canvas, no lines).
- **Fills**: `.pattern` for deliberate empty areas (beside the code window, empty states, map column).
- **Footer**: three link columns split by hatched-less gutter strips (`border-x`), then theme switcher (system / light / dark segmented pill) + copyright.

## Surfaces & hairlines

Depth via hairlines, not shadows:

- `.frame` (outer tinted ring, `p-1.5`) + `.frame-inner` (white / gray-950 panel, `outline-gray-950/5` / `white/10`) - cards, map, charts, legal docs.
- `.divided-grid` - 1px gaps are the cell dividers (contact).
- `.row-grid` - 1→2→3 col card grid whose **row** separators are full-bleed like every other row (skills). No transforms / `data-reveal` on its cells.
- Hero demo: JSON editor + the profile card it "renders", card in a bezel pulled over the editor (`lg:-ml-36`); hovering a JSON line ↔ card field highlights both (`data-k` / `data-f`).
- Code windows stay dark in both themes (`bg-gray-950` light / `white/4` dark), three gray dots, line numbers; keys `pink-400`, strings `sky-300`, numbers `amber-300`.
- Shadows only on floating chrome (status card, dropdowns).

## Admin (`PrivateLayout` + the `.admin-*` atoms)

Same line, focused chrome - no second theme:

- **Layout**: `PrivateLayout` uses the public `.page-shell` (hatched gutters,
  96rem column). Inside the column: a flat sidebar on a hairline (`border-r`,
  sticky full-height on md+, drawer on mobile) + a `h-14` `.line-b` navbar
  (breadcrumbs, theme toggle) + content in `.container-main` that scrolls with
  the page. No floating cards, no inner scroll panel. Follows the app theme.
- **Page header**: `AdminPageHeader.astro` = `SectionHeader` rows (heading row +
  lead row on full-bleed `.line-y`, `tracking-tighter` heading, `actions` slot).
  Every admin page uses it; the opaque sidebar hides the lines where it sits over them.
- **Atoms**: `.admin-card` (flat panel + hairline ring), `.admin-card-title`,
  `.admin-label`, `.admin-input` (= `.field`), `.admin-help`, `.admin-error`,
  `.admin-form-actions`, `.admin-btn` / `-primary` / `-secondary` / `-danger`
  (pills). They live in `index.css` and are the single source of truth - fix the
  look there, never per page.
- **Depth**: hairline rings, like the public surfaces. Shadows only on floating
  chrome (modals, dropdowns, drawers).
- **Login** (`/login`) is the door to this panel but not inside it: it uses
  `CoreLayout` + `.page-shell`/`.line-*`/`.field`/`.btn-pill` directly, so it
  reads as part of the public site without `PublicLayout`'s navbar and footer.

## Color

- **Public**: Tailwind **gray** (`gray-950` headings / `gray-600` body light; `white` / `gray-400` dark). Accent **sky** (`sky-600` light / `sky-400` dark) for eyebrows, inline `.token` code, focus rings.
- **Buttons**: `.btn-pill .btn-pill-primary` (gray-950 light / gray-700 dark) and `.btn-pill .btn-pill-ghost` (inset ring). Inside admin pages use the `.admin-btn*` atoms - same pills, same palette - so the admin stays one system.
- **Admin**: identical palette (gray ink, sky accent, emerald/red for status). Slate, blue and cyan are gone; `.admin-*` atoms carry the admin look.
- `--pattern-fg` (`rgb(3 7 18 / .05)` light, `rgb(255 255 255 / .1)` dark) is the only line/hatch ink.

## Type

- Public: `font-inter` (Inter), set on `<body>` by `PublicLayout`. Headings `font-medium tracking-tighter`; hero `.display` up to `text-8xl`.
- Admin: `PrivateLayout` applies the same `font-inter`; page titles use the public heading treatment. (Legacy: `blog/index.astro` and `verify-email.astro` still use `font-display`/Bricolage - clean up when those pages are next touched.)
- `--font-mono` IBM Plex Mono - eyebrows, annotations, tags, code.

## Brand

One source: `scripts/brand/gen.py` (see its docstring to run). Mark = isometric
circuit cube (left face **H**, right face **B**, top face traces), blue→green
gradient. Outputs, all text outlined to paths:

- `public/brand/logo.svg` (mark), `wordmark.svg` (mark + "hafizbahtiar", used in navbar/login), `jata.svg` (stacked emblem), `icon.svg` / `icon-maskable.svg` (dark tile)
- `public/favicon.svg|ico`, `public/favicons/*.png`, `public/og-default.png`

Never hand-edit those files - change the generator and re-run.

## Rules

1. Any new page/component: use `SectionHeader`, `.line-*`, `.container-main`, `.frame`, `.btn-pill-*`, `.eyebrow`, `.lead` - and inside admin the `.admin-*` atoms - before writing ad-hoc classes.
2. Admin shares the public line: change the look in the shared atoms (`index.css`) or the chrome (`PrivateLayout`, `AdminSidebar`, `AdminNavbar`), never one page at a time.
3. New colors: add a token to `@theme`, don't inline arbitrary hex.
4. Pattern alpha must stay ≤ 5% light / ≤ 10% dark - texture is a whisper.