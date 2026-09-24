# Family Module - Agent Rules (Do / Don't)

> Strict operating rules for any AI agent (Opus/Codex/etc.) modifying the Family module.
> Read `family-module-brain.md` first for context. These rules win over convenience.
> If a rule blocks you, **stop and ask** - do not work around it.

---

## 🚫 Hard "never" rules

1. **Never push.** Commit locally only. The human pushes.
2. **Never run remote D1 migration** (`npm run db:migrate:remote`) or any `wrangler ... --remote`
   write. Reads are still privileged - don't run them without being asked.
3. **Never mutate production / remote data.** No remote `UPDATE`/`INSERT`/`DELETE`.
4. **Never deploy** (`npm run deploy`, `wrangler deploy`).
5. **Never add `/family` to the public navbar** unless the human explicitly approves the privacy change.
6. **Never widen the public DTO** in `src/lib/family-privacy.ts` without an explicit privacy decision.
   Adding a field there can leak PII to the browser.
7. **Never merge people by display name.** Identity is `globalKey` (then `tree:id` fallback) only.
   Re-introducing name matching corrupts same-named distinct people.
8. **Never implement Phase 5 visibility schema** (per-person privacy columns) unless explicitly approved.
9. **Never remediate remote D1 by `display_name` alone.** Always scope by `tree_id` and/or `global_key`,
   and always run the verification SELECTs first.
10. **Never rewrite the Family module from scratch.** Verify, extend, and patch real issues only.

---

## ✅ Always do

- **Read the brain docs first** (`brain/family-module-brain.md`,
  `architecture/family-module-architecture.md`) before editing Family code.
- **Run `npm run build`** (frontend) before committing - it's the only type-check/verify step.
  ECONNREFUSED during build = local API down = expected, not a failure.
- **Re-audit the island payload for privacy** whenever you touch pages, the sanitizer, the merge,
  or `chart-data.ts`. Confirm no `notes`/`metadata`/`firstName`/`lastName`/`treeId`/full living
  birthdates/relationship ids/dates reach the browser. (How: run the SSR page against the prod
  read-only API and parse the `<astro-island props=...>` JSON - see the fable review report for the method.)
- **Keep sanitization the last step** before data enters the island. Merge/transform on full data,
  sanitize, *then* pass to React.
- **Test the four public scenarios** after frontend changes: `/family`, `/family/[slug]`,
  a bad slug (must be HTTP 404), and `?p=<globalKey>`.
- **Smoke-test the admin builder** after any change to shared code (`FamilyTreeChart.tsx`,
  `chart-data.ts`, `useFamilyChart.ts`, family types): card selection, inline add
  father/mother/spouse/son/daughter, fit/center/orientation. (This needs auth - if you can't, say so.)
- **Verify before remediation.** For D1 work, run `docs/reports/family-page-phase-0-d1-verification.sql`
  SELECTs locally, inspect output, and ask before any remote step.
- **Mark untested work honestly** in any report you write. Do not claim verified without evidence.

---

## ⚠️ Red flags - stop and think

| If you catch yourself… | …stop because |
|---|---|
| Adding a field to `PublicFamily*` interfaces | You may be leaking PII. Confirm it's whitelist-safe. |
| Calling the public family API and assuming it's privacy-safe | It returns **full PII**. Sanitization is frontend-only. |
| "Just" matching people by name to merge/link | Corrupts same-named people. Use `globalKey`. |
| Editing `FamilyTreeChart.tsx` | It's shared with admin and has a window-event contract. Don't break events or inline edit. |
| Removing `enableCrossTreeNavigation` prop | It's a deprecated no-op kept for admin compat. Removing it breaks `FamilyTreeBuilder` props. |
| Hardcoding a person/name patch in merge or chart | The old name-based cross-tree logic was removed on purpose. Don't reintroduce. |
| Reaching for `new Date(year).getFullYear()` for display | Timezone-drifts. Use `displayYear()` / regex year extraction. |
| Running migrate against `--remote` | Forbidden here. Local only, and only if asked. |
| Combined-tree numeric ids in a share link | They're unstable. Use `globalKey`. |
| Setting `globalKey` via admin API | Not supported (validators omit it). It's seed/SQL-managed. |

---

## Files: edit caution map

**Do not edit casually (shared / contract-bearing / privacy-critical):**
- `src/lib/family-privacy.ts` - privacy boundary. Changes here can leak PII.
- `src/lib/family-merge.ts` - identity/merge invariants.
- `src/components/family/FamilyTreeChart.tsx` - shared with admin; window-event contract + inline edit.
- `src/hooks/useFamilyChart.ts` - public chart lifecycle; easy to introduce leaks/duplicate inits.
- `src/lib/chart-data.ts` - shared by public + admin charts.
- Backend `src/services/family.ts`, `src/routes/v1/**/family.ts` (hono-workers) - API contract.
- Backend migrations / seeds - schema + `global_key` source of truth.

**Safer extension points:**
- `src/components/family/PersonDetailPanel.tsx`, `FamilyListView.tsx`, `PersonSearch.tsx`,
  `FamilyToolbar.tsx` - presentational, public-only.
- `src/styles/family-chart-theme.css` - visual theming (verify light/dark in devtools).
- `src/data/family.ts` - combined-view config.
- Docs under `docs/brain`, `docs/architecture`, `docs/reports`.

---

## Commit etiquette for this module

- Scope commits to the Family module + its docs. Don't bundle unrelated changes.
- Frontend and backend are **separate repos** - never mix their changes in one commit.
- Run `npm run build` before committing frontend changes; quote the result.
- If you find a code bug while documenting, **document it first and ask** before patching, unless it
  is a critical, obvious, low-risk fix.
