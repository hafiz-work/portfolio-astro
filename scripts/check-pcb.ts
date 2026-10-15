// bun scripts/check-pcb.ts - PCB (MTD) against the worked examples in LHDN's 2026 specification
// (docs/sources/pcb/spesifikasi-pcb-2026.pdf). "p." = PDF page (the printed page number is one less).
// Every expected value below is printed in the PDF; none is computed here.
import { naik5sen, pcb, pcbBukanPemastautin, selepasZakat } from "../src/lib/pcb";

const eq = (got: unknown, want: unknown, what: string) => {
  if (got !== want) throw new Error(`${what}: got ${got}, want ${want}`);
};

// Exhibit 5 (p.46-47): category 3, 3 children, RM5,500 a month, EPF RM605, no TP1 deductions.
const ex5 = { gajiSen: 550_000, kwspSen: 60_500, kategori: 3 as const, anak: { biasa: 3 } };
const jan = pcb({ ...ex5, bulan: 1 }); // p.46
eq(jan.n, 11, "Jan n");
eq(jan.K2, 30_863, "Jan K2 (RM308.63)");
eq(jan.P, 4_700_007, "Jan P (RM47,000.07)");
eq(jan.M, 3_500_000, "Jan M");
eq(jan.R, 6, "Jan R");
eq(jan.B, 60_000, "Jan B");
eq(jan.pcbSen, 11_000, "Jan MTD (RM110.00)");
const feb = pcb({ ...ex5, bulan: 2 }); // p.47 - X = January's RM110 comes from the month loop
eq(feb.n, 10, "Feb n");
eq(feb.K, 60_500, "Feb K");
eq(feb.X, 11_000, "Feb X");
eq(feb.K2, 27_900, "Feb K2 (RM279.00)");
eq(feb.P, 4_700_000, "Feb P (RM47,000.00)");
eq(feb.pcbSen, 11_000, "Feb MTD (RM110)");
// March onwards in Exhibit 5 use TP1 deductions (LP), cut from v1 - not testable here.

// Non-resident (p.10): RM3,000 x 30% = RM900.00.
eq(pcbBukanPemastautin(300_000), 90_000, "non-resident RM3,000");

// Term 2 (p.20): round up to the next 5 sen.
eq(naik5sen(28_702), 28_705, "287.02 -> 287.05");
eq(naik5sen(15_206), 15_210, "152.06 -> 152.10");
eq(naik5sen(11_000), 11_000, "110.00 stays");

// Terms 3-5 (p.20-21), table 5(i): MTD before zakat < RM10 is not deducted; net after zakat < RM10 is.
eq(selepasZakat(800, 500), 0, "5(i)a 8.00 - 5.00");
eq(selepasZakat(1_500, 2_000), 0, "5(i)b 15.00 - 20.00");
eq(selepasZakat(1_500, 800), 700, "5(i)c 15.00 - 8.00");
eq(selepasZakat(12_000, 10_000), 2_000, "5(i)d 120.00 - 100.00");

console.log("check-pcb: ok", `Jan RM${jan.pcbSen / 100}`, `Feb RM${feb.pcbSen / 100}`);
