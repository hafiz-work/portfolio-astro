// /ipu: today's MET forecast for every location in one request, matched to each air
// station by the nearest MET location with coordinates (src/data/cuaca-lokasi.ts).
// A forecast for the current part of the day - MET publishes no live rain readings.
// (Paparan Masjid uses today's row of getRamalan in src/lib/ramalan-cuaca.ts.)
import { LOKASI } from "../data/cuaca-lokasi";
import { getJson, withFallback } from "./fallback";
import { distanceKm } from "./geo";
import { OPEN_METEO_SOURCE, wmoText } from "./ramalan-cuaca";

type Row = { date: string; summary_forecast: string | null; min_temp: number | null; max_temp: number | null };

export type Period = "morning" | "afternoon" | "night";
export type Sky = "hujan" | "ribut" | "jerebu" | "cerah";
export interface Cuaca {
  /** MET location used, e.g. "Pasir Gudang". */
  place: string;
  /** "Ribut petir di beberapa tempat" */
  text: string;
  sky: Sky;
}
type DayRow = Row & { location: { location_id: string }; morning_forecast: string | null; afternoon_forecast: string | null; night_forecast: string | null };

export const PERIOD_LABEL: Record<Period, string> = { morning: "Pagi ini", afternoon: "Petang ini", night: "Malam ini" };

/** Malaysian hour -> MET period. Before 6 am shows the morning (MET has no rows for yesterday's night). */
export const periodAt = (hourMY: number): Period => (hourMY >= 19 ? "night" : hourMY >= 12 ? "afternoon" : "morning");

/** MET wording -> kind. "Tiada Hujan" = cerah; Ribut petir before Hujan (it rains too). */
export function skyOf(text: string): Sky {
  const t = text.toLowerCase();
  if (t.startsWith("tiada")) return "cerah";
  if (t.includes("ribut")) return "ribut";
  if (t.includes("hujan")) return "hujan";
  if (t.includes("jerebu")) return "jerebu";
  return "cerah";
}

const GEO = LOKASI.filter((l) => l.lat != null && l.lng != null);

/** Nearest MET location within 50 km (every JAS station today is within 47 km), else null. */
export function nearestMet(lat: number, lng: number) {
  let best: { id: string; name: string; d: number } | null = null;
  for (const l of GEO) {
    const d = distanceKm(lat, lng, l.lat!, l.lng!);
    if (d <= 50 && (!best || d < best.d)) best = { id: l.id, name: l.name, d };
  }
  return best;
}

/** Today's forecast rows by MET location id (one request), or null when MET is down. */
export async function getTodayAll(ymd: string): Promise<Map<string, DayRow> | null> {
  const got = await withFallback<DayRow[]>(
    `cuaca-semua:${ymd}`,
    [{
      name: "MET Malaysia",
      load: async () => {
        const rows = await getJson<DayRow[]>(`https://api.data.gov.my/weather/forecast/?filter=${ymd}@date&limit=1000`);
        return Array.isArray(rows) && rows.length ? rows : null;
      },
    }],
    { freshS: 3 * 60 * 60, staleS: 12 * 60 * 60 },
  );
  return got ? new Map(got.data.map((r) => [r.location.location_id, r])) : null;
}

/** The forecast at (lat, lng) for `period`, or null (no nearby location / no text). */
export function cuacaAt(rows: Map<string, DayRow>, lat: number, lng: number, period: Period): Cuaca | null {
  const near = nearestMet(lat, lng);
  const text = near && rows.get(near.id)?.[`${period}_forecast`];
  return near && text ? { place: near.name, text, sky: skyOf(text) } : null;
}

export interface MetDay {
  /** MET location id - links to /ramalan-cuaca?lokasi=. */
  id: string;
  place: string;
  morning: string | null;
  afternoon: string | null;
  night: string | null;
  min: number | null;
  max: number | null;
}

/** The whole of today's MET forecast at the nearest location (station panel). */
export function metDayAt(rows: Map<string, DayRow>, lat: number, lng: number): MetDay | null {
  const near = nearestMet(lat, lng);
  const r = near && rows.get(near.id);
  return near && r
    ? { id: near.id, place: near.name, morning: r.morning_forecast, afternoon: r.afternoon_forecast, night: r.night_forecast, min: r.min_temp, max: r.max_temp }
    : null;
}

export interface Now {
  text: string;
  temp: number;
  /** mm in the last 15 min. */
  rain: number;
}
type OmCurrent = { current?: { weather_code?: number; temperature_2m?: number; precipitation?: number } };

/** Open-Meteo `current` block -> Now, or null when a field is missing. */
export function parseNow(body: OmCurrent): Now | null {
  const c = body.current;
  return c && c.weather_code != null && c.temperature_2m != null && c.precipitation != null
    ? { text: wmoText(c.weather_code), temp: Math.round(c.temperature_2m), rain: c.precipitation }
    : null;
}

/**
 * Current weather at each point, by its id, from Open-Meteo - one request for all,
 * a global-model estimate (MET publishes no live readings), labelled as such.
 * `key` names the point set in the cache (e.g. "ipu").
 */
export async function getNowAt(key: string, points: { id: string; lat: number; lng: number }[]): Promise<Record<string, Now | null> | null> {
  if (!points.length) return null;
  const f = (n: number) => n.toFixed(3);
  const got = await withFallback<Record<string, Now | null>>(
    `cuaca-kini:${key}`,
    [{
      name: OPEN_METEO_SOURCE,
      load: async () => {
        const body = await getJson<OmCurrent | OmCurrent[]>(
          `https://api.open-meteo.com/v1/forecast?latitude=${points.map((p) => f(p.lat)).join(",")}&longitude=${points.map((p) => f(p.lng)).join(",")}&current=weather_code,temperature_2m,precipitation&timezone=Asia%2FKuala_Lumpur`,
        );
        const list = Array.isArray(body) ? body : body ? [body] : [];
        return list.length === points.length ? Object.fromEntries(points.map((p, i) => [p.id, parseNow(list[i])])) : null;
      },
    }],
    { freshS: 30 * 60, staleS: 2 * 60 * 60 },
  );
  return got?.data ?? null;
}
