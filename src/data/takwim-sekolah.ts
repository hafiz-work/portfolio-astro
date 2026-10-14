// KPM Kalendar Akademik (school calendar), typed by hand from KPM's own PDFs - never
// from blogs/news. Source page: https://www.moe.gov.my/kalendar-akademik-semasa
// (linked from https://www.moe.gov.my/takwim). Checked 2026-10-14.
//
// 2026: https://www.moe.gov.my/storage/files/shares/Takwim/Takwim%20Persekolahan/Kalendar%20Akademik%202026.pdf
//   sha256 bea2dfb6fd91df64d3a6ac37a464d1ff165293b379651afc71d46e2ead697eb1
//   p1 Lampiran A (Kumpulan A), p2 Lampiran B (Kumpulan B), p3 Lampiran C (cuti perayaan).
// 2027: https://www.moe.gov.my/storage/files/shares/Takwim/Takwim%20Persekolahan/Kalendar%20Akademik%20Tahun%202027.pdf
//   sha256 7d676a96fb1ca3c132cd066e8039d80d19a66c3a9891316ffd6b37d201395e03
//   (scanned) p1 Lampiran A, p2 Lampiran B, p3-p4 Lampiran C (cuti perayaan + catatan).
// Copies in docs/sources/kpm/. Update once a year when KPM publishes the next year.
// Check: bun scripts/check-takwim-sekolah.ts

export type Kumpulan = "A" | "B";

export const NEGERI = [
  { id: "johor", name: "Johor" },
  { id: "kedah", name: "Kedah" },
  { id: "kelantan", name: "Kelantan" },
  { id: "melaka", name: "Melaka" },
  { id: "negeri-sembilan", name: "Negeri Sembilan" },
  { id: "pahang", name: "Pahang" },
  { id: "perak", name: "Perak" },
  { id: "perlis", name: "Perlis" },
  { id: "pulau-pinang", name: "Pulau Pinang" },
  { id: "sabah", name: "Sabah" },
  { id: "sarawak", name: "Sarawak" },
  { id: "selangor", name: "Selangor" },
  { id: "terengganu", name: "Terengganu" },
  { id: "kuala-lumpur", name: "WP Kuala Lumpur" },
  { id: "labuan", name: "WP Labuan" },
  { id: "putrajaya", name: "WP Putrajaya" },
] as const;

export type NegeriId = (typeof NEGERI)[number]["id"];

/** One block of the year, in order: school weeks and school holidays alternate. */
export interface Blok {
  kind: "sekolah" | "cuti";
  name: string;
  start: string;
  end: string;
}

/** A day that may apply to some states only (`only`) or all but some (`except`). */
export interface Hari {
  date: string;
  only?: NegeriId[];
  except?: NegeriId[];
}

export interface Perayaan {
  name: string;
  /** The festival's own (public holiday) days. */
  days: Hari[];
  /** KPM's extra school holidays per group (Tambahan Cuti Perayaan). */
  extra: Record<Kumpulan, Hari[]>;
  /** KPM's "Catatan" (festival falls inside a school holiday). */
  note?: string;
}

export interface Kalendar {
  year: number;
  kumpulan: Record<Kumpulan, NegeriId[]>;
  blok: Record<Kumpulan, Blok[]>;
  perayaan: Perayaan[];
}

const A: NegeriId[] = ["kedah", "kelantan", "terengganu"];
const B: NegeriId[] = [
  "johor", "melaka", "negeri-sembilan", "pahang", "perak", "perlis", "pulau-pinang",
  "sabah", "sarawak", "selangor", "kuala-lumpur", "labuan", "putrajaya",
];

