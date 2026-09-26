# TODO - senarai semak (dikemas kini 2026-09-26)

Priorities: P0 = bug/vuln, P1 = perf/correctness, P2 = polish/cleanup.

Fail ni senarai **kerja yang belum siap** sahaja. Item yang dah selesai dibuang - butirannya ada dalam git diff / commit sesi 2026-09-24 (CORS PATCH, validator blog/experiences/profile, rate-limit memory, audit-log route, resume tracking + retention, upload R2 peribadi + proxy media, cover image blog, viewsCount dibuang, System Logs client-side fetch) dan sesi 2026-09-26 (loader cache-friendly untuk blog/policy/projek detail, `lib/projects.ts` tinggal admin sahaja, guard tarikh `profile.astro`, stub settings dilabel, build astro 7 dibaiki: buang override `vite ^7`, `@astrojs/react ^6.0.6`, declare `htmlparser2`/`domhandler`/`entities`, `map.tsx` namespace import + **`setWorkerUrl()` untuk worker maplibre v6**, **captcha Google reCAPTCHA → Cloudflare Turnstile** pada login + contact form).

## Captcha - Cloudflare Turnstile (menggantikan reCAPTCHA v3)

Sisi backend dan frontend dua-dua **dah live dan disahkan** (2026-09-26):
- API produksi proses `captchaToken`; field lama ditolak - `{"success":false,"error":"Unrecognized key(s) in object: 'recaptchaToken'"}`.
- Frontend produksi serve `challenges.cloudflare.com/turnstile/v0/api.js?render=explicit` + `data-turnstile-site-key="0x4AAAAAAFD-PSk_u7NHAF-5"` pada `/login` dan home.
- Guard timeout 15s berfungsi di produksi (challenge yang tak selesai tak tinggalkan spinner).

Baki:

- [ ] **Sahkan `TURNSTILE_SECRET` betul** dengan satu login (atau hantar contact) sebenar dalam browser biasa. Dari luar, "secret tak diset" dan "token tak sah" dua-dua pulang 400 yang sama, jadi ia kena disahkan dari dalam: login berjaya (atau sekurang-kurangnya masuk peringkat semak kredential) = secret sah. Challenge Turnstile **tidak selesai dalam browser automasi** (headless mahupun headed/CDP) - aku dah cuba, jadi ini kerja manusia. `wrangler tail` sambil cuba login akan tunjuk baris `Turnstile siteverify result:` kalau nak bukti log.
- [ ] **Sahkan domain widget** dalam dashboard ada `localhost` (+ `127.0.0.1`) untuk dev lokal; produksi guna `hafizbahtiar.com` + `www.hafizbahtiar.com` (var `TURNSTILE_HOSTNAMES`).
- [ ] Replay: token single-use - cubaan kedua dengan token yang sama sepatutnya ditolak.
- [ ] Nota dev: `.env.development`/`.env.example` guna `PUBLIC_TURNSTILE_SITE_KEY`; biar kosong untuk matikan captcha lokal (backend skip bila secret tak diset).

## P0 - Deploy & operasi

- [ ] `npm run db:migrate:remote` **dahulu**, baru `wrangler deploy` backend. D1 prod belum ada table `resume_downloads` **dan migration 014 (kolum telegram)** - tanpa 014, `GET /owner/profile` pulang 500 dan page profile admin mati sepenuhnya.
- [ ] Deploy frontend - semua fix sesi lepas belum naik.
- [ ] Commit semuanya. Kerja sesi ni masih dalam staging index, belum ada commit - **`package.json` dan `package-lock.json` mesti masuk sekali** (CI guna `npm ci`, lockfile lama yang hoist `htmlparser2`/`entities`/`domhandler` ke root sebabkan build remote pecah).
- [ ] Sahkan selepas deploy: overview 200 + `resumeDownloads` naik; klik link resume di footer → row masuk; cron `0 3 * * *` terdaftar (`wrangler deployments`/dashboard).

## Telegram (WIP - UI staged, backend plumbing siap)

- [ ] **Remote belum konfigur** (`hono-workers`): `bunx wrangler secret put TELEGRAM_BOT_TOKEN` + `TELEGRAM_WEBHOOK_SECRET`, `bun run db:migrate:remote` (014), `bun run telegram:webhook`. Verifikasi lokal: `bun scripts/verify-telegram.ts` (24 checks, lulus); migration 014 dah apply di D1 lokal.
- [ ] **[P2] Kemas UI Telegram**: `Profile` (`lib/profile.ts`) tak ada `telegramChatId`/`telegramLinkedAt`; `profile.astro` guna `new ApiClient(API_BASE_URL)` inline + `profile as any`. Pindah ke `profileService` (link/unlink/status) dan buang cast.
- [ ] **[P3] Error Telegram guna `alert()`** (`profile.astro:543,557`) - admin lain guna `showToast`.
- [ ] **[P3] `/owner/profile` kongsi `AUTH_RATE_LIMITER` (5/60s per IP)**: visit profile (GET) + link (PUT+GET) + save (PUT) = 4; 6 aksi pantas dalam 60s → 429. Pertimbang limiter berasingan untuk CRUD profile.
- [ ] **[P3] Bot commands belum ada**: `/status`, `/stats`, `/recent`, `/mute` (chat owner cuma dapat help) + notifikasi contact message. Dijejak dalam TODO `hono-workers`.

## Security & hardening

- [ ] **[P1] Lockout brute-force login hanya client-side.** `login.astro:402` (5 gagal → 60s dalam browser boleh dimatikan). Sahkan backend had kadar `/auth/login` (Turnstile dah membantu) - kerja `hono-workers`.
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
