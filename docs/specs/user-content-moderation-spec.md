# User Content & Moderation Spec

**Status:** IMPLEMENTED locally 2026-10-09 (backend `feat/roles-permissions`, frontend `main`, both uncommitted; migrations 020-021 on **local** D1 only). Decisions in §1 confirmed by the owner ("default ikut cadangan"). Remote steps: §8.
**Repos:** `hono-workers` (schema, routes, moderation) + `portfolio-astro` (`/account` pages, admin moderation UI, public author line).
**Depends on:** `roles-permissions-spec.md` and `user-registration-spec.md` - both DONE locally. Email: **Resend**.

> **For the implementing agent:** this doc is the contract. Report DONE / PARTIAL / BLOCKED / NOT DONE. Never run `--remote`.

---

## 1. Decisions (owner, 2026-10-08)

| Question | Answer |
|---|---|
| What can a `user` do? | Write **blog posts** and **quotes**, edit their **own profile** |
| When is it public? | **Immediately** on publish - no approval queue |
| Moderation | Owner/admin can **reject** (hide) or **delete** with a **reason**, and **restore** a rejected item |
| Repeat offenders | Each account has a **strike score**; owner/admin can **temp-ban** or **permanently ban** |
| Where users manage it | **`/account`** (public shell). `/admin` stays owner/admin only - the `admin.access` gate is untouched |

Defaults (confirmed 2026-10-09):
- ⚠️ Strike score = count of reject + delete actions against the account in the **last 90 days** (restore cancels its reject). Shown to moderators; **no auto-ban** - a human decides.
- ⚠️ Admin gets `users.ban` too (owner can remove it in `/admin/roles`).
- ⚠️ Public user posts show **"by \<display name\>"** so visitors can tell them from the owner's writing.
- ⚠️ Rate limit: 5 blog posts + 20 quotes per user per 24 h.

## 2. Data model (backend migration `020_user_content.sql`)

```sql
-- who wrote it (NULL = owner/admin-authored, the existing rows)
ALTER TABLE blog_posts ADD COLUMN created_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE quotes     ADD COLUMN created_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;

-- quotes have no status today: add one ('published' | 'rejected')
ALTER TABLE quotes ADD COLUMN status TEXT NOT NULL DEFAULT 'published';
-- blog_posts.status gains the value 'rejected' (free text today: draft|published|archived)

-- the current moderation state of an item (latest action wins)
ALTER TABLE blog_posts ADD COLUMN moderation_reason TEXT;
ALTER TABLE quotes     ADD COLUMN moderation_reason TEXT;

-- every moderation action = history + strike source. Survives the content's deletion.
CREATE TABLE moderation_actions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    target_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content_type TEXT NOT NULL CHECK (content_type IN ('blog_post', 'quote')),
    content_id INTEGER,                    -- NULL once deleted
    content_title TEXT NOT NULL,           -- snapshot: title / first 80 chars of the quote
    action TEXT NOT NULL CHECK (action IN ('reject', 'restore', 'delete')),
    reason TEXT NOT NULL,                  -- required for reject/delete, shown to the user
    actor_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_bans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    expires_at DATETIME,                   -- NULL = permanent
    created_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    lifted_at DATETIME,                    -- set when lifted early
    lifted_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL
);
-- active ban = lifted_at IS NULL AND (expires_at IS NULL OR expires_at > now)
-- + indexes on created_by_user_id, moderation_actions(target_user_id, created_at), user_bans(user_id)
```

The owner/admin can never be banned or moderated (checked in code: target must hold no `admin.access`).

## 3. Permissions (added to migration 020, codes in `services/permissions.ts`)

| Code | owner | admin | user | Guards |
|---|:-:|:-:|:-:|---|
| `account.blog` | ✓ | ✓ | ✓ | `/me/blog/*` - own posts only |
| `account.quotes` | ✓ | ✓ | ✓ | `/me/quotes/*` - own quotes only |
| `moderation.read` | ✓ | ✓ | | queue, history, strike scores |
| `moderation.act` | ✓ | ✓ | | reject / restore / delete user content |
| `users.ban` | ✓ | ✓ ⚠️ | | ban / lift ban |

Ownership is in the **query**, never a client id: every `/me/*` read/write has `WHERE created_by_user_id = :callerId`
(IDOR - a foreign id returns 404, not 403).

## 4. Backend (`hono-workers`)

### 4.1 Ban enforcement (one place each)
- `POST /auth/login`: active ban → `403 { error: 'Account banned', data: { reason, expiresAt } }` (no session issued).
- `jwtAuth`: active ban → 403 same body (catches existing sessions). Cached per request with the user load (one indexed query).
- Banning also destroys the user's sessions (`destroySessionsForUser`), like a password change.

### 4.2 User routes (`routes/v1/account/`)
| Route | Permission | Notes |
|---|---|---|
| `GET/POST /me/blog`, `GET/PUT/DELETE /me/blog/:id` | `account.blog` | fields: title, excerpt, body (markdown), tags, cover. No `is_featured`, no sections/checklists. `status`: `draft` / `published` only - a `rejected` post can't be re-published by its author (409) |
| `GET/POST /me/quotes`, `PUT/DELETE /me/quotes/:id` | `account.quotes` | text, author, source, existing tags only (no creating tags) |
| `PATCH /me` | `account.update` | display name, bio, avatar, links - never email/role |
| `GET /me/moderation` | `account.read` | the caller's own moderation history + active ban (so they see *why*) |

Validation as the admin validators, plus: slug generated server-side (`<slug>-<id>` to avoid collisions with the owner's posts); body max 50 KB; rate limit (§1) per user via the existing D1 counter limiter.

### 4.3 Moderation routes (`routes/v1/owner/moderation.ts`, behind the `/owner/*` gate)
| Route | Permission |
|---|---|
| `GET /owner/moderation/content?type=&status=` - user-authored items, newest first | `moderation.read` |
| `POST /owner/moderation/:type/:id/reject` `{ reason }` | `moderation.act` |
| `POST /owner/moderation/:type/:id/restore` `{ reason }` | `moderation.act` |
| `DELETE /owner/moderation/:type/:id` `{ reason }` | `moderation.act` |
| `GET /owner/moderation/users/:id` - strike score, history, bans | `moderation.read` |
| `POST /owner/moderation/users/:id/ban` `{ reason, expiresAt? }` / `.../unban` | `users.ban` (moved from `/owner/users`: that router's verb guard reads POST as `users.create`) |

Each action writes `moderation_actions` in the **same D1 batch** as the content change, plus an `audit_logs` row.
Reject/restore only touch user-authored rows (`created_by_user_id IS NOT NULL`); owner content stays on the normal admin routes.

### 4.4 Public reads
- Blog list/detail already filter `status = 'published'` - `rejected` is excluded for free. Add `author_name` (join `users`, `displayNameOf`) for user posts.
- Quotes public list: add `WHERE status = 'published'`.
- No KV cache on these routes; the HTTP `Cache-Control: max-age=60, stale-while-revalidate=600` means a rejected item can linger for about a minute at the edge/browser. Accepted.

### 4.5 Verify
New `scripts/verify-user-content.ts` (in-memory SQLite on the real 019 + 020 SQL, like `verify-admin-role-guard.ts`): IDOR (user B can't read/edit user A's post), rejected post hidden from public + not re-publishable, strike score math, ban blocks login + existing session, owner/admin unbannable, rate limit.

## 5. Frontend (`portfolio-astro`)

### 5.1 `/account` (public shell, `noindex`, guard: signed in, else `/login`)
| Page | What |
|---|---|
| `/account` | profile form (`PATCH /me`), password (`PUT /me/password`), moderation notices + active ban banner |
| `/account/blog`, `/account/blog/new`, `/account/blog/[id]` | own posts list + editor (markdown textarea + preview). Rejected posts show the reason, read-only |
| `/account/quotes` | own quotes, inline add/edit (same pattern as `QuoteTagsManager`) |

`homeFor()` (`src/lib/auth.ts`) switches its non-admin target from `/` to `/account`. Login shows the ban reason + end date on 403.

### 5.2 Rendering user HTML - **security**
User markdown → HTML on the public page goes through `sanitizeRichHtml` with a **stricter user mode**: no `iframe`, no `input`,
links forced to `rel="nofollow ugc noopener noreferrer"` + `target="_blank"`. The owner's posts keep today's preset.

### 5.3 Admin
- **`/admin/moderation`** (`moderation.read`): queue of user-authored blog posts + quotes, filters (type, status), actions reject / restore / delete with a required reason; click an author → strike score, history, bans, ban / unban (`users.ban`).
- `/admin/users`: strike score + ban badge per row, ban/unban buttons.
- Sidebar: "Moderation" under Inbox.

### 5.4 Public
- Blog card + post: "by \<name\>" on user posts. Quotes: no change beyond hiding rejected.

## 6. Phases

| # | Repo | Work | Done when |
|---|---|---|---|
| 0 | - | ⚠️ defaults in §1 confirmed; **registration's email sender decided** | answered |
| 1 | both | `user-registration-spec.md` | a `user` can sign up, verify, log in, land on `/account` |
| 2 | backend | §2-4 (migration 020, `/me/*`, moderation, bans, verify script) | verify script + e2e pass locally |
| 3 | frontend | §5 | build passes; flows clicked through in Brave |
| 4 | owner 👤 | backup → migrate remote → deploy backend → deploy frontend | - |

User content ships **with** moderation (Phases 2-3 together) - publish-immediately must never go live without reject/ban.

## 7. Never

- Never trust a content id from the client for ownership - scope by `created_by_user_id = caller`.
- Never render user HTML without the strict sanitizer mode.
- Never let moderation/ban touch an account with `admin.access`.
- Never auto-ban - the strike score informs a human.
- Never run remote migrations from an agent.

## 8. As built (2026-10-09)

**Backend:** migrations `020_email_verification.sql`, `021_user_content.sql`; `services/{email,registration,user-content}.ts`;
`routes/v1/account/{me,content}.ts` (`/me`, `/me/blog`, `/me/quotes`), `routes/v1/owner/moderation.ts`; `/auth/register`,
`/auth/resend-verification`, `/auth/verify-email`; login + `jwtAuth` enforce verification and bans (`AuthBlockedError` → 403 with `code`).
`scripts/test-db.ts` builds an in-memory SQLite from every migration; `scripts/verify-user-content.ts` (15 checks) + all other verify scripts pass.

**Frontend:** `/register` (+ `?resend=1`), `/account/verify`, `/account`, `/account/blog`, `/account/quotes`, `/admin/moderation`;
login shows unverified / banned reasons; shared `src/lib/turnstile.ts`; `sanitizeRichHtml(html, { ugc: true })` + `renderUserMarkdown()`
(`scripts/verify-sanitize.ts`); public "by <name>" on posts and quotes; middleware gates `/account/*` (except `/account/verify`).

**E2E (local, wrangler dev + astro preview, test accounts removed):** register → email (logged in dev) → verify → login; post live with
"by <name>"; reject hides it + author sees the reason and can't re-publish; ban kills the session and blocks login with the reason;
owner/admin unbannable; `<script>` in a user post stripped.

**Owner steps 👤**
1. Resend: verify `hafizbahtiar.com` (DNS records Resend gives), then `npx wrangler secret put RESEND_API_KEY`.
   Optional `EMAIL_FROM` (default `Hafiz Bahtiar <noreply@hafizbahtiar.com>`), `SITE_URL` (default `https://hafizbahtiar.com`).
   Without the key, production registration fails loudly (500) rather than silently not sending.
2. Remote D1, in order, after a backup: migrations 018 → 023 (`roles-permissions-spec.md` §7 for 018-019; 022 moves sessions to D1 - everyone signs in once more after it; 023 moves Telegram dedupe to D1). Deploy the backend right after: it no longer has a KV binding. Then the old namespace can be deleted: `bunx wrangler kv namespace delete --namespace-id 8bfb0f90c58a40b78b0f0917a0fe7270`.
3. Deploy backend, then frontend.
