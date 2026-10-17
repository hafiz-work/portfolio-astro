# TODO - senarai semak (dikemas kini 2026-10-17)

Priorities: P0 = bug/vuln, P1 = perf/correctness, P2 = polish/cleanup, P3 = nice to have.
Fail ni senarai **kerja yang belum siap** sahaja - item siap dibuang (butiran dalam git history). Isu keselamatan: `VULNERABLE.md`. Backend: `/Users/hafiz/Developments/hono-workers/TODO.md`.

## ⚠️ PENTING - baca dulu (untuk agent lain)

- **Jangan sekali-kali jalankan migration D1 remote** (`db:migrate:remote`) atau deploy - itu kerja owner. Data ujian dalam D1 lokal mesti dibersihkan.
- **Belum commit**: semua kerja sejak sesi 2026-09-24 masih dalam staging index. Bila commit, **`package.json` + `package-lock.json` mesti masuk sekali** (CI guna `npm ci`; lockfile lama yang hoist `htmlparser2`/`entities`/`domhandler` ke root pecahkan build remote).
- **Captcha lokal**: `PUBLIC_TURNSTILE_SITE_KEY` kosong = key **produksi** (kod sengaja `||`, bukan `??`, supaya env build kosong tak matikan captcha produksi). Untuk dev guna test key `1x00000000000000000000BB` + backend tanpa `TURNSTILE_SECRET` (atau test secret `1x0000000000000000000000000000000AA`). Challenge Turnstile tak selesai dalam browser automasi - login sebenar kena buat manusia.
- **`ApiClient`**: 404 -> `null` hanya untuk GET/HEAD; write throw. 401 = satu refresh + satu retry (`bun scripts/check-api-retry.ts`).
- **Refresh token berputar**: setiap full page load akaun/admin = satu write D1 (`tryRefresh`). Jangan tukar navigasi dalaman jadi full reload; jangan panggil refresh/me selari.
- **Cloudflare plan Free** (disahkan owner 2026-10-15): had 100k request/hari untuk seluruh site - bila habis, semua page error. Data luar dah colo-cached (`fallback.ts`, `public-content.ts`); HTML SSR tak di-cache.
- **Jangan cache HTML widget embed** (`/waktu-solat/embed`, `/ipu/embed`): Worker tetap jalan sebelum cache (tak kurangkan invocation), dan `data-server-now`/`data-today` dalam HTML jadi basi (jam tersasar, reload berulang sekitar tengah malam).
- **Prerender tak membantu kos**: home, `/blog`, `/quotes`, `/projects` perlukan data API semasa request; app Showcase data langsung. Jangan tukar ke prerender untuk "jimat".
- **R2 binding `remote: true`**: upload lokal tulis ke bucket sebenar (perlu `wrangler login`). Aset peribadi jangan bawah prefix `images/` - route proxy hanya serve prefix itu.
- **Guna helper bersama, jangan tulis semula** (refactor 2026-10-17): `lib/geo.ts` (`distanceKm`, `locateOnce`, `geoErrorText`), `lib/clipboard.ts` (`copyText`), `lib/url.ts` (`setParam`, pass `history.state`), `lib/money.ts` (`rm`, `ringgit`), `lib/date-my.ts` (`todayMY`, `formatIsoMs`, `isoToDmy`), `lib/chart.ts` + `ui/LineChart.astro`, `lib/map-view.ts` (`bindViewTabs`, `POINTS_MAP_FOCUS`), `lib/theme.ts`, `lib/admin-ui.ts` (`showToast`, form helpers), `lib/calc-state.ts`, `ui/ResetButton.astro`, atom `.link`, `CONTACT_EMAIL`. Ikon: lucide. Check scripts: `bun:test` `expect`.
- **Keselamatan (dah disemak, kekalkan)**: "Kongsi" (`BackLink`) kongsi `location.href` sahaja; state kalkulator (`calc-state.ts`) divalidasi per medan dan masuk `.value`/`checked`, bukan HTML; `public/sw.js` cache GET same-origin Showcase + `/_astro/*` sahaja (tak pernah admin/account/auth/api/POST); import `/@react-refresh` dalam `TechHeading` hanya bawah `import.meta.env.DEV`.

## Owner - deploy & dashboard (manual)

- [ ] **[P0] Backend dulu, baru frontend**: dalam `hono-workers` `bun run db:migrate:remote` (012 cap global, 013 buang table `owner` - **`wrangler d1 export` dulu**, 014 telegram, 015 counters, 022 sessions, 023 telegram dedupe, 024 profil awam - semak username pendua dulu, query dalam `hono-workers/TODO.md`), kemudian `wrangler deploy`. Tanpa 014, `GET /owner/profile` pulang 500.
- [ ] **[P0] Tukar password produksi `users.id = 1`** - seed lama ada hash `admin123` (seed dah dibaiki, row sedia ada tak berubah).
- [ ] **[P0] Deploy frontend** selepas backend. Nota: selepas deploy backend, page dari `localhost:4321` tak boleh panggil API produksi (CORS produksi sahaja) - dev guna backend lokal.
- [ ] **[P1] Selepas deploy, sahkan**:
  - Turnstile: satu login sebenar berjaya = `TURNSTILE_SECRET` sah (`wrangler tail` tunjuk `Turnstile siteverify result:`); cuba token sama kali kedua -> ditolak; domain widget dashboard ada `localhost`/`127.0.0.1` untuk dev.
  - Had kadar login: beberapa login gagal pantas -> 429.
  - Family API: `curl https://api.hafizbahtiar.com/api/v1/public/family` tiada `notes`/`metadata`.
  - Overview admin 200 + `resumeDownloads` naik bila klik link resume; cron `0 3 * * *` terdaftar.
