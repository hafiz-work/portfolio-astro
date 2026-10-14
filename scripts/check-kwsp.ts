// bun scripts/check-kwsp.ts - KWSP contributions vs the Third Schedule PDF (October 2025 wages).
import { THIRD_SCHEDULE } from "../src/data/kwsp/2025-10";
import { caruman } from "../src/lib/kwsp";

const eq = (got: unknown, want: unknown, what: string) => {
  if (JSON.stringify(got) !== JSON.stringify(want)) throw new Error(`${what}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
};
const rm = (n: number) => Math.round(n * 100);
const sen = (r: ReturnType<typeof caruman>) => [r.bahagian, r.majikan, r.pekerja];

// Rows read off the PDF (2026-10-14).
eq(sen(caruman(rm(10), "warganegara", false)), ["A", 0, 0], "A RM10 = NIL");
eq(sen(caruman(rm(10.01), "warganegara", false)), ["A", 300, 300], "A RM10.01");
eq(sen(caruman(rm(5000), "warganegara", false)), ["A", 65000, 55000], "A RM5,000 (13%)");
eq(sen(caruman(rm(5000.01), "pr", false)), ["A", 61200, 56100], "A RM5,000.01 (12%)");
eq(sen(caruman(rm(5500), "warganegara", false)), ["A", 66000, 60500], "A RM5,500 (LHDN Exhibit 5 KWSP)");
eq(sen(caruman(rm(20000), "warganegara", false)), ["A", 240000, 220000], "A RM20,000");
eq(sen(caruman(rm(5000), "pr", true)), ["C", 32500, 27500], "C RM5,000");
eq(sen(caruman(rm(20000), "warganegara", true)), ["E", 80000, 0], "E RM20,000");
// Above RM20,000: 12% / 11% of wages, rounded up to the ringgit.
eq(sen(caruman(rm(25000), "warganegara", false)), ["A", 300000, 275000], "A RM25,000");
eq(sen(caruman(rm(20000.01), "warganegara", false)), ["A", 240100, 220100], "A RM20,000.01");
eq(sen(caruman(rm(3000), "asing", false)), ["F", 6000, 6000], "F RM3,000");
eq(sen(caruman(rm(3010), "asing", true)), ["F", 6100, 6100], "F RM3,010 rounds up");
// Part F total = 4% of wages rounded up once (RM61), not the two rounded-up shares (RM62).
eq(caruman(rm(1525), "asing", false).jumlah, 6100, "F RM1,525 total");
eq(caruman(rm(5000), "warganegara", false).jumlah, 120000, "A RM5,000 total");

// Every band = each share of the band's upper bound rounded up to the ringgit - the rule
// lib/kwsp.ts follows above RM20,000. A/C rates drop at RM5,000.
const rates = { A: [[1300, 1100], [1200, 1100]], C: [[650, 550], [600, 550]], E: [[400, 0], [400, 0]] };
for (const [part, rows] of Object.entries(THIRD_SCHEDULE)) {
  let prev = 0;
  for (const [hulu, er, ee] of rows) {
    if (prev >= 1000) {
      const [rer, ree] = rates[part as keyof typeof rates][hulu > 500_000 ? 1 : 0];
      const up = (bp: number) => Math.ceil((hulu * bp) / 1_000_000) * 100;
      eq([er, ee], [up(rer), up(ree)], `Part ${part} band to ${hulu / 100}`);
    }
    prev = hulu;
  }
}
console.log("check-kwsp: ok", Object.entries(THIRD_SCHEDULE).map(([p, r]) => `${p}:${r.length}`).join(" "));
