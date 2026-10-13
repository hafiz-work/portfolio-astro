# React Bits components

Copy-in components from [reactbits.dev](https://reactbits.dev) (React + Tailwind v4; some need `three`,
`motion` or `gsap`). **License: MIT + Commons Clause** - free for personal and commercial use, but the
Commons Clause bars reselling or republishing the components themselves as a UI kit/library. Keep the
source URL comment in each file. Isolated here, away from `src/components/ui/`, `src/components/shadcn/`
and `src/components/great-ui/`.

## Add a component

1. Copy the files by hand from
   `https://github.com/DavidHDev/react-bits/blob/main/src/content/Components/<Name>/` - usually
   `<Name>.jsx` + `<Name>.css`. **Variants differ per component**: Lanyard ships only the JSX + CSS
   pair, others also ship `-TS-TW` / `-JS-CSS` files. Take the pair that matches this repo (TS + Tailwind
   when available, else the JSX + CSS one and port it).
2. **Do not use `npx shadcn@latest add @react-bits/<Name>-TS-TW`.** `components.json` aliases send the
   shadcn CLI into `src/components/shadcn/`, ignoring `--path` - the same trap already documented in
   `src/components/great-ui/README.md` (verified 2026-10-08).
3. Check the component page on reactbits.dev for the prop table, and install an extra dependency only
   when that component needs it - never ahead of time.
4. Some components load their own assets (`.glb`, textures) from the React Bits CDN. Vendor them
   locally (`public/` or `src/assets/`) instead of hotlinking, and remember cross-origin images that a
   component draws into a canvas need CORS headers (same-origin is simplest).

## Porting a component

| Next.js / source | Here |
|---|---|
| `"use client"` | delete (Astro islands are client-side via `client:*`) |
| `next/image` `<Image>` | `<img>` with `width`/`height`/`loading="lazy"`, or pass an Astro `<Image>` from the `.astro` parent |
| `next/link` `<Link>` | `<a href>` |
| `next-themes` / `useTheme` | read `document.documentElement.classList.contains("dark")` (theme lives on `<html>`, see `CoreLayout.astro`) |
| `@/lib/utils` `cn` | same import, it exists (`src/lib/utils.ts`) |
| `motion/react`, `gsap` | needs the package. Install it with the first component that uses it |
| raw colours (`zinc-*`, `slate-*`, `blue-*`, cyan, hex) | our palette: gray ink + sky accent (`STYLE.md`) |
| other icon sets | lucide |

## Rules

- **Don't use shadcn token classes** (`bg-background`, …) here; those belong to `src/components/shadcn/`.
- **Respect reduced motion.** Keep the component's own handling if it has one (Lanyard disables its
  intro and breeze), otherwise wrap in `<MotionConfig reducedMotion="user">` or check `useReducedMotion()`.
- **Mount as React islands** - `client:visible` for a below-the-fold showpiece, never `client:load` for
  anything GPU-heavy.
- **Showpiece, not chrome.** React Bits suits an accent (hero effect, highlight card). Navigation, forms
  and admin stay on our primitives.
- **Budget the bundle before adopting**: anything pulling `three` / physics is a separate island chunk
  (~170KB gz for `three` alone). Say the cost in one line at the top of the file, and read §6
  (do-not-adopt list) of `docs/research/ui-reference-shadcn-great-ui.md` first.
- Name the file after the component (`lanyard.tsx`, not `Lanyard-TS-TW.tsx`) and keep the source URL +
  license line at the top of the file.
