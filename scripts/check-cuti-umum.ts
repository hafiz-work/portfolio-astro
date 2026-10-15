// bun scripts/check-cuti-umum.ts - BKPP JPM public holiday data + next-holiday logic.
import { CUTI_UMUM } from "../src/data/cuti-umum";
import { NEGERI, type NegeriId } from "../src/data/takwim-sekolah";
import { cutiFor, nextCuti, tahunFor } from "../src/lib/cuti-umum";

const eq = (got: unknown, want: unknown, what: string) => {
  if (JSON.stringify(got) !== JSON.stringify(want)) throw new Error(`${what}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
};
const iso = /^\d{4}-\d{2}-\d{2}$/;
const ids = NEGERI.map((n) => n.id);
const valid = (d: string) => iso.test(d) && new Date(`${d}T00:00:00Z`).toISOString().startsWith(d);

for (const t of CUTI_UMUM) {
  t.cuti.forEach((c, i) => {
    if (!valid(c.date) || !c.date.startsWith(String(t.year))) throw new Error(`${t.year} bad date ${c.date} ${c.name}`);
    if (i > 0 && c.date < t.cuti[i - 1].date) throw new Error(`${t.year} not sorted at ${c.date} ${c.name}`);
    for (const n of [...(c.only ?? []), ...(c.except ?? [])]) if (!ids.includes(n)) throw new Error(`${c.name}: unknown state ${n}`);
  });
  // Every state has a list, and every national (federal) holiday on it.
  for (const n of ids) {
    const list = cutiFor(n, t.year);
    if (list.length < 15) throw new Error(`${t.year} ${n}: only ${list.length} holidays`);
    for (const name of ["Hari Pekerja", "Hari Kebangsaan", "Hari Malaysia", "Hari Krismas", "Hari Raya Puasa", "Tahun Baharu Cina"])
      if (!list.some((c) => c.name === name)) throw new Error(`${t.year} ${n}: no ${name}`);
  }
}

// Holidays per state = ticks per column on the combined table (Persekutuan dan Negeri),
// order KL Labuan Putrajaya Johor Kedah Kelantan Melaka NS Pahang Perak Perlis PP Sabah Sarawak Selangor Terengganu.
const ORDER: NegeriId[] = [
  "kuala-lumpur", "labuan", "putrajaya", "johor", "kedah", "kelantan", "melaka", "negeri-sembilan",
  "pahang", "perak", "perlis", "pulau-pinang", "sabah", "sarawak", "selangor", "terengganu",
];
eq(ORDER.map((n) => cutiFor(n, 2026).length), [18, 19, 18, 18, 18, 19, 18, 18, 18, 18, 18, 19, 20, 19, 18, 20], "2026 per state (p4-6)");
eq(ORDER.map((n) => cutiFor(n, 2027).length), [18, 19, 18, 18, 19, 19, 18, 19, 18, 18, 19, 19, 20, 19, 18, 21], "2027 per state (p4-6)");
eq(tahunFor(2026)!.cuti.length, 49, "2026: 49 rows (p4-6)");
eq(tahunFor(2027)!.cuti.length, 50, "2027: 52 rows, TBC/Qurban Hari Kedua (P)+(N) merged (p4-5)");

// Straight from the PDFs (docs/sources/kabinet/).
const has = (n: NegeriId, y: number, date: string, name: string) => cutiFor(n, y).some((c) => c.date === date && c.name === name);
eq(has("selangor", 2026, "2026-01-01", "Tahun Baharu"), true, "2026 Tahun Baharu Selangor (p4)");
eq(has("johor", 2026, "2026-01-01", "Tahun Baharu"), false, "2026 no Tahun Baharu in Johor (p4)");
eq(has("sarawak", 2026, "2026-11-08", "Hari Deepavali"), false, "2026 no Deepavali in Sarawak (p6)");
eq(has("labuan", 2026, "2026-05-30", "Pesta Kaamatan (Pesta Menuai)"), true, "2026 Kaamatan Labuan (p5)");
eq(has("melaka", 2026, "2026-03-23", "Hari Raya Puasa (Hari Ketiga)"), true, "2026 Raya ketiga Melaka (p4)");
eq(has("kelantan", 2026, "2026-02-18", "Tahun Baharu Cina (Hari Kedua)"), true, "2026 TBC day 2 (N) Kelantan (p4)");
eq(cutiFor("kedah", 2026).find((c) => c.date === "2026-05-28")?.tentative, true, "2026 Qurban day 2 Kedah, subject to change (p2, p5)");
eq(cutiFor("perak", 2026).find((c) => c.name === "Hari Raya Puasa")?.date, "2026-03-21", "2026 Raya (p1, p4)");
eq(cutiFor("perak", 2026).find((c) => c.name === "Hari Raya Puasa")?.tentative, true, "2026 Raya subject to change (p1)");
eq(cutiFor("perak", 2026).find((c) => c.name === "Hari Kebangsaan")?.tentative, undefined, "Merdeka fixed");
eq(cutiFor("kuala-lumpur", 2027).find((c) => c.name === "Tahun Baharu Cina")?.date, "2027-02-06", "2027 TBC (p1, p4)");
eq(cutiFor("terengganu", 2027).filter((c) => c.name === "Israk dan Mikraj").map((c) => c.date), ["2027-01-06", "2027-12-26"], "2027 Israk Mikraj twice (p4, p6)");
eq(has("perlis", 2027, "2027-05-17", "Hari Ulang Tahun Keputeraan Raja Perlis"), true, "2027 Raja Perlis (p5)");
eq(has("sarawak", 2027, "2027-10-28", "Hari Deepavali"), false, "2027 no Deepavali in Sarawak (p6)");

// Next holiday on fixed dates.
eq(nextCuti("selangor", "2026-10-14"), { date: "2026-11-08", names: ["Hari Deepavali"], daysLeft: 25 }, "Selangor 14/10/2026");
eq(nextCuti("sarawak", "2026-10-14"), { date: "2026-12-25", names: ["Hari Krismas"], daysLeft: 72 }, "Sarawak 14/10/2026 (no Deepavali, no Christmas Eve)");
eq(nextCuti("selangor", "2026-12-11")?.daysLeft, 0, "Sultan Selangor's birthday is today");
eq(nextCuti("johor", "2026-12-26"), { date: "2027-01-22", names: ["Hari Thaipusam"], daysLeft: 27 }, "Johor across the year boundary");
eq(nextCuti("kuala-lumpur", "2026-12-26"), { date: "2027-01-01", names: ["Tahun Baharu"], daysLeft: 6 }, "KL across the year boundary");
eq(nextCuti("perlis", "2027-05-17")?.names, ["Hari Raya Qurban", "Hari Ulang Tahun Keputeraan Raja Perlis"], "two holidays on one day");
eq(nextCuti("kedah", "2027-12-27"), null, "past the last published year");

console.log(`cuti-umum ok: ${CUTI_UMUM.map((t) => `${t.year} ${t.cuti.length}`).join(", ")}`);