- [ ] **[P1] Telegram**: `bunx wrangler secret put TELEGRAM_BOT_TOKEN` + `TELEGRAM_WEBHOOK_SECRET`, migrate 014, `bun run telegram:webhook`.
- [ ] **[P2] Dashboard Cloudflare (plan Free)**: Notifications -> usage alert Workers requests hampir had harian; Security -> Bots -> Bot Fight Mode; WAF block laluan scanner (`/wp-*`, `*.php`, `/.env`, `/.git`); rate-limit rule per IP untuk `/*/embed`. Kalau satu site hos widget betul-betul besar: naik ke Paid atau widget perlukan key.

## Frontend

- [ ] **[P2] Hantar beacon lawatan** - backend `POST /api/v1/public/visit` dah ada (migration 015) tapi frontend belum hantar; satu baris dalam `PublicLayout`. Kemudian panel admin untuk `GET /owner/dashboard/visits`.
- [ ] **[P2] `kl-boundary.json` (15.8 KB) dalam bundle setiap pelawat** (`MapCanvas.tsx:15`, import statik) - kecilkan titik atau ambil sebagai aset runtime.
- [ ] **[P2] CSP `'unsafe-inline'` untuk script** (`middleware.ts:33`, untuk inline theme-init `CoreLayout`); CSP `middleware.ts` kena sepadan dengan `public/_headers` secara manual.
- [ ] **[P3] Cover blog** dalam kad `/blog` dan/atau hero post (sekarang social card sahaja).
- [ ] **[P3] Nota privasi "IP download dilog"** - tiada page privasi site; pilih nota footer, page site-level, atau biar.
- [ ] **[P3] `README.md` masih boilerplate Astro starter** - tulis README sebenar (setup, env, deploy) atau buang.

## Akaun - profil awam (`/u/{username}`)

Spec `docs/specs/public-user-profile-spec.md` (diluluskan 2026-10-13). Backend siap 2026-10-17 (lokal, migration 024); frontend sedang dibuat. Keputusan owner: kekal login dengan username, atau emel sahaja (username awam = nama login yang diketahui).

- [ ] **[P2] Frontend** (selepas backend): seksyen "Public profile" dalam `/account/settings` (username + `Switch` + salin URL), `src/pages/u/[username].astro` (`PublicLayout`, map ke DTO tempatan), menu user "View public profile", link nama penulis ke `/u/{authorUsername}` di `/blog`, `/blog/[slug]`, `/quotes` (spec §3.3).

## Showcase

- [ ] **[P3] Format kod** (pilihan owner): prettier/biome sekali format - ~12 fail petik tunggal + inden 4. Refactor corak kod 2026-10-17 dah siap.
- [ ] **[P3] `map.tsx` `MapControls` locate** (home `MapCanvas`, admin `ExperienceMapPicker`) masih panggil `getCurrentPosition` terus - guna `locateOnce`/`geoErrorText` dari `lib/geo.ts`.
- [ ] **[P2] Pengangkutan Awam (phone)**: stesen dipilih boleh tertutup bottom sheet 60dvh - map tak offset ke atas.
- [ ] **[P2] `SectionHeader` `TextReveal client:visible` muat React di phone** - guna cara `TechHeading` (import bila `lg` padan).
- [ ] **[P3] Butang "×" kotak carian biru browser** - `::-webkit-search-cancel-button` ikut palet.
- [ ] **[P3] Ingat pilihan**: Ramalan Cuaca (lokasi), Kadar Tukaran (mata wang + jumlah), Cuti Umum / Takwim Sekolah (negeri) - URL + localStorage macam kalkulator (`calc-state.ts`).
- [ ] **[P3] Idea**: kegemaran di `/showcase`; amaran MET aktif di IPU/Ramalan Cuaca; "Tambah ke kalendar" (`.ics`); tooltip graf SVG; satu komponen "Lokasi saya"; kos isi tangki; Harga Emas, Zakat (`IDEA.md`).
- [ ] **PCB dalam Kalkulator Gaji** - menunggu kes ujian rasmi LHDN (`docs/plans/kalkulator-gaji-pcb-kwsp.md`).

## Map & UI

- [ ] **[P3] Simpan pilihan 3D/KL dalam localStorage** (home map; reset bila reload).
- [ ] **[P3] Terrain/DEM** - sengaja dilangkau; perlukan host pihak ketiga + CSP `connect-src`.
