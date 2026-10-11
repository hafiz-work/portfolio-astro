// bun scripts/check-imsakiah.ts - JAKIM date parsing and the Ramadan filter (offline).
import { parseJakimDate, ramadanOnly, type RamadanDay } from "../src/lib/imsakiah";

const eq = (got: unknown, want: unknown, what: string) => {
  if (JSON.stringify(got) !== JSON.stringify(want)) throw new Error(`${what}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
};
eq(parseJakimDate("15-Feb-2026"), "2026-02-15", "English month");
eq(parseJakimDate("31-Dis-2026"), "2026-12-31", "Malay Dis");
eq(parseJakimDate("1-Mac-2027"), "2027-03-01", "Malay Mac, 1 digit day");
eq(parseJakimDate("05-Ogos-2026"), "2026-08-05", "Malay Ogos");
eq(parseJakimDate("05-Okt-2026"), "2026-10-05", "Malay Okt");
eq(parseJakimDate("2026-02-15"), null, "ISO is not JAKIM's format");
eq(parseJakimDate("15-Xyz-2026"), null, "unknown month");

const row = (date: string, hijri: string) => ({ date, hijri }) as RamadanDay;
const rows = [
  row("2026-03-20", "1447-10-01"),
  row("2026-02-19", "1447-09-01"),
  row("2026-02-18", "1447-08-30"),
  row("2026-02-20", "1447-09-02"),
  row("2027-02-08", "1448-09-01"),
];
eq(ramadanOnly(rows, 1447).map((r) => r.date), ["2026-02-19", "2026-02-20"], "month 9 of 1447 only, sorted");
console.log("imsakiah: ok");
