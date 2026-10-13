# User Registration Spec

**Status:** IMPLEMENTED locally 2026-10-09 - email via **Resend**. As-built notes and owner steps: `user-content-moderation-spec.md` §8.
**Repos:** `hono-workers` (backend - register, verify, role gate) + `portfolio-astro` (pages + guards).
**Depends on:** `docs/specs/roles-permissions-spec.md` - DONE locally 2026-10-08 (`owner` role, RBAC tables, `requirePermission`, `GET /me`, `PUT /me/password`). New accounts get role `user` (`account.read`, `account.update`).

> **Open question - answer before Phase 1:** ⚠️ what does a registered user *do*? (comments on blog posts? relatives contributing to the family tree? something else?)
> No feature = no registration: it only buys spam signups, stored PII (PDPA) and auth surface to maintain. The answer sets what `/account` shows and whether `/register` is public or invite-only.

---

## 1. URLs

| URL | Who | Purpose |
|---|---|---|
| `/register` | public | sign-up form (Turnstile) - unlisted from the navbar until the feature ships |
| `/login` | everyone | one login; redirect by role after success |
| `/account` | role `user` (and owner) | the user's own area - profile, settings, the feature's UI |
| `/admin` | `owner` / `admin` only | unchanged, stays the owner's CMS |
| `/verify-email` | - | **taken** by MARC (separate Go app). Our link uses `/account/verify?token=…` |

Post-login redirect: `owner`/`admin` → `/admin`, everyone else → `/account`.

## 2. Current state (verified 2026-10-08)

- `users.role` defaults to `'user'`; `requireAdmin()` (`hono-workers/src/middleware/auth.ts`) admits only `owner`/`admin`. Admin **data** is already safe from a `user` token.
- `POST /auth/login` (`src/routes/v1/owner/auth.ts`) has **no role check** - any active user can log in. Fine once roles route correctly, but see §4.
- `users` already has `email_verified`, `email_verification_token`, `password_reset_*` columns. No email-sending service exists in the backend yet.
- Frontend gate is cosmetic: `middleware.ts` checks the `session_active` cookie (logged in, not role); `PrivateLayout` `guardAuth` checks token presence only. A `user` would see an empty admin shell.
- `LoginResponse.user` (`src/lib/auth.ts`) has no `role` field.

## 3. Backend (`hono-workers`) - for the backend agent

1. `POST /auth/register` `{ email, password, name, captchaToken }`
   - Turnstile required (reuse `utils/turnstile`), rate limit per IP (reuse the login limiter's pattern).
   - `role` is **always** `'user'` server-side - never read from the body.
   - Same password hashing as existing users. Duplicate email → generic `200` "check your email" (no account enumeration).
   - Creates the row with `email_verified = false`.
2. Email verification: send a single-use, expiring token link to `https://hafizbahtiar.com/account/verify?token=…`; `POST /auth/verify-email { token }` sets `email_verified = true`. ⚠️ pick a sender (Resend / Cloudflare Email / MailChannels) - none exists.
3. `POST /auth/login`: refuse `email_verified = false` for role `user` (owner unaffected). Return `user.role` in the response.
4. ~~`GET /me`~~ - exists (`routes/v1/account/me.ts`, returns `permissions` too).
5. Later, with the feature: `PATCH /me`, password reset (columns exist), account delete (PDPA).

## 4. Frontend (`portfolio-astro`)

1. `src/lib/auth.ts`: add `role` to `User`; `register()`; `me()`. Set `session_active` as today.
2. `src/pages/login.astro`: after success redirect by `role` (§1) instead of always `/admin`.
3. `PrivateLayout.astro` `guardAuth`: after the token check, call `me()`; role not `owner`/`admin` → `location.replace("/account")`. Real access control stays in the backend.
4. `src/pages/register.astro`: copy `login.astro` (same layout, Turnstile widget, `.admin-*`/public atoms per `STYLE.md`). `prerender = false`, `noindex`.
5. `src/pages/account/index.astro` + `account/verify.astro`: public shell (`PublicLayout`), client guard → `/login` if not signed in. `noindex`.
6. `middleware.ts`: gate `/account/*` (except `/account/verify`) on `session_active` like `/admin`. CSP: no change if all calls go to the existing API origin.

## 5. Phases

| Phase | Repo | Work | Done when |
|---|---|---|---|
| 0 | - | answer the ⚠️ open question | feature named |
| 1 | backend | §3.1-3.4 + email sender | register → email → verify → login works with curl |
| 2 | frontend | §4.1-4.3 (role-aware login + admin guard) | `user` login lands on `/account`, never sees admin shell |
| 3 | frontend | §4.4-4.6 (pages) | `npm run build` passes; flow works end to end locally |
| 4 | both | the actual feature from Phase 0 | - |

## 6. Never

- No user id in `/account` URLs - identity comes from the session (`GET /me`). Every endpoint checks the token owns the resource (IDOR); a public share URL, if ever needed, uses a non-sequential id *and* that check.
- Never accept `role` from the client. Never give `/admin` to a non-owner/admin.
- Never run remote D1 migrations from an agent - owner runs them.
- Don't link `/register` in the navbar before Phase 4.
