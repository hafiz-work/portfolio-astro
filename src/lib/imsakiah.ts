// Jadual Imsakiah (/waktu-solat/imsakiah): every day of one Ramadan for a JAKIM zone.
// Ramadan crosses Gregorian months (and sometimes years), so this asks for a date
// range: plan A JAKIM e-solat `period=duration` (POST datestart/dateend), plan B the
// api.waktusolat.app mirror month by month, then the last good copy. Rows are kept
// only where JAKIM's own Hijri date is month 9 of the wanted year, so the table
// follows JAKIM's takwim, not our estimate. JAKIM publishes a year's times late in
// the previous year - until then there are no rows and the page shows the
// estimated dates instead.
// Check: bun scripts/check-imsakiah.ts

import { getJson, withFallback } from "./fallback";
import { toMasihi } from "./hari-kebesaran";
import type { PrayerDay } from "./waktu-solat";

const ESOLAT = "https://www.e-solat.gov.my/index.php?r=esolatApi/takwimsolat&period=duration";
const WAKTUSOLAT = "https://api.waktusolat.app/v2/solat";
const DAY = 86_400_000;
const KEYS = ["imsak", "fajr", "syuruk", "dhuha", "dhuhr", "asr", "maghrib", "isha"] as const;

export type RamadanDay = PrayerDay & { date: string };

export interface Imsakiah {
  hYear: number;
  /** Estimated or JAKIM dates of 1 Ramadan and 1 Syawal (ISO). */
  start: string;
  syawal: string;
  estimated: boolean;
  /** null = JAKIM has not published these dates yet. */
  days: RamadanDay[] | null;
  source: string | null;
  stale: boolean;
}

// JAKIM writes dates as "15-Feb-2026", with Malay month names ("31-Dis-2026").
const MON: Record<string, number> = {
  jan: 1, feb: 2, mac: 3, mar: 3, apr: 4, mei: 5, may: 5, jun: 6, jul: 7,
  ogos: 8, ogo: 8, aug: 8, sep: 9, okt: 10, oct: 10, nov: 11, dis: 12, dec: 12,
};
/** "15-Feb-2026" / "31-Dis-2026" -> "2026-02-15"; anything else -> null. */
export function parseJakimDate(s: string): string | null {
  const m = /^(\d{1,2})-([A-Za-z]{3,4})-(\d{4})$/.exec(s ?? "");
  const mon = m && MON[m[2].toLowerCase()];
  return m && mon ? `${m[3]}-${String(mon).padStart(2, "0")}-${m[1].padStart(2, "0")}` : null;
}

/** Keep month 9 of `hYear` only, oldest first. */
export const ramadanOnly = (rows: RamadanDay[], hYear: number) =>
  rows
    .filter((r) => r.hijri.startsWith(`${hYear}-09-`))
    .sort((a, b) => a.date.localeCompare(b.date));

const iso = (t: number) => new Date(t).toISOString().slice(0, 10);

async function fromJakim(zone: string, from: string, to: string): Promise<RamadanDay[] | null> {
  const json = await getJson<{ status?: string; prayerTime?: (PrayerDay & { date: string })[] }>(
    `${ESOLAT}&zone=${encodeURIComponent(zone)}`,
    { method: "POST", body: new URLSearchParams({ datestart: from, dateend: to }), timeoutMs: 8000 },
  );
  if (!json?.status?.startsWith("OK") || !Array.isArray(json.prayerTime)) return null;
  return json.prayerTime.flatMap((r) => {
    const date = parseJakimDate(r.date);
    return date ? [{ ...r, date }] : [];
  });
}

const myClock = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Kuala_Lumpur",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});
async function fromWaktuSolatApp(zone: string, from: string, to: string): Promise<RamadanDay[] | null> {
  type Row = { day: number; hijri: string } & Record<(typeof KEYS)[number], number>;
  const months = [...new Set([from.slice(0, 7), to.slice(0, 7)])];
  const parts = await Promise.all(
    months.map(async (ym) => {
      const json = await getJson<{ prayers?: Row[] }>(
        `${WAKTUSOLAT}/${encodeURIComponent(zone)}?year=${ym.slice(0, 4)}&month=${Number(ym.slice(5, 7))}`,
      );
      return (json?.prayers ?? []).map((r) => ({
        date: `${ym}-${String(r.day).padStart(2, "0")}`,
        hijri: r.hijri,
        ...Object.fromEntries(KEYS.map((k) => [k, myClock.format(new Date(r[k] * 1000))])),
      })) as RamadanDay[];
    }),
  );
  const rows = parts.flat();
  return rows.length ? rows : null;
}

/** Ramadan `hYear` for `zone`. `today` (ISO, Malaysia) picks JAKIM's current takwim. */
export async function getImsakiah(zone: string, hYear: number, today: string): Promise<Imsakiah | null> {
  const [first, syawal] = await Promise.all([toMasihi(`${hYear}-09-01`, today), toMasihi(`${hYear}-10-01`, today)]);
  if ("error" in first || "error" in syawal) return null;
  const estimated = first.source === "anggaran" || syawal.source === "anggaran";
  // Estimates can be a day or two off JAKIM: ask for a wider window, keep month 9.
  const from = iso(Date.parse(first.masihi) - 3 * DAY);
  const to = iso(Date.parse(syawal.masihi) + 2 * DAY);

  const got = await withFallback<RamadanDay[]>(
    `imsakiah:${zone}:${hYear}`,
    [
      { name: "e-solat JAKIM", load: async () => nonEmpty(ramadanOnly((await fromJakim(zone, from, to)) ?? [], hYear)) },
      { name: "api.waktusolat.app", load: async () => nonEmpty(ramadanOnly((await fromWaktuSolatApp(zone, from, to)) ?? [], hYear)) },
    ],
    { freshS: 24 * 60 * 60, staleS: 400 * 24 * 60 * 60 },
  );
  return {
    hYear,
    start: got?.data[0].date ?? first.masihi,
    syawal: got ? iso(Date.parse(got.data.at(-1)!.date) + DAY) : syawal.masihi,
    estimated: !got && estimated,
    days: got?.data ?? null,
    source: got?.source ?? null,
    stale: got?.stale ?? false,
  };
}

// A month with fewer than 29 days of rows is incomplete - never cache it as Ramadan.
const nonEmpty = (rows: RamadanDay[]) => (rows.length >= 29 ? rows : null);
