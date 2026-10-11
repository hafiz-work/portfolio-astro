// Today's MET Malaysia forecast for a JAKIM zone (Paparan Masjid header).
// One location per zone (src/data/solat-zone-met.ts); MET publishes 7 days per
// location, refreshed through the day, so cache a few hours keyed by location + date.
import { ZONE_MET } from "../data/solat-zone-met";
import { getJson, withFallback } from "./fallback";

export interface Forecast {
  /** "Ribut petir di beberapa tempat" */
  summary: string;
  min: number;
  max: number;
}

type Row = { date: string; summary_forecast: string | null; min_temp: number | null; max_temp: number | null };

/** Forecast for `zone` on `ymd` (Malaysian "YYYY-MM-DD"), or null (unmapped zone, MET down). */
export async function getForecast(zone: string, ymd: string): Promise<Forecast | null> {
  const loc = ZONE_MET[zone];
  if (!loc) return null;
  const got = await withFallback<Forecast>(
    `cuaca:${loc}:${ymd}`,
    [{
      name: "MET Malaysia",
      load: async () => {
        const rows = await getJson<Row[]>(
          `https://api.data.gov.my/weather/forecast/?filter=${loc}@location__location_id`,
        );
        const r = Array.isArray(rows) ? rows.find((x) => x.date === ymd) : undefined;
        return r?.summary_forecast && r.min_temp != null && r.max_temp != null
          ? { summary: r.summary_forecast, min: r.min_temp, max: r.max_temp }
          : null;
      },
    }],
    { freshS: 3 * 60 * 60, staleS: 12 * 60 * 60 },
  );
  return got?.data ?? null;
}
