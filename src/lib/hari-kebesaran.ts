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

// ---- Hijri <-> Masihi converter (/tarikh-hijri): same sources, same order. ----

export type Conversion =
  | { masihi: string; hijri: string; source: "jakim" | "anggaran" }
  | { error: string };

const pad = (n: number) => String(n).padStart(2, "0");
const hijriStr = ([y, m, d]: [number, number, number]) => `${y}-${pad(m)}-${pad(d)}`;
/** Monotonic day-ish index of a Hijri date (months counted as 30 days). */
const hKey = ([y, m, d]: [number, number, number]) => (y * 12 + m - 1) * 30 + d;
// Intl's Umm al-Qura table is reliable well beyond this; keep inputs sane.
const MASIHI_YEARS = [1900, 2100];
const HIJRI_YEARS = [1318, 1524];

/** "YYYY-MM-DD" (Masihi) -> Hijri, JAKIM takwim if it covers the date, else estimate. */
export async function toHijri(ymd: string, today: string): Promise<Conversion> {
  const t = Date.parse(`${ymd}T00:00:00Z`);
  const y = Number(ymd.slice(0, 4));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd) || Number.isNaN(t) || new Date(t).toISOString().slice(0, 10) !== ymd) {
    return { error: "Tarikh Masihi tidak sah." };
  }
  if (y < MASIHI_YEARS[0] || y > MASIHI_YEARS[1]) {
    return { error: `Tahun Masihi mesti antara ${MASIHI_YEARS[0]} dan ${MASIHI_YEARS[1]}.` };
  }
  const fromJakim = (await jakimYear(today.slice(0, 4)))?.get(ymd);
  return { masihi: ymd, hijri: hijriStr(fromJakim ?? estimate(ymd)), source: fromJakim ? "jakim" : "anggaran" };
}

/** "YYYY-MM-DD" (Hijri) -> Masihi: reverse lookup in JAKIM's takwim, else search the Umm al-Qura calendar. */
export async function toMasihi(hijri: string, today: string): Promise<Conversion> {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(hijri);
  if (!m) return { error: "Tarikh Hijri tidak sah." };
  const h = [Number(m[1]), Number(m[2]), Number(m[3])] as [number, number, number];
  if (h[0] < HIJRI_YEARS[0] || h[0] > HIJRI_YEARS[1]) {
    return { error: `Tahun Hijri mesti antara ${HIJRI_YEARS[0]} dan ${HIJRI_YEARS[1]}.` };
  }
  if (h[1] < 1 || h[1] > 12) return { error: "Bulan Hijri mesti antara 1 dan 12." };
  if (h[2] < 1 || h[2] > 30) return { error: "Hari bulan Hijri mesti antara 1 dan 30." };
  const want = hijriStr(h);
  const noDay = { error: `Bulan ini hanya 29 hari - tiada hari ke-30.` };

  const jakim = await jakimYear(today.slice(0, 4));
  if (jakim) {
    const rows = [...jakim];
    const i = rows.findIndex(([, x]) => hijriStr(x) === want);
    if (i >= 0) return { masihi: rows[i][0], hijri: want, source: "jakim" };
    // JAKIM shows day 29 followed by day 1: a 29-day month.
    const j = rows.findIndex(([, x]) => hijriStr(x) === hijriStr([h[0], h[1], 29]));
    if (h[2] === 30 && j >= 0 && j + 1 < rows.length) return noDay;
  }

  // Estimate: start from the mean Hijri year/month, then walk to the exact day.
  // 1 Muharram 1 AH = 622-07-16 (Julian) = -42521587200000 ms.
  let t = -42_521_587_200_000 + Math.round(((h[0] - 1) * 354.367 + (h[1] - 1) * 29.5306 + h[2] - 1)) * DAY;
  for (let n = 0; n < 10; n++) {
    const delta = hKey(h) - hKey(estimate(new Date(t).toISOString().slice(0, 10)));
    if (delta === 0) break;
    t += delta * DAY;
  }
  // ponytail: a 30th that oscillates between 29 and 1 never converges; the ±3-day scan settles it.
  for (let k = -3; k <= 3; k++) {
    const ymd = new Date(t + k * DAY).toISOString().slice(0, 10);
    if (hijriStr(estimate(ymd)) === want) return { masihi: ymd, hijri: want, source: "anggaran" };
  }
  return noDay;
}
