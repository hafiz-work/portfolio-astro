// Air Pollutant Index (IPU) for /ipu - Jabatan Alam Sekitar (JAS) APIMS, the
// current hourly reading for every station in one request. No second official
// real-time source exists, so the only fallback is the last good copy - kept just
// 6 hours, and the page always shows the reading time (old air data misleads).
import { getJson, withFallback } from "./fallback";
import { linePath } from "./chart";

const APIMS =
  "https://eqms.doe.gov.my/api3/publicmapproxy/PUBLIC_DISPLAY/CAQM_MCAQM_Current_Reading/MapServer/0/query?where=1%3D1&outFields=STATION_ID,DATETIME,API,PARAM_SELECTED,STATION_LOCATION,PLACE,STATE_NAME,LATITUDE,LONGITUDE&f=json";

export interface Station {
  id: string;
  /** "Kangar, PERLIS" */
  location: string;
  place: string;
  state: string;
  lat: number;
  lng: number;
  /** null = no valid reading this hour. */
  api: number | null;
  /** Dominant pollutant, e.g. "PM2.5". */
  pollutant: string | null;
  /** Reading time. APIMS stores Malaysian wall-clock time as if it were UTC
   *  (17:00 MYT arrives as 17:00Z), so format it with timeZone "UTC". */
  time: number;
}

export interface Readings {
  stations: Station[];
  source: string;
  stale: boolean;
}

/** JAS bands. Colours follow JAS's own scale (blue, green, yellow, orange, red). */
export const BANDS = [
  { max: 50, label: "Baik", tone: "baik" },
  { max: 100, label: "Sederhana", tone: "sederhana" },
  { max: 200, label: "Tidak sihat", tone: "tidak-sihat" },
  { max: 300, label: "Sangat tidak sihat", tone: "sangat" },
  { max: Infinity, label: "Berbahaya", tone: "bahaya" },
] as const;

export const bandOf = (api: number | null) => (api == null ? null : BANDS.find((b) => api <= b.max)!);

type ArcGis = { features?: { attributes: Record<string, unknown> }[] };

async function fromApims(): Promise<Station[] | null> {
  const json = await getJson<ArcGis>(APIMS, { timeoutMs: 8000 });
  const stations = (json?.features ?? [])
    .map(({ attributes: a }) => {
      const api = typeof a.API === "number" && a.API >= 0 ? a.API : null;
      return {
        id: String(a.STATION_ID ?? ""),
        location: String(a.STATION_LOCATION ?? ""),
        place: String(a.PLACE ?? ""),
        state: String(a.STATE_NAME ?? ""),
        lat: Number(a.LATITUDE),
        lng: Number(a.LONGITUDE),
        api,
        pollutant: api != null && typeof a.PARAM_SELECTED === "string" ? a.PARAM_SELECTED : null,
        time: Number(a.DATETIME),
      };
    })
    .filter((s) => s.id && Number.isFinite(s.lat) && Number.isFinite(s.lng));
  return stations.length ? stations : null;
}

/** Every station's current reading, or null if JAS is down and nothing is stored. */
export async function getReadings(): Promise<Readings | null> {
  const got = await withFallback<Station[]>(
    "ipu",
    [{ name: "Jabatan Alam Sekitar (APIMS)", load: fromApims }],
    { freshS: 15 * 60, staleS: 6 * 60 * 60 },
  );
  return got ? { stations: got.data, source: got.source, stale: got.stale } : null;
}

// Last 25 hourly readings for every CAQM station in one request - the "Data Trend"
// chart on APIMS (eqms.doe.gov.my/APIMS/main) calls this. `datetime` is the
// Malaysian wall-clock hour; MCAQM (mobile) stations have no trend rows.
const TREND = "https://eqms.doe.gov.my/api3/publicportalapims/datatrendchart";

/** Station id -> hourly IPU, oldest first, ending at `end` (null = no reading that hour). */
export interface Trend {
  /** Last hour, APIMS-style (Malaysian wall-clock as UTC ms). */
  end: number;
  stations: Record<string, (number | null)[]>;
}

const HOUR = 3_600_000;
export const TREND_HOURS = 25;

type TrendRow = { STATION_ID?: unknown; EPOCHDATE?: unknown; API?: unknown };

/** Rows -> 25-slot series per station. Pure, so `scripts/check-ipu-trend.ts` can test it. */
export function toTrend(rows: TrendRow[], end: number): Trend | null {
  const stations: Trend["stations"] = {};
  for (const r of rows) {
    const i = TREND_HOURS - 1 - (end - Number(r.EPOCHDATE)) / HOUR;
    if (typeof r.STATION_ID !== "string" || !Number.isInteger(i) || i < 0 || i >= TREND_HOURS) continue;
    const series = (stations[r.STATION_ID] ??= Array(TREND_HOURS).fill(null));
    series[i] = typeof r.API === "number" && r.API >= 0 ? r.API : null;
  }
  return Object.keys(stations).length ? { end, stations } : null;
}

export async function getTrend(): Promise<Trend | null> {
  // The current Malaysian hour as "YYYY-MM-DDTHH:00:00" and as APIMS's fake-UTC ms.
  const hour = new Date(Math.floor((Date.now() + 8 * HOUR) / HOUR) * HOUR);
  const stamp = hour.toISOString().slice(0, 13) + ":00:00";
  const got = await withFallback<Trend>(
    "ipu-trend",
    [
      {
        name: "Jabatan Alam Sekitar (APIMS)",
        load: async () => {
          const json = await getJson<{ highcharts_bar?: TrendRow[] }>(`${TREND}?datetime=${stamp}&`, { timeoutMs: 8000 });
          return Array.isArray(json?.highcharts_bar) ? toTrend(json.highcharts_bar, hour.getTime()) : null;
        },
      },
    ],
    { freshS: 15 * 60, staleS: 6 * 60 * 60 },
  );
  return got?.data ?? null;
}

/** Sparkline path for one series in a w x h box (gaps stay gaps); null under 2 readings. */
export function sparkline(series: (number | null)[], w: number, h: number) {
  const values = series.filter((v): v is number => v != null);
  if (values.length < 2) return null;
  const [min, max] = [Math.min(...values), Math.max(...values)];
  const span = max - min || 1;
  const d = linePath(series.map((v, i) => (v == null ? null : [(i / (series.length - 1)) * w, h - ((v - min) / span) * h])));
  return { d, min, max };
}
