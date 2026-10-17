// Weekly fuel prices for /harga-minyak (Malaysia, RM per litre).
// Plan A: data.gov.my API (dataset `fuelprice`). Plan B: the same dataset as a CSV
// on data.gov.my's static storage (different infrastructure from the API). Then
// the last good copy (lib/fallback). Prices change weekly (effective Thursday).
import { getJson, withFallback } from "./fallback";

const API = "https://api.data.gov.my/data-catalogue?id=fuelprice&filter=level@series_type&sort=-date&limit=13";
const CSV = "https://storage.data.gov.my/commodities/fuelprice.csv";
const WEEKS = 13; // this week + 12 for the history table

/** Column -> label. Notes are data.gov.my's own column descriptions only; the
 *  BUDI/SKDS diesel columns have none yet, so they show just the scheme name. */
export const FUELS = [
  { key: "ron95", label: "RON95", note: "" },
  { key: "ron97", label: "RON97", note: "" },
  { key: "diesel", label: "Diesel", note: "Semenanjung Malaysia" },
  { key: "diesel_eastmsia", label: "Diesel", note: "Malaysia Timur" },
  { key: "ron95_budi95", label: "RON95 BUDI95", note: "Subsidi BUDI 95" },
  { key: "ron95_skps", label: "RON95 SKPS", note: "Sistem Kawalan Petrol Bersubsidi" },
  { key: "diesel_budi", label: "Diesel BUDI", note: "" },
  { key: "diesel_skds", label: "Diesel SKDS", note: "" },
] as const;
export type FuelKey = (typeof FUELS)[number]["key"];

export type FuelWeek = { date: string } & Record<FuelKey, number | null>;

export interface FuelPrices {
  /** Newest first: weeks[0] is the price in effect now. */
  weeks: FuelWeek[];
  source: string;
  stale: boolean;
}

const toWeek = (r: Record<string, unknown>): FuelWeek => {
  const num = (v: unknown) => (v === "" || v == null || Number.isNaN(Number(v)) ? null : Number(v));
  return {
    date: String(r.date),
    ...Object.fromEntries(FUELS.map((f) => [f.key, num(r[f.key])])),
  } as FuelWeek;
};

/** The data.gov.my CSV (no quoted fields) -> the newest `limit` "level" rows. */
export const parseFuelCsv = (csv: string, limit = WEEKS): FuelWeek[] => {
  const [head, ...lines] = csv.trim().split(/\r?\n/);
  const cols = head.split(",");
  return lines
    .map((line) => Object.fromEntries(line.split(",").map((v, i) => [cols[i], v])))
    .filter((r) => r.series_type === "level" && /^\d{4}-\d{2}-\d{2}$/.test(r.date))
    .map(toWeek)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, limit);
};

async function fromApi(): Promise<FuelWeek[] | null> {
  const rows = await getJson<Record<string, unknown>[]>(API);
  return Array.isArray(rows) && rows.length ? rows.map(toWeek) : null;
}

async function fromCsv(): Promise<FuelWeek[] | null> {
  const res = await fetch(CSV, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) return null;
  const weeks = parseFuelCsv(await res.text());
  return weeks.length ? weeks : null;
}

/** This week's prices plus 12 weeks of history, or null if every plan fails. */
export async function getFuelPrices(): Promise<FuelPrices | null> {
  const got = await withFallback<FuelWeek[]>(
    "harga-minyak",
    [
      { name: "data.gov.my", load: fromApi },
      { name: "data.gov.my (fail CSV)", load: fromCsv },
    ],
    { freshS: 6 * 60 * 60, staleS: 30 * 24 * 60 * 60 },
  );
  return got ? { weeks: got.data, source: got.source, stale: got.stale } : null;
}

/** Price change from the previous week, rounded to sen (null when either is missing). */
export const weeklyChange = (weeks: FuelWeek[], key: FuelKey): number | null => {
  const [now, prev] = [weeks[0]?.[key], weeks[1]?.[key]];
  return now == null || prev == null ? null : Math.round((now - prev) * 100) / 100;
};

