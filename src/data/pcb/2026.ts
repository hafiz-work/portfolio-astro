// PCB (MTD) 2026 - hand-copied from LHDN, "Specification for Monthly Tax Deduction (MTD) Calculations
// Using Computerized Calculation for 2026" (updated 01 January 2026), saved at
// docs/sources/pcb/spesifikasi-pcb-2026.pdf. Page numbers are PDF pages (printed number = PDF page - 1).
// Amounts in RM as printed; src/lib/pcb.ts converts to sen.
export const PCB_2026 = {
  tahun: 2026,
  url: "https://www.hasil.gov.my/wp-content/uploads/spesifikasi-kaedah-pengiraan-berkomputer-pcb-2026.pdf",
  sha256: "a1618051c858393d92d868c9975c183309d3d07e48f0e4f0cdef589f45f5800c",
  // Table 1 (p.12): [M, R %, B category 1 & 3, B category 2]. A row applies when P > M;
  // P of RM5,000 or less has no row, so no tax.
  jadual1: [
    [5_000, 1, -400, -800],
    [20_000, 3, -250, -650],
    [35_000, 6, 600, 600],
    [50_000, 11, 1_500, 1_500],
    [70_000, 19, 3_700, 3_700],
    [100_000, 25, 9_400, 9_400],
    [400_000, 26, 84_400, 84_400],
    [600_000, 28, 136_400, 136_400],
    [2_000_000, 30, 528_400, 528_400],
  ] as [number, number, number, number][],
  D: 9_000, // individual (p.27)
  S: 4_000, // husband / wife, category 2 only (p.12, p.27)
  DU: 7_000, // disabled individual (p.29)
  SU: 6_000, // disabled husband / wife (p.29)
  Q: 2_000, // per qualifying child (p.27)
  // Child counted as this many children (p.28): 18+ studying diploma+ in Malaysia / degree+ abroad,
  // disabled, disabled and studying diploma+ (Malaysia) / degree+ (abroad).
  anak: { biasa: 1, ipt: 4, oku: 4, okuIpt: 8 },
  hadKwsp: 4_000, // EPF qualifying amount per year (p.11, p.28)
  kadarBukanPemastautin: 30, // % of remuneration (p.10)
};
