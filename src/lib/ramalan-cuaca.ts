// 7-day forecast for one MET location (/ramalan-cuaca).
// Plan A: MET Malaysia via data.gov.my (official, daily, pagi/petang/malam).
// Plan B: Open-Meteo (global model) - only for locations with coordinates in
//         src/data/cuaca-lokasi.ts; daily summary + min/max, no pagi/petang/malam.
// Then the stored copy. Days before today (Malaysia) are dropped on every read, so a
// stored copy never shows yesterday as "today".
import type { Lokasi } from "../data/cuaca-lokasi";
import { getJson, withFallback, type Fetched } from "./fallback";

export interface Day {
  /** "YYYY-MM-DD" (Malaysia). */
  date: string;
  summary: string;
  /** MET: when the summary applies ("Pagi dan Petang"); null from Open-Meteo. */
  when: string | null;
  morning: string | null;
  afternoon: string | null;
  night: string | null;
  min: number;
  max: number;
}

export const MET_SOURCE = "MET Malaysia";
export const OPEN_METEO_SOURCE = "Open-Meteo (anggaran model global)";

type MetRow = {
  date: string;
  morning_forecast: string | null;
  afternoon_forecast: string | null;
  night_forecast: string | null;
  summary_forecast: string | null;
  summary_when: string | null;
  min_temp: number | null;
  max_temp: number | null;
};

/** MET rows -> days, oldest first; rows without a summary or temperatures are dropped. */
export function parseMet(rows: MetRow[]): Day[] {
  return rows
    .filter((r) => r.date && r.summary_forecast && r.min_temp != null && r.max_temp != null)
    .map((r) => ({
      date: r.date,
      summary: r.summary_forecast!,
      when: r.summary_when || null,
      morning: r.morning_forecast || null,
      afternoon: r.afternoon_forecast || null,
      night: r.night_forecast || null,
      min: r.min_temp!,
      max: r.max_temp!,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

// WMO weather codes (Open-Meteo `weather_code`) in Malay, worded like MET's summaries.
const WMO: Record<number, string> = {
  0: "Cerah",
  1: "Kebanyakannya cerah",
  2: "Separa berawan",
  3: "Mendung",
  45: "Berkabus",
  48: "Berkabus",
  51: "Hujan renyai",
  53: "Hujan renyai",
  55: "Hujan renyai",
  61: "Hujan ringan",
  63: "Hujan",
  65: "Hujan lebat",
  80: "Hujan sekejap-sekejap",
  81: "Hujan sekejap-sekejap",
  82: "Hujan lebat sekejap-sekejap",
  95: "Ribut petir",
  96: "Ribut petir dengan hujan batu",
  99: "Ribut petir dengan hujan batu",
};
export const wmoText = (code: number) => WMO[code] ?? "Tiada maklumat";

type OpenMeteo = {
  daily?: { time?: string[]; weather_code?: number[]; temperature_2m_min?: number[]; temperature_2m_max?: number[] };
};

/** Open-Meteo daily block -> days (whole degrees, like MET). */
export function parseOpenMeteo(body: OpenMeteo): Day[] {
  const d = body.daily;
  if (!d?.time?.length || !d.weather_code || !d.temperature_2m_min || !d.temperature_2m_max) return [];
  return d.time
    .map((date, i) => ({ date, code: d.weather_code![i], min: d.temperature_2m_min![i], max: d.temperature_2m_max![i] }))
    .filter((x) => x.code != null && x.min != null && x.max != null)
    .map((x) => ({
      date: x.date,
      summary: wmoText(x.code),
      when: null,
      morning: null,
      afternoon: null,
      night: null,
      min: Math.round(x.min),
      max: Math.round(x.max),
    }));
}

/** Today in Malaysia, "YYYY-MM-DD". */
export const todayMY = (now = new Date()) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kuala_Lumpur" }).format(now);

/** Drop days before `today` (a stored copy can be up to a day old). */
export const fromToday = (days: Day[], today = todayMY()) => days.filter((d) => d.date >= today);

export async function getRamalan(loc: Lokasi): Promise<Fetched<Day[]> | null> {
  const plans = [
    {
      name: MET_SOURCE,
      load: async () => {
        const rows = await getJson<MetRow[]>(
          `https://api.data.gov.my/weather/forecast/?filter=${encodeURIComponent(loc.id)}@location__location_id`,
        );
        const days = Array.isArray(rows) ? parseMet(rows) : [];
        return days.length ? days : null;
      },
    },
  ];
  if (loc.lat != null && loc.lng != null) {
    const { lat, lng } = loc;
    plans.push({
      name: OPEN_METEO_SOURCE,
      load: async () => {
        const body = await getJson<OpenMeteo>(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=Asia%2FKuala_Lumpur&forecast_days=7`,
        );
        const days = body ? parseOpenMeteo(body) : [];
        return days.length ? days : null;
      },
    });
  }
  const got = await withFallback<Day[]>(`ramalan:${loc.id}`, plans, { freshS: 3 * 60 * 60, staleS: 24 * 60 * 60 });
  if (!got) return null;
  const days = fromToday(got.data);
  return days.length ? { ...got, data: days } : null;
}
