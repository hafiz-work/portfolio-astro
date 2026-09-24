# Project CMS - Production Rollout Checklist

**Status:** Not yet executed. **Do not deploy or run remote D1 migration without explicit go-ahead.**
**Repos:** `hono-workers` (backend/API + D1), `portfolio-astro` (public + admin frontend).
**Branch (current work):** `portfolio-admin-backend` in both repos.

---

## ⛔ Do-not-deploy gate (read first)

The public frontend now renders project CTAs **exclusively from structured `project_links`** (active + public only). Production D1 is **not yet migrated (010) or backfilled (007/008)**, so its `project_links` table is empty.

**If the frontend is deployed before production D1 has migration 010 + seeds 007/008 applied, every project will lose its Source/Demo/Live CTAs** (the page falls back to the "Discuss this project / Request a walkthrough" contact CTA for all). The structured detail sections (problem/contribution/etc.) and carousel media would also be empty.

➡️ **Therefore the DB must be migrated + seeded before the frontend deploy.** Follow the order below exactly.

---

## 1. Preflight checks (local)

- [ ] Both repos on the intended release commit; `git status` clean in each.
- [ ] Decide the release/merge process per your workflow (these sessions never touched `main`; merging `portfolio-admin-backend` → your deploy branch is a separate, deliberate step).
- [ ] Backend type-check: `cd hono-workers && npx tsc --noEmit` → clean.
- [ ] Frontend: `cd portfolio-astro && npx astro check` → 0 errors; `npm run build` → green.
- [ ] Local D1 migration applied: `cd hono-workers && npm run db:migrate:status` shows `010 - projects_cms`.
- [ ] Local D1 seeds verified idempotent (run twice, counts stable): `007_projects_cms_backfill`, `008_flagship_case_studies`.
- [ ] Local owner-API E2E green (create→publish→public sanitization→archive).
- [ ] Confirm production secrets/vars exist on the Worker: `JWT_SECRET`, `R2_PUBLIC_URL`, `ALLOWED_ORIGINS`, `ENVIRONMENT=production` (and `RECAPTCHA_SECRET_KEY` if reCAPTCHA is enforced).
- [ ] **Back up production D1 before any remote change** (export): `wrangler d1 export hono_workers_db --remote --output backup-pre-cms-$(date +%F).sql`.

## 2. Exact deploy order

> Run from `hono-workers` unless noted. Remote = production D1.

1. **Remote migrate 010** - additive schema (new columns + child tables; legacy columns untouched):
   `npm run db:migrate:remote` → re-check `node ./scripts/migrate.js status --remote` shows `010` applied.
2. **Remote seed (007 then 008)** - backfill children + flagship narrative:
   `npm run db:seed:remote` (applies all pending seeds in order). Verify remotely: 9 projects, `project_tech_stacks`/`project_features`/`project_links`/`media_assets`/`project_media` populated, broken `com-invois`/`fasttrack-system` links are `hidden`.
3. **Deploy backend** - `cd hono-workers && npm run deploy` (`wrangler deploy --minify`). Smoke: `GET https://api.hafizbahtiar.com/api/v1/projects` returns 9; `GET …/projects/qiubbx` returns structured DTO with `links`/`techStacks`/`featureList`.
4. **Deploy frontend** - `cd portfolio-astro && npm run deploy` (`wrangler deploy --minify`). Only after steps 1–3 are confirmed.
5. **Production smoke test** - see §4.

## 3. Rollback plan

- **Frontend rollback:** `cd portfolio-astro && wrangler rollback` (revert to the previous Worker deployment), or redeploy the prior release commit. Reverting the frontend restores the previous flat-link CTA behavior.
- **Backend rollback:** `cd hono-workers && wrangler rollback` (previous deployment), or redeploy the prior commit. The new endpoints/DTO are additive; old frontend code ignores extra fields.
- **DB caution (additive - do NOT "roll back" by dropping):** migration 010 only **adds** columns/tables and seeds only **populate** them; legacy columns (`technologies`/`tags`/`features`/`github_url`/`live_url`/`image_url`) are intact. Rolling back code needs **no** schema change. **Do not drop the new columns/tables or DELETE seeded rows as a "rollback"** - that is data loss and is unnecessary (old code simply ignores them). If a seed must be undone, prefer `node ./scripts/seed.js down <version> --remote` (removes the `seed_versions` marker) and targeted reverting, not table drops.

## 4. Production smoke tests (post-deploy)

