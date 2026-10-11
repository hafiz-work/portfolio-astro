# Ideas - Showcase apps

Small public apps for `/showcase`, same pattern as the ones already live (Waktu Solat,
Harga Minyak, Kadar Tukaran, Kiraan Detik): official Malaysian data first, a fallback
chain through `src/lib/fallback.ts`, useful to people in Malaysia, cheap to run. Each
app gets its own top-level route and one entry in the `apps` array
(`src/pages/showcase.astro`). See CLAUDE.md -> Showcase.

Data sources below were checked on 2026-10-11. Done and removed: IPU (`/ipu`), Widget Waktu Solat (`/waktu-solat/embed`). Next recommended: **2**.

## 2. Harga Emas Kijang Emas - `/harga-emas`

- **Data:** Bank Negara Malaysia open API, verified:
  `https://api.bnm.gov.my/public/kijang-emas` (header `Accept: application/vnd.BNM.API.v1+json`)
  → 1 oz buy RM 17,301 / sell RM 18,001, ½ oz, ¼ oz (2026-10-09).
- **Why:** official buy/sell prices; also the input #6 (zakat) needs.
- **Scope:** today's prices per size, price per gram, change from the previous day.
- **Fallback:** stored copy (no other official Kijang Emas source).
- **Effort:** small.

## 4. Kompas Kiblat (telefon) - `/kiblat`

- **Data:** bearing from GPS (great-circle to the Kaabah) - no API; JAKIM's zone bearing
  (already fetched) as a cross-check.
- **Why:** practical on a phone; reuses the location flow.
- **Scope:** compass needle from `DeviceOrientationEvent` (iOS needs a permission tap);
  fall back to showing the bearing in degrees when there is no compass.
- **Effort:** small-medium (sensor quirks across iOS/Android).

## 5. Mod Ramadan di Paparan Masjid

- **Data:** none new - Hijri month from the takwim we already have.
- **Why:** in Ramadan, mosques highlight Imsak (sahur ends) and Maghrib (berbuka).
- **Scope:** during Ramadan, the countdown targets Imsak/Maghrib and the cards say
  "Sahur berakhir" / "Berbuka"; automatic, with a Tetapan switch to turn it off.
- **Effort:** small (seasonal - worth doing before Ramadan 1448, ~Feb 2027).

## 6. Kalkulator Zakat

- **Data:** gold price from #2 (Kijang Emas) for nisab.
- **Why:** searched often.
- **Effort:** medium.
- **Caution:** nisab and calculation methods differ per state zakat authority. Must follow
  each state's official source - a wrong number here is a religious matter, not a typo.
  Build #2 first.

## Small additions (no new page)

- **OPR on Kadar Tukaran** - BNM `https://api.bnm.gov.my/public/opr` (verified: 2.75%,
  2026-09-03). One line under the rates.
- **Cuaca hari ini on Paparan Masjid** - MET forecast via `api.data.gov.my/weather/forecast/`
  (verified earlier). Needs a JAKIM zone -> MET location mapping.
- **Graf Harga Minyak** - a chart for the 12-week table (load the dataviz skill first).

## Considered, not recommended

- **Paras air / banjir (JPS)** - publicinfobanjir.water.gov.my has no documented API;
  scraping it would break silently, and wrong flood data is dangerous.
- **Harga barang (PriceCatcher, KPDN)** - very large dataset; needs real storage and
  search, not a small showcase app.
- **Kalkulator KWSP / PCB** - rules change often; high risk of wrong numbers.
- **Cuti umum** - `api.data.gov.my` `public_holidays` returns 404; holidays differ per state.
- **Generic developer tools** (JSON formatter, URL shortener) - don't set the portfolio apart.
