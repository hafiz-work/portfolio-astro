/**
 * Kadar LKM (lesen kenderaan motor / cukai jalan) - hand-copied from JPJ's own guides,
 * checked 2026-10-14. Amounts in sen. Copies + sha256 in docs/sources/jpj/ (SHA256SUMS).
 *
 * A: "Garis Panduan Pengiraan Kadar LKM ... (Pindaan Selepas Bajet 2009)"
 *    https://www.jpj.gov.my/wp-content/uploads/2026/07/Lampiran-A-Garis_Panduan_Pengiraan_LKM_Bajet_20092-2.pdf
 *    sha256 b6dafdc679173704fcee446b9b9b84e2ce8afdff79529d3158a590788b4dbbdf
 * B: "Garis Panduan Kadar LKM Bagi Kenderaan Motor Elektrik (ZEVs)", Surat Pekeliling
 *    Bahagian Pelesenan Kenderaan Bil. 01/2026, 1 April 2026
 *    https://www.jpj.gov.my/wp-content/uploads/2026/07/Lampiran-B-01.04.2026-Garis-Panduan-Kadar-LKM-Bagi-Kenderaan-Motor-Elektrik-ZEVs.pdf
 *    sha256 39df18d4264316c7fcd35981c34891e8cb66b85e0be40e0e81379d579f2a484e
 * Both linked from https://www.jpj.gov.my/pusat-media-3/informasi-perkhidmatan-jpj/kenderaan/panduan-pengiraan-kadar-lkm/
 * (The "Kadar Bayaran Pelesenan Kenderaan" page lists registration fees only - no LKM rates.)
 *
 * Left out on purpose (JPJ's guide gives no figure, or the case is outside v1):
 * - motorcycles 150cc and below: "dikekalkan pada kadar sedia ada" (A p1, p14, p18, p29) - rate not printed;
 * - Sabah non-saloon diesel 4WD: "dikekalkan pada kadar sedia ada" (A p20 iii);
 * - hybrids: neither guide mentions them;
 * - goods/commercial, public service, trailer, driving school, e-hailing, government use codes.
 */

/** A band runs up to `max` (inclusive; null = no cap). `sen` is the flat rate, or the
 *  "Kadar Asas" when `per` is set: + `per` sen for every unit above the previous band's max.
 *  `sen: null` = JPJ says "kadar sedia ada" without printing it. */
export interface Band {
  max: number | null;
  sen: number | null;
  per?: number;
}
export interface Table {
  ref: string;
  unit: "cc" | "W";
  bands: Band[];
}

const flat = (max: number | null, rm: number): Band => ({ max, sen: rm * 100 });
const prog = (max: number | null, rm: number, perSen: number): Band => ({ max, sen: rm * 100, per: perSen });

// Semenanjung Malaysia ----------------------------------------------------------
export const SM_MOTOSIKAL: Table = {
  ref: "Garis panduan petrol/diesel, ms 1 (1.1.1)",
  unit: "cc",
  bands: [{ max: 150, sen: null }, flat(200, 30), flat(250, 50), flat(500, 180), flat(800, 250), flat(null, 350)],
};
export const SM_SALOON_INDIVIDU: Table = {
  ref: "Garis panduan petrol/diesel, ms 1-2 (1.1.2, kod AB)",
  unit: "cc",
  bands: [flat(1000, 20), flat(1200, 55), flat(1400, 70), flat(1600, 90),
    prog(1800, 200, 40), prog(2000, 280, 50), prog(2500, 380, 100), prog(3000, 880, 250), prog(null, 2130, 450)],
};
export const SM_SALOON_SYARIKAT: Table = {
  ref: "Garis panduan petrol/diesel, ms 2 (1.1.3, kod AC)",
  unit: "cc",
  bands: [flat(1000, 20), flat(1200, 110), flat(1400, 140), flat(1600, 180),
    prog(1800, 400, 80), prog(2000, 560, 100), prog(2500, 760, 300), prog(3000, 2260, 750), prog(null, 6010, 1350)],
};
export const SM_BUKAN_SALOON: Table = {
  ref: "Garis panduan petrol/diesel, ms 3 (1.1.4, kod AD/AE)",
  unit: "cc",
  bands: [flat(1000, 20), flat(1200, 85), flat(1400, 100), flat(1600, 120),
    prog(1800, 300, 30), prog(2000, 360, 40), prog(2500, 440, 80), prog(3000, 840, 160), prog(null, 1640, 160)],
};

