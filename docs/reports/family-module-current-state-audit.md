# Family Module - Current-State Audit

> Snapshot of the Family module after the Phase 0–4 refactor + Opus review fix were merged to
> `main`. Audit performed by reading both repos (`portfolio-astro`, `hono-workers`) and
> re-verifying the public surface against the **production read-only API**. No code was changed for
> this audit; no remote migration / deploy / push was performed.
>
> Date: 2026-06-13 · Frontend branch at audit: `main` · Key merged commit on file:
> `88ee2b8 fix(family): timezone-safe public birth-year display`.

---

## 1. What is done ✅

- **SSR data flow.** `/family` and `/family/[slug]` fetch in Astro frontmatter at request time;
  the old browser-side cross-tree fetch waterfall and cache-buster params are gone.
- **Single sanitized island.** Exactly one `FamilyExplorer` React island per page receives a
  whitelisted `PublicFamilyTreeDetail` (verified by parsing the rendered `<astro-island props>`).
- **Privacy whitelist (frontend).** Living birthdates are year-only; living death dates are null;
  deceased keep full dates; `notes`/`metadata`/`firstName`/`lastName`/`treeId`/relationship
  `id`/`isPrimary`/dates/timestamps/`createdByUserId` are stripped. Verified against real prod data
  (77 people: 69 living year-only, 8 deceased full).
- **globalKey-keyed merge.** Combined `/family` merges trees by `globalKey` (then `tree:id`
  fallback); no name-based merging.
- **Real chart zoom.** Public hook and admin chart use `family-chart` `manualZoom`/`zoomTo`, not
  fake card-spacing.
- **Timezone-safe years.** `displayYear()` + regex-first `yearOnly()` fix the west-of-UTC
  off-by-one birth-year bug.
- **Admin compatibility preserved.** Shared `buildChartData`; `FamilyTreeChart` keeps its
  window-event contract and inline add/edit; `enableCrossTreeNavigation` is a no-op for prop compat.
- **Routing states.** Bad slug → HTTP 404 + UI; empty/error states render; build passes.

## 2. What is still risky ⚠️

1. **Backend public API exposes full PII (highest priority).** `GET /api/v1/family/:slug` (and
   `/family`, `/family/person/:id`) return `notes`, `metadata`, `firstName`, `lastName`, `treeId`,
   **full living birthdates**, relationship `id`/`isPrimary`/`startDate`/`endDate`/`notes`, and
   timestamps. The whitelist only protects the rendered page, not direct API callers. **Sanitization
   is frontend-only.** Recommend moving/duplicating sanitization into the backend.
2. **Synthetic combined ids are unstable.** Numeric ids in `/family` depend on data ordering. Share
   links prefer `globalKey`, but a numeric `?p=` could point at a different person after data churn.
3. **People missing `globalKey` appear twice** across trees until backfilled - and `globalKey` is
   **seed/SQL-managed only** (not editable via admin UI), so this is a D1 task.
4. **D1 remediation not done.** The `globalKey` backfill / parent-bridge rows in
   `docs/reports/family-page-phase-0-d1-verification.sql` are **not applied** and **not verified**.
   Its §3 backfill matches by `display_name` without tree scoping - could over-merge same-named
   people. Must run §1/§2 SELECTs and inspect before any remote step.
5. **`metadata.birth_order` is JSON-in-TEXT.** Admin child sort parses it ad hoc; no typed column.
6. **Bottom sheet has no full focus trap** (Esc + focus-in/return only). Acceptable, not ideal.

## 3. What needs manual testing ❌ (not done in automated review)

- Admin builder click-through at `/admin/family`: card selection, inline add
  father/mother/spouse/son/daughter, fit/center/orientation, and confirming no public `/family` API
  storm on card click. (Requires auth.)
- Light/dark `family-chart` theme in devtools (selectors are conservative; may need tuning).
- Accessibility pass: VoiceOver, Lighthouse, color contrast, focus visibility, touch targets.
- Mobile 375px: toolbar wrap, list fallback, bottom sheet, pinch/pan.
- Deep-link `?p=<globalKey>` interactive centering (SSR 200 verified; visual centering not confirmed).

## 4. What should not be touched casually

- `src/lib/family-privacy.ts` (privacy boundary), `src/lib/family-merge.ts` (identity),
  `src/lib/chart-data.ts` (shared), `src/hooks/useFamilyChart.ts`,
  `src/components/family/FamilyTreeChart.tsx` (shared/admin contract).
- Backend `src/services/family.ts`, `src/routes/v1/**/family.ts`, migrations, seeds.
- See `docs/brain/family-module-agent-rules.md` for the full caution map.

## 5. Recommended next steps (in priority order)

1. **Backend public DTO / sanitization** - close the API PII gap (mirror the frontend whitelist;
   reduce living birthdates to year server-side; drop notes/metadata/relationship internals).
2. **D1 globalKey/relationship remediation** - run verification SELECTs locally, fix the §3 scoping,
   get human approval, then apply (local → remote) carefully.
3. **Admin builder manual QA** - full click-through after the shared-chart changes.
4. **Accessibility pass** + **light/dark chart visual tuning**.
5. **E2E privacy test** - automate the island-payload audit so leaks regress loudly.
6. (Optional, approval-gated) **Phase 5 visibility schema**, **typed `birth_order` column**,
   **photo/avatar management**.

## 6. Known unrelated item (not part of this audit's scope)

- `hono-workers/scripts/migrate.js` has an **uncommitted** local fix (parse multi-line
  `wrangler --json` output so `columnExists()` and migration tracking work). It unblocks the failing
  `009_blog_cover_image` ADD COLUMN. It is **not** committed and is unrelated to the Family docs.
  Decide separately whether to commit it (suggested: `fix(migrate): parse multi-line wrangler --json output`).
