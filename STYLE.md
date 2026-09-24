# STYLE.md - Design language

Two themes live in this repo. **Public** (non-admin) pages follow the
tailwindcss.com styling line: flat canvas, hatched gutter rails, full-bleed
hairline rows, huge tight headings, pill buttons. **Admin** is a locked slate/blue/cyan system inside `PrivateLayout`,
always dark - never restyle it to match public.

`src/styles/index.css` is the single source of truth. Raw hex only lives in the
`@theme` block as named tokens; markup must use token/utility classes, never
inlined `bg-[#...]`.

## Tokens (`src/styles/index.css` `@theme`)

| Token | Light | Dark |
|---|---|---|
| `--color-canvas` (public page bg) | `#ffffff` (white) | - |
| `--color-pub-dark` (public dark bg) | - | `#030712` (= tailwind gray-950, `oklch(.13 .028 261.692)`) |
| `--color-admin-base` (locked admin canvas) | - | `#0f172a` (slate-900) |
| `--color-surface-code` / `-rail` | - | `#0d1117` / `#161b22` (code & editor) |
| `--color-family-canvas` | `#f1f5f9` | `#1a1f29` |

`html.dark body` → `bg-pub-dark`. Admin: `PrivateLayout` forces
`bg-admin-base` on its container, so the public body color never reaches the
admin chrome.

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

## Color

- **Public**: Tailwind **gray** (`gray-950` headings / `gray-600` body light; `white` / `gray-400` dark). Accent **sky** (`sky-600` light / `sky-400` dark) for eyebrows, inline `.token` code, focus rings.
- **Buttons**: `.btn-pill .btn-pill-primary` (gray-950 light / gray-700 dark) and `.btn-pill .btn-pill-ghost` (inset ring). `.btn-*` / `.admin-btn-*` are admin - don't use them on public pages.
- **Admin**: unchanged slate/blue/cyan, locked in `PrivateLayout`.
- `--pattern-fg` (`rgb(3 7 18 / .05)` light, `rgb(255 255 255 / .1)` dark) is the only line/hatch ink.

## Type

- Public: `font-inter` (Inter), set on `<body>` by `PublicLayout`. Headings `font-medium tracking-tighter`; hero `.display` up to `text-8xl`.
- Admin: `--font-sans` Instrument Sans / `--font-display` Bricolage Grotesque (unchanged).
- `--font-mono` IBM Plex Mono - eyebrows, annotations, tags, code.

## Brand

One source: `scripts/brand/gen.py` (see its docstring to run). Mark = isometric
circuit cube (left face **H**, right face **B**, top face traces), blue→green
gradient. Outputs, all text outlined to paths:

- `public/brand/logo.svg` (mark), `wordmark.svg` (mark + "hafizbahtiar", used in navbar/login), `jata.svg` (stacked emblem), `icon.svg` / `icon-maskable.svg` (dark tile)
- `public/favicon.svg|ico`, `public/favicons/*.png`, `public/og-default.png`

Never hand-edit those files - change the generator and re-run.

## Rules

1. Any new public page/component: use `SectionHeader`, `.line-*`, `.container-main`, `.frame`, `.btn-pill-*`, `.eyebrow`, `.lead` before writing ad-hoc classes.
2. Never restyle sibling admin atoms to match the public line just because they're on screen together.
3. New colors: add a token to `@theme`, don't inline arbitrary hex.
4. Pattern alpha must stay ≤ 5% light / ≤ 10% dark - texture is a whisper.