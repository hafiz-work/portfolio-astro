# Ideas - Showcase apps

Small public apps for `/showcase`, same pattern as Waktu Solat: official data, useful
to people in Malaysia, searched often, cheap to run (one cached fetch). Each app gets
its own top-level route and one entry in the `apps` array (`src/pages/showcase.astro`).
See CLAUDE.md -> Showcase.

Recommended order: **1** first (most searched, data verified, small), **4** any time.

## 1. Harga Minyak Minggu Ini - `/harga-minyak`

- **Data:** `api.data.gov.my` dataset `fuelprice` - verified 2026-10-11:
  `https://api.data.gov.my/data-catalogue?id=fuelprice&sort=-date&limit=1`
  → RON95 4.67, RON97 5.15, diesel 5.27, BUDI95 1.99, diesel Sabah/Sarawak 2.15 (2026-10-08).
- **Why:** updated every Wednesday, searched every week ("harga minyak minggu ini").
- **Scope:** this week vs last week (up/down), a few months of history as a chart.
- **Effort:** small - one page, one fetch, cache until the next Wednesday.

## 2. Kadar Tukaran Wang - `/kadar-tukaran` - DONE (2026-10-11)

- **Data:** Bank Negara Malaysia open API - verified 2026-10-11:
  `https://api.bnm.gov.my/public/exchange-rate/USD`
  (header `Accept: application/vnd.BNM.API.v1+json`) → USD sell 4.096 / buy 4.071 (2026-10-09).
- **Why:** official BNM rates, not estimates.
- **Scope:** rate table + RM ↔ currency converter.
- **Effort:** small.

## 3. Kiraan detik Ramadan / Syawal / Hari Raya Haji - DONE as `/kiraan-detik` (2026-10-11)

- JAKIM has no takwim for next year yet (e-solat `NO_RECORD` for 2027 in Oct 2026), so dates beyond the current year are Umm al-Qura estimates (±1 day), labelled on the page.

- **Data:** Hijri date per day from JAKIM e-solat `period=year` (already used by Waktu Solat).
- **Why:** reuses data we already fetch; the countdown can also go on Paparan Masjid.
- **Effort:** small.

## 4. Pengumuman di Paparan Masjid

- **Data:** none - a text setting in the URL, like the other Tetapan.
- **Why:** mosques need a scrolling notice ("Kuliah Maghrib malam ini…").
- **Effort:** very small (Paparan Masjid enhancement, not a new app).

## 5. Kalkulator Zakat

- **Data:** gold price - BNM has a Kijang Emas API (**not verified yet**).
- **Why:** searched often.
- **Effort:** medium.
- **Caution:** nisab and calculation methods differ per state zakat authority. Must follow
  each state's official source - a wrong number here is a religious matter, not a typo.

## Considered, not recommended

- **Kalkulator KWSP / PCB** - rules change often; high risk of wrong numbers.
- **Generic developer tools** (JSON formatter, URL shortener) - plentiful elsewhere; don't
  set the portfolio apart.
- **Cuti umum** - `api.data.gov.my` `public_holidays` returned 404 (2026-10-11); holidays
  also differ per state.
