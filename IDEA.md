# Ideas - Showcase apps

Small public apps for `/showcase`, same pattern as the ones already live (Waktu Solat,
Harga Minyak, Kadar Tukaran, Kiraan Detik): official Malaysian data first, a fallback
chain through `src/lib/fallback.ts`, useful to people in Malaysia, cheap to run. Each
app gets its own top-level route and one entry in the `apps` array
(`src/pages/showcase.astro`). See CLAUDE.md -> Showcase.

Data sources below were checked on 2026-10-11; ideas 14-19 checked on 2026-10-14. Done and removed: IPU (`/ipu`), Widget Waktu Solat (`/waktu-solat/embed`), Kompas Kiblat
(`/kiblat`), Mod Ramadan (Paparan Masjid), Amaran Cuaca, Gempa Bumi, Tarikh Hijri, OPR, cuaca on
Paparan Masjid, Graf Harga Minyak, garisan kiblat pada peta, Widget IPU. Nombor Kecemasan (`/kecemasan`), Jadual Imsakiah (`/waktu-solat/imsakiah`), Pengangkutan Awam (`/pengangkutan-awam`),
Kalkulator Bil Elektrik (`/kalkulator-bil-elektrik`), Kalkulator Cukai Jalan (`/kalkulator-cukai-jalan`),
Takwim Persekolahan (`/takwim-sekolah`), Inflasi (`/inflasi`), Derma Darah (`/derma-darah`),
Cuti Umum (`/cuti-umum`) - all 2026-10-14; Masjid & Surau (`/waktu-solat/masjid`, SISMIM list +
OSM "terdekat") 2026-10-21; see CLAUDE.md -> Showcase. Ideas 20-23 checked on 2026-10-21 (OpenDOSM,
data.moh.gov.my and the BNM API - see `OPEN-API.md` §1A and §4).
Next recommended: **20** (smallest, high safety value), then **24**, then **2**. Idea 24 checked
2026-10-21.

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

## 20. Semak Produk NPRA (kosmetik/ubat dibatalkan) - `/semak-produk`

- **Data:** data.moh.gov.my (NPRA), files only - not in the API (404):
  `storage.data.gov.my/healthcare/cosmetic_notifications_cancelled.csv` (14 KB, 125 products with the
  **banned substance found** - mercury, tretinoin, hydroquinone…) and
  `pharmaceutical_products_cancelled.csv` (223 KB, cancelled MAL registrations). Data as of 1 Oct 2026, CC BY 4.0.
- **Why:** people check "krim ni ada merkuri ke?" before buying online; the official list is buried.
- **Scope:** search by product name / NOT / MAL number / company; each hit shows the substance or the
  cancellation date + "rujuk NPRA". Small files -> fetched and colo-cached a day (stale a month), searched
  on the page.
- **Later, maybe:** "is this product registered?" needs the full lists (10.7 MB ubat, 23.9 MB kosmetik) - a
  generated index or server search, not a page download. Skip until the small version proves useful.
- **Caution:** absence from the cancelled list does **not** mean a product is safe or registered - say so
  on the page; NPRA's own search (quest3plus) is the final word.
- **Effort:** small.

## 21. Semak Amaran Pengguna BNM - `/semak-syarikat`

- **Data:** `https://api.bnm.gov.my/public/consumer-alert` (verified 200 without a key, 2026-10-21; 53 KB:
  name, registration number, date added, websites).
- **Why:** investment/loan scams; fits the 997 NSRC line on `/kecemasan`.
- **Scope:** search by company or website; hit -> "dalam Senarai Amaran BNM sejak <tarikh>" + link to BNM;
  no hit -> "tiada dalam senarai - ini tidak bermaksud ia berlesen", link to BNM's licensed lists.
- **Fallback:** stored copy (fresh 1 day, stale 30 days).
- **Caution:** never say "selamat"; read the APIKijang terms and rate limits before building.
- **Effort:** small.

## 22. Base Rate bank - on `/kadar-tukaran` (OPR section)

- **Data:** `https://api.bnm.gov.my/public/base-rate` (verified 2026-10-21): Base Rate, BLR and
  indicative effective lending rate per bank.
- **Scope:** one table under the OPR, sorted by bank; same source/stale labelling.
- **Effort:** tiny.

## 23. Derma Organ - on `/derma-darah`

- **Data:** data.moh.gov.my `organ_pledges` (API, daily; 71 pledges on 2026-10-20) and
  `organ_pledges_state`.
- **Scope:** a small "Ikrar derma organ" card + 30-day trend under the blood donations, link to NTRC's pledge page.
- **Effort:** small. Low priority - fewer people look for it.

## 24. Cari Taska Berdaftar (JKM) - `/taska`

Checked 2026-10-21 (idea from a friend: taska / tadika / rumah pengasuh).

- **Data:** JKM's public register at `https://www.jkm.gov.my/main/taska` - the link malaysia.gov.my gives
  parents as "Senarai TASKA Berdaftar JKM". **3,658 taska** (Selangor 1,061). HTML, 10 a page
  (`?search_state=<1-16>&search_district=&search_name=&frontendpage=taska&page=N`; `per-page` is ignored).
  Each entry: name, **No. Pendaftaran** (e.g. `W/TI-018/2023`), **Tarikh Tempoh** (validity, e.g.
  27.06.2023 - 26.06.2028), category (Institusi / Tempat Kerja / Harian / Komuniti…), address, phone,
  fax, email, and a **GPS link** (`maps.google.com/?q=lat,lng`) - coordinates on ~88% of a 48-entry sample.
  `robots.txt` OK. No open licence stated (same position as SISMIM).
