# Ideas - Showcase apps

Small public apps for `/showcase`, same pattern as the ones already live (Waktu Solat,
Harga Minyak, Kadar Tukaran, Kiraan Detik): official Malaysian data first, a fallback
chain through `src/lib/fallback.ts`, useful to people in Malaysia, cheap to run. Each
app gets its own top-level route and one entry in the `apps` array
(`src/pages/showcase.astro`). See CLAUDE.md -> Showcase.

Data sources below were checked on 2026-10-11. Done and removed: IPU (`/ipu`), Widget Waktu Solat (`/waktu-solat/embed`), Kompas Kiblat
(`/kiblat`), Mod Ramadan (Paparan Masjid). Next recommended: **2**, **8**, **10**.

## 2. Harga Emas Kijang Emas - `/harga-emas`

- **Data:** Bank Negara Malaysia open API, verified:
  `https://api.bnm.gov.my/public/kijang-emas` (header `Accept: application/vnd.BNM.API.v1+json`)
  → 1 oz buy RM 17,301 / sell RM 18,001, ½ oz, ¼ oz (2026-10-09).
- **Why:** official buy/sell prices; also the input #6 (zakat) needs.
- **Scope:** today's prices per size, price per gram, change from the previous day.
- **Fallback:** stored copy (no other official Kijang Emas source).
- **Effort:** small.

## 6. Kalkulator Zakat

- **Data:** gold price from #2 (Kijang Emas) for nisab.
- **Why:** searched often.
- **Effort:** medium.
- **Caution:** nisab and calculation methods differ per state zakat authority. Must follow
  each state's official source - a wrong number here is a religious matter, not a typo.
  Build #2 first.

## 7. Amaran Cuaca MET - `/amaran-cuaca`

- **Data:** MET Malaysia via data.gov.my, verified: `https://api.data.gov.my/weather/warning`
  → active warnings with `title_bm`, `valid_from`/`valid_to`, text in BM (2026-10-11: ribut
  petir, angin kencang dan laut bergelora).
- **Why:** official, timely; people check before travelling or going to sea.
- **Scope:** active warnings only (drop expired by `valid_to`), newest first, "Tiada amaran"
  state. Later: a banner on Paparan Masjid when the mosque's state has a warning.
- **Fallback:** stored copy, short life (warnings expire within hours - never show an old
  one as current).
- **Effort:** small.

## 8. Gempa Bumi Terkini - `/gempa`

- **Data:** MET earthquake feed, verified:
  `https://api.data.gov.my/weather/warning/earthquake?sort=-utcdatetime&limit=50`
  → `lat`, `lon`, `depth`, `magdefault`, `location`, Malay distance from Malaysia
  (`nbm_distancemas`, e.g. "17,477km TL Pulau Banggi,SABAH").
- **Why:** after a quake (Sabah, Sumatra) people search "gempa hari ini".
- **Scope:** reuses `PointsMap` (badge = magnitude, colour by strength) + list tab, same
  layout as `/ipu`; filter "berhampiran Malaysia".
- **Effort:** small (the map is already built).

## 9. Bas & Tren Langsung - `/bas`

- **Data:** GTFS Realtime via data.gov.my, verified: `.../gtfs-realtime/vehicle-position/prasarana?category=rapid-bus-kl`
  and `/ktmb` (protobuf), routes/stops from `.../gtfs-static/prasarana` (zip, 1.6 MB).
- **Why:** "where is my bus" is a daily need in KL.
- **Scope:** live vehicle positions on `PointsMap`, filter by route, refresh every 30 s.
- **Effort:** medium-large: protobuf decoding (a dependency or a small decoder), static
  GTFS needs processing at build time, and refreshing points is new for `PointsMap`.

## 10. Jadual Imsakiah Ramadan (cetak)

- **Data:** none new - the JAKIM month we already fetch.
- **Why:** mosques and families print an Imsakiah table every Ramadan.
- **Scope:** the `/waktu-solat` monthly table switched to the Ramadan dates (Imsak,
  Subuh, Maghrib, Isyak columns, Hijri day), reusing "Cetak jadual". Pairs with Mod Ramadan.
- **Effort:** small (seasonal - before ~Feb 2027).

## 11. Penukar Tarikh Hijri ↔ Masihi - `/tarikh-hijri`

- **Data:** JAKIM takwim (already used by Kiraan Detik) for this year; `Intl`
  `islamic-umalqura` as the fallback, flagged "anggaran ±1 hari" like Kiraan Detik.
- **Why:** frequent searches ("1 Muharram 1449 bila").
- **Effort:** small.

## Small additions (no new page)

- **OPR on Kadar Tukaran** - BNM `https://api.bnm.gov.my/public/opr` (verified: 2.75%,
  2026-09-03). One line under the rates.
- **Cuaca hari ini on Paparan Masjid** - MET forecast via `api.data.gov.my/weather/forecast/`
  (verified earlier). Needs a JAKIM zone -> MET location mapping.
- **Graf Harga Minyak** - a chart for the 12-week table (load the dataviz skill first).
- **Garisan kiblat pada peta** - on `/kiblat`, a `PointsMap` with a great-circle line from
  the user to the Kaabah (`MapRoute`), useful where the compass is unreliable.
- **Widget IPU** - same iframe pattern as the Waktu Solat widget (add the route to
  `EMBEDDABLE`).

## Considered, not recommended

- **Paras air / banjir (JPS)** - publicinfobanjir.water.gov.my has no documented API;
  scraping it would break silently, and wrong flood data is dangerous.
- **Harga barang (PriceCatcher, KPDN)** - very large dataset; needs real storage and
  search, not a small showcase app.
- **Kalkulator KWSP / PCB** - rules change often; high risk of wrong numbers.
- **Cuti umum** - `api.data.gov.my` `public_holidays` returns 404; holidays differ per state.
- **Kalkulator Faraid** - inheritance shares depend on the whole family situation and on
  court practice; a wrong share is a legal and religious problem.
- **Generic developer tools** (JSON formatter, URL shortener) - don't set the portfolio apart.
