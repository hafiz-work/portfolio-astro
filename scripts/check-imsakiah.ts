// bun scripts/check-imsakiah.ts - JAKIM date parsing and the Ramadan filter (offline).
import { expect } from "bun:test";
import { parseJakimDate, ramadanOnly, type RamadanDay } from "../src/lib/imsakiah";

expect(parseJakimDate("15-Feb-2026"), "English month").toBe("2026-02-15");
expect(parseJakimDate("31-Dis-2026"), "Malay Dis").toBe("2026-12-31");
expect(parseJakimDate("1-Mac-2027"), "Malay Mac, 1 digit day").toBe("2027-03-01");
expect(parseJakimDate("05-Ogos-2026"), "Malay Ogos").toBe("2026-08-05");
expect(parseJakimDate("05-Okt-2026"), "Malay Okt").toBe("2026-10-05");
expect(parseJakimDate("2026-02-15"), "ISO is not JAKIM's format").toBeNull();
expect(parseJakimDate("15-Xyz-2026"), "unknown month").toBeNull();

const row = (date: string, hijri: string) => ({ date, hijri }) as RamadanDay;
const rows = [
  row("2026-03-20", "1447-10-01"),
  row("2026-02-19", "1447-09-01"),
  row("2026-02-18", "1447-08-30"),
  row("2026-02-20", "1447-09-02"),
  row("2027-02-08", "1448-09-01"),
];
expect(ramadanOnly(rows, 1447).map((r) => r.date), "month 9 of 1447 only, sorted").toEqual(["2026-02-19", "2026-02-20"]);
console.log("imsakiah: ok");
