// bun scripts/check-cuti-umum.ts - BKPP JPM public holiday data + next-holiday logic.
import { expect } from "bun:test";
import { CUTI_UMUM } from "../src/data/cuti-umum";
import { NEGERI, type NegeriId } from "../src/data/takwim-sekolah";
import { cutiFor, nextCuti, tahunFor } from "../src/lib/cuti-umum";

const iso = /^\d{4}-\d{2}-\d{2}$/;
const ids = NEGERI.map((n) => n.id);
const valid = (d: string) => iso.test(d) && new Date(`${d}T00:00:00Z`).toISOString().startsWith(d);

for (const t of CUTI_UMUM) {
  t.cuti.forEach((c, i) => {
    expect(valid(c.date) && c.date.startsWith(String(t.year)), `${t.year} bad date ${c.date} ${c.name}`).toBe(true);
    if (i > 0) expect(c.date >= t.cuti[i - 1].date, `${t.year} not sorted at ${c.date} ${c.name}`).toBe(true);
    for (const n of [...(c.only ?? []), ...(c.except ?? [])]) expect(ids, `${c.name}: unknown state ${n}`).toContain(n);
  });
  // Every state has a list, and every national (federal) holiday on it.
  for (const n of ids) {
    const list = cutiFor(n, t.year);
    expect(list.length, `${t.year} ${n}: holidays`).toBeGreaterThanOrEqual(15);
    for (const name of ["Hari Pekerja", "Hari Kebangsaan", "Hari Malaysia", "Hari Krismas", "Hari Raya Puasa", "Tahun Baharu Cina"])
      expect(list.map((c) => c.name), `${t.year} ${n}: no ${name}`).toContain(name);
  }
}

// Holidays per state = ticks per column on the combined table (Persekutuan dan Negeri),
// order KL Labuan Putrajaya Johor Kedah Kelantan Melaka NS Pahang Perak Perlis PP Sabah Sarawak Selangor Terengganu.
const ORDER: NegeriId[] = [
  "kuala-lumpur", "labuan", "putrajaya", "johor", "kedah", "kelantan", "melaka", "negeri-sembilan",
  "pahang", "perak", "perlis", "pulau-pinang", "sabah", "sarawak", "selangor", "terengganu",
];
expect(ORDER.map((n) => cutiFor(n, 2026).length), "2026 per state (p4-6)").toEqual([18, 19, 18, 18, 18, 19, 18, 18, 18, 18, 18, 19, 20, 19, 18, 20]);
expect(ORDER.map((n) => cutiFor(n, 2027).length), "2027 per state (p4-6)").toEqual([18, 19, 18, 18, 19, 19, 18, 19, 18, 18, 19, 19, 20, 19, 18, 21]);
expect(tahunFor(2026)!.cuti.length, "2026: 49 rows (p4-6)").toBe(49);
expect(tahunFor(2027)!.cuti.length, "2027: 52 rows, TBC/Qurban Hari Kedua (P)+(N) merged (p4-5)").toBe(50);

// Straight from the PDFs (docs/sources/kabinet/).
const has = (n: NegeriId, y: number, date: string, name: string) => cutiFor(n, y).some((c) => c.date === date && c.name === name);
expect(has("selangor", 2026, "2026-01-01", "Tahun Baharu"), "2026 Tahun Baharu Selangor (p4)").toBe(true);
expect(has("johor", 2026, "2026-01-01", "Tahun Baharu"), "2026 no Tahun Baharu in Johor (p4)").toBe(false);
expect(has("sarawak", 2026, "2026-11-08", "Hari Deepavali"), "2026 no Deepavali in Sarawak (p6)").toBe(false);
expect(has("labuan", 2026, "2026-05-30", "Pesta Kaamatan (Pesta Menuai)"), "2026 Kaamatan Labuan (p5)").toBe(true);
expect(has("melaka", 2026, "2026-03-23", "Hari Raya Puasa (Hari Ketiga)"), "2026 Raya ketiga Melaka (p4)").toBe(true);
expect(has("kelantan", 2026, "2026-02-18", "Tahun Baharu Cina (Hari Kedua)"), "2026 TBC day 2 (N) Kelantan (p4)").toBe(true);
expect(cutiFor("kedah", 2026).find((c) => c.date === "2026-05-28")?.tentative, "2026 Qurban day 2 Kedah, subject to change (p2, p5)").toBe(true);
expect(cutiFor("perak", 2026).find((c) => c.name === "Hari Raya Puasa")?.date, "2026 Raya (p1, p4)").toBe("2026-03-21");
expect(cutiFor("perak", 2026).find((c) => c.name === "Hari Raya Puasa")?.tentative, "2026 Raya subject to change (p1)").toBe(true);
expect(cutiFor("perak", 2026).find((c) => c.name === "Hari Kebangsaan")?.tentative, "Merdeka fixed").toBeUndefined();
expect(cutiFor("kuala-lumpur", 2027).find((c) => c.name === "Tahun Baharu Cina")?.date, "2027 TBC (p1, p4)").toBe("2027-02-06");
expect(cutiFor("terengganu", 2027).filter((c) => c.name === "Israk dan Mikraj").map((c) => c.date), "2027 Israk Mikraj twice (p4, p6)").toEqual(["2027-01-06", "2027-12-26"]);
expect(has("perlis", 2027, "2027-05-17", "Hari Ulang Tahun Keputeraan Raja Perlis"), "2027 Raja Perlis (p5)").toBe(true);
expect(has("sarawak", 2027, "2027-10-28", "Hari Deepavali"), "2027 no Deepavali in Sarawak (p6)").toBe(false);

// Next holiday on fixed dates.
expect(nextCuti("selangor", "2026-10-14"), "Selangor 14/10/2026").toEqual({ date: "2026-11-08", names: ["Hari Deepavali"], daysLeft: 25 });
expect(nextCuti("sarawak", "2026-10-14"), "Sarawak 14/10/2026 (no Deepavali, no Christmas Eve)").toEqual({ date: "2026-12-25", names: ["Hari Krismas"], daysLeft: 72 });
expect(nextCuti("selangor", "2026-12-11")?.daysLeft, "Sultan Selangor's birthday is today").toBe(0);
expect(nextCuti("johor", "2026-12-26"), "Johor across the year boundary").toEqual({ date: "2027-01-22", names: ["Hari Thaipusam"], daysLeft: 27 });
expect(nextCuti("kuala-lumpur", "2026-12-26"), "KL across the year boundary").toEqual({ date: "2027-01-01", names: ["Tahun Baharu"], daysLeft: 6 });
expect(nextCuti("perlis", "2027-05-17")?.names, "two holidays on one day").toEqual(["Hari Raya Qurban", "Hari Ulang Tahun Keputeraan Raja Perlis"]);
expect(nextCuti("kedah", "2027-12-27"), "past the last published year").toBeNull();

console.log(`cuti-umum ok: ${CUTI_UMUM.map((t) => `${t.year} ${t.cuti.length}`).join(", ")}`);
