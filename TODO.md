# TODO - src audit (2026-09-24)

Diagnosis `/Users/user/projects/portfolio-astro/src`. Priorities: P0 = bug/vuln, P1 = perf/correctness, P2 = polish/cleanup.

## Restyle - public site to tailwindcss.com line (in progress)

Committed scope (user): full theme for **non-admin** pages only; admin slate stays. Contract in `STYLE.md`.

- [x] Write `STYLE.md` design language doc.
- [x] **Tokens**: `--color-canvas` → `#ffffff`, add `--color-pub-dark` `#030712`, `html.dark body` → `bg-pub-dark` (admin unaffected - `PrivateLayout` forces `bg-admin-base`). `src/styles/index.css:22,24,52`.
- [x] **Background.astro**: flat `#ffffff`/`#030712`, dot grid 32px→**10px** at 5%/10%, add diagonal line grid layer (`repeating-linear-gradient 315deg`), **drop** the blue blur glow.
- [x] **Navbar glass**: dark `rgba(15,23,42,.92)` → `rgba(3,7,18,.92)`, light `#f8fafc` → white glass; same for `.glass-nav` util. `src/components/layout/Navbar.astro:189-205`, `src/styles/index.css:277`.
- [x] **Cards → flat hairline**: `.card` loses hover shadow, gains `outline gray-950/5 dark:outline-white/10` (tailwind inset-ring look), `rounded-2xl`. `src/styles/index.css:186`.
- [x] **Accent**: keep cyan/blue - shared atoms serve admin (see STYLE.md "Color"). Do NOT sed cyan→sky repo-wide.
- [x] Verify `npm run build` unaffected + public dark pages report `#030712`.

### Content width responsive (`site-grid`) - done

- [x] `.site-grid` full-bleed shell (`grid-cols-[2.5rem_minmax(0,96rem)_2.5rem]` md+, `row-gap 6rem/9rem`); `::before` left gutter carries the 10px diagonal micro-line pattern + rail hairline, `::after` right gutter is a bare rail - auto-flow drops section content into the 1536px center track. `.site-grid > * { padding-inline: 1.5rem }` on mobile, none on md+. `src/styles/index.css`.
- [x] `.container-main` widened: `860px` → responsive `max-w-3xl md:max-w-4xl`.
- [x] Home page (`index.astro`) wrapped in `.site-grid pb-16 md:pb-24`; per-section `pt-16 md:pt-24` tops.

### Section style (tailwind ruled rows) - done

- [x] `.hairline` utility: `::before`/`::after` `h-px w-[200vw] left-[-100vw]`, `gray-950/5` / `white/10`. Applied to every home section: `#github-activity`, `#skills`, `#projects` (in `index.astro`), `#experience` (MapSection.astro:43), `#contact` (ContactSection.astro:12).
- [x] `.section-heading` bumped `2xl/1.75rem` → `3xl/4xl`, `tracking-tight` (tailwind h2 heft).

### Card style (showcase) - done

- [x] `.showcase-grid`: `gap-2 rounded-2xl bg-slate-950/5 p-2 dark:bg-white/10` - the gap itself is the hairline between cards; `sm:grid-cols-2`.
- [x] `.showcase-card`: `rounded-xl bg-white outline gray-950/5 dark:bg-slate-950 dark:outline-white/10`.
- [x] `ProjectCard.astro` rebuilt on the showcase-card surface (flat, no lift/shadow, `hover:outline-cyan`); `FeaturedProjects.astro` now a `showcase-grid`, featured card `sm:col-span-2`.
- [x] Skills cards → `showcase-card`; map frame → `showcase-card` (MapSection.astro:110).

### Wider page wideness - done

- [x] `npm run build` passes; `.site-grid`/`.hairline`/`.showcase-*` confirmed in emitted CSS.

Deferred (after core): accent swap if atoms get split public/admin (cyan kept by design).

## Security & hardening

- **[P0] Admin System Logs runs an unauthenticated SSR fetch of `owner/system/logs`.**
  `src/pages/admin/system.astro:6` - `systemService.getLogs()` runs in frontmatter. The Worker can't forward the httpOnly API cookie, so this always 401s and the page is permanently broken ("No logs found"). It's also the only admin page violating the site-wide client-side fetch pattern.
  Fix: fetch client-side like every other admin page (dashboard/index.astro pattern), or accept a server-side token.
- **[P1] Blog + project-policy public routes defeat CDN caching (`cache: 'no-store'`).**
  `src/lib/api-client.ts:78` sets `cache: 'no-store'` on every request. Public pages still on that path: `src/pages/blog/index.astro:11`, `blog/[slug]/index.astro:13`, `projects/[slug]/index.astro:17` (policy), `projects/[slug]/privacy.astro:14,30-31`, `terms.astro:14,30-31`. Family (`src/lib/family.ts:21-36 publicGet`) and home (`src/lib/public-content.ts:22` fetchJson) already use cache-friendly raw `fetch` - port blog/policy routes to the same loader.
