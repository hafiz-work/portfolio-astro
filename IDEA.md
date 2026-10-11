# Ideas - Showcase apps

Small public apps for `/showcase`, same pattern as the ones already live (Waktu Solat,
Harga Minyak, Kadar Tukaran, Kiraan Detik): official Malaysian data first, a fallback
chain through `src/lib/fallback.ts`, useful to people in Malaysia, cheap to run. Each
app gets its own top-level route and one entry in the `apps` array
(`src/pages/showcase.astro`). See CLAUDE.md -> Showcase.

Data sources below were checked on 2026-10-11. Done and removed: IPU (`/ipu`), Widget Waktu Solat (`/waktu-solat/embed`), Kompas Kiblat
(`/kiblat`), Mod Ramadan (Paparan Masjid), Amaran Cuaca, Gempa Bumi, Tarikh Hijri, OPR, cuaca on
Paparan Masjid, Graf Harga Minyak, garisan kiblat pada peta, Widget IPU. Nombor Kecemasan (`/kecemasan`), Jadual Imsakiah (`/waktu-solat/imsakiah`), Bas Langsung (`/bas`).
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

## 6. Kalkulator Zakat

- **Data:** gold price from #2 (Kijang Emas) for nisab.
- **Why:** searched often.
- **Effort:** medium.
- **Caution:** nisab and calculation methods differ per state zakat authority. Must follow
  each state's official source - a wrong number here is a religious matter, not a typo.
  Build #2 first.

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
