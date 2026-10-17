// Daily blood donations for /derma-darah (PDN / KKM, via data.gov.my dataset `blood_donations`).
// Plan A: data.gov.my API. Then the last good copy (lib/fallback) - no second provider
// publishes PDN's daily counts. The state dataset (`blood_donations_state`) has no API rows
// (only a 12 MB CSV), so it is left out.
import { getJson, withFallback } from "./fallback";
import { formatIsoMs } from "./date-my";

const DAYS = 30;
// 5 rows a day ("all" + 4 blood types); one extra day so a short latest day still leaves 30.
const API = `https://api.data.gov.my/data-catalogue?id=blood_donations&sort=-date&limit=${5 * (DAYS + 1)}`;

/** Blood type code -> label, in the usual A, B, AB, O order. */
export const TYPES = { a: "A", b: "B", ab: "AB", o: "O" } as const;
export type BloodType = keyof typeof TYPES;
const CODES = Object.keys(TYPES) as BloodType[];

export interface Donations {
  /** Latest data date, `YYYY-MM-DD`. */
  date: string;
  total: number;
  types: { type: BloodType; label: string; donations: number }[];
  /** "all" donations, oldest first, up to 30 days ending at `date`. */
  trend: { date: string; donations: number }[];
}

type Row = { date: string; donations: number; blood_type: string };

const isRow = (r: unknown): r is Row => {
  const x = r as Row;
  return (
    !!x &&
    typeof x.date === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(x.date) &&
    (x.blood_type === "all" || Object.hasOwn(TYPES, x.blood_type)) &&
    Number.isInteger(x.donations) &&
    x.donations >= 0
  );
};

/** API rows -> latest day + trend; null if any row is malformed or the latest day is incomplete. */
export function parseDonations(rows: unknown): Donations | null {
  if (!Array.isArray(rows) || !rows.length || !rows.every(isRow)) return null;
  const date = rows.reduce((d, r) => (r.date > d ? r.date : d), "");
  const latest = new Map(rows.filter((r) => r.date === date).map((r) => [r.blood_type, r.donations]));
  if (!latest.has("all") || CODES.some((c) => !latest.has(c))) return null;
  return {
    date,
    total: latest.get("all")!,
    types: CODES.map((type) => ({ type, label: TYPES[type], donations: latest.get(type)! })),
    trend: rows
      .filter((r) => r.blood_type === "all")
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-DAYS)
      .map((r) => ({ date: r.date, donations: r.donations })),
  };
}

/** "2026-10-13" -> "13 Oktober 2026" (or "13 Okt" with `short`). */
export const dayLabel = (ymd: string, short = false) =>
  formatIsoMs(ymd, { day: "numeric", month: short ? "short" : "long", ...(short ? {} : { year: "numeric" }) });

export async function getDonations(): Promise<(Donations & { source: string; stale: boolean }) | null> {
  const got = await withFallback<Donations>(
    "derma-darah",
    [{ name: "KKM / PDN (data.gov.my)", load: async () => parseDonations(await getJson(API)) }],
    { freshS: 6 * 60 * 60, staleS: 4 * 24 * 60 * 60 },
  );
  return got ? { ...got.data, source: got.source, stale: got.stale } : null;
}
