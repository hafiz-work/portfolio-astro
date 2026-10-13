// Malaysian date format (dd/mm/yyyy) for DatePicker.astro: the field shows and
// accepts dd/mm/yyyy, forms still submit ISO yyyy-mm-dd.
// Check: bun scripts/check-date-my.ts

export const BULAN = ["Januari", "Februari", "Mac", "April", "Mei", "Jun", "Julai", "Ogos", "September", "Oktober", "November", "Disember"];
/** Monday first (Isnin … Ahad). */
export const HARI_PENDEK = ["Is", "Se", "Ra", "Kh", "Ju", "Sa", "Ah"];

const pad = (n: number) => String(n).padStart(2, "0");

/** "2027-02-08" -> "08/02/2027"; anything else -> "". */
export function isoToDmy(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso ?? "");
  return m ? `${m[3]}/${m[2]}/${m[1]}` : "";
}

/** True for a real calendar date (no 30/02, no 31/04). */
export function isRealDate(y: number, m: number, d: number): boolean {
  if (y < 1 || m < 1 || m > 12 || d < 1) return false;
  const t = new Date(Date.UTC(y, m - 1, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d;
}

/** "8/2/2027", "08-02-2027", "08.02.2027" or "08022027" -> "2027-02-08"; invalid -> null. */
export function dmyToIso(text: string): string | null {
  const s = (text ?? "").trim();
  const m = /^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{4})$/.exec(s) ?? /^(\d{2})(\d{2})(\d{4})$/.exec(s);
  if (!m) return null;
  const [d, mo, y] = [Number(m[1]), Number(m[2]), Number(m[3])];
  return isRealDate(y, mo, d) ? `${y}-${pad(mo)}-${pad(d)}` : null;
}

/** 42 cells (6 weeks, Monday first) covering `month` (1-12) of `year`. */
export function monthGrid(year: number, month: number): { iso: string; day: number; inMonth: boolean }[] {
  const first = new Date(Date.UTC(year, month - 1, 1));
  const offset = (first.getUTCDay() + 6) % 7; // Monday = 0
  return Array.from({ length: 42 }, (_, i) => {
    const t = new Date(Date.UTC(year, month - 1, 1 + i - offset));
    return {
      iso: t.toISOString().slice(0, 10),
      day: t.getUTCDate(),
      inMonth: t.getUTCMonth() === month - 1,
    };
  });
}

/** Shift an ISO date by days (keyboard navigation). */
export const addDays = (iso: string, n: number) =>
  new Date(Date.parse(`${iso}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

/** Same day in another month, clamped to that month's length (31 Jan + 1 -> 28/29 Feb). */
export function addMonths(iso: string, n: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const target = new Date(Date.UTC(y, m - 1 + n, 1));
  const last = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(d, last));
  return target.toISOString().slice(0, 10);
}
