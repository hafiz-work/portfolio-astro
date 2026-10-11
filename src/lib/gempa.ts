// Latest earthquakes for /gempa - MET Malaysia's feed on data.gov.my (the same
// list as met.gov.my). No second official source, so the only fallback is the
// last good copy (a few hours); the page always shows when each quake happened.
import { getJson, withFallback } from "./fallback";

// Trailing slash: the API 301s the slash-less path.
const API = "https://api.data.gov.my/weather/warning/earthquake/?sort=-utcdatetime&limit=50";

export interface Quake {
  id: string;
  /** Malaysian wall-clock time stored as UTC ms - format with timeZone "UTC". */
  time: number;
  lat: number;
  lng: number;
  /** km */
  depth: number;
  mag: number;
  magType: string;
  /** Place name as MET gives it, e.g. "Northern Molucca Sea". */
  location: string;
  /** "931km TG Semporna,Sabah" - distance from the nearest Malaysian town. */
  distance: string;
}

export interface Quakes {
  quakes: Quake[];
  source: string;
  stale: boolean;
}

export const BANDS = [
  { max: 4, label: "Kecil", tone: "kecil" },
  { max: 5, label: "Sederhana", tone: "sederhana" },
  { max: 6, label: "Kuat", tone: "kuat" },
  { max: 7, label: "Sangat kuat", tone: "sangat" },
  { max: Infinity, label: "Major", tone: "major" },
] as const;

export const bandOf = (mag: number) => BANDS.find((b) => mag < b.max)!;

type Row = Record<string, unknown>;

async function fromMet(): Promise<Quake[] | null> {
  const rows = await getJson<Row[]>(API, { timeoutMs: 8000 });
  const quakes = (Array.isArray(rows) ? rows : [])
    .filter((r) => r.visible === true)
    .map((r) => ({
      id: `${r.utcdatetime}-${r.lat}`,
      time: Date.parse(`${r.localdatetime}Z`),
      lat: Number(r.lat),
      lng: Number(r.lon),
      depth: Number(r.depth),
      mag: Number(r.magdefault),
      magType: String(r.magtypedefault ?? ""),
      location: String(r.location ?? ""),
      distance: String(r.nbm_distancemas ?? ""),
    }))
    .filter((q) => Number.isFinite(q.time) && Number.isFinite(q.lat) && Number.isFinite(q.lng) && Number.isFinite(q.mag))
    .sort((a, b) => b.time - a.time);
  return quakes.length ? quakes : null;
}

/** Latest visible quakes, newest first, or null if MET is down and nothing is stored. */
export async function getQuakes(): Promise<Quakes | null> {
  const got = await withFallback<Quake[]>(
    "gempa",
    [{ name: "MET Malaysia (data.gov.my)", load: fromMet }],
    { freshS: 10 * 60, staleS: 6 * 60 * 60 },
  );
  return got ? { quakes: got.data, source: got.source, stale: got.stale } : null;
}