export const TAKWIM: Kalendar[] = [
  {
    year: 2026,
    kumpulan: { A, B },
    blok: {
      // p1
      A: [
        { kind: "sekolah", name: "Penggal 1", start: "2026-01-11", end: "2026-03-19" },
        { kind: "cuti", name: "Cuti Penggal 1", start: "2026-03-20", end: "2026-03-28" },
        { kind: "sekolah", name: "Penggal 1", start: "2026-03-29", end: "2026-05-21" },
        { kind: "cuti", name: "Cuti Pertengahan Tahun", start: "2026-05-22", end: "2026-06-06" },
        { kind: "sekolah", name: "Penggal 2", start: "2026-06-07", end: "2026-08-27" },
        { kind: "cuti", name: "Cuti Penggal 2", start: "2026-08-28", end: "2026-09-05" },
        { kind: "sekolah", name: "Penggal 2", start: "2026-09-06", end: "2026-12-03" },
        { kind: "cuti", name: "Cuti Akhir Persekolahan", start: "2026-12-04", end: "2026-12-31" },
      ],
      // p2
      B: [
        { kind: "sekolah", name: "Penggal 1", start: "2026-01-12", end: "2026-03-20" },
        { kind: "cuti", name: "Cuti Penggal 1", start: "2026-03-21", end: "2026-03-29" },
        { kind: "sekolah", name: "Penggal 1", start: "2026-03-30", end: "2026-05-22" },
        { kind: "cuti", name: "Cuti Pertengahan Tahun", start: "2026-05-23", end: "2026-06-07" },
        { kind: "sekolah", name: "Penggal 2", start: "2026-06-08", end: "2026-08-28" },
        { kind: "cuti", name: "Cuti Penggal 2", start: "2026-08-29", end: "2026-09-06" },
        { kind: "sekolah", name: "Penggal 2", start: "2026-09-07", end: "2026-12-04" },
        { kind: "cuti", name: "Cuti Akhir Persekolahan", start: "2026-12-05", end: "2026-12-31" },
      ],
    },
    // p3
    perayaan: [
      {
        name: "Tahun Baru Cina",
        days: [{ date: "2026-02-17" }, { date: "2026-02-18" }],
        extra: {
          A: [{ date: "2026-02-15" }, { date: "2026-02-16" }, { date: "2026-02-19" }],
          B: [{ date: "2026-02-16" }, { date: "2026-02-19" }, { date: "2026-02-20" }],
        },
      },
      {
        name: "Hari Raya Aidilfitri",
        days: [{ date: "2026-03-21" }, { date: "2026-03-22" }],
        extra: { A: [{ date: "2026-03-19" }], B: [{ date: "2026-03-19" }, { date: "2026-03-20" }] },
        note: "Dalam Cuti Penggal 1",
      },
      { name: "Pesta Kaamatan", days: [{ date: "2026-05-30", only: ["sabah", "labuan"] }, { date: "2026-05-31", only: ["sabah", "labuan"] }], extra: { A: [], B: [] }, note: "Dalam Cuti Pertengahan Tahun" },
      { name: "Hari Gawai Dayak", days: [{ date: "2026-06-01", only: ["sarawak"] }, { date: "2026-06-02", only: ["sarawak"] }], extra: { A: [], B: [] }, note: "Dalam Cuti Pertengahan Tahun" },
      {
        name: "Hari Deepavali",
        days: [{ date: "2026-11-08", except: ["sarawak"] }],
        extra: {
          A: [{ date: "2026-11-09" }],
          B: [{ date: "2026-11-10", except: ["sarawak"] }, { date: "2026-11-09", only: ["sarawak"] }],
        },
      },
      { name: "Hari Krismas", days: [{ date: "2026-12-25" }], extra: { A: [], B: [] }, note: "Dalam Cuti Akhir Persekolahan" },
    ],
  },
  {
    year: 2027,
    kumpulan: { A, B },
    blok: {
      // p1
      A: [
        { kind: "sekolah", name: "Penggal 1", start: "2027-01-04", end: "2027-03-04" },
        { kind: "cuti", name: "Cuti Penggal 1", start: "2027-03-05", end: "2027-03-13" },
        { kind: "sekolah", name: "Penggal 1", start: "2027-03-14", end: "2027-05-20" },
        { kind: "cuti", name: "Cuti Pertengahan Tahun", start: "2027-05-21", end: "2027-06-05" },
        { kind: "sekolah", name: "Penggal 2", start: "2027-06-06", end: "2027-08-26" },
        { kind: "cuti", name: "Cuti Penggal 2", start: "2027-08-27", end: "2027-09-04" },
        { kind: "sekolah", name: "Penggal 2", start: "2027-09-05", end: "2027-12-02" },
        { kind: "cuti", name: "Cuti Akhir Persekolahan", start: "2027-12-03", end: "2027-12-31" },
      ],
      // p2
      B: [
        { kind: "sekolah", name: "Penggal 1", start: "2027-01-04", end: "2027-03-05" },
        { kind: "cuti", name: "Cuti Penggal 1", start: "2027-03-06", end: "2027-03-14" },
        { kind: "sekolah", name: "Penggal 1", start: "2027-03-15", end: "2027-05-21" },
        { kind: "cuti", name: "Cuti Pertengahan Tahun", start: "2027-05-22", end: "2027-06-06" },
        { kind: "sekolah", name: "Penggal 2", start: "2027-06-07", end: "2027-08-27" },
        { kind: "cuti", name: "Cuti Penggal 2", start: "2027-08-28", end: "2027-09-05" },
        { kind: "sekolah", name: "Penggal 2", start: "2027-09-06", end: "2027-12-03" },
        { kind: "cuti", name: "Cuti Akhir Persekolahan", start: "2027-12-04", end: "2027-12-31" },
      ],
    },
    // p3-p4
    perayaan: [
      {
        name: "Tahun Baru Cina",
        days: [{ date: "2027-02-06" }, { date: "2027-02-07" }],
        extra: {
          A: [{ date: "2027-02-08", only: ["kelantan", "terengganu"] }, { date: "2027-02-09" }, { date: "2027-02-10" }, { date: "2027-02-11" }],
          B: [{ date: "2027-02-05" }, { date: "2027-02-09" }, { date: "2027-02-10" }, { date: "2027-02-11" }, { date: "2027-02-12" }],
        },
      },
      {
        name: "Hari Raya Aidilfitri",
        days: [{ date: "2027-03-10" }, { date: "2027-03-11" }],
        extra: { A: [{ date: "2027-03-14" }], B: [] },
        note: "Dalam Cuti Penggal 1",
      },
      {
        name: "Hari Raya Aidiladha",
        days: [{ date: "2027-05-17" }, { date: "2027-05-18", only: ["kelantan", "terengganu"] }],
        extra: {
          A: [{ date: "2027-05-16" }, { date: "2027-05-18", only: ["kedah"] }, { date: "2027-05-19" }],
          B: [{ date: "2027-05-18" }, { date: "2027-05-19" }],
        },
      },
      { name: "Hari Wesak", days: [{ date: "2027-05-20" }], extra: { A: [], B: [{ date: "2027-05-21" }] } },
      { name: "Pesta Kaamatan", days: [{ date: "2027-05-30", only: ["sabah", "labuan"] }, { date: "2027-05-31", only: ["sabah", "labuan"] }], extra: { A: [], B: [] }, note: "Dalam Cuti Pertengahan Tahun" },
      { name: "Hari Gawai Dayak", days: [{ date: "2027-06-01", only: ["sarawak"] }, { date: "2027-06-02", only: ["sarawak"] }], extra: { A: [], B: [] }, note: "Dalam Cuti Pertengahan Tahun" },
      {
        name: "Hari Deepavali",
        days: [{ date: "2027-10-28", except: ["sarawak"] }],
        extra: {
          A: [{ date: "2027-10-27" }],
          B: [{ date: "2027-10-27", except: ["sarawak"] }, { date: "2027-10-29", except: ["sarawak"] }, { date: "2027-10-28", only: ["sarawak"] }],
        },
      },
      { name: "Hari Krismas", days: [{ date: "2027-12-25" }], extra: { A: [], B: [] }, note: "Dalam Cuti Akhir Persekolahan" },
    ],
  },
];
