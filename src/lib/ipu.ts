// Air Pollutant Index (IPU) for /ipu - Jabatan Alam Sekitar (JAS) APIMS, the
// current hourly reading for every station in one request. No second official
// real-time source exists, so the only fallback is the last good copy - kept just
// 6 hours, and the page always shows the reading time (old air data misleads).
import { getJson, withFallback } from "./fallback";

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
