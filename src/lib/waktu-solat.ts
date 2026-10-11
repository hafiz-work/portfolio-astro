// Malaysian prayer times from JAKIM e-solat (official, unauthenticated).
// One request returns the whole month for a zone; it is kept in the colo cache
// keyed by zone + Malaysian month, so JAKIM sees ~1 request per zone per month
// per location, and the month rolls over at Malaysian midnight on the 1st.

import { SOLAT_ZONES, type SolatZone } from "../data/solat-zones";

const DEFAULT_ZONE = "WLY01"; // Kuala Lumpur, Putrajaya

/** `?zone=` checked against the JAKIM list (trust boundary: it goes into the upstream URL). */
export const resolveZone = (param: string | null): SolatZone =>
  SOLAT_ZONES.find((z) => z.code === param?.toUpperCase()) ??
  SOLAT_ZONES.find((z) => z.code === DEFAULT_ZONE)!;

const ESOLAT = "https://www.e-solat.gov.my/index.php?r=esolatApi/takwimsolat&period=month";
const TIMEOUT_MS = 6000;
const CACHE_S = 6 * 60 * 60;

export interface PrayerDay {
  hijri: string; // "1448-04-29"
  date: string; // "11-Okt-2026"
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
  /** Kiblat direction for the zone, e.g. "292° 31′ 16″" (null if JAKIM omits it). */
  bearing: string | null;
}

/** JAKIM sends the bearing HTML-escaped ("292&#176; 31&#8242; …"). */
const decodeEntities = (s: string) => s.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));

/** The month's rows + kiblat bearing, or null on any upstream failure (never cached). */
async function fetchMonth(url: string): Promise<Month | null> {
  const res = await fetch(url, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) return null;
  const json = (await res.json()) as { status?: string; prayerTime?: PrayerDay[]; bearing?: string };
  if (!json.status?.startsWith("OK") || !json.prayerTime?.length) return null;
  return { days: json.prayerTime, bearing: json.bearing ? decodeEntities(json.bearing) : null };
}

export interface PrayerTimes {
  today: PrayerDay;
  tomorrow: PrayerDay;
  /** Every day of the current month (index 0 = the 1st) - for the monthly table. */
  month: PrayerDay[];
  bearing: string | null;
}

/**
 * Today's (and tomorrow's) times, the whole month and the kiblat bearing for a JAKIM
 * zone, or null if e-solat is down/slow. Tomorrow feeds the display countdown after
 * Isyak. `zone` must be validated by the caller.
 */
export async function getPrayerTimes(zone: string): Promise<PrayerTimes | null> {
  const today = todayInMalaysia();
  const url = `${ESOLAT}&zone=${encodeURIComponent(zone)}`;
  // The month is in the key (not the upstream URL) so a new month misses the cache.
  // `_v` bumps when the cached shape changes.
  const key = new Request(`${url}&_m=${today.slice(0, 7)}&_v=2`);
  const cache = (globalThis.caches as unknown as { default?: Cache } | undefined)?.default;
  try {
    const hit = await cache?.match(key);
    const month = hit ? ((await hit.json()) as Month) : await fetchMonth(url);
    if (!month?.days.length) return null;
    if (!hit && cache) {
      await cache.put(key, new Response(JSON.stringify(month), {
        headers: { "Content-Type": "application/json", "Cache-Control": `public, max-age=${CACHE_S}` },
      }));
    }
    const days = month.days;
    const i = Number(today.slice(8, 10)) - 1;
    if (!days[i]) return null;
    // ponytail: last day of the month uses today's row for tomorrow (Subuh moves ~1 min/day);
    // fetch next month here if that minute ever matters.
    return { today: days[i], tomorrow: days[i + 1] ?? days[i], month: days, bearing: month.bearing };
  } catch {
    return null;
  }
}

const HIJRI_MONTHS = [
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
