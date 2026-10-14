/**
 * TNB domestic tariff (Peninsular Malaysia), Tarif Domestik Am, effective 1 July 2025.
 * Hand-copied - every number below comes from an official TNB document. Copies + sha256 in
 * docs/sources/tnb/SHA256SUMS. Checked 2026-10-14. Check: bun scripts/check-bil-elektrik.ts
 *
 * - Tariff schedule: "Guide to Electricity Tariff", https://www.mytnb.com.my/tariff/PDF/guide-to-electricity-tariff.pdf
 *   (sha256 13e3ec6f…e2d5): schedule printed p.38 (PDF p.40), EEI table p.16 (PDF p.18),
 *   AFA p.20 (PDF p.22), KWTBB + service tax p.22 (PDF p.24), sample bill p.29 (PDF p.31).
 * - Worked bills: https://www.mytnb.com.my/tariff/PDF/fahami-guna-nikmati-penggunaan-{300,600,1000,1501}-kwj.pdf
 * - 800 kWh protection for usage Sep-Dec 2026: TNB press release S.A. 2026/09/18_24,
 *   https://www.tnb.com.my/assets/press_releases/20260918_24_bm.pdf (sha256 01346968…d904), p.1.
 * - Rounding, the ST / non-ST split and the monthly AFA history: TNB's own bill calculator on
 *   https://www.mytnb.com.my/tariff (js/rates.js + js/calculator-newDomestic.js, v1.1.69).
 *   AFA for Oct 2026 also on https://www.singlebuyer.com.my/Generation-Info-Tariff/automatic-fuel-adjustment-(afa)
 *
 * Units: rates in 1/100 sen per kWh (27.03 sen = 2703) so every amount is integer maths; money in sen.
 */

export const TARIF_BERKUAT_KUASA = "2025-07-01";
export const TARIKH_SEMAK = "2026-10-14";

export const TARIF = {
  /** Energy charge: ≤ 1,500 kWh, and > 1,500 kWh (the higher rate then applies to every kWh). */
  tenaga: 2703,
  tenagaTinggi: 3703,
  hadTenagaTinggi: 1500,
  kapasiti: 455,
  rangkaian: 1285,
  /** Retail charge, sen/month; waived at or below the protection threshold. */
  runcit: 1000,
  /** KWTBB 1.6% (per mille x 10 = 16/1000), not charged at 300 kWh and below. */
  kwtbbPerSeribu: 16,
  hadKwtbb: 300,
  /** Service tax 8% on the part of the bill above the threshold. */
  cukaiPeratus: 8,
  /** Protection threshold: AFA, retail charge and service tax waived at or below it. */
  ambang: 600,
} as const;

/** Energy Efficiency Incentive (guide p.16), 1/100 sen per kWh, on the whole month's kWh. */
export const EEI: { hingga: number; kadar: number }[] = [
  { hingga: 200, kadar: -2500 },
  { hingga: 250, kadar: -2450 },
  { hingga: 300, kadar: -2250 },
  { hingga: 350, kadar: -2100 },
  { hingga: 400, kadar: -1700 },
  { hingga: 450, kadar: -1450 },
  { hingga: 500, kadar: -1200 },
  { hingga: 550, kadar: -1050 },
  { hingga: 600, kadar: -900 },
  { hingga: 650, kadar: -750 },
  { hingga: 700, kadar: -550 },
  { hingga: 750, kadar: -450 },
  { hingga: 800, kadar: -400 },
  { hingga: 850, kadar: -250 },
  { hingga: 900, kadar: -100 },
  { hingga: 1000, kadar: -50 },
];

/** Temporary higher threshold (press release 18 Sep 2026), by usage month, inclusive. */
export const AMBANG_SEMENTARA = { dari: "2026-09", hingga: "2026-12", kwh: 800 } as const;

/**
 * AFA by usage month, 1/100 sen per kWh (negative = rebate). From TNB's calculator (rates.js
 * FUEL_BY_MONTH); announced months only - its Nov 2026-Jan 2027 figures are forecasts and are
 * left out. Add a row when TNB announces the next month.
 */
export const AFA: Record<string, number> = {
  "2025-07": 0,
  "2025-08": -145,
  "2025-09": -110,
  "2025-10": -650,
  "2025-11": -891,
  "2025-12": -642,
  "2026-01": -499,
  "2026-02": -277,
  "2026-03": -215,
  "2026-04": -47,
  "2026-05": 138,
  "2026-06": 259,
  "2026-07": 359,
  "2026-08": 380,
  "2026-09": 367,
  "2026-10": 361,
};
