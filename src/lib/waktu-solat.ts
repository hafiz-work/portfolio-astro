// Malaysian prayer times. Plan A JAKIM e-solat (official), plan B the
// api.waktusolat.app mirror of JAKIM's data, then the last good copy (lib/fallback).
// One request returns the whole month for a zone.

import { SOLAT_ZONES, type SolatZone } from "../data/solat-zones";
import { getJson, withFallback } from "./fallback";

const DEFAULT_ZONE = "WLY01"; // Kuala Lumpur, Putrajaya

/** `?zone=` checked against the JAKIM list (trust boundary: it goes into the upstream URL). */
export const resolveZone = (param: string | null): SolatZone =>
  SOLAT_ZONES.find((z) => z.code === param?.toUpperCase()) ??
  SOLAT_ZONES.find((z) => z.code === DEFAULT_ZONE)!;

const ESOLAT = "https://www.e-solat.gov.my/index.php?r=esolatApi/takwimsolat&period=month";
const WAKTUSOLAT = "https://api.waktusolat.app/v2/solat";

export interface PrayerDay {
  hijri: string; // "1448-04-29"
  imsak: string; // "05:41:00"
  fajr: string;
  syuruk: string;
  dhuha: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
}

/** Today's date in Malaysia as "YYYY-MM-DD" (the Worker runs in UTC). */
export const todayInMalaysia = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kuala_Lumpur" }).format(new Date());

interface Month {
  days: PrayerDay[];
  /** Kiblat direction for the zone, e.g. "292° 31′ 16″" (JAKIM only; null otherwise). */
  bearing: string | null;
}

/** JAKIM sends the bearing HTML-escaped ("292&#176; 31&#8242; …"). */
const decodeEntities = (s: string) => s.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));

const KEYS = ["imsak", "fajr", "syuruk", "dhuha", "dhuhr", "asr", "maghrib", "isha"] as const;
const myClock = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Kuala_Lumpur",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

/** Plan A: JAKIM e-solat - the official source. */
async function fromJakim(zone: string): Promise<Month | null> {
  const json = await getJson<{ status?: string; prayerTime?: PrayerDay[]; bearing?: string }>(
    `${ESOLAT}&zone=${encodeURIComponent(zone)}`,
  );
  if (!json?.status?.startsWith("OK") || !json.prayerTime?.length) return null;
  return { days: json.prayerTime, bearing: json.bearing ? decodeEntities(json.bearing) : null };
}

/** Plan B: api.waktusolat.app - a mirror of JAKIM's data (Unix timestamps per prayer). */
async function fromWaktuSolatApp(zone: string, ymd: string): Promise<Month | null> {
  type Row = { day: number; hijri: string } & Record<(typeof KEYS)[number], number>;
  const json = await getJson<{ prayers?: Row[] }>(
    `${WAKTUSOLAT}/${encodeURIComponent(zone)}?year=${ymd.slice(0, 4)}&month=${Number(ymd.slice(5, 7))}`,
  );
  if (!json?.prayers?.length) return null;
  const days = json.prayers
    .sort((a, b) => a.day - b.day)
    .map((r) => ({
      hijri: r.hijri,
      ...Object.fromEntries(KEYS.map((k) => [k, myClock.format(new Date(r[k] * 1000))])),
    })) as PrayerDay[];
  return { days, bearing: null };
}

export interface PrayerTimes {
  today: PrayerDay;
  tomorrow: PrayerDay;
  /** Every day of the current month (index 0 = the 1st) - for the monthly table. */
  month: PrayerDay[];
  bearing: string | null;
  /** Which plan answered ("e-solat JAKIM", …) and whether it is the last good copy. */
  source: string;
  stale: boolean;
}

/**
 * Today's (and tomorrow's) times, the whole month and the kiblat bearing for a JAKIM
 * zone - JAKIM first, then the waktusolat.app mirror, then the last good copy (kept
 * 40 days). Null only if all three fail. `zone` must be validated by the caller.
 * Cached per zone + Malaysian month, so the month rolls over at Malaysian midnight.
 */
export async function getPrayerTimes(zone: string): Promise<PrayerTimes | null> {
  const today = todayInMalaysia();
  const got = await withFallback<Month>(
    `solat:${zone}:${today.slice(0, 7)}`,
    [
      { name: "e-solat JAKIM", load: () => fromJakim(zone) },
      { name: "api.waktusolat.app (data JAKIM)", load: () => fromWaktuSolatApp(zone, today) },
    ],
    { freshS: 6 * 60 * 60, staleS: 40 * 24 * 60 * 60 },
  );
  const days = got?.data.days;
  const i = Number(today.slice(8, 10)) - 1;
  if (!got || !days?.[i]) return null;
  // ponytail: last day of the month uses today's row for tomorrow (Subuh moves ~1 min/day);
  // fetch next month here if that minute ever matters.
  return {
    today: days[i],
    tomorrow: days[i + 1] ?? days[i],
    month: days,
    bearing: got.data.bearing,
    source: got.source,
    stale: got.stale,
  };
}

export const HIJRI_MONTHS = [
  "Muharram", "Safar", "Rabiulawal", "Rabiulakhir", "Jamadilawal", "Jamadilakhir",
  "Rejab", "Syaaban", "Ramadan", "Syawal", "Zulkaedah", "Zulhijjah",
];

/** "1448-04-29" -> "29 Rabiulakhir 1448H" */
export const formatHijri = (hijri: string) => {
  const [y, m, d] = hijri.split("-").map(Number);
  return HIJRI_MONTHS[m - 1] ? `${d} ${HIJRI_MONTHS[m - 1]} ${y}H` : hijri;
};

/** "05:41:00" -> "05:41" */
export const hhmm = (time: string) => time.slice(0, 5);
