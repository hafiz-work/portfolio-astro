// bun scripts/check-pcb.ts - PCB (MTD) against the worked examples in LHDN's 2026 specification
// (docs/sources/pcb/spesifikasi-pcb-2026.pdf). "p." = PDF page (the printed page number is one less).
// Every expected value below is printed in the PDF; none is computed here.
import { expect } from "bun:test";
import { naik5sen, pcb, pcbBukanPemastautin, selepasZakat } from "../src/lib/pcb";

// Exhibit 5 (p.46-47): category 3, 3 children, RM5,500 a month, EPF RM605, no TP1 deductions.
const ex5 = { gajiSen: 550_000, kwspSen: 60_500, kategori: 3 as const, anak: { biasa: 3 } };
const jan = pcb({ ...ex5, bulan: 1 }); // p.46
expect(jan.n, "Jan n").toBe(11);
expect(jan.K2, "Jan K2 (RM308.63)").toBe(30_863);
expect(jan.P, "Jan P (RM47,000.07)").toBe(4_700_007);
expect(jan.M, "Jan M").toBe(3_500_000);
expect(jan.R, "Jan R").toBe(6);
expect(jan.B, "Jan B").toBe(60_000);
expect(jan.pcbSen, "Jan MTD (RM110.00)").toBe(11_000);
const feb = pcb({ ...ex5, bulan: 2 }); // p.47 - X = January's RM110 comes from the month loop
expect(feb.n, "Feb n").toBe(10);
expect(feb.K, "Feb K").toBe(60_500);
expect(feb.X, "Feb X").toBe(11_000);
expect(feb.K2, "Feb K2 (RM279.00)").toBe(27_900);
expect(feb.P, "Feb P (RM47,000.00)").toBe(4_700_000);
expect(feb.pcbSen, "Feb MTD (RM110)").toBe(11_000);
// March onwards in Exhibit 5 use TP1 deductions (LP), cut from v1 - not testable here.

// Non-resident (p.10): RM3,000 x 30% = RM900.00.
expect(pcbBukanPemastautin(300_000), "non-resident RM3,000").toBe(90_000);

// Term 2 (p.20): round up to the next 5 sen.
expect(naik5sen(28_702), "287.02 -> 287.05").toBe(28_705);
expect(naik5sen(15_206), "152.06 -> 152.10").toBe(15_210);
expect(naik5sen(11_000), "110.00 stays").toBe(11_000);

// Terms 3-5 (p.20-21), table 5(i): MTD before zakat < RM10 is not deducted; net after zakat < RM10 is.
expect(selepasZakat(800, 500), "5(i)a 8.00 - 5.00").toBe(0);
expect(selepasZakat(1_500, 2_000), "5(i)b 15.00 - 20.00").toBe(0);
expect(selepasZakat(1_500, 800), "5(i)c 15.00 - 8.00").toBe(700);
expect(selepasZakat(12_000, 10_000), "5(i)d 120.00 - 100.00").toBe(2_000);

console.log("check-pcb: ok", `Jan RM${jan.pcbSen / 100}`, `Feb RM${feb.pcbSen / 100}`);
