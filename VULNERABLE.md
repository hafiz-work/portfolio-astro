# VULNERABLE.md — open items

Audit of `portfolio-astro` (Astro SSR, Cloudflare Workers), 2026-10-14; re-checked 2026-10-17.
Open items only — fixed findings are removed (see git history). Deploy/verification steps live in `TODO.md` → "Owner".

## ⚠️ Important — read first (for other agents)

- **The public family backend API is now sanitized in code** (`hono-workers` `src/services/family-public-dto.ts`, allow-list chokepoint; living birth dates year-only) but **not verified in production**. Until it is, keep `src/lib/family-privacy.ts` as the second layer and never pass raw API family data to an island. After production is confirmed, update CLAUDE.md's "not privacy-sanitized" note and `docs/brain/family-module-brain.md` §7.
- **Login rate limiting is server-side in code** (`/auth` router: per IP, per account, global — `hono-workers` `src/routes/v1/owner/auth.ts`). The client lockout in `LoginForm.tsx` / `admin/login.astro` is UX only; don't rely on it.
- **Any new `set:html` on API or user data must go through the sanitizer** (`bun scripts/check-sanitize.ts`). `family-chart` uses innerHTML — card text must stay escaped (`bun scripts/check-chart-data.ts`).
- **Untrusted URL/localStorage input** (calculator state, `?zone=`, `?stesen=`, `?lokasi=`, `?negeri=`…) is validated against an allow-list before use and written to `.value` / text, never HTML. Keep that rule for new params.

## Open

1. `[backend]` **Session gate is client-side.** The `session_active` cookie is a documented UX gate (`src/middleware.ts:88`, `src/lib/auth.ts:61`); this Worker cannot read the API's httpOnly cookies. Fix = backend session check / BFF (optional — by design today).
2. **`/verify-email` token can land in Workers Logs.** The token arrives in the GET URL (from the email link) and `wrangler.jsonc` persists 10% of invocation logs. Ops decision (sampling/retention), not fixable in code.
3. **`family-chart` form UI interpolates `initial_value`/`rel_label` into HTML unescaped** (`family-chart.esm.js:2041`, `:2050`, `:2058`, `:2070`, `:2086`, `:2103`; values from `:3501`/`:3544`). Latent: the configured flows only render empty placeholders with static labels. Needs an upstream patch before enabling edit-existing / `rel_reference` flows or on library upgrade.
4. **Slug `..` nuance:** `encodeURIComponent` blocks all traversal except a bare `..` slug, which still resolves one segment up (`/api/v1/`). Negligible; close fully with a `^[a-z0-9-]+$` slug whitelist if wanted.

## Unverified against production

- The traversal fix and the family pages' `isPublic` filter (edge normalization / live API DTO).
- Backend validation of project link URLs, family `photoUrl`, and the blog publish policy — if the API already validates, the frontend fixes are defence-in-depth only.
- Whether the RBAC migrations are deployed in production.
