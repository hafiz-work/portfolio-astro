// "Peringatan hari ini" for Waktu Solat: one curated ayat or hadis per day.
// Curated (src/data/peringatan.ts) so nothing appears out of context on a mosque
// screen; the text itself is always fetched from the source, never retyped.
// - Ayat: api.alquran.cloud - Uthmani Arabic + Basmeih (Tafsir Pimpinan Ar-Rahman).
// - Hadis: HadeethEnc (hadeethenc.com) Malay translation, with grade + source.
// Content never changes, so responses are colo-cached for a week. The hadis API
// is slow; on a miss or timeout the page simply renders without a reminder.
import { AYAT, HADIS } from "../data/peringatan";
import { getJson, withFallback } from "./fallback";

// Content never changes: fresh for a week, last good copy for a month.
const KEEP = { freshS: 7 * 24 * 60 * 60, staleS: 30 * 24 * 60 * 60 };

export interface Reminder {
  kind: "ayat" | "hadis";
  arabic?: string;
  text: string;
  /** Latin label: surah + ayat, or the hadis grade. */
  source: string;
  /** Arabic attribution of a hadis (e.g. "رواه البخاري") - render without letter-spacing. */
  sourceAr?: string;
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
      type Ed = { text: string; surah: { englishName: string } };
      const got = await withFallback<Ed[]>(
        `ayat:${item.ref}`,
        [{
          name: "alquran.cloud",
          load: async () => {
            const d = await getJson<{ data?: Ed[] }>(
              `https://api.alquran.cloud/v1/ayah/${item.ref}/editions/quran-uthmani,ms.basmeih`,
              { timeoutMs: 4000 },
            );
            return d?.data?.length === 2 ? d.data : null;
          },
        }],
        KEEP,
      );
      const [ar, ms] = got?.data ?? [];
      if (!ar || !ms) return null;
      return { kind: "ayat", arabic: ar.text, text: ms.text, source: `Surah ${ms.surah.englishName}, ${item.ref}` };
    }
    type H = { hadeeth: string; grade?: string; attribution?: string };
    const got = await withFallback<H>(
      `hadis:${item.ref}`,
      [{
        name: "HadeethEnc",
        load: async () => {
          const h = await getJson<H>(`https://hadeethenc.com/api/v1/hadeeths/one/?language=ms&id=${item.ref}`, { timeoutMs: 4000 });
          return typeof h?.hadeeth === "string" ? h : null;
        },
      }],
      KEEP,
    );
    const h = got?.data;
    if (!h) return null;
    const grade = Object.entries(GRADE).find(([ar]) => h.grade?.includes(ar))?.[1];
    return { kind: "hadis", text: h.hadeeth, source: grade ?? "", sourceAr: h.attribution };
  } catch {
    return null;
  }
}
