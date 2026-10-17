// bun scripts/check-kwsp.ts - KWSP contributions vs the Third Schedule PDF (October 2025 wages).
import { expect } from "bun:test";
import { THIRD_SCHEDULE } from "../src/data/kwsp/2025-10";
import { caruman } from "../src/lib/kwsp";

const rm = (n: number) => Math.round(n * 100);
const sen = (r: ReturnType<typeof caruman>) => [r.bahagian, r.majikan, r.pekerja];

// Rows read off the PDF (2026-10-14).
expect(sen(caruman(rm(10), "warganegara", false)), "A RM10 = NIL").toEqual(["A", 0, 0]);
expect(sen(caruman(rm(10.01), "warganegara", false)), "A RM10.01").toEqual(["A", 300, 300]);
expect(sen(caruman(rm(5000), "warganegara", false)), "A RM5,000 (13%)").toEqual(["A", 65000, 55000]);
expect(sen(caruman(rm(5000.01), "pr", false)), "A RM5,000.01 (12%)").toEqual(["A", 61200, 56100]);
expect(sen(caruman(rm(5500), "warganegara", false)), "A RM5,500 (LHDN Exhibit 5 KWSP)").toEqual(["A", 66000, 60500]);
expect(sen(caruman(rm(20000), "warganegara", false)), "A RM20,000").toEqual(["A", 240000, 220000]);
expect(sen(caruman(rm(5000), "pr", true)), "C RM5,000").toEqual(["C", 32500, 27500]);
expect(sen(caruman(rm(20000), "warganegara", true)), "E RM20,000").toEqual(["E", 80000, 0]);
// Above RM20,000: 12% / 11% of wages, rounded up to the ringgit.
expect(sen(caruman(rm(25000), "warganegara", false)), "A RM25,000").toEqual(["A", 300000, 275000]);
expect(sen(caruman(rm(20000.01), "warganegara", false)), "A RM20,000.01").toEqual(["A", 240100, 220100]);
expect(sen(caruman(rm(3000), "asing", false)), "F RM3,000").toEqual(["F", 6000, 6000]);
expect(sen(caruman(rm(3010), "asing", true)), "F RM3,010 rounds up").toEqual(["F", 6100, 6100]);
// Part F total = 4% of wages rounded up once (RM61), not the two rounded-up shares (RM62).
expect(caruman(rm(1525), "asing", false).jumlah, "F RM1,525 total").toBe(6100);
expect(caruman(rm(5000), "warganegara", false).jumlah, "A RM5,000 total").toBe(120000);

// Every band = each share of the band's upper bound rounded up to the ringgit - the rule
// lib/kwsp.ts follows above RM20,000. A/C rates drop at RM5,000.
const rates = { A: [[1300, 1100], [1200, 1100]], C: [[650, 550], [600, 550]], E: [[400, 0], [400, 0]] };
for (const [part, rows] of Object.entries(THIRD_SCHEDULE)) {
  let prev = 0;
  for (const [hulu, er, ee] of rows) {
    if (prev >= 1000) {
      const [rer, ree] = rates[part as keyof typeof rates][hulu > 500_000 ? 1 : 0];
      const up = (bp: number) => Math.ceil((hulu * bp) / 1_000_000) * 100;
      expect([er, ee], `Part ${part} band to ${hulu / 100}`).toEqual([up(rer), up(ree)]);
    }
    prev = hulu;
  }
}
console.log("check-kwsp: ok", Object.entries(THIRD_SCHEDULE).map(([p, r]) => `${p}:${r.length}`).join(" "));
