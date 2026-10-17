// Public holiday logic over src/data/cuti-umum.ts - pure, ISO dates in Malaysian time
// (the page passes todayMY()). Check: bun scripts/check-cuti-umum.ts
import { CUTI_UMUM, type CutiUmum, type TahunCuti } from "../data/cuti-umum";
import type { NegeriId } from "../data/takwim-sekolah";
import { appliesTo, daysBetween } from "./takwim-sekolah";

export const tahunFor = (year: number): TahunCuti | undefined => CUTI_UMUM.find((t) => t.year === year);

export const cutiFor = (negeri: NegeriId, year: number): CutiUmum[] =>
  tahunFor(year)?.cuti.filter((c) => appliesTo(c, negeri)) ?? [];

/** Today's holiday(s), else the next date with one; null past the last published year. */
export function nextCuti(negeri: NegeriId, today: string): { date: string; names: string[]; daysLeft: number } | null {
  const all = CUTI_UMUM.flatMap((t) => cutiFor(negeri, t.year));
  const date = all.find((c) => c.date >= today)?.date;
  if (!date) return null;
  return { date, names: all.filter((c) => c.date === date).map((c) => c.name), daysLeft: daysBetween(today, date) };
}
