# Ideas - Showcase apps

Small public apps for `/showcase`, same pattern as the ones already live (Waktu Solat,
Harga Minyak, Kadar Tukaran, Kiraan Detik): official Malaysian data first, a fallback
chain through `src/lib/fallback.ts`, useful to people in Malaysia, cheap to run. Each
app gets its own top-level route and one entry in the `apps` array
(`src/pages/showcase.astro`). See CLAUDE.md -> Showcase.

Data sources below were checked on 2026-10-11; ideas 14-19 checked on 2026-10-14. Done and removed: IPU (`/ipu`), Widget Waktu Solat (`/waktu-solat/embed`), Kompas Kiblat
(`/kiblat`), Mod Ramadan (Paparan Masjid), Amaran Cuaca, Gempa Bumi, Tarikh Hijri, OPR, cuaca on
Paparan Masjid, Graf Harga Minyak, garisan kiblat pada peta, Widget IPU. Nombor Kecemasan (`/kecemasan`), Jadual Imsakiah (`/waktu-solat/imsakiah`), Bas Langsung (`/bas`),
Kalkulator Bil Elektrik (`/kalkulator-bil-elektrik`), Kalkulator Cukai Jalan (`/kalkulator-cukai-jalan`),
Takwim Persekolahan (`/takwim-sekolah`) - all 2026-10-14; see CLAUDE.md -> Showcase.
Next recommended: **2**.

Nombor Kecemasan follow-ups: verify and add Talian HEAL 15555 (KKM), MCMC aduan, more highway
operators (KL-Karak/LPT1, LDP, SPRINT, DUKE, WCE, LEKAS…) - official sources only; see the
header comment in `src/data/kecemasan.ts`.

## 2. Harga Emas Kijang Emas - `/harga-emas`

- **Data:** Bank Negara Malaysia open API, verified:
  `https://api.bnm.gov.my/public/kijang-emas` (header `Accept: application/vnd.BNM.API.v1+json`)
  → 1 oz buy RM 17,301 / sell RM 18,001, ½ oz, ¼ oz (2026-10-09).
- **Why:** official buy/sell prices; also the input #6 (zakat) needs.
- **Scope:** today's prices per size, price per gram, change from the previous day.
- **Fallback:** stored copy (no other official Kijang Emas source).
- **Effort:** small.

## 6. Kalkulator Zakat - `/kalkulator-zakat`

- **Data:** gold price from #2 (Kijang Emas) for nisab.
- **Why:** searched often.
- **Effort:** medium.
- **Caution:** nisab and calculation methods differ per state zakat authority. Must follow
  each state's official source - a wrong number here is a religious matter, not a typo.
  Build #2 first.

## 13. Kalkulator Gaji - PCB dan KWSP - `/kalkulator-gaji`

Full plan with official sources, formulas and test cases: `docs/plans/kalkulator-gaji-pcb-kwsp.md`.
Live with KWSP only (2026-10-14). PCB lib built and checked against the LHDN 2026 spec
(`src/lib/pcb.ts`), not on the page yet. Still needed: 10-15 cases from LHDN's official PCB
calculator (for the check), and how Part F rounding is split.

## 17. Zakat Fitrah (setiap negeri) - `/kalkulator-zakat-fitrah`

- **Data:** each state's Majlis Agama Islam / zakat authority rate for the year. No single official combined
  table - collect state by state (some states fix it per person, others per kg of rice eaten).
- **Why:** every Muslim in Malaysia pays it in Ramadan; the rate changes by state and year.
- **Scope:** state → this year's rate, who must pay, the deadline (before Aidilfitri prayer), link to the
  state's official payment portal.
- **Fallback:** none - static table, dated per entry like `kecemasan`.
- **Caution:** religious matter - official state sources only, never blogs/mirrors; ship with or after #6.
- **Effort:** small-medium (data entry per state).

## 18. Harga Getah Harian (LGM / MRE) - `/harga-getah`

- **Data:** Malaysian Rubber Board's Malaysian Rubber Exchange prices:
  `https://www.lgm.gov.my/webv2/sidenav/(mreDetails:mreprice)`. Page is JS-rendered (checked 2026-10-14) -
  find a JSON endpoint first; **if there is none, drop this idea** rather than scrape a rendered page.
- **Why:** smallholders and estates check daily prices; no friendly public viewer exists.
- **Scope:** today's cup lump / latex / scrap prices + change from the previous day.
- **Fallback:** stored copy (once an endpoint exists).
- **Effort:** small after the endpoint is confirmed; blocked until then.

## 19. Inflasi / IHP (DOSM) - `/inflasi`

- **Data:** data.gov.my data catalogue, verified 2026-10-14:
  `https://data.gov.my/data-catalogue/cpi_annual` (+ the monthly CPI series; pick the right dataset id
  when building). Same host the site already uses for Harga Minyak.
- **Why:** the monthly CPI release is news every month; a clean Malay viewer (headline % + by division)
  beats scrolling DOSM tables.
- **Scope:** latest month yoy % headline, list by division, a small 12-month trend.
- **Fallback:** stored copy of the last release.
- **Caution:** monthly release cadence - show the reference month prominently.
- **Effort:** small-medium.

## Considered, not recommended

- **Paras air / banjir (JPS)** - publicinfobanjir.water.gov.my has no documented API;
  scraping it would break silently, and wrong flood data is dangerous.
- **Harga barang (PriceCatcher, KPDN)** - very large dataset; needs real storage and
  search, not a small showcase app.
- **Cuti umum** - `api.data.gov.my` `public_holidays` returns 404; holidays differ per state.
- **Kalkulator Faraid** - inheritance shares depend on the whole family situation and on
  court practice; a wrong share is a legal and religious problem.
- **Generic developer tools** (JSON formatter, URL shortener) - don't set the portfolio apart.
- **Harga komoditi harian (KPK)** - published as a daily infographic image, not a table or API; an app
  would have to read a picture a day.
- **Kalkulator tol (LLM)** - fares live in per-highway PDFs; hundreds of plaza × vehicle-class combos,
  and revisions keep coming, so a hand-kept table goes stale quickly.
- **Peta masjid/surau (OpenStreetMap)** - no official dataset; coverage is uneven outside cities, and a
  wrong pin sends people to the wrong place.
