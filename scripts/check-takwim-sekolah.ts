// bun scripts/check-takwim-sekolah.ts - KPM school calendar data + next-break logic.
import { NEGERI, TAKWIM } from "../src/data/takwim-sekolah";
import { addDays } from "../src/lib/date-my";
import { breaksFor, kalendarFor, kumpulanOf, nextBreak } from "../src/lib/takwim-sekolah";

const eq = (got: unknown, want: unknown, what: string) => {
  if (JSON.stringify(got) !== JSON.stringify(want)) throw new Error(`${what}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
};
const iso = /^\d{4}-\d{2}-\d{2}$/;

for (const k of TAKWIM) {
  // Every state in exactly one group.
  for (const n of NEGERI) {
    const hits = Number(k.kumpulan.A.includes(n.id)) + Number(k.kumpulan.B.includes(n.id));
    eq(hits, 1, `${k.year} ${n.id} groups`);
  }
  eq(k.kumpulan.A.length + k.kumpulan.B.length, NEGERI.length, `${k.year} group sizes`);
  // Blocks: school/holiday alternate, each starts the day after the last ends, year ends 31/12.
  for (const g of ["A", "B"] as const) {
    const blok = k.blok[g];
    blok.forEach((b, i) => {
      if (!iso.test(b.start) || !iso.test(b.end) || b.start > b.end) throw new Error(`${k.year}${g} bad block ${b.name}`);
      if (i > 0) {
        eq(b.start, addDays(blok[i - 1].end, 1), `${k.year}${g} ${b.name} contiguous`);
        if (b.kind === blok[i - 1].kind) throw new Error(`${k.year}${g} ${b.name}: two ${b.kind} blocks in a row`);
      }
    });
    eq(blok[0].kind, "sekolah", `${k.year}${g} starts with school`);
    eq(blok.at(-1)!.end, `${k.year}-12-31`, `${k.year}${g} ends`);
  }
  for (const p of k.perayaan)
    for (const h of [...p.days, ...p.extra.A, ...p.extra.B])
      if (!iso.test(h.date) || !h.date.startsWith(String(k.year))) throw new Error(`${k.year} ${p.name} bad date ${h.date}`);
}

// Straight from the PDFs (docs/sources/kpm/).
const k26 = kalendarFor(2026)!;
eq(kumpulanOf("kedah", k26), "A", "Kedah = A (2026 p1)");
eq(kumpulanOf("johor", k26), "B", "Johor = B (2026 p2)");
eq(k26.blok.A[0].start, "2026-01-11", "2026 A start (p1)");
eq(k26.blok.B[0].start, "2026-01-12", "2026 B start (p2)");
eq(k26.blok.B[3], { kind: "cuti", name: "Cuti Pertengahan Tahun", start: "2026-05-23", end: "2026-06-07" }, "2026 B mid-year (p2)");
const k27 = kalendarFor(2027)!;
eq(k27.blok.A[7].start, "2027-12-03", "2027 A Cuti Akhir (p1)");
eq(k27.blok.B[1], { kind: "cuti", name: "Cuti Penggal 1", start: "2027-03-06", end: "2027-03-14" }, "2027 B Cuti Penggal 1 (p2)");
eq(k27.perayaan[0].extra.B.length, 5, "2027 TBC: 5 extra days for B (p3)");

// Next break on fixed dates.
eq(nextBreak("selangor", "2026-10-14"), { name: "Hari Deepavali", start: "2026-11-08", end: "2026-11-10", daysLeft: 25 }, "Selangor 14/10/2026");
eq(nextBreak("sarawak", "2026-10-14"), { name: "Hari Deepavali", start: "2026-11-09", end: "2026-11-09", daysLeft: 26 }, "Sarawak 14/10/2026 (no Deepavali PH)");
eq(nextBreak("kelantan", "2026-11-10"), { name: "Cuti Akhir Persekolahan", start: "2026-12-04", end: "2026-12-31", daysLeft: 24 }, "Kelantan 10/11/2026");
eq(nextBreak("perak", "2026-12-20")?.daysLeft, 0, "Perak mid Cuti Akhir");
eq(nextBreak("perak", "2027-01-01")?.name, "Tahun Baru Cina", "Perak 01/01/2027 -> TBC 2027");
eq(nextBreak("kedah", "2027-02-01")?.start, "2027-02-06", "Kedah TBC 2027 starts with the festival (no 08/02)");
eq(nextBreak("terengganu", "2027-02-01")?.start, "2027-02-06", "Terengganu TBC 2027");
eq(nextBreak("johor", "2027-02-01")?.start, "2027-02-05", "Johor TBC 2027 from 05/02");
eq(nextBreak("johor", "2028-01-01"), null, "past the last published year");
// Sabah/Labuan Kaamatan has no extra day, so it is not a break of its own.
if (breaksFor("sabah").some((b) => b.name === "Pesta Kaamatan")) throw new Error("Kaamatan is inside the mid-year holiday");

console.log("check-takwim-sekolah: ok", TAKWIM.map((k) => k.year).join(", "), "-", breaksFor("selangor").length, "breaks for Selangor");
