// bun scripts/check-takwim-sekolah.ts - KPM school calendar data + next-break logic.
import { expect } from "bun:test";
import { NEGERI, TAKWIM } from "../src/data/takwim-sekolah";
import { addDays } from "../src/lib/date-my";
import { breaksFor, kalendarFor, kumpulanOf, nextBreak } from "../src/lib/takwim-sekolah";

const iso = /^\d{4}-\d{2}-\d{2}$/;

for (const k of TAKWIM) {
  // Every state in exactly one group.
  for (const n of NEGERI) {
    const hits = Number(k.kumpulan.A.includes(n.id)) + Number(k.kumpulan.B.includes(n.id));
    expect(hits, `${k.year} ${n.id} groups`).toBe(1);
  }
  expect(k.kumpulan.A.length + k.kumpulan.B.length, `${k.year} group sizes`).toBe(NEGERI.length);
  // Blocks: school/holiday alternate, each starts the day after the last ends, year ends 31/12.
  for (const g of ["A", "B"] as const) {
    const blok = k.blok[g];
    blok.forEach((b, i) => {
      expect(iso.test(b.start) && iso.test(b.end) && b.start <= b.end, `${k.year}${g} bad block ${b.name}`).toBe(true);
      if (i > 0) {
        expect(b.start, `${k.year}${g} ${b.name} contiguous`).toBe(addDays(blok[i - 1].end, 1));
        expect(b.kind, `${k.year}${g} ${b.name}: two ${b.kind} blocks in a row`).not.toBe(blok[i - 1].kind);
      }
    });
    expect(blok[0].kind, `${k.year}${g} starts with school`).toBe("sekolah");
    expect(blok.at(-1)!.end, `${k.year}${g} ends`).toBe(`${k.year}-12-31`);
  }
  for (const p of k.perayaan)
    for (const h of [...p.days, ...p.extra.A, ...p.extra.B])
      expect(iso.test(h.date) && h.date.startsWith(String(k.year)), `${k.year} ${p.name} bad date ${h.date}`).toBe(true);
}

// Straight from the PDFs (docs/sources/kpm/).
const k26 = kalendarFor(2026)!;
expect(kumpulanOf("kedah", k26), "Kedah = A (2026 p1)").toBe("A");
expect(kumpulanOf("johor", k26), "Johor = B (2026 p2)").toBe("B");
expect(k26.blok.A[0].start, "2026 A start (p1)").toBe("2026-01-11");
expect(k26.blok.B[0].start, "2026 B start (p2)").toBe("2026-01-12");
expect(k26.blok.B[3], "2026 B mid-year (p2)").toEqual({ kind: "cuti", name: "Cuti Pertengahan Tahun", start: "2026-05-23", end: "2026-06-07" });
const k27 = kalendarFor(2027)!;
expect(k27.blok.A[7].start, "2027 A Cuti Akhir (p1)").toBe("2027-12-03");
expect(k27.blok.B[1], "2027 B Cuti Penggal 1 (p2)").toEqual({ kind: "cuti", name: "Cuti Penggal 1", start: "2027-03-06", end: "2027-03-14" });
expect(k27.perayaan[0].extra.B.length, "2027 TBC: 5 extra days for B (p3)").toBe(5);

// Next break on fixed dates.
expect(nextBreak("selangor", "2026-10-14"), "Selangor 14/10/2026").toEqual({ name: "Hari Deepavali", start: "2026-11-08", end: "2026-11-10", daysLeft: 25 });
expect(nextBreak("sarawak", "2026-10-14"), "Sarawak 14/10/2026 (no Deepavali PH)").toEqual({ name: "Hari Deepavali", start: "2026-11-09", end: "2026-11-09", daysLeft: 26 });
expect(nextBreak("kelantan", "2026-11-10"), "Kelantan 10/11/2026").toEqual({ name: "Cuti Akhir Persekolahan", start: "2026-12-04", end: "2026-12-31", daysLeft: 24 });
expect(nextBreak("perak", "2026-12-20")?.daysLeft, "Perak mid Cuti Akhir").toBe(0);
expect(nextBreak("perak", "2027-01-01")?.name, "Perak 01/01/2027 -> TBC 2027").toBe("Tahun Baru Cina");
expect(nextBreak("kedah", "2027-02-01")?.start, "Kedah TBC 2027 starts with the festival (no 08/02)").toBe("2027-02-06");
expect(nextBreak("terengganu", "2027-02-01")?.start, "Terengganu TBC 2027").toBe("2027-02-06");
expect(nextBreak("johor", "2027-02-01")?.start, "Johor TBC 2027 from 05/02").toBe("2027-02-05");
expect(nextBreak("johor", "2028-01-01"), "past the last published year").toBeNull();
// Sabah/Labuan Kaamatan has no extra day, so it is not a break of its own.
expect(breaksFor("sabah").map((b) => b.name), "Kaamatan is inside the mid-year holiday").not.toContain("Pesta Kaamatan");

console.log("check-takwim-sekolah: ok", TAKWIM.map((k) => k.year).join(", "), "-", breaksFor("selangor").length, "breaks for Selangor");
