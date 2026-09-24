# TODO - senarai semak (dikemas kini 2026-09-24)

Priorities: P0 = bug/vuln, P1 = perf/correctness, P2 = polish/cleanup.

Fail ni senarai **kerja yang belum siap** sahaja. Item yang dah selesai dibuang - butirannya ada dalam git diff / commit sesi 2026-09-24 (CORS PATCH, validator blog/experiences/profile, rate-limit memory, audit-log route, resume tracking + retention, upload R2 peribadi + proxy media, cover image blog, viewsCount dibuang, System Logs client-side fetch).

## P0 - Deploy & operasi

- [ ] `npm run db:migrate:remote` **dahulu**, baru `wrangler deploy` backend. D1 prod belum ada table `resume_downloads`; tanpa ini dashboard `GET /owner/dashboard/overview` pulang 500 dan setiap beacon download dibuang senyap.
- [ ] Deploy frontend - semua fix sesi lepas belum naik.
- [ ] Commit semuanya. Kerja sesi ni masih dalam staging index, belum ada commit.
- [ ] Sahkan selepas deploy: overview 200 + `resumeDownloads` naik; klik link resume di footer → row masuk; cron `0 3 * * *` terdaftar (`wrangler deployments`/dashboard).

## Security & hardening

- [ ] **[P1] Route public blog + policy masih `cache: 'no-store'`.** `src/lib/api-client.ts:78` set no-store pada setiap request. Port ke loader cache-friendly macam `public-content.ts` / `family.ts`. Fail: `blog/index.astro:11`, `blog/[slug]/index.astro:13`, `projects/[slug]/index.astro:17`, `projects/[slug]/privacy.astro:14,30-31`, `terms.astro:14,30-31`.
- [ ] **[P1] Lockout brute-force login hanya client-side.** `login.astro:402` (5 gagal → 60s dalam browser boleh dimatikan). Sahkan backend had kadar `/auth/login` (reCAPTCHA dah membantu).
- [ ] **[P2] CSP `'unsafe-inline'` untuk script** (`middleware.ts:33`, diperlukan oleh inline theme-init `CoreLayout`). Risiko sync: CSP `middleware.ts` kena sepadan dengan `public/_headers` secara manual (`middleware.ts:11`).
- [ ] **[P2] Token verify-email melalui query URL** (`verify-email.astro:14`) - standard untuk link email; ubah hanya kalau backend boleh terima POST.

## Performance

- [ ] **[P1] `projects/[slug]`: dua round-trip berurutan**, policy `no-store` + 404-prone (`projects/[slug]/index.astro:16-19`). Selarikan, atau masukkan policy ke dalam DTO detail.
- [ ] **[P1] Privacy/terms: `getStaticPaths` → detail → policy.** `privacy.astro:12-34`, `terms.astro:12-34` - ambil senarai penuh, kemudian re-fetch detail + policy per slug. Guna semula rekod senarai; satu fetch policy.
- [ ] **[P1] Admin projects list buat N+1 `getProjectDetail`** untuk badge warning (`ProjectsCmsTable.tsx:57-66`) - batch endpoint atau sertakan warnings dalam respons senarai.
- [ ] **[P2] `kl-boundary.json` (15.8 KB) masuk bundle JS setiap pelawat** (`MapCanvas.tsx:14`, import statik dalam island `client:only`). Kecilkan titik atau ambil sebagai aset runtime.
- [ ] **[P2] Admin policy editor muat senarai projek penuh untuk satu rekod** (`lib/projects.ts:30-33`) - guna `/owner/projects/{id}`.

## Correctness / robustness

- [ ] **[P1] `profile.astro:335` - `new Date()` rosak mematikan seluruh page.** RangeError → catch langkau semua field selepasnya. Juga guna `innerHTML` untuk teks statik (tukar ke `textContent`).
- [ ] **[P2] `ApiClient` retry 401 boleh berpusing** (`api-client.ts:82-99`) - 401 berulang pada request yang di-retry mencetuskan refresh + retry lagi selagi refresh pulang OK. Tambah flag "retried once".
      Nota dari sesi lepas: 404 → `null` hanya untuk GET/HEAD; write sekarang throw, jadi caller yang dulu anggap 404 sebagai `null` kena jangkakan exception.

## Dead code & cleanup

- [ ] **[P2] Buang `src/data/kl-polygon.json` (37 KB)** - sifar import (hanya `fetch-kl.cjs` di root menyentuhnya).
- [ ] **[P2] Dua loader projek**: `lib/projects.ts:11-18` (ApiClient, no-store) vs `lib/public-content.ts:74-138` (cache-friendly) - satukan selepas fix caching.
- [ ] **[P1] Stub admin pages nampak macam live**: `admin/settings/general.astro:9-20`, `admin/settings/security/maintenance.astro:7-8` - setting hardcoded + mock save ("No backend endpoint yet"). Siapkan endpoint atau label "coming soon".

## Backend (`hono-workers`)

- [ ] **[P2] Drop-list `db:reset` stale** - tinggal 6 table lama, tak masuk table baru.
- [ ] **[P2] `observability.enabled: false` sementara `logs`/`traces` enabled** dalam `wrangler.jsonc` - bercanggah.
- [ ] **[P2] wrangler 4.99 → 4.138** (`bun update wrangler` atau `bun add -d wrangler@latest`); `package-lock.json` masih ada di sebelah `bun.lock` walaupun dah standardize pada bun.
- [ ] **[P3] Upload lokal perlukan `wrangler login`** sebab R2 binding `remote: true` (dev tulis ke bucket sebenar). Kalau nanti ada aset peribadi, jangan letak bawah prefix `images/` - route proxy sengaja hanya serve prefix itu.
- [ ] **[P3] Cover blog**: papar dalam kad senarai `/blog` dan/atau hero image di post page (sekarang untuk social card sahaja).

## Map & UI

- [ ] **[P3] Terrain/DEM** - sengaja dilangkau; perlukan host pihak ketiga + CSP `connect-src`.
- [ ] **[P3] Simpan pilihan 3D/KL dalam localStorage** (tema sudah persist; dua toggle ni reset bila reload).

## Resume tracking

- [ ] **[P3] Sahkan beacon tercatat dalam prod** (selepas migrate + deploy): klik link footer, semak `SELECT COUNT(*) FROM resume_downloads;`.
- [ ] **[P3] Tempat untuk nota privasi "IP download dilog"** - tiada page privasi peringkat site, hanya `/projects/[slug]/privacy` per projek. Pilih: nota footer, page site-level, atau biar.

## Docs drift

- [ ] **[P2] CLAUDE.md (`portfolio-astro`) describe `_accessToken` in-memory** dalam ApiClient; kod sebenar httpOnly cookie + silent refresh. Kemas kini seksyen Data flow.
- [ ] **[P3] `README.md` masih boilerplate Astro starter** - "Astro Starter Kit: Basics", pokok fail rekaan (`Welcome.astro`, `Layout.astro`), dan rujukan `src/assets/astro.svg` yang dah dibuang. Tulis README sebenar (setup, env, deploy) atau buang fail tu.

## Restyle (latar)

Kontrak: `STYLE.md` - tema tailwindcss.com untuk halaman **non-admin** sahaja (admin kekal slate). Public pages siap. Deferred: tukar aksen kalau atom dipisah public/admin (cyan dikekalkan by design).
