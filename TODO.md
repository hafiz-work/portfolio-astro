# TODO - senarai semak (dikemas kini 2026-10-13)

Priorities: P0 = bug/vuln, P1 = perf/correctness, P2 = polish/cleanup.

Fail ni senarai **kerja yang belum siap** sahaja. Item yang dah selesai dibuang - butirannya ada dalam git diff / commit sesi 2026-09-24 (CORS PATCH, validator blog/experiences/profile, rate-limit memory, audit-log route, resume tracking + retention, upload R2 peribadi + proxy media, cover image blog, viewsCount dibuang, System Logs client-side fetch) dan sesi 2026-09-26 (loader cache-friendly untuk blog/policy/projek detail, `lib/projects.ts` tinggal admin sahaja, guard tarikh `profile.astro`, stub settings dilabel, build astro 7 dibaiki: buang override `vite ^7`, `@astrojs/react ^6.0.6`, declare `htmlparser2`/`domhandler`/`entities`, `map.tsx` namespace import + **`setWorkerUrl()` untuk worker maplibre v6**, **captcha Google reCAPTCHA → Cloudflare Turnstile** pada login + contact form).

## Captcha - Cloudflare Turnstile (menggantikan reCAPTCHA v3)

Sisi backend dan frontend dua-dua **dah live dan disahkan** (2026-09-26):
- API produksi proses `captchaToken`; field lama ditolak - `{"success":false,"error":"Unrecognized key(s) in object: 'recaptchaToken'"}`.
- Frontend produksi serve `challenges.cloudflare.com/turnstile/v0/api.js?render=explicit` + `data-turnstile-site-key="0x4AAAAAAFD-PSk_u7NHAF-5"` pada `/login` dan home.
- Guard timeout 15s berfungsi di produksi (challenge yang tak selesai tak tinggalkan spinner).

Baki:

- [ ] **Sahkan `TURNSTILE_SECRET` betul** (2026-10-13: sisi frontend produksi disahkan - `/login`, `/register`, `/admin/login` serve `api.js?render=explicit` + site key, CSP benarkan `challenges.cloudflare.com`; `wrangler` tak login di mesin ni, jadi nama secret pun belum disemak - `wrangler secret list` dalam `hono-workers` tunjuk sama ada ia wujud, bukan sama ada ia betul) dengan satu login (atau hantar contact) sebenar dalam browser biasa. Dari luar, "secret tak diset" dan "token tak sah" dua-dua pulang 400 yang sama, jadi ia kena disahkan dari dalam: login berjaya (atau sekurang-kurangnya masuk peringkat semak kredential) = secret sah. Challenge Turnstile **tidak selesai dalam browser automasi** (headless mahupun headed/CDP) - aku dah cuba, jadi ini kerja manusia. `wrangler tail` sambil cuba login akan tunjuk baris `Turnstile siteverify result:` kalau nak bukti log.
- [ ] **Sahkan domain widget** dalam dashboard ada `localhost` (+ `127.0.0.1`) untuk dev lokal; produksi guna `hafizbahtiar.com` + `www.hafizbahtiar.com` (var `TURNSTILE_HOSTNAMES`).
- [ ] Replay: token single-use - cubaan kedua dengan token yang sama sepatutnya ditolak.
- [x] ~~Nota dev: biar kosong untuk matikan captcha lokal~~ - **salah** (disemak 2026-10-13): `login`/`register`/`admin/login`/`ContactSection` guna `PUBLIC_TURNSTILE_SITE_KEY || "0x4AAAAAAFD-…"`, jadi kosong = key produksi, captcha tetap hidup. Cara betul (dah tulis dalam `.env.example`): test key Cloudflare `1x00000000000000000000BB` (sentiasa lulus, invisible) + backend `TURNSTILE_SECRET` tak diset atau test secret `1x0000000000000000000000000000000AA`. Kod sengaja kekal `||` - `??` akan matikan captcha produksi kalau env build wujud tapi kosong. Key default kini satu konstan: `TURNSTILE_SITE_KEY` dalam `src/lib/constants.ts`.

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

