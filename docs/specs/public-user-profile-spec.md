# Public User Profile Spec

**Status:** PROPOSED 2026-10-13 - not started. Needs backend work; the frontend is blocked on it.
**Repos:** `hono-workers` (backend - username, visibility, public read) + `portfolio-astro` (settings UI, public page).
**Depends on:** `user-registration-spec.md` (accounts, `GET /me`), `user-content-moderation-spec.md` (own posts/quotes, `rejected`, bans).
**Backend path:** CLAUDE.md says `/Users/hafiz/Developments/hono-workers` - not present on the 2026-10-13 machine; confirm the path before Phase 1.

A signed-in user gets a shareable public page with their profile, links, posts and quotes - their "professional profile" on hafizbahtiar.com. Today the account user menu has a "Website" item that only links to `/`; it becomes "View public profile".

---

## 1. Decisions (owner - answer before Phase 1)

| # | Question | Recommendation |
|---|---|---|
| D1 | URL | **`/u/{username}`**. The request said `/me/{username}`, but `/me/*` is already the API's *authenticated, own-data* namespace (`GET /me`, `/me/blog`, `/me/quotes`) and reads as "my" - a public page for someone else under `/me` confuses both people and code. `/@username` is a second option (needs an Astro route `[handle].astro` matching `@…`, collides with nothing today). |
| D2 | Visibility default | **Off (opt-in).** PDPA: a profile becomes public only when the user turns it on. Existing users stay private. |
| D3 | Username rules | 3-30 chars, `^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$` (lowercase letters, digits, single hyphens inside), stored lowercase, unique. Reserved list (§2.3). |
| D4 | Username changes | Allowed any time; the old one is freed at once (no redirects). Shortcut - add a redirect table only if people complain about dead shared links. |
| D5 | What shows | display name (fallback: account name), bio, location, the 4 links, "member since" (month + year), published posts, published quotes. Never email. |
| D6 | Search engines | Index public profiles (`index, follow`) - that's the point of sharing. Private/unknown = 404 (not 403, so usernames can't be probed for "exists but private"). |

## 2. Backend (`hono-workers`)

### 2.1 Migration (`0xx_user_username.sql`)

```sql
ALTER TABLE users ADD COLUMN username TEXT;
ALTER TABLE users ADD COLUMN profile_public INTEGER NOT NULL DEFAULT 0;
CREATE UNIQUE INDEX idx_users_username ON users(username);  -- NULLs don't collide in SQLite
```

Put the columns on whichever table backs the `/me` profile fields if that isn't `users` - check `services/` for where `displayName`/`bio` live. Local first (`db:migrate`); remote migration is the owner's step, never the agent's.

### 2.2 Own account (`routes/v1/account/me.ts`)

- `GET /me` adds `username: string | null` and `profilePublic: boolean`.
- Profile update (the endpoint `accountService.updateProfile` calls) accepts `username` and `profilePublic`:
  - validator in `validators/` with D3's regex + reserved list, `.strict()` like the others;
  - lower-case before the uniqueness check; taken -> **409** `{ code: "username_taken" }`;
  - `profilePublic: true` without a username -> **400** `{ code: "username_required" }`.
- No separate "is it available?" endpoint - the 409 on save is enough (skipped on purpose; add one if the settings form needs live feedback).

### 2.3 Reserved usernames

Anything that is or may become a site path or role: `admin`, `owner`, `account`, `login`, `logout`, `register`, `settings`, `me`, `u`, `api`, `blog`, `quotes`, `projects`, `family`, `showcase`, `hafiz`, `hafizbahtiar`, `support`, `help`, `root`, `system`, `null`, `undefined`. One exported array, also used by the frontend validator.

### 2.4 Public read - `GET /public/profiles/:username`

- No auth. 404 when: no such username, `profile_public = 0`, user banned (active ban), or email not verified. One indistinguishable 404 for all.
- Response - a **whitelist DTO**, built field by field (never spread a DB row):

```ts
{
  username: string;
  displayName: string;          // profile.displayName || users.name
  bio: string | null;
  location: string | null;
  links: { website, githubUrl, linkedinUrl, twitterUrl };   // each string | null
  memberSince: string;          // "2026-10" - month only
  posts:  { slug, title, excerpt, publishedAt, tags }[];    // status published, not rejected, newest 20
  quotes: { id, text, author, source }[];                   // not rejected, newest 20
}
```

- Never: `id`, `email`, `role`, `permissions`, strikes, moderation history, timestamps beyond `memberSince`/`publishedAt`.
- Cache like the other public endpoints (colo cache + `Cache-Control`, short - e.g. 5 min) and purge/skip-cache on the owner's own profile update if the cache layer allows.
- Rate limit with the existing public limiter. No list endpoint - **no user directory** (anti-scraping).

### 2.5 Verify (backend)

Script in `scripts/` (house style: assert-based, `bun scripts/verify-…`): username validator (good/bad/reserved/case), 409 on duplicate (case-insensitive), 400 public-without-username, public read returns 404 for private / banned / unverified / unknown and the DTO has exactly the whitelisted keys.

## 3. Frontend (`portfolio-astro`)

### 3.1 Settings (`/account/settings`, `AccountSettings.tsx`)

New first section **"Public profile"** above "Change password":
- `Input` username (prefix shown as `hafizbahtiar.com/u/`), client check with the same regex + reserved list, 409 -> field error "That username is taken".
- shadcn `Switch` "Show my profile publicly" (disabled until a username is saved).
- When public: the URL with **Copy** and **Open** buttons.
- Uses `useFormGuard` like the password form; separate submit.
- `Me` type (`src/lib/auth.ts`) gains `username`, `profilePublic`.

### 3.2 Public page `src/pages/u/[username].astro`

- `prerender = false`, `PublicLayout` (site navbar/footer - it's a public page, not the account shell).
- Fetch in frontmatter through a `src/lib/` service extending `ApiClient`'s public path (no `noCache`, like `family.ts`); 404 -> `Astro.rewrite("/404")`.
- Map the response into a local DTO again before rendering (same idea as `family-privacy.ts`) - the page renders only whitelisted fields even if the API grows.
- Layout: header (initials avatar, display name, @username, location, bio, link buttons), then Posts (links to `/blog/{slug}`) and Quotes. Public palette (gray/sky, `STYLE.md`), not shadcn tokens.
- `<meta>`: title `"{displayName} (@{username}) | Hafiz Bahtiar"`, description from bio, OG card = site default for now.
- Validate `username` against D3's regex before calling the API (trust boundary, like `resolveZone`).

### 3.3 Links into it

- Account user menu (`AccountSidebar.tsx`): "Website" -> **"View public profile"** (`/u/{username}`) when public; keep "Website" otherwise.
- Blog post author name and `/quotes` attribution link to the profile when the author's is public - needs `authorUsername` (null when private) on the public post/quote DTOs. Phase 3, optional.

## 4. Phases

1. **Backend:** migration, `/me` fields, profile update + validator + reserved list, public read, verify script. Local D1 only.
2. **Frontend:** settings section, `/u/[username]` page, user menu link. `npm run build`.
3. **Optional:** `authorUsername` on public blog/quote DTOs + links; per-profile OG image.
4. **Owner:** remote migration, deploy backend, then frontend.

## 5. Never

- No email, user id or role in any public response or page.
- No public list/search of users.
- No profile public by default; no public page for banned or unverified accounts.
- No lookup by display name - username only.
- No remote D1 migration by an agent.
