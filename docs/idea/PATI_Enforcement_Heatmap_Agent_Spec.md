# PATI Enforcement Hotspot Map - Agent Implementation Spec (v2)

> Status: **idea / not started**. v2 refined 2026-09-30 from the v1 draft.
> Owner decides the two open questions in §0 before any data is collected.
> Changes from v1: fitted to this stack (D1 + Hono Workers, not PostgreSQL), phased
> so Phase 1 needs **no backend at all**, source reliability corrected from real
> checks, privacy/precision rules added, extraction + review workflow made concrete.

---

## 0. Decide first (blocking)

1. **Where does it live?** ✅ Decided: a sub-project at `https://hafizbahtiar.com/{sub-project}`
   (see §10 for routing rules). Still worth framing the page as a data-engineering
   case study - a "PATI hotspot" map on a personal site can read as a political statement.
2. **Public precision cap.** Recommended: public map shows **neighbourhood level or
   coarser**. Building/street coordinates (e.g. a workers' quarters) effectively
   say where vulnerable people live *now* - keep those internal or don't store them.
   Record the decision here.

Decision log:

| Date | Question | Decision |
|---|---|---|
| 2026-09-30 | Where it lives | **Sub-project on this site at the root: `https://hafizbahtiar.com/{sub-project}`** (slug TBD, proposal `/pati-hotspots`) |
| | Public precision cap | |

---

## 1. Objective

Answer one question from public official reporting:

> "Where have Malaysian authorities reported the most PATI enforcement activity?"

It must **never** claim or imply:

> "Where do the most PATI live?" / PATI population, density or prevalence.

Primary metric: **reported PATI arrests from enforcement operations, by location and
time.** Everything else is secondary or context.

---

## 2. Data semantics - never mix these

| Concept | Meaning | Is it PATI? |
|---|---|---|
| `pati_arrested` | People detained in an immigration enforcement operation | Enforcement metric - **not** a population |
| `people_checked` | People screened in that operation | Enforcement metric |
| `non_citizen_population` | All non-citizens in DOSM population stats | **No** |
| `foreign_workers` | Registered/active foreign workers | **No** |
| `arrivals` / `arrivals_soe` (data.gov.my) | Entries into Malaysia; `soe` = state of *entry*, not residence | **No** |

Context layers (§11) stay visually and semantically separate from enforcement data.

---

## 3. Sources - verified reality (checked 2026-09-30)

There is **no PATI enforcement dataset or API**. Every event comes from free-text
publications, so collection = reading + extracting + verifying.

| Source | What it is | Default confidence |
|---|---|---|
| **MKN** press posts (`mkn.gov.my/web/ms/...`) | Official. Joint-operation reports with location, people checked, arrests, nationalities. E.g. [Taman Sri Muda, 602 PATI](https://www.mkn.gov.my/web/ms/2024/10/07/taman-sri-muda-digempur-602-pati-pelbagai-negara-ditahan/) | high |
| **JIM state portals** (e.g. [JIM Johor](https://johor.imi.gov.my/johor/)) | Official state operation announcements | high |
| **JIM "Keratan Akhbar"** (`imi.gov.my/index.php/keratan-akhbar/...`) | **Newspaper articles reposted by JIM** (Harian Metro, BH...), not JIM's own release | medium |
| **Parliament** (Hansard / written answers, `parlimen.gov.my`) | Annual/state/nationality totals; rarely event-level | high (for aggregates only) |
| **Media** (Bernama, BH, HMetro, Utusan, Sinar, RTM) | Discovery + corroboration only | low; never overrides official |
| **DOSM / OpenDOSM** (`data.gov.my`) | Population & migration **context only** | n/a |

Rules:
- Media finds events; an official URL confirms them. If no official URL exists, the
  event may stay at `low` and is **excluded from the public map by default**.
- One real operation is reported by 3-6 outlets (Taman Sri Muda: MKN, BH, HMetro,
  Kosmo, Utusan, RTM). Dedupe before counting (§7).

---

## 4. Phasing - smallest thing first

### Phase 0 - Source inventory (no code, ~0.5 day)
Search every source in §3 for 2024-2026, per state (13 states + KL, Putrajaya,
Labuan). Output `docs/idea/pati-source-inventory.md`: per source, how many usable
events, date range, typical fields present. **Gate:** proceed only if ≥100
verifiable events look reachable.

Search seeds (combine with each state and year):
```text
site:mkn.gov.my PATI ditahan
site:mkn.gov.my operasi bersepadu PATI
site:imi.gov.my PATI ditahan
site:<state>.imi.gov.my operasi
site:parlimen.gov.my pendatang asing tanpa izin tangkapan
```

### Phase 1 - Static MVP (frontend repo only, no backend)
- Verified events live in **`src/data/{sub-project}/events.json`** (100-200 rows is tiny).
- Every change goes through a PR, so review = git history.
- Page reads the JSON at build time; filtering and the heatmap run client-side.
- **Why:** no migration, no endpoint, no deploy of the Worker - and it can start
  before backend access is available.

### Phase 2 - D1 + API (backend repo, only when needed)
Move to D1 when **either**: events exceed ~1,000, or you want to add events from
the admin instead of PRs. Same schema (§5), same JSON shape from the API (§9), so
the page only swaps its data source.

---

## 5. Data model

Phase 1 stores rows in this shape in JSON; Phase 2 uses the same columns in D1.

### D1 / SQLite schema (Phase 2)

```sql
CREATE TABLE pati_events (
  id                   INTEGER PRIMARY KEY AUTOINCREMENT,
  event_date           TEXT NOT NULL,          -- ISO YYYY-MM-DD (operation date)
  state                TEXT NOT NULL,          -- canonical name, §8
  district             TEXT,
  location_name        TEXT NOT NULL,          -- as reported, e.g. "Taman Sri Muda"
  latitude             REAL,                   -- public-safe point, see §6
  longitude            REAL,
  location_precision   TEXT NOT NULL CHECK (location_precision IN
                         ('neighbourhood','town','district','state')),
  people_checked       INTEGER,                -- NULL if not reported
  pati_arrested        INTEGER,                -- NULL if not a number ("several")
  enforcement_type     TEXT NOT NULL CHECK (enforcement_type IN
                         ('joint_operation','immigration_raid','workplace_inspection',
                          'checkpoint','other')),
  confidence           TEXT NOT NULL CHECK (confidence IN ('high','medium','low')),
  notes                TEXT,                   -- verbatim wording for NULL counts
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at           TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_pati_events_date  ON pati_events(event_date);
CREATE INDEX idx_pati_events_state ON pati_events(state, district);

-- Every event needs ≥1 source; the "canonical" one is the most official.
CREATE TABLE pati_event_sources (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id           INTEGER NOT NULL REFERENCES pati_events(id) ON DELETE CASCADE,
  organization       TEXT NOT NULL,          -- "MKN", "JIM Selangor", "Berita Harian"
  tier               TEXT NOT NULL CHECK (tier IN ('official','official_repost','parliament','media')),
  title              TEXT,
  url                TEXT NOT NULL UNIQUE,
  published_date     TEXT,
  is_canonical       INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE pati_event_nationalities (
  event_id           INTEGER NOT NULL REFERENCES pati_events(id) ON DELETE CASCADE,
  nationality        TEXT NOT NULL,          -- canonical, §8
  pati_arrested      INTEGER,                -- NULL when only the list is reported
  PRIMARY KEY (event_id, nationality)
);
```

Dropped from v1 (derivable or unused): `event_year`, `event_month` (derive from
`event_date`), `mukim`, `location_description`, per-row source columns (moved to
`pati_event_sources`). Nationality is **only** in the child table.

### JSON shape (Phase 1)

```json
{
  "id": "2024-10-05-taman-sri-muda",
  "eventDate": "2024-10-05",
  "state": "Selangor",
  "district": "Petaling",
  "locationName": "Taman Sri Muda",
  "lat": 3.0215, "lng": 101.5390,
  "locationPrecision": "neighbourhood",
  "peopleChecked": 1091,
  "patiArrested": 602,
  "enforcementType": "joint_operation",
  "confidence": "high",
  "nationalities": [
    { "nationality": "Bangladesh", "patiArrested": null },
    { "nationality": "Indonesia", "patiArrested": null }
  ],
  "sources": [
    { "organization": "MKN", "tier": "official", "url": "https://www.mkn.gov.my/web/ms/2024/10/07/taman-sri-muda-digempur-602-pati-pelbagai-negara-ditahan/", "publishedDate": "2024-10-07", "isCanonical": true },
    { "organization": "Berita Harian", "tier": "media", "url": "https://www.bharian.com.my/berita/kes/2024/10/1307039/taman-sri-muda-digempur-602-pati-pelbagai-negara-ditahan", "publishedDate": "2024-10-05", "isCanonical": false }
  ],
  "notes": null
}
```
(Coordinates above are illustrative - geocode for real, §6.)

---

## 6. Location, geocoding and privacy

**Store only what is safe to publish.** Precision values are limited to
`neighbourhood | town | district | state` - `exact/building/street` from v1 are
removed on purpose (§0.2).

- Geocode the **area**, not a building: "Taman Sri Muda, Shah Alam" → the taman's
  centroid, precision `neighbourhood`.
- If the source names a building/site (factory, kongsi, restaurant), record the
  **surrounding neighbourhood or town** instead and put nothing more precise anywhere.
- Only district known → district centroid, precision `district`.
- Geocoder: **Nominatim** (OpenStreetMap) - max 1 request/second, a real
  `User-Agent`, cache results, show "© OpenStreetMap contributors". ~100-200
  place names = a one-off script run, not a service. Verify every result on a map by
  eye; Malaysian taman names repeat across states.
- Store the geocoder query used in `notes` if the match was ambiguous.

**Never store about people:** names, photos, ages, sex breakdowns beyond what the
aggregate table needs, employer names. Counts and nationalities only.

---

## 7. Collection workflow (extraction + review)

1. **Discover** - Phase 0 searches; save candidate URLs to a working list.
2. **Extract** - an AI agent may read each article and draft a JSON row. Extraction
   prompt must say: copy numbers exactly; `null` when not a number; never infer
   nationality; never make a location more precise than the text.
3. **Human review (required)** - open the source, check every number, date, place.
   Nothing reaches `events.json` / D1 without this. The PR/commit is the audit log.
4. **Dedupe** - candidate duplicates share: same `state`, `event_date` within ±3
   days (media often publishes a day later), and similar `location_name`. Equal
   `pati_arrested` is strong evidence. Merge into one event; attach every URL to
   `sources`; the most official one is canonical.
5. **Geocode** - §6.

Rules that never bend:
- "Several PATI were arrested" → `patiArrested: null`, wording in `notes`.
- Operation date ≠ article date. If only the article date is known, use it and say so
  in `notes`.
- Annual/state totals from Parliament are **not events** - keep them in a separate
  `pati_aggregates` file/table if used at all.

---

## 8. Normalisation

**States** (canonical): Johor, Kedah, Kelantan, Melaka, Negeri Sembilan, Pahang,
Perak, Perlis, Pulau Pinang, Sabah, Sarawak, Selangor, Terengganu, W.P. Kuala Lumpur,
W.P. Putrajaya, W.P. Labuan. (Map "Penang" → "Pulau Pinang", "KL" → "W.P. Kuala Lumpur".)

**Nationalities:** English country names (Bangladesh, Indonesia, Myanmar, Nepal,
Pakistan, India, Sri Lanka, Philippines, Vietnam, Thailand, China, Cambodia, ...).
Open list - add new ones as reported (e.g. Algeria appears in Taman Sri Muda). Only
from the source text; never from names, photos or location.

---

## 9. API (Phase 2, Hono on Workers)

```text
GET /api/v1/pati/events?from=2025-01-01&to=2025-12-31&state=Selangor&district=Petaling&nationality=Bangladesh&minConfidence=medium
```

- Public, read-only, edge-cached like other public endpoints.
- Default `minConfidence=medium` (low excluded unless asked).
- Returns the §5 JSON shape (events with nested `sources` + `nationalities`).
- **No server-side heatmap aggregation needed** at this scale - the client bins.
  Add `/pati/aggregates?by=state|district` only if payloads get heavy.
- Admin CRUD under `/owner/pati/...` only if/when events are entered from the admin.

---

## 10. Frontend (this repo)

- Route: **`src/pages/{sub-project}/index.astro`** → `https://hafizbahtiar.com/{sub-project}`
  (proposal: `pati-hotspots`), `prerender = true` in Phase 1.
- The slug must not collide with an existing top-level route or `public/` path:
  taken today = `admin`, `blog`, `family`, `login`, `projects`, `verify-email`, `docs`,
  `images`, `brand`, `favicons` (re-check `src/pages` and `public` before creating).
- Sub-project pages use `PublicLayout` (same navbar/footer/theme) but are **not**
  added to the navbar; link them from the related project page in `/projects`
  instead, so the portfolio stays the entry point.
- The sitemap picks the page up automatically once it is prerendered; keep it
  out (add to `SITEMAP_EXCLUDE` in `astro.config.mjs`) until the data is reviewed.
- Keep sub-project code in its own folders so it can be moved out later without
  surgery: `src/pages/{sub-project}/`, `src/components/{sub-project}/`,
  `src/data/{sub-project}/`.
- Map: reuse `src/components/ui/map.tsx` (MapLibre v6, Carto basemaps - already
  allowed by the CSP). No new map dependency.
- Layers:
  - zoomed out (z < 9): MapLibre **`heatmap` layer**, weight = `patiArrested`
    (events with `null` count get a small fixed weight and are labelled
    "count not reported");
  - zoomed in (z ≥ 9): **circle** layer, one point per event, radius by arrests.
- Filters: date range, state, district, nationality, enforcement type, confidence.
- Popup on click:
  ```text
  Taman Sri Muda · Petaling, Selangor
  Reported PATI arrests: 602 (of 1,091 checked)
  Date: 5 Oct 2024 · Joint operation
  Location precision: neighbourhood
  Source: MKN (official) · +5 reports
  ```
- Always-visible caption: *"Reported immigration enforcement activity from public
  official sources. Not a measure of where PATI live."* plus coverage note
  ("N events, 2024-2026, sources: MKN, JIM").
- Summary panel per filter: total reported arrests, operations, arrest rate
  (only over events with both numbers - show how many events that covers).

---

## 11. Context layers (optional, later)

Separate toggle, separate legend, different visual encoding (choropleth by state/
district, not heat):
- Non-citizen population (DOSM) by state/district/year.
- Registered foreign workers, if a public source exists.

Never combine into a single score. The only allowed cross-metric is
`reported arrests per 1,000 non-citizens`, labelled as an **enforcement-event
ratio**, never "prevalence".

---

## 12. Wording

GOOD: "PATI Enforcement Hotspots", "Reported PATI arrests by enforcement location",
"Reported immigration enforcement activity".

BAD: "PATI population", "Where PATI live", "PATI density/concentration",
"Most PATI in ...".

---

## 13. Acceptance criteria

Phase 0
- [ ] Source inventory written with per-source event counts and a go/no-go.

Phase 1
- [ ] ≥100 events, each human-reviewed, each with ≥1 source URL.
- [ ] Every event with `confidence: high` has an official (MKN/JIM/Parliament) URL.
- [ ] Duplicates merged; each event lists all its source URLs.
- [ ] No precision finer than `neighbourhood`; no personal data stored.
- [ ] Unknown values are `null` - never estimated.
- [ ] Heatmap + zoomed-in points + popup with source; filters work.
- [ ] Caption states it is enforcement data, not population.
- [ ] A validation script (one file, no framework) fails the build if any row breaks
      the rules above (missing source, bad precision, unknown state, etc.).

Phase 2 (only if triggered, §4)
- [ ] D1 migration applied **locally**; remote migration done by the owner.
- [ ] `/api/v1/pati/events` returns the same shape; page switched to it.

---

## 14. Agent instructions

- You are building a **research/data pipeline**, not generating data.
- **Do not guess.** Unverifiable → `null` or excluded.
- **Do not make locations more precise than the source** - and never finer than
  neighbourhood in stored data.
- **Call it enforcement data.** Never population.
- Frontend repo: follow `STYLE.md` and `CLAUDE.md`. Backend (hono-workers): local
  migrations only; never run remote D1 writes or deploy - the owner does.
- Stop at the end of Phase 0 and report the inventory before collecting in bulk.
