# TODO - senarai semak (dikemas kini 2026-09-26)

Priorities: P0 = bug/vuln, P1 = perf/correctness, P2 = polish/cleanup.

Fail ni senarai **kerja yang belum siap** sahaja. Item yang dah selesai dibuang - butirannya ada dalam git diff / commit sesi 2026-09-24 (CORS PATCH, validator blog/experiences/profile, rate-limit memory, audit-log route, resume tracking + retention, upload R2 peribadi + proxy media, cover image blog, viewsCount dibuang, System Logs client-side fetch) dan sesi 2026-09-26 (loader cache-friendly untuk blog/policy/projek detail, `lib/projects.ts` tinggal admin sahaja, guard tarikh `profile.astro`, stub settings dilabel).

## P0 - Deploy & operasi

- [ ] `npm run db:migrate:remote` **dahulu**, baru `wrangler deploy` backend. D1 prod belum ada table `resume_downloads`; tanpa ini dashboard `GET /owner/dashboard/overview` pulang 500 dan setiap beacon download dibuang senyap.
- [ ] Deploy frontend - semua fix sesi lepas belum naik.
- [ ] Commit semuanya. Kerja sesi ni masih dalam staging index, belum ada commit.
- [ ] Sahkan selepas deploy: overview 200 + `resumeDownloads` naik; klik link resume di footer → row masuk; cron `0 3 * * *` terdaftar (`wrangler deployments`/dashboard).
- [ ] **[P0] `astro build` tak keluar output untuk deploy.** Exit 0 tapi `dist/` cuma ada `dist/server/.prerender/` (15 fail, entry `index.js` noop) - tiada `dist/client`, tiada HTML, tiada entry worker sebenar. Astro print "Could not find the prerender entry point in the build output. This is likely a bug in Astro." Dah berlaku sebelum perubahan 2026-09-26; kemungkinan dari commit `da0a410` (astro ^7.3.5 + @astrojs/cloudflare ^14.3.3). Sahkan (`wrangler deploy --dry-run`) sebelum deploy sebenar.

## Security & hardening

- [ ] **[P1] Lockout brute-force login hanya client-side.** `login.astro:402` (5 gagal → 60s dalam browser boleh dimatikan). Sahkan backend had kadar `/auth/login` (reCAPTCHA dah membantu) - kerja `hono-workers`.
- [ ] **[P2] CSP `'unsafe-inline'` untuk script** (`middleware.ts:33`, diperlukan oleh inline theme-init `CoreLayout`). Risiko sync: CSP `middleware.ts` kena sepadan dengan `public/_headers` secara manual (`middleware.ts:11`).
- [ ] **[P2] Token verify-email melalui query URL** (`verify-email.astro:14`) - standard untuk link email; ubah hanya kalau backend boleh terima POST.

## Performance

- [ ] **[P1] Admin projects list buat N+1 `getProjectDetail`** untuk badge warning (`ProjectsCmsTable.tsx:57-66`) - perlu batch endpoint atau warnings disertakan dalam respons senarai (`hono-workers`).
- [ ] **[P2] `kl-boundary.json` (15.8 KB) masuk bundle JS setiap pelawat** (`MapCanvas.tsx:14`, import statik dalam island `client:only`). Kecilkan titik atau ambil sebagai aset runtime.
- [ ] **[P2] Admin policy editor muat senarai projek penuh untuk satu rekod** (`lib/projects.ts:30-33`) - guna `/owner/projects/{id}`.

## Correctness / robustness

- [ ] **[P2] `ApiClient` retry 401 boleh berpusing** (`api-client.ts:82-99`) - 401 berulang pada request yang di-retry mencetuskan refresh + retry lagi selagi refresh pulang OK. Tambah flag "retried once".
      Nota dari sesi lepas: 404 → `null` hanya untuk GET/HEAD; write sekarang throw, jadi caller yang dulu anggap 404 sebagai `null` kena jangkakan exception.

## Dead code & cleanup

- [ ] **[P2] Buang `src/data/kl-polygon.json` (37 KB)** - sifar import (hanya `fetch-kl.cjs` di root menyentuhnya).
- [ ] **[P3] `lib/blog.ts` `getPublicPosts`/`getPublicPostBySlug` dah tak dipanggil** - public blog guna `public-content.ts`; buang supaya service tu tinggal admin sahaja.
- [ ] **[P2] Komen `admin/index.astro:5` ada `<script>` sebagai teks** - Vite anggap ia blok script sebenar, esbuild gagal parse dan dep pre-bundling dev dilangkau. Tukar ayat komen.

## Backend (`hono-workers`)

- [ ] **[P2] Drop-list `db:reset` stale** - tinggal 6 table lama, tak masuk table baru.
- [ ] **[P2] `observability.enabled: false` sementara `logs`/`traces` enabled** dalam `wrangler.jsonc` - bercanggah.
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
