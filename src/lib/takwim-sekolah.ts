// School calendar logic over src/data/takwim-sekolah.ts - pure, dates are ISO
// yyyy-mm-dd in Malaysian time (the page passes todayMY()).
// Check: bun scripts/check-takwim-sekolah.ts
import { NEGERI, TAKWIM, type Hari, type Kalendar, type Kumpulan, type NegeriId } from "../data/takwim-sekolah";

export const isNegeri = (id: string): id is NegeriId => NEGERI.some((n) => n.id === id);

export const kalendarFor = (year: number): Kalendar | undefined => TAKWIM.find((k) => k.year === year);

export function kumpulanOf(negeri: NegeriId, k: Kalendar): Kumpulan {
  return k.kumpulan.A.includes(negeri) ? "A" : "B";
}

export const appliesTo = (h: Hari, negeri: NegeriId) =>
  (!h.only || h.only.includes(negeri)) && !h.except?.includes(negeri);

/** Whole days from `from` to `to` (both ISO dates). */
export const daysBetween = (from: string, to: string) =>
  Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);

export interface Cuti {
  name: string;
  start: string;
  end: string;
  /** 0 while the break is on. */
  daysLeft: number;
}

/** Every break for a state, in date order: school holidays + festive breaks that have a KPM extra day. */
export function breaksFor(negeri: NegeriId): Omit<Cuti, "daysLeft">[] {
  return TAKWIM.flatMap((k) => {
    const g = kumpulanOf(negeri, k);
    const school = k.blok[g].filter((b) => b.kind === "cuti");
    const festive = k.perayaan.flatMap((p) => {
      const extra = p.extra[g].filter((h) => appliesTo(h, negeri));
      if (!extra.length) return []; // festival inside a school holiday, or no school day off
      const dates = [...p.days.filter((h) => appliesTo(h, negeri)), ...extra].map((h) => h.date).sort();
      return [{ name: p.name, start: dates[0], end: dates.at(-1)! }];
    });
    return [...school, ...festive].map(({ name, start, end }) => ({ name, start, end }));
  }).sort((a, b) => a.start.localeCompare(b.start));
}

/** The break on today, else the next one; null past the last published year. */
export function nextBreak(negeri: NegeriId, today: string): Cuti | null {
  const b = breaksFor(negeri).find((x) => x.end >= today);
  return b ? { ...b, daysLeft: Math.max(0, daysBetween(today, b.start)) } : null;
}