- [ ] **[P1] Lockout brute-force login hanya client-side.** Risiko kos juga: setiap cubaan = hash password (request paling berat CPU) + bacaan D1. `login.astro:402` (5 gagal → 60s dalam browser boleh dimatikan). Sahkan backend had kadar `/auth/login` (Turnstile dah membantu) - kerja `hono-workers`.
- [ ] **[P2] CSP `'unsafe-inline'` untuk script** (`middleware.ts:33`, diperlukan oleh inline theme-init `CoreLayout`). Risiko sync: CSP `middleware.ts` kena sepadan dengan `public/_headers` secara manual (`middleware.ts:11`).
- [ ] **[P2] Token verify-email melalui query URL** (`verify-email.astro:14`) - standard untuk link email; ubah hanya kalau backend boleh terima POST.

## Performance

- [ ] **[P1] Admin projects list buat N+1 `getProjectDetail`** untuk badge warning (`ProjectsCmsTable.tsx:57-66`) - perlu batch endpoint atau warnings disertakan dalam respons senarai (`hono-workers`).
- [ ] **[P2] `kl-boundary.json` (15.8 KB) masuk bundle JS setiap pelawat** (`MapCanvas.tsx:14`, import statik dalam island `client:only`). Kecilkan titik atau ambil sebagai aset runtime.
- [ ] **[P2] Admin policy editor muat senarai projek penuh untuk satu rekod** (`lib/projects.ts:30-33`) - guna `/owner/projects/{id}`.

## Correctness / robustness

- Nota: `ApiClient` 404 → `null` hanya untuk GET/HEAD; write throw, jadi caller yang dulu anggap 404 sebagai `null` kena jangkakan exception. (Loop retry 401 dah dibaiki 2026-10-13 - sekali refresh + retry sahaja, `bun scripts/check-api-retry.ts`.)

## Dead code & cleanup

- [ ] **[P2] Buang `src/data/kl-polygon.json` (37 KB)** - sifar import (hanya `fetch-kl.cjs` di root menyentuhnya).
- [ ] **[P3] `lib/blog.ts` `getPublicPosts`/`getPublicPostBySlug` dah tak dipanggil** - public blog guna `public-content.ts`; buang supaya service tu tinggal admin sahaja.

## Kos Cloudflare (audit 2026-10-13)

Konteks: request Worker murah (paid: 10M/bulan termasuk, lepas tu ~$0.30/M; free: >100k/hari = error, bukan bil). Yang betul-betul spike ialah **loop** dan **write D1**. Data luar dah colo-cached (Cache API, percuma); HTML SSR **tak** di-cache - setiap view = satu invocation.

- [ ] **[P1] Sahkan `TURNSTILE_SECRET` di produksi** (lihat seksyen Captcha) - tanpanya backend skip captcha dan brute-force login jadi kos CPU sepenuhnya. Pastikan juga backend rate-limit `/auth/login`.
- [ ] **[Owner, dashboard] Semak plan Cloudflare (Free atau Workers Paid)** - menentukan dua item di bawah. Paid: kos request ~$0.30/M, isu kecil. Free: had 100k request/hari untuk **seluruh site** - bila habis, semua page error (bukan bil), jadi itu satu-satunya senario yang betul-betul bahaya.
- [ ] **[P3] Widget embed boleh dipasang mana-mana site** (`/waktu-solat/embed`, `/ipu/embed`, `frame-ancestors *`) - setiap pageview site lain = satu invocation kita; widget IPU reload setiap 30 min selagi terbuka (~48/hari setiap widget). Dianalisa 2026-10-13, **kod sengaja tak diubah**:
      - Cache HTML (Cache API / Cache Rule) **tak kurangkan invocation** - Worker jalan sebelum cache; ia cuma jimat CPU render (beberapa ms). Data (JAKIM/APIMS) dah colo-cached dalam `fallback.ts`.
      - Cache HTML juga **merosakkan widget**: `data-server-now` + `data-today` dalam HTML - jam tersasar sebanyak umur cache, dan sekitar tengah malam `today` basi boleh buat widget reload berulang sampai cache tamat.
      - Rate-limit per IP tak hentikan site popular (setiap pelawat IP lain) - ia hanya untuk bot/banjir dari satu sumber.
      - **Kalau Free**: (1) Notifications -> usage alert Workers requests hampir had harian; (2) WAF rate-limit rule untuk `/*/embed` per IP (lawan bot). Kalau satu site hos betul-betul besar: naik ke Paid, atau widget perlukan key.
      - **Kalau Paid**: biar. 1M pageview/bulan di site hos ≈ $0.30.
      - Kalau nanti nak kurangkan request dari pelawat sama yang buka banyak page site hos: buang kebergantungan `serverNow` dalam embed (guna jam peranti), baru `Cache-Control` pendek selamat. Risiko pada jam widget + semakan tengah malam - belum berbaloi.