- **[P1] Login brute-force lockout is client-side only.**
  `src/pages/login.astro:402` - 5 fails → 60s lock, all in a toggleable browser. Fine as UX, not a control. Verify the backend rate-limits `/auth/login` (reCAPTCHA already helps).
- **[P2] CSP ships `'unsafe-inline'` for script.**
  `src/middleware.ts:33` - required by the inline theme-init script in `CoreLayout`. Sync risk: middleware CSP must match `public/_headers` by hand (comment at `middleware.ts:11`).
- **[P2] Verify-email token travels in the URL query.**
  `src/pages/verify-email.astro:14` - GET param leaks via server logs/history/referrer. Standard for email links; nothing to do unless the backend can accept a POST from an outbound redirects handle.

## Performance

- **[P1] `projects/[slug]` makes two sequential round-trips; policy is no-store + 404-prone.**
  `src/pages/projects/[slug]/index.astro:16-19` - detail (cache-friendly) then `getProjectPolicyBySlug` (no-store, separate fetch even when no policy exists). Parallelize, or fold policy into the detail DTO.
- **[P1] Privacy/terms pages: build-time list → detail → policy chain.**
  `src/pages/projects/[slug]/privacy.astro:12-34`, `terms.astro:12-34` - `getStaticPaths` fetches the full project list, then re-fetches detail + policy per slug. Reuse the list records; single policy fetch.
- **[P1] Admin projects list does N+1 detail fetches.**
  `src/components/admin/projects/ProjectsCmsTable.tsx:57-66` - one `getProjectDetail` per project for warning badges, fire-and-forget after the list. Batch endpoint on the backend, or fetch warnings in the list response.
- **[P2] 15.8 KB polygon JSON inlined into every visitor's JS bundle.**
  `src/components/home/MapCanvas.tsx:14` imports `kl-boundary.json` statically into a `client:only` island. Decimate points or fetch it as an asset at runtime. See cleanup below for its 37 KB sibling.
- **[P2] Admin policy editor downloads the full project list for one record.**
  `src/lib/projects.ts:30-33` (`getAdminProjectById`) loops `owner/projects/all`. Use the dedicated `/owner/projects/{id}` endpoint.

## Correctness / robustness

- **[P1] `profile.astro` nulls out the whole profile page on a bad `createdAt`.**
  `src/pages/admin/profile.astro:335` - `new Date()` of a malformed timestamp throws RangeError → the catch skips every field population after it. Also uses `innerHTML` for static text (use textContent).
- **[P1] `system.astro` renders crash on malformed log timestamps.**
  `src/pages/admin/system.astro:73` - unguarded `new Date(log.timestamp).toLocaleString()` in SSR frontmatter loop can fail the entire admin page. Guard like `formatDate` in `ProjectsCmsTable.tsx:41-45`.
- **[P2] `ApiClient` 401-retry can loop.**
  `src/lib/api-client.ts:82-99` - a repeated 401 on the retried request triggers another refresh + retry, indefinitely, as long as refresh keeps returning OK. Guard with a "retried once" flag.
- **[P2] `MediaCarousel` renders alt="" when backend omits alt.**
  `src/components/project/MediaCarousel.astro:79` - semantically fine (decorative) but nags a11y; acceptable.

## Dead code & cleanup

- **[P2] Delete `src/data/kl-polygon.json` (37 KB) - zero imports** (only the root `fetch-kl.cjs` generator touches it).
- **[P2] Delete unused assets `src/assets/background.svg`, `src/assets/astro.svg`** (Background is pure CSS; astro.svg unreferenced).
- **[P2] Unused exports** - `src/lib/experiences.ts:14 getPublicExperiences`, `src/lib/contact.ts:89 getContactStats`, `src/lib/profile.ts:24 getProfile`. Remove or wire up.
- **[P2] Duplicate project loaders.** `src/lib/projects.ts:11-18` (ApiClient, no-store) vs `src/lib/public-content.ts:74-138` (cache-friendly) both fetch public projects/detail; only the legal pages use the former. After the caching fix, collapse onto one.
- **[P1] Stub admin pages presented as live.** `src/pages/admin/settings/general.astro:9-20` and `settings/security/maintenance.astro:7-8` hardcode settings with "No backend endpoint yet" mock saves. Either ship the endpoint or label the page as coming soon.

## Docs drift

- **[P2] CLAUDE.md describes an in-memory `_accessToken`** in `ApiClient`; the code is pure httpOnly-cookie + silent refresh (no in-memory token). Update `CLAUDE.md` Data flow section.