// Sabah (Sarawak prints the same figures: A p29-30, 3.1-3.3) ---------------------
export const SABAH_MOTOSIKAL: Table = {
  ref: "Garis panduan petrol/diesel, ms 18 (2.1.1)",
  unit: "cc",
  bands: [{ max: 150, sen: null }, flat(200, 9), flat(250, 12), flat(500, 30), flat(800, 40), flat(null, 42)],
};
export const SABAH_SALOON: Table = {
  ref: "Garis panduan petrol/diesel, ms 18-19 (2.1.2, kod AB/AC)",
  unit: "cc",
  bands: [flat(1000, 20), flat(1200, 44), flat(1400, 56), flat(1600, 72),
    prog(1800, 160, 32), prog(2000, 224, 25), prog(2500, 274, 50), prog(3000, 524, 100), prog(null, 1024, 135)],
};
export const SABAH_BUKAN_SALOON: Table = {
  ref: "Garis panduan petrol/diesel, ms 19 (2.1.3, kod AD/AE)",
  unit: "cc",
  bands: [flat(1000, 20), flat(1200, 42.5), flat(1400, 50), flat(1600, 60),
    prog(1800, 165, 17), prog(2000, 199, 22), prog(2500, 243, 44), prog(3000, 463, 88), prog(null, 903, 120)],
};
export const SARAWAK_MOTOSIKAL: Table = { ...SABAH_MOTOSIKAL, ref: "Garis panduan petrol/diesel, ms 29 (3.1)" };
export const SARAWAK_SALOON: Table = { ...SABAH_SALOON, ref: "Garis panduan petrol/diesel, ms 29-30 (3.2, kod AB/AC)" };
export const SARAWAK_BUKAN_SALOON: Table = { ...SABAH_BUKAN_SALOON, ref: "Garis panduan petrol/diesel, ms 30 (3.3, kod AD/AE)" };

// Pulau Langkawi & Pulau Pangkor (A p14, 1.2.1-1.2.4) and Labuan (A p25, 2.2.1-2.2.3):
// motorcycles >150cc and cars >1000cc pay 50% of the Semenanjung / Sabah petrol rate;
// cars 1000cc and below a flat RM20.
export const ISLAND_SMALL_CAR_SEN = 2000;

// Electric (ZEV), B - same rates in Semenanjung, Sabah and Sarawak ----------------
export const EV_MOTOSIKAL: Table = {
  ref: "Garis panduan ZEV, ms 1 (1.1-1.3)",
  unit: "W",
  bands: [flat(7500, 2), flat(10000, 9), flat(12500, 12), flat(25000, 30), flat(40000, 40), flat(null, 42)],
};
/** B 1.3: "Pengecualian 50% daripada kadar asas" - applies to the 1.2 bands (above 7,500 W). */
export const EV_MOTOSIKAL_FLAT_MAX = 7500;

// B p1-3 (2.1, kod AB/AC/AD/AE/AH): [max watt, sen]. B prints the last band as
// "Melebihi 1,010,001"; read as everything from 1,010,001 W up.
const EV_CAR_ROWS: [number, number][] = [
  [50000, 2000], [60000, 3000], [70000, 4000], [80000, 5000], [90000, 6000], [100000, 7000],
  [110000, 8000], [120000, 10000], [130000, 12000], [140000, 14000], [150000, 16000], [160000, 18000],
  [170000, 20000], [180000, 22000], [190000, 24000], [200000, 26000], [210000, 28000], [220000, 30500],
  [230000, 33500], [240000, 36500], [250000, 39500], [260000, 42500], [270000, 45500], [280000, 48500],
  [290000, 51500], [300000, 54500], [310000, 57500], [320000, 61500], [330000, 66500], [340000, 71500],
  [350000, 76500], [360000, 81500], [370000, 86500], [380000, 91500], [390000, 96500], [400000, 101500],
  [410000, 106500], [420000, 114000], [430000, 124000], [440000, 134000], [450000, 144000], [460000, 154000],
  [470000, 164000], [480000, 174000], [490000, 184000], [500000, 194000], [510000, 204000], [520000, 216500],
  [530000, 231500], [540000, 246500], [550000, 261500], [560000, 276500], [570000, 291500], [580000, 306500],
  [590000, 321500], [600000, 336500], [610000, 351500], [620000, 369000], [630000, 389000], [640000, 409000],
  [650000, 429000], [660000, 449000], [670000, 469000], [680000, 489000], [690000, 509000], [700000, 529000],
  [710000, 549000], [720000, 571500], [730000, 596500], [740000, 621500], [750000, 646500], [760000, 671500],
  [770000, 696500], [780000, 721500], [790000, 746500], [800000, 771500], [810000, 796500], [820000, 824000],
  [830000, 854000], [840000, 884000], [850000, 914000], [860000, 944000], [870000, 974000], [880000, 1004000],
  [890000, 1034000], [900000, 1064000], [910000, 1094000], [920000, 1126500], [930000, 1161500], [940000, 1196500],
  [950000, 1231500], [960000, 1266500], [970000, 1301500], [980000, 1336500], [990000, 1371500], [1000000, 1406500],
  [1010000, 1441500],
];
export const EV_CAR: Table = {
  ref: "Garis panduan ZEV, ms 1-3 (2.1)",
  unit: "W",
  bands: [...EV_CAR_ROWS.map(([max, sen]) => ({ max, sen })), { max: null, sen: 2000000 }],
};
// B p7 §12: Langkawi and Labuan pay 50%. Pulau Pangkor is not named for ZEVs.
