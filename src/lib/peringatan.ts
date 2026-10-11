// "Peringatan hari ini" for Waktu Solat: one curated ayat or hadis per day.
// Curated (src/data/peringatan.ts) so nothing appears out of context on a mosque
// screen; the text itself is always fetched from the source, never retyped.
// - Ayat: api.alquran.cloud - Uthmani Arabic + Basmeih (Tafsir Pimpinan Ar-Rahman).
// - Hadis: HadeethEnc (hadeethenc.com) Malay translation, with grade + source.
// Content never changes, so responses are colo-cached for a week. The hadis API
// is slow; on a miss or timeout the page simply renders without a reminder.
import { AYAT, HADIS } from "../data/peringatan";

const TIMEOUT_MS = 4000;
const CACHE_S = 7 * 24 * 60 * 60;

export interface Reminder {
  kind: "ayat" | "hadis";
  arabic?: string;
  text: string;
  /** Latin label: surah + ayat, or the hadis grade. */
  source: string;
  /** Arabic attribution of a hadis (e.g. "رواه البخاري") - render without letter-spacing. */
  sourceAr?: string;
}

/** GET + week-long colo cache; only responses passing `ok` are cached. */
async function cachedJson<T>(url: string, ok: (json: T) => boolean): Promise<T | null> {
  const cache = (globalThis.caches as unknown as { default?: Cache } | undefined)?.default;
  const key = new Request(url);
  const hit = await cache?.match(key);
  if (hit) return (await hit.json()) as T;
  const res = await fetch(url, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) return null;
  const json = (await res.json()) as T;
  if (!ok(json)) return null;
  if (cache) {
    await cache.put(key, new Response(JSON.stringify(json), {
      headers: { "Content-Type": "application/json", "Cache-Control": `public, max-age=${CACHE_S}` },
    }));
  }
  return json;
}

const GRADE: Record<string, string> = { "صحيح": "Sahih", "حسن": "Hasan" };

/** Today's reminder for a "YYYY-MM-DD" Malaysian date, or null if the source is unavailable. */
export async function getDailyReminder(ymd: string): Promise<Reminder | null> {
  // Even days an ayat, odd days a hadis; each list cycles on its own.
  const day = Math.floor(Date.parse(`${ymd}T00:00:00Z`) / 86_400_000);
  const turn = Math.floor(day / 2);
  const item = day % 2 && HADIS.length
    ? { kind: "hadis" as const, ref: HADIS[turn % HADIS.length] }
    : { kind: "ayat" as const, ref: AYAT[turn % AYAT.length] };
  try {
    if (item.kind === "ayat") {
      type Ed = { text: string; numberInSurah: number; surah: { number: number; englishName: string } };
      const d = await cachedJson<{ data: Ed[] }>(
        `https://api.alquran.cloud/v1/ayah/${item.ref}/editions/quran-uthmani,ms.basmeih`,
        (j) => j?.data?.length === 2,
      );
      const [ar, ms] = d?.data ?? [];
      if (!ar || !ms) return null;
      return { kind: "ayat", arabic: ar.text, text: ms.text, source: `Surah ${ms.surah.englishName}, ${item.ref}` };
    }
    const h = await cachedJson<{ hadeeth?: string; grade?: string; attribution?: string }>(
      `https://hadeethenc.com/api/v1/hadeeths/one/?language=ms&id=${item.ref}`,
      (j) => typeof j?.hadeeth === "string",
    );
    if (!h?.hadeeth) return null;
    const grade = Object.entries(GRADE).find(([ar]) => h.grade?.includes(ar))?.[1];
    return { kind: "hadis", text: h.hadeeth, source: grade ?? "", sourceAr: h.attribution };
  } catch {
    return null;
  }
}
