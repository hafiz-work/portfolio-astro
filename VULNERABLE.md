# VULNERABLE.md — open items

Audit of `portfolio-astro` (Astro SSR, Cloudflare Workers), 2026-10-14.
Fixed findings and the checked-clean list were removed — see git history for resolved items and their verification evidence.
Backend `hono-workers` is out of scope per SECURITY.md.

## Needs backend (`hono-workers`) — can't be closed in this repo

1. **Public family API returns full PII rows.** `src/lib/family.ts:21-26` fetches unauthenticated; the API returns `notes`, `metadata`, `firstName`, `lastName`, full living birthdates (confirmed by the repo's own note, `docs/brain/family-module-brain.md:140-146`). Fix = public DTO / server-side sanitize.
2. **No server-side rate limit on `/auth/login`.** The frontend lockout is in-memory only (`src/components/account/LoginForm.tsx`, `src/pages/admin/login.astro`) and bypassable by reload or direct API calls. Fix = backend rate limit.
3. **Session gate is client-side.** The `session_active` cookie is a documented UX gate (`src/middleware.ts:88`, `src/lib/auth.ts:61`); this Worker cannot read the API's httpOnly cookies. Fix = backend session check / BFF (optional — by design today).

## Residuals / watch items

4. **`/verify-email` token can land in Workers Logs.** The token arrives in the GET URL (from the email link) and `wrangler.jsonc` persists 10% of invocation logs. Ops decision (sampling/retention), not fixable in code.
5. **`family-chart` form UI interpolates `initial_value`/`rel_label` into HTML unescaped** (`family-chart.esm.js:2041`, `:2050`, `:2058`, `:2070`, `:2086`, `:2103`; values from `:3501`/`:3544`). Latent: the configured flows only render empty placeholders with static labels, so stored names can't reach it today. Needs an upstream patch before enabling edit-existing / `rel_reference` flows or on library upgrade.
6. **2 moderate npm advisories:** `postcss-selector-parser` via `@tailwindcss/typography`; only fixable via a breaking `--force` downgrade. Revisit on the next typography release.
7. **Slug `..` nuance:** `encodeURIComponent` blocks all traversal except a bare `..` slug, which still resolves one segment up (`/api/v1/`). Negligible; close fully with a `^[a-z0-9-]+$` slug whitelist if wanted.

## Unverified against production

- The traversal fix and the family pages' `isPublic` filter were not exercised against production (edge normalization / live API DTO).
- Backend validation of project link URLs, family `photoUrl`, and the blog publish policy — if the API already validates, the frontend fixes are defence-in-depth only.
- Whether the RBAC migrations are deployed in production.