- **Why:** taska deaths and unregistered taska are in the news; Akta 308 makes registration
  compulsory, and parents are told to "semak di portal JKM" - a page that is 366 pages of cards with no map.
- **Scope:** "Taska berdaftar terdekat" on a `PointsMap` + list by state/district; each taska shows name,
  registration number, validity (**"Tempoh tamat"** badge when the end date has passed - the sample had
  one that ended Aug 2024 and is still listed), category, address, "Arah" link, link to JKM. Name search
  ("adakah taska ni berdaftar?"). Talian Kasih **15999** for reporting unregistered taska.
- **How:** a generator (`scripts/taska/jkm.ts`, Bun) walks the 366 pages politely (1 request / 2 s,
  ~12 min, monthly) -> the parsed list. Keep it **server-side** (lib + JSON endpoint that returns the
  nearest 20 for a rounded location, or one state) rather than a public 3,658-row file: the register has no
  open licence, so don't republish it wholesale (same reasoning as SISMIM). Fallback: stored copy.
- **PDPA:** never show phone/email/fax - many operators are individuals. Name, registration number,
  validity, address and the pin are what the public register exists for.
- **Also send a data request** (§7 of `OPEN-API.md`): agency **KPWKM**, title "Senarai TASKA Berdaftar
  (JKM) dengan koordinat", fields as above minus personal contacts, purpose Product Development. A
  licensed file would replace the crawl.
- **Effort:** medium (generator + parser check + map page).

**Left out of this idea, and why:**

- **Rumah pengasuh / pengasuh berdaftar** - JKM publishes no list (`/main/pengasuh` is an empty page;
  only per-state *counts* exist in the archive, last 2017-2020). They are individuals caring for children
  in their own homes - a public map of them would be a safety problem even if the data existed. Don't build.
- **Tadika** - no national list. KPM (Bahagian Pendidikan Swasta) registers private tadika but publishes
  no directory; malaysia.gov.my gives no tadika checker. Partial and stale only: KEMAS TABIKA PDFs per
  state (2020 folder), KEMAS TASKA PDFs (2020, now 523), JPNIN Tabika Perpaduan PDF (404), archive
  "Senarai Tadika Islam di Malaysia" (JAKIM, ~900 rows, 2021, CC BY, has phone numbers). Revisit only if
  KPM publishes a list or a data request (agency **KPM**) is fulfilled.
- **KEMAS / Perpaduan taska** - not in JKM's register (separate agencies); their lists are the stale PDFs
  above. The page must say "senarai JKM sahaja".

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

**Ditangguh hingga Januari 2027** (diputuskan 2026-10-14): kadar 1448H diumumkan setiap negeri menjelang
Ramadan (~Feb 2027); kadar 1447H sudah lepas dan tidak boleh dipaparkan. Bina sekali gus apabila
negeri mula mengumumkan; negeri yang belum umum = "belum diumumkan", tiada angka.

- **Data:** each state's Majlis Agama Islam / zakat authority rate for the year. No single official combined
  table - collect state by state (some states fix it per person, others per kg of rice eaten).
- **Why:** every Muslim in Malaysia pays it in Ramadan; the rate changes by state and year.
- **Scope:** state → this year's rate, who must pay, the deadline (before Aidilfitri prayer), link to the
  state's official payment portal.
- **Fallback:** none - static table, dated per entry like `kecemasan`.
- **Caution:** religious matter - official state sources only, never blogs/mirrors; ship with or after #6.
- **Effort:** small-medium (data entry per state).

## Considered, not recommended

- **Paras air / banjir (JPS)** - publicinfobanjir.water.gov.my has no documented API;
  scraping it would break silently, and wrong flood data is dangerous.
- **Harga barang (PriceCatcher, KPDN)** - checked 2026-10-21: not in the API; monthly files
  `pricecatcher/pricecatcher_YYYY-MM.csv` (19.4 MB) / `.parquet` (0.96 MB) + `lookup_item` / `lookup_premise`.
  Still needs a generator that aggregates a month into per-item/per-area prices and real search - a big
  build, not a small showcase app. Revisit if a "harga barang terdekat" app is worth a week.
- **Cuti umum** - `api.data.gov.my` `public_holidays` returns 404; holidays differ per state.
- **Kalkulator Faraid** - inheritance shares depend on the whole family situation and on
  court practice; a wrong share is a legal and religious problem.
- **Generic developer tools** (JSON formatter, URL shortener) - don't set the portfolio apart.
- **Harga getah harian (LGM / MRE)** - checked 2026-10-14: every MRE and farmgate price API behind
  `lgm.gov.my/webv2api` needs a login (401); the one open endpoint is filled by visitors' browsers and has
  today only (no previous day). No data.gov.my dataset. Only route: ask LGM for official data access.
- **Harga komoditi harian (KPK)** - published as a daily infographic image, not a table or API; an app
  would have to read a picture a day.
- **Kalkulator tol (LLM)** - fares live in per-highway PDFs; hundreds of plaza × vehicle-class combos,
  and revisions keep coming, so a hand-kept table goes stale quickly.
- **Peta masjid/surau (OpenStreetMap) as the main list** - superseded 2026-10-21: the official list
  (SISMIM) is the main view on `/waktu-solat/masjid`; OSM only powers "Terdekat dengan saya", labelled as
  not JAKIM's list. Still true: coverage is uneven outside cities.
- **OpenDOSM analyst datasets** (GDP, LFS, gaji, PPI, IPI, trade, SDG) - checked 2026-10-21: annual or
  quarterly figures for analysts; little day-to-day use for the public. `crime_district` stops at 2023.