- [ ] **[Owner, dashboard] Semua page awam SSR termasuk home** - setiap view, crawler atau bot = satu invocation + CPU render; data dah colo-cached (`fallback.ts`, `public-content.ts`), jadi D1/upstream tak terkesan. Disemak 2026-10-13: **prerender tak membantu** - home, `/blog`, `/quotes`, `/projects` perlukan data API (prerender = data beku sampai build seterusnya, dan build kena capai API - sebab asal semuanya SSR); `/tarikh-hijri`, `/register`, `/verify-email` guna query; `/kiraan-detik` + app Showcase data langsung. Hanya `/404` dan `/login` tiada kebergantungan, tapi URL tak dikenali tetap panggil Worker, jadi jimat sikit CPU sahaja. Tindakan sebenar di dashboard: **Security -> Bots -> Bot Fight Mode** hidup; WAF custom rule block laluan scanner (`/wp-*`, `*.php`, `/.env`, `/.git`) - site ni tiada satu pun; rate-limit rule umum per IP. Free plan: usage alert sama seperti di atas.
- [ ] **[P2] D1 rows-read untuk akaun (`hono-workers`)**: `/me/blog`, `/me/quotes`, `/me/moderation` pulang senarai penuh dan dashboard panggil ketiga-tiganya. Sahkan ada index `created_by_user_id` (dan untuk kiraan strike 90 hari) - tanpa index setiap panggilan baca seluruh table. Kalau senarai membesar: endpoint ringkasan untuk dashboard.
- [ ] **[P3] Setiap full page load akaun/admin buat `tryRefresh`** = satu write D1 (refresh token berputar). ClientRouter elak ni; jangan tukar navigasi dalaman jadi full reload.

## Akaun - profil awam (`/u/{username}`)

Spec: `docs/specs/public-user-profile-spec.md` - **diluluskan 2026-10-13** (D1-D6 ikut cadangan: `/u/{username}`, opt-in, peraturan username D3, tiada redirect bila tukar, apa yang dipapar D5, diindeks; link `authorUsername` masuk skop). Frontend tersekat sampai backend siap.

- [ ] **[P2] Backend (`hono-workers`)**: migration `username` + `profile_public` (D1 lokal sahaja), `GET /me` + update profile terima dua field tu (409 `username_taken`), senarai username terpelihara, `GET /public/profiles/:username` (DTO whitelist, 404 seragam untuk private/banned/belum verify), `authorUsername` dalam DTO blog/quote awam (spec §2.5 - `null` bila profil penulis private), skrip verify.
- [ ] **[P2] Frontend**: seksyen "Public profile" dalam `/account/settings` (username + `Switch` + salin URL), page `src/pages/u/[username].astro` (`PublicLayout`, map ke DTO tempatan sebelum render), menu user "Website" -> "View public profile", link nama penulis ke `/u/{authorUsername}` di `/blog`, `/blog/[slug]` dan `/quotes` (spec §3.3).
- [ ] **Owner**: migrate remote + deploy backend, baru deploy frontend.

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

- [ ] **[P2] Path backend dalam CLAUDE.md (`/Users/hafiz/Developments/hono-workers`) tiada pada mesin 2026-10-13** - sahkan path sebenar dan kemas kini (spec profil awam pun rujuk path ni).
- [ ] **[P2] CLAUDE.md (`portfolio-astro`) describe `_accessToken` in-memory** dalam ApiClient; kod sebenar httpOnly cookie + silent refresh. Kemas kini seksyen Data flow.
- [ ] **[P3] `README.md` masih boilerplate Astro starter** - "Astro Starter Kit: Basics", pokok fail rekaan (`Welcome.astro`, `Layout.astro`), dan rujukan `src/assets/astro.svg` yang dah dibuang. Tulis README sebenar (setup, env, deploy) atau buang fail tu.

## Restyle (latar)

Kontrak: `STYLE.md` - tema tailwindcss.com untuk halaman **non-admin** sahaja (admin kekal slate). Public pages siap. Deferred: tukar aksen kalau atom dipisah public/admin (cyan dikekalkan by design).
