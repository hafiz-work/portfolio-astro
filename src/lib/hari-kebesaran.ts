// Upcoming Islamic days (Ramadan, Syawal, Aidiladha, …) for /kiraan-detik.
//
// Source order, per event:
//   1. JAKIM's takwim - the Hijri date on every row of e-solat `period=year`
//      (the calendar Malaysia actually uses). Covers the current year only, and
//      JAKIM publishes next year's takwim late in the year.
//      Last good copy if JAKIM is down (lib/fallback).
//   2. Otherwise an estimate from the runtime's Umm al-Qura calendar (Intl),
//      flagged as such. Checked against JAKIM 2026: same Aidiladha, 1 day early
//      for 1 Ramadan and 1 Syawal - so it is shown as "anggaran ±1 hari".
// Ramadan and Syawal are finally set by rukyah and the official announcement.

import { getJson, withFallback } from "./fallback";

const ESOLAT_YEAR = "https://www.e-solat.gov.my/index.php?r=esolatApi/takwimsolat&period=year&zone=WLY01";
const DAY = 86_400_000;

export const EVENTS = [
  { key: "israk", name: "Israk dan Mikraj", month: 7, day: 27 },
  { key: "ramadan", name: "Awal Ramadan", month: 9, day: 1 },
  { key: "nuzul", name: "Nuzul Al-Quran", month: 9, day: 17 },
  { key: "aidilfitri", name: "Hari Raya Aidilfitri", month: 10, day: 1 },
  { key: "aidiladha", name: "Hari Raya Aidiladha", month: 12, day: 10 },
  { key: "muharram", name: "Awal Muharram", month: 1, day: 1 },
  { key: "maulid", name: "Maulidur Rasul", month: 3, day: 12 },
] as const;

export interface UpcomingEvent {
  key: string;
  name: string;
  /** Gregorian "YYYY-MM-DD". */
  date: string;
  hijriYear: number;
  /** Whole days from today (0 = today). */
  daysLeft: number;
  source: "jakim" | "anggaran";
}

/** JAKIM takwim for the current year: Hijri [year, month, day] per Gregorian date (last good copy if JAKIM is down). */
async function jakimYear(year: string): Promise<Map<string, [number, number, number]> | null> {
  const got = await withFallback<string[]>(
    `takwim:${year}`,
    [{
      name: "e-solat JAKIM",
      load: async () => {
        const json = await getJson<{ status?: string; prayerTime?: { hijri: string }[] }>(ESOLAT_YEAR, { timeoutMs: 8000 });
        return json?.status?.startsWith("OK") && json.prayerTime?.length ? json.prayerTime.map((r) => r.hijri) : null;
      },
    }],
    { freshS: 24 * 60 * 60, staleS: 400 * 24 * 60 * 60 },
  );
  if (!got) return null;
  // Row i is 1 January + i days.
  const start = Date.parse(`${year}-01-01T00:00:00Z`);
  return new Map(got.data.map((h, i) => [new Date(start + i * DAY).toISOString().slice(0, 10), h.split("-").map(Number) as [number, number, number]]));
}

const umalqura = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura", {
  day: "numeric",
  month: "numeric",
  year: "numeric",
  timeZone: "UTC",
});
const estimate = (ymd: string): [number, number, number] => {
  const p = Object.fromEntries(umalqura.formatToParts(new Date(`${ymd}T00:00:00Z`)).map((x) => [x.type, x.value]));
  return [parseInt(p.relatedYear ?? p.year, 10), Number(p.month), Number(p.day)];
};

/** Every event's next occurrence on or after `today` ("YYYY-MM-DD", Malaysian date), soonest first. */
export async function getUpcomingEvents(today: string): Promise<UpcomingEvent[]> {
  const jakim = await jakimYear(today.slice(0, 4));
  const t0 = Date.parse(`${today}T00:00:00Z`);
  const found = new Map<string, UpcomingEvent>();
  // ponytail: day-by-day scan, ~400 iterations; fine for one SSR render.
  for (let i = 0; i <= 400 && found.size < EVENTS.length; i++) {
    const ymd = new Date(t0 + i * DAY).toISOString().slice(0, 10);
    const fromJakim = jakim?.get(ymd);
    // Past the end of JAKIM's published year we can only estimate.
    const [hy, hm, hd] = fromJakim ?? estimate(ymd);
    for (const e of EVENTS) {
      if (found.has(e.key) || e.month !== hm || e.day !== hd) continue;
      found.set(e.key, { key: e.key, name: e.name, date: ymd, hijriYear: hy, daysLeft: i, source: fromJakim ? "jakim" : "anggaran" });
    }
  }
  return [...found.values()].sort((a, b) => a.daysLeft - b.daysLeft);
}
