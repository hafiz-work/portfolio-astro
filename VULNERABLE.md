# VULNERABLE.md — verified security audit ledger

Frontend audit of `portfolio-astro` (Astro SSR, Cloudflare Workers).
Backend `hono-workers` is out of scope per SECURITY.md — items that can only be fixed there are marked as such.

- Date: 2026-10-14 · branch `main`
- Method: parallel sub-agent audits, then every High/Medium finding re-verified by direct code reads. Items 1–3 confirmed by executing the real modules (`node`), dependencies via `npm audit`.
- Re-verified after fixes (2026-10-14): independent 42-check repro (`bun`) + slug-encoding URL checks (`node`); both project check scripts; `npm run build` exit 0.
- Status: 🔧 fix in progress · ⬜ open · ✅ fixed & re-verified

## High

### 1. ✅ Stored XSS — family chart interpolates names/photoUrl into `innerHTML`
- Chain: `src/lib/chart-data.ts` (raw `label`, `first name`, `last name`, `avatar`) → `family-chart` builds cards with `innerHTML`, zero escaping — `node_modules/family-chart/dist/family-chart.esm.js:2595` (card), `:2625`/`:2634` (`<img src="${...}">`), `:2368`/`:2422` (SVG variant); `grep escape|sanitize|textContent` in dist → 0 hits. Config: `src/hooks/useFamilyChart.ts:86-87`, `src/components/admin/family/FamilyTreeChart.tsx:183-190`.
- Reach: public `/family` + `/family/[slug]` (privacy whitelist keeps `displayName`/`photoUrl` — `src/lib/family-privacy.ts`) and the admin chart. CSP `script-src 'unsafe-inline'` (`src/middleware.ts:39`) so inline handlers execute.
- Precondition: family authoring rights (`family.write`); `normalizeText` only trims (`FamilyTreeBuilder.tsx:509/620`).
- Fixed: escaping happens at render, not in the data (escaped data would show `&amp;` in the admin edit form and be saved back). `cardText(...keys)` in `chart-data.ts` is the `setCardDisplay` row for both consumers; `safeImageUrl()` keeps only `https:` URLs, re-serialized via `new URL().href` (percent-encodes `"` `<` `>`). Check: `bun scripts/check-chart-data.ts`.
- Residual ⬜ (latent, not reachable in configured flows): the library's form UI writes `value="${field.initial_value}"` / `${field.rel_label}` unescaped — `family-chart.esm.js:2041`, `:2050`, `:2058`, `:2070` (inputs/textarea/select), `:2086`, `:2103` (info spans), sourced from `datum.data[…]` at `:3501`/`:3544`. Verified today: the editable form only renders empty placeholder data (`_new_rel_data` labels come from the static `setAddRelLabels`, `:3645–3719`) and no `rel_reference` fields are configured, so stored names cannot reach it. Revisit before enabling library edit-existing / rel_reference flows or on library upgrade — needs an upstream patch.

### 2. ✅ `sanitizeRichHtml` crashes → persistent 500
- `src/lib/sanitize.ts:99-100`: `name in PRESET_ATTRS` walks the prototype chain; `PRESET_ATTRS["constructor"]` is `Object`, `.test` undefined → `TypeError`.
- Executed repro: `sanitizeRichHtml('<p constructor="1">hi</p>')` and `renderUserMarkdown(...)` both threw `PRESET_ATTRS[name].test is not a function`.
- Reach: `blog/[slug]/index.astro:57-62` renders user posts with no try/catch → every visitor gets a 500; admin `TextEditor.tsx:63-64,255` crashes on stored content. Any registered user can trigger via direct `POST /me/blog` (bypasses the client editor).
- Fixed: `Object.hasOwn(PRESET_ATTRS, name)`. `scripts/check-sanitize.ts` covers `constructor`/`__proto__`/`toString`/`hasOwnProperty` in owner and UGC modes.
- Re-verified: independent repro adds `prototype` to the payload set (5 keys × 2 modes), all no-throw and `<p>x</p>`; `class`/preset-attr/link-rel regressions unchanged.

## Medium

### 3. ✅ Unencoded slug → API path traversal
- `src/lib/public-content.ts:37,146,200,209` and `src/lib/family.ts:44` interpolate the route slug into the upstream URL. Astro decodes `%5C` (`node_modules/astro/dist/core/util/pathname.js:11` uses `decodeURI`).
- Executed: slug `..\..\quotes` normalizes to `https://api.hafizbahtiar.com/api/quotes`; `..\..\..\owner\users` → `/owner/users`; also `/health`.
- Impact is lower than Medium suggests: the upstream request is an unauthenticated GET, so `/owner/*` returns 401; worst case another public endpoint's JSON renders as a post/project. Effectively Low.
- Fixed: `encodeURIComponent(slug)` at `public-content.ts:146,200,209`, `family.ts:44`, and the unused `blog.ts:17`. Re-verified independently: backslash slugs stay encoded (`.../api/v1/blog/..%5C..%5Cquotes`), and `?`/`#`/space are encoded too. Residual nuance: a slug of exactly `..` still resolves one segment up to `/api/v1/` (negligible — close fully with a `^[a-z0-9-]+$` slug whitelist if wanted). Build green after the change.