Public:
- [ ] Homepage `https://hafizbahtiar.com/` loads; featured projects render.
- [ ] `/projects` lists all projects; cards link to detail.
- [ ] 3 project details: `qiubbx` (Live demo CTA), `com-invois` (no Source/Play CTA - contact fallback), `jom-dapur` (Request a walkthrough); narrative sections render for flagships.
- [ ] CTAs only point at working links; **broken `com-invois` github/play-store URLs absent** from HTML; `fasttrack-system` broken links absent.
- [ ] **Confidential check:** any `is_confidential` project shows no `clientName` and no private/hidden links in the page source.
- [ ] Carousel: renders where real screenshots exist; gracefully absent otherwise (no broken images).
- [ ] `www.hafizbahtiar.com` → `hafizbahtiar.com` (see §5).

Admin:
- [ ] `/login` → log in with real owner credentials (reCAPTCHA as configured).
- [ ] `/admin/projects` table loads owner data (incl. draft/archived) with badges.
- [ ] Open + edit a draft; Save Basics persists.
- [ ] Publish blocked when visible media lacks alt; succeeds once fixed.
- [ ] Publish then Unpublish a test draft; Archive requires confirmation.
- [ ] Draft/archived projects absent from public `/projects`.

## 5. Cloudflare www redirect rule

- Repo middleware (`portfolio-astro/src/middleware.ts`) issues a `301 www → apex` for **SSR HTML only**.
- **Authoritative fix:** configure a Cloudflare **Redirect Rule** (or Bulk Redirect): `www.hafizbahtiar.com/*` → `https://hafizbahtiar.com/$1` (301, preserve path/query). This also covers static assets the middleware does not. Canonical tags + sitemap already point at the apex.

## 6. Known follow-ups (not blocking deploy)

- R2 upload pipeline (media is URL-based today).
- Real screenshot galleries authored via admin (carousels are empty until then).
- `PROJECT_LINK_OVERRIDES` (frontend) can be retired once production runs on `project_links` and is confirmed stable.
- Admin interactive browser click-through remains the one locally-unverified seam (auth needs a real browser).

---

## 7. Post-rollout status (2026-06-17 release - EXECUTED)

- **Live versions:** `hono-workers` Worker `ce27f22c`; `portfolio-astro` Worker `6fb74a01`. Deployed from branch `portfolio-admin-backend` (`hono-workers` HEAD `47b6921`, `portfolio-astro` HEAD `49602a1`).
- Prod D1: migration `010` + seeds `007`/`008` applied & verified (9 projects, children populated, broken links hidden, flagship narrative present). Backup: `/Users/hafiz/Developments/backup-pre-cms-2026-06-17.sql`.
- Public smoke re-verified green; `www → apex` 301 works (path + query preserved) via middleware.
- **Production admin browser smoke: PENDING owner** - interactive login needs a real browser; the prod owner API correctly rejects non-production-signed tokens (401), confirming auth is secure.
- Branch is ahead of `main`: `hono-workers` 7 commits, `portfolio-astro` 9 commits. No existing git tags in either repo.

### Owner production admin smoke (do in a browser)
Log into `https://hafizbahtiar.com/admin` → table loads → **create a temporary draft** (`zz-prod-smoke`) → edit Basics → add a section / feature / tech / link → add a URL media asset → confirm **visible media without alt blocks publish** → add alt → **publish** → preview the public page → **unpublish** → **archive** → then **delete** the test draft (or leave it archived and note it). Do not touch real published projects.

## 8. Merge-to-main plan (run AFTER a 24–72h stable window + green prod admin smoke - NOT yet executed)

For each repo (`hono-workers`, then `portfolio-astro`):
1. Confirm clean working tree and the branch is current.
2. `git checkout main`
3. `git merge --no-ff portfolio-admin-backend -m "merge: project CMS upgrade"` - **no-ff, no squash** to preserve the staged rollout history.
4. *(Optional; no prior tag convention exists)* annotate a release tag on the merge commit: `git tag -a cms-v1 -m "Project CMS upgrade (migration 010, seeds 007/008)"`.
5. Push when ready (separate, deliberate): `git push origin main` (and `git push origin cms-v1`).
6. Re-point future production deploys to `main`. **Merging does not change the running production** - Workers are version-pinned, so no redeploy is required merely to merge; the live site keeps serving `ce27f22c`/`6fb74a01` until the next intentional deploy.

**Guards:** do not merge until the owner's prod admin browser smoke is green and the site has been stable for the window; keep the D1 backup until confident; **do not remove `PROJECT_LINK_OVERRIDES`** until a stable window confirms `project_links` drives all production CTAs (then remove it in a small follow-up).
