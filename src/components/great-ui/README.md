# Great UI components

Copy-in components from [great-ui.com](https://www.great-ui.com/components) (built for Next.js + Motion + Tailwind v4). **License: Great UI Custom License, not MIT**: free to use in this site (incl. commercial), but never republish the components as a UI kit/library. Keep the source attribution comment in each file. Isolated here, away from `src/components/ui/` and `src/components/shadcn/`. Copy each component by hand from `https://www.great-ui.com/r/<name>.json` (`files[0].content`) or the GitHub repo. **Don't use `npx shadcn add` with Great UI URLs**: it ignores `--path` and writes into `src/components/shadcn/ui/` (verified 2026-10-08).

## Porting a component

| Next.js / source | Here |
|---|---|
| `"use client"` | delete (Astro islands are client-side via `client:*`) |
| `next/image` `<Image>` | `<img>` with `width`/`height`/`loading="lazy"`, or pass an Astro `<Image>` from the `.astro` parent |
| `next/link` `<Link>` | `<a href>` |
| `next-themes` / `useTheme` | read `document.documentElement.classList.contains("dark")` (theme lives on `<html>`, see `CoreLayout.astro`) |
| `@/lib/utils` `cn` | same import, it exists (`src/lib/utils.ts`) |
| `motion/react` | needs the `motion` package. Install it with the first component that uses it, never ahead of time |
| raw colours (`zinc-*`, `slate-*`, `blue-*`, hex) | our palette: gray ink + sky accent (`STYLE.md`) |
| other icon sets | lucide |

## Rules

- **Respect reduced motion.** Wrap animated components in `<MotionConfig reducedMotion="user">` or check `useReducedMotion()`.
- **Don't use shadcn token classes** (`bg-background`, …) here; those belong to `src/components/shadcn/`.
- **Mount as React islands** (`client:visible` for below-the-fold animation, so it doesn't load up front).
- **Showpiece, not chrome.** Great UI suits accents such as a hero effect or a highlight card. Keep navigation, forms and admin on our primitives. See `docs/research/ui-reference-shadcn-great-ui.md` §6 (do-not-adopt list) before adding one.
- Name the file after the component (`spotlight-card.tsx`) and keep the source URL in a top-of-file comment.