### 4. ⬜ Public family API returns full PII rows
- `src/lib/family.ts:21-26` fetches without credentials; repo's own note `docs/brain/family-module-brain.md:140-146` confirms the API returns `notes`, `metadata`, `firstName`, `lastName`, full living birthdates — whitelisting only protects the rendered page.
- Fix belongs in `hono-workers` (public DTO / server-side sanitize). Frontend cannot close it.

## Low

5. ⬜ `src/pages/projects/[slug]/index.astro:232` — `href={link.url}` with no scheme validation (`javascript:` URL from CMS would execute).
6. ⬜ Login lockout is in-memory only — `src/components/account/LoginForm.tsx:39`, `src/pages/admin/login.astro:222-223,380-383`. Reload = bypass; only Turnstile + backend limits remain.
7. ⬜ `session_active` cookie gate is client-settable — `src/lib/auth.ts:61`, `src/middleware.ts:88` (documented as UX, not a boundary). Admin data is fetched client-side behind backend auth, so no direct exposure found.
8. ⬜ Password change never calls `/auth/logout` — `src/components/account/AccountSettings.tsx:31-33`. `logout()` also swallows failures (`src/lib/auth.ts:67-76`).
9. ⬜ `/verify-email` confirms on GET, falls back to the **staging** MARC host when the env var is unset, and the token lives in URLs captured by persisted Workers Logs — `src/pages/verify-email.astro:13-28`, `wrangler.jsonc`.
10. ⬜ Frontend never checks `FamilyTree.isPublic` — `src/pages/family/index.astro` merges every tree the API returns; relies entirely on the backend filter.
11. ⬜ `npm audit`: 7 high / 2 moderate / 0 critical (wrangler, miniflare, undici, sharp, source-map-js, http-cache-semantics, postcss-selector-parser, @tailwindcss/typography, @cloudflare/vite-plugin). All have `fixAvailable`.
12. ⬜ Hygiene: `.gitignore` misses `.dev.vars`/`.env.*`; `.github/workflows/ci.yml` has no `permissions:` block; `public/_headers` vs `src/middleware.ts` CSP drift (geolocation, `api.waktusolat.app`); real family names + `/Users/hafiz/Developments/...` path committed in `docs/reports/family-page-phase-0-d1-verification.sql:3,31-41`.

## Confirmed clean
- No JS-readable tokens (httpOnly cookies only, no localStorage/URL tokens), no open redirects.
- All other HTML sinks sanitized or static (`dangerouslySetInnerHTML` only in `MyPosts.tsx` via `renderUserMarkdown`); no `eval`/`document.write`/`insertAdjacentHTML` in `src/`.
- No hardcoded secrets or committed env files (`git ls-files` → `.env.example` only); Turnstile secret absent from repo by design.
- Endpoints `resume.pdf.ts`, `bas/[feed].json.ts`, `kecemasan/[slug].vcf.ts` reviewed, no injectable input.
- Sanitizer protocol allowlists (`javascript:`, `data:`, `vbscript:` rejected; iframe pinned to youtube-nocookie) hold.

## Unverified leads
- Cloudflare edge backslash normalization — traversal not tested against production.
- Backend validation of project link URLs, family `photoUrl`, and the blog publish policy (affects #1/#2 reachability).
- Whether RBAC migrations are deployed in production.

## Re-check checklist after fixes (#1/#2/#3)
- [x] `bun scripts/check-chart-data.ts` + `bun scripts/check-sanitize.ts` pass (re-run independently).
- [x] Independent repro (42 checks): sanitizer no-throw on 5 inherited-key payloads × owner/UGC + regressions; `cardText` output has no raw `<` for tag/close/attribute payloads; `safeImageUrl` rejects `javascript:`/`http:`/`data:`/relative/empty and percent-encodes `"` `<` `>`.
- [x] Both consumers wired: `useFamilyChart.ts:88`, `FamilyTreeChart.tsx:187,190` — every `setCardDisplay` row uses `cardText`; avatars via `safeImageUrl` (`chart-data.ts:66`).
- [x] Slug fix verified: traversal stays encoded; `..`-segment nuance noted in #3.
- [x] `npm run build` exit 0 (re-run after all staged changes). Blog-path 500 resolved at module level (`renderUserMarkdown` no longer throws); no live browser run.