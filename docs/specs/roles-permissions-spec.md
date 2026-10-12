# Roles & Permissions Spec (RBAC)

**Status:** IMPLEMENTED locally 2026-10-08 - backend branch `feat/roles-permissions` (uncommitted), frontend on `main` (uncommitted). Migrations 018-019 applied to **local** D1 only. Remote steps pending (§7 👤).
**Repos:** `hono-workers` (schema, middleware, routes) + `portfolio-astro` (auth, guards, sidebar, Users/Roles pages).
**Feeds:** `docs/specs/user-registration-spec.md` (now unblocked: `owner` role, permissions, `GET /me` exist).

> **For the implementing agent:** this doc is the contract - if reality forces a deviation, update it and its Status in the
> same change. Never run `--remote` migrations or remote writes - the owner does that (§7).

---

## 1. Before (verified 2026-10-08) - why this exists

- One `users.role` column, `CHECK (role IN ('admin','moderator','user'))` - `owner` could not be stored; the owner row was `admin`.
- `requireAdmin()` let any `admin` act as owner; `OwnerService` fell back to the first `admin`; `canManagePrivilegedAccount` required an `OWNER` that couldn't exist; `moderator` unused.
- `project-children` was mounted at `/owner` with `use('*')` - its middleware ran on **every** `/owner/*` router mounted after it (verified with Hono).
- Frontend knew no roles: any signed-in account got the admin shell.

## 2. Model

### 2.1 Tables (migration 019)

| Table | Columns | Notes |
|---|---|---|
| `roles` | `id`, `code` (unique, lowercase), `name`, `description`, `is_system`, timestamps | system: `owner`, `admin`, `user` |
| `permissions` | `id`, `code` (unique, `<module>.<action>`), `module`, `action`, `description` | seeded from code (`PERMISSIONS`) - never edited in the UI |
| `role_permissions` | `role_id`, `permission_id` (PK pair, FK cascade) | the grant matrix |

`users.role` keeps the role **code** (no FK rebuild). Triggers: a user's role must exist in `roles`; a role can't be deleted or
renamed while users hold it, and system roles never. Exactly one `owner` (partial unique index, migration 018).

**Naming / casing:** `role_permissions` (common convention; same meaning as "permission_roles"). Codes are **lowercase** -
the norm for permission strings (OAuth/Auth0 scopes `read:users`, Kubernetes verbs, AWS IAM actions) and the casing this
codebase already normalises roles to. UPPERCASE is for constants in code, not stored values.

### 2.2 Permission catalogue (46)

- **CRUD modules** - each gets `read` / `create` / `update` / `delete`:
  `blog`, `projects` (incl. sections, tech stacks, media, policies), `experiences`, `quotes` (incl. tags), `contact`,
  `uploads`, `family`, `profile` (owner public profile + Telegram), `users`, `roles`.
- **Special:** `admin.access` (enter `/owner` API + `/admin` UI), `dashboard.read`, `audit.read` (system logs),
  `roles.assign` (change a role, manage admin accounts), `account.read`, `account.update` (own account / password).

### 2.3 Default matrix

| | owner | admin | user |
|---|:-:|:-:|:-:|
| `admin.access`, `dashboard.read` | ✓ | ✓ | |
| `blog` `projects` `experiences` `quotes` `contact` `uploads` `users` (CRUD) | ✓ | ✓ | |
| `family` `profile` (CRUD), `audit.read` | ✓ | | |
| `roles.*`, `roles.assign` | ✓ | | |
| `account.read`, `account.update` | ✓ | ✓ | ✓ |

Hard rules (code, not data):
- **Owner = every permission, in code** (`loadPermissions`) - a bad row can't lock the owner out. The owner role is immutable via API.
- **Role administration is owner-only:** `roles.*` / `roles.assign` can't be granted to any other role (validator).
- **Users API:** without `roles.assign` a caller sees/manages only `user` rows; the owner row is never manageable (not even by the owner); `owner` is never assignable.

## 3. Backend (`hono-workers`) - as built

| File | What |
|---|---|
| `migrations/018_roles_owner.sql` | rebuild `users` (no CHECK), owner row → `owner`, `moderator` → `user`, single-owner index; snapshots/restores `family_trees.created_by_user_id` (DROP TABLE fires its `ON DELETE SET NULL`) |
| `migrations/019_rbac.sql` | 3 tables, seeds §2.2-2.3, triggers; `schemas/roles.sql` mirrors it |
| `services/permissions.ts` | `PERMISSIONS`, `OWNER_ONLY`, `actionFor(method)`, `loadPermissions(db, role)`, `canSeeUser` / `canManageUser` |
| `middleware/auth.ts` | `requirePermission(code)`, `requireModule(module)` (GET→read, POST→create, PUT/PATCH→update, DELETE→delete), `hasPermission(c, code)` (loaded once per request, cached on context). `jwtAuth` is a no-op when an outer gate already ran. `requireAdmin` deleted |
| `routes/v1.ts` | **one gate** `v1.use('/owner/*', jwtAuth, requirePermission('admin.access'))` before every owner router (`/auth` stays outside) - a router that forgets its guard is still closed to users |
| `routes/v1/owner/*.ts` | each router also guards its own module; `dashboard /logs` needs `audit.read`; `project-children` guards only its own paths |
| `routes/v1/owner/roles.ts` + `services/roles.ts` + `validators/roles.ts` | `GET /owner/roles`, `GET /owner/roles/permissions`, `POST`, `PUT /:code` (name/description/permissions, atomic batch), `DELETE /:code`; audited (`entity_type = 'role'`) |
| `routes/v1/account/me.ts` | `GET /me` → `{ id, name, email, role, permissions }`; `PUT /me/password` (moved from `/owner/profile/password`) |
| `services/owner.ts` | owner = role `owner` only (no admin fallback) |
| `routes/v1/owner/auth.ts`, `services/auth.ts` | login returns `user.role`; `displayNameOf()` fixes the `"undefined undefined"` name |
| `scripts/verify-admin-role-guard.ts` | 23 checks; runs the **real** 019 SQL on in-memory SQLite (bun:sqlite) - matrix, triggers, gates, policy, wiring |

Verified 2026-10-08: tsc clean, all 8 `scripts/verify-*.ts` pass, and an end-to-end run on `wrangler dev` with temporary local accounts (removed afterwards):
admin → 403 on family/profile/roles/logs, 200 on content; user → 403 on every `/owner/*` path incl. non-existent ones (global gate);
anonymous → 401; custom role `editor` (blog read+update) → GET/PUT pass, DELETE 403; role in use / system role → 409; granting `roles.update` → 400; editing `owner` → 403.

## 4. Frontend (`portfolio-astro`) - as built

| File | What |
|---|---|
| `src/lib/auth.ts` | `Role`, `User.role`, `Me`, `authService.me()` (one request per page, cleared with auth state), `can(me, code)`, `homeFor(me)` |
| `src/pages/login.astro` | both redirects use `homeFor(me)` - `/admin` with `admin.access`, else `/` (→ `/account` once the registration spec ships it) |
| `src/layouts/PrivateLayout.astro` | guard: token/refresh, then `admin.access` or leave. Cosmetic - backend gate is the wall |
| `src/components/admin/AdminSidebar.astro` | every item has `perm`; hidden when missing, empty groups hidden; footer shows real name + role; new **Users** + **Roles** items |
| `src/lib/access.ts` | users + roles admin client |
| `/admin/users` (`UsersManager.tsx`) | list/search, add (role picker only with `roles.assign`), role select, active toggle, delete; owner row locked, self not editable |
| `/admin/roles` (`RolesTable.tsx`), `/admin/roles/new` + `/admin/roles/edit?code=` (`RoleForm.tsx`), `/admin/roles/view?code=` (`RoleDetail.tsx`) | standard list / new / edit / detail: name, description, permission grid (module × action); delete unused custom roles; owner locked (view only), `roles` module disabled. Backend `GET /owner/roles/:code` for one role |
| `src/lib/settings.ts` | password change → `PUT /me/password` |

Not built: per-page guards (the sidebar hides, the backend 403s - the page shows its existing error state).

## 5. Phases

| # | Status |
|---|---|
| 0 decisions (drop `moderator`, §2.3 defaults, tables, lowercase) | DONE - owner chose "ikut cadangan, ikut standard" + tables |
| 1-2 backend | DONE (local) |
| 3 frontend | DONE (build passes; not yet clicked through in a browser) |
| 3b remote 👤 | NOT DONE - §7 |

Deploy order: backend code + migrations 018-019 together (code reads role `owner` and the RBAC tables), then frontend.

## 6. Later

- KV cache for `loadPermissions` if the per-request D1 read ever shows up in latency (one indexed query today; owner skips it).
- Split `POST .../reorder` from `create` only if a custom role ever needs reorder without create (`actionFor` comment).

## 7. Owner-run steps 👤 (agents never run these)

```bash
# 1. Read-only: confirm the owner row on remote BEFORE migrating (018 makes the lowest-id owner/admin the owner)
npx wrangler d1 execute hono_workers_db --remote --command "SELECT id, email, role, is_active FROM users ORDER BY id"
# 2. Backup
npx wrangler d1 export hono_workers_db --remote --output=backup-pre-018.sql
# 3. Deploy backend, then migrate
npm run db:migrate:remote
# 4. Verify
npx wrangler d1 execute hono_workers_db --remote --command "SELECT role, COUNT(*) FROM users GROUP BY role; SELECT COUNT(*) FROM permissions; PRAGMA foreign_key_check;"
#    expect: exactly one owner, 46 permissions, no FK rows
```

No down migration for 018 (it would have to squeeze `owner` into the old CHECK) - restore from the step-2 export.
Ownership transfer: one manual statement swapping two rows' roles in a transaction - never an API.

## 8. Never

- Never accept `owner` from input; never let a non-owner role hold `roles.*`.
- Never trust the JWT `role` claim - `jwtAuth` reads D1.
- Never put the permission map in the frontend - it reads `/me.permissions`.
- Never add an `/owner` router without its own `requireModule`/`requirePermission` (the verify script fails), and never mount a router at `/owner` with `use('*')`.
- Never run remote migrations from an agent.
