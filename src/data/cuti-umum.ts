// Hari Kelepasan Am (public holidays) per state, typed by hand from the Cabinet Division's own
// PDFs - never from blogs/news/calendar sites. Source page: https://www.kabinet.gov.my/hari-kelepasan-am/
// (Bahagian Kabinet, Perlembagaan dan Perhubungan Antara Kerajaan, JPM). Checked 2026-10-14.
//
// 2026: https://www.kabinet.gov.my/storage/2025/08/HKA-2026.pdf
//   sha256 415023261014e30880b0fbb7a40c47a9655605183ef976204489d760fed769a3
// 2027: https://www.kabinet.gov.my/storage/2026/08/HKA_2027.pdf
//   sha256 4b13d6b956ebba64e8ca80209f838439b2956a193fa37957e6446531752f96f9
// Both: p1 Persekutuan, p2-3 Negeri, p4-6 Persekutuan dan Negeri (the table typed here, one row each;
// a day that is (P) for some states and (N) for others is one row). "*" = "Tertakluk kepada
// perubahan" (p1, p3) -> `tentative`. The PDFs state no weekend pattern and no cuti ganti, so neither
// is here. Copies in docs/sources/kabinet/. Add next year when BKPP publishes it (around August).
// Check: bun scripts/check-cuti-umum.ts
import type { NegeriId } from "./takwim-sekolah";

export interface CutiUmum {
  date: string;
  name: string;
  /** Only these states (absent = every state). */
  only?: NegeriId[];
  /** Every state but these. */
  except?: NegeriId[];
  /** Marked "* Tertakluk kepada perubahan" in the PDF. */
  tentative?: true;
}

export interface TahunCuti {
  year: number;
  pdf: string;
  cuti: CutiUmum[];
}

const NO_NEW_YEAR: NegeriId[] = ["johor", "kedah", "kelantan", "perlis", "terengganu"];
const WP: NegeriId[] = ["kuala-lumpur", "labuan", "putrajaya"];
const ISRAK: NegeriId[] = ["kedah", "negeri-sembilan", "perlis", "terengganu"];
const THAIPUSAM: NegeriId[] = ["kuala-lumpur", "putrajaya", "johor", "negeri-sembilan", "perak", "pulau-pinang", "selangor"];
const NUZUL: NegeriId[] = [
  "kuala-lumpur", "labuan", "putrajaya", "kelantan", "pahang", "perak", "perlis", "pulau-pinang", "selangor", "terengganu",
];
const QURBAN_2: NegeriId[] = ["kedah", "kelantan", "perlis", "terengganu"];

export const CUTI_UMUM: TahunCuti[] = [
  {
    year: 2026,
    pdf: "https://www.kabinet.gov.my/storage/2025/08/HKA-2026.pdf",
    cuti: [
      // p4
      { date: "2026-01-01", name: "Tahun Baharu", except: NO_NEW_YEAR },
      { date: "2026-01-14", name: "Hari Keputeraan Yang di-Pertuan Besar Negeri Sembilan", only: ["negeri-sembilan"] },
      { date: "2026-01-17", name: "Israk dan Mikraj", only: ISRAK },
      { date: "2026-02-01", name: "Hari Wilayah Persekutuan", only: WP },
      { date: "2026-02-01", name: "Hari Thaipusam", only: THAIPUSAM },
      { date: "2026-02-17", name: "Tahun Baharu Cina" },
      { date: "2026-02-18", name: "Tahun Baharu Cina (Hari Kedua)" },
      { date: "2026-02-19", name: "Awal Ramadan", only: ["johor", "kedah"], tentative: true },
      { date: "2026-02-20", name: "Hari Pengisytiharan Tarikh Kemerdekaan", only: ["melaka"] },
      { date: "2026-03-04", name: "Hari Ulang Tahun Pertabalan Sultan Terengganu", only: ["terengganu"] },
      { date: "2026-03-07", name: "Hari Nuzul Al-Quran", only: NUZUL },
      { date: "2026-03-21", name: "Hari Raya Puasa", tentative: true },
      { date: "2026-03-22", name: "Hari Raya Puasa (Hari Kedua)", tentative: true },
      { date: "2026-03-23", name: "Hari Keputeraan Sultan Johor", only: ["johor"] },
      { date: "2026-03-23", name: "Hari Raya Puasa (Hari Ketiga)", only: ["melaka"] },
      { date: "2026-03-30", name: "Hari Jadi Yang di-Pertua Negeri Sabah", only: ["sabah"] },
      { date: "2026-04-03", name: "Good Friday", only: ["sabah", "sarawak"] },
      { date: "2026-04-26", name: "Hari Keputeraan Sultan Terengganu", only: ["terengganu"] },
      { date: "2026-05-01", name: "Hari Pekerja" },
      // p5
      { date: "2026-05-17", name: "Hari Ulang Tahun Keputeraan Raja Perlis", only: ["perlis"] },
      { date: "2026-05-22", name: "Hari Hol Almarhum Sultan Ahmad Shah Al-Musta'in Billah ibni Almarhum Sultan Abu Bakar", only: ["pahang"] },
      { date: "2026-05-26", name: "Hari Arafah", only: ["kelantan", "terengganu"] },
      { date: "2026-05-27", name: "Hari Raya Qurban", tentative: true },
      { date: "2026-05-28", name: "Hari Raya Qurban (Hari Kedua)", only: QURBAN_2, tentative: true },
      { date: "2026-05-30", name: "Pesta Kaamatan (Pesta Menuai)", only: ["labuan", "sabah"] },
      { date: "2026-05-31", name: "Hari Wesak" },
      { date: "2026-05-31", name: "Pesta Kaamatan (Pesta Menuai)", only: ["labuan", "sabah"] },
      { date: "2026-06-01", name: "Hari Keputeraan Rasmi Seri Paduka Baginda Yang di-Pertuan Agong" },
      { date: "2026-06-01", name: "Perayaan Hari Gawai Dayak", only: ["sarawak"] },
      { date: "2026-06-02", name: "Perayaan Hari Gawai Dayak", only: ["sarawak"] },
      { date: "2026-06-17", name: "Awal Muharam (Maal Hijrah)" },
      { date: "2026-06-21", name: "Hari Keputeraan Sultan Kedah", only: ["kedah"] },
      { date: "2026-07-07", name: "Hari Ulang Tahun Perisytiharan Tapak Warisan Dunia", only: ["pulau-pinang"] },
      { date: "2026-07-11", name: "Hari Jadi Yang di-Pertua Negeri Pulau Pinang", only: ["pulau-pinang"] },
      { date: "2026-07-21", name: "Hari Hol Almarhum Sultan Iskandar", only: ["johor"] },
      { date: "2026-07-22", name: "Hari Kemerdekaan Sarawak", only: ["sarawak"] },
      { date: "2026-07-31", name: "Hari Keputeraan Sultan Pahang", only: ["pahang"] },
      { date: "2026-08-24", name: "Hari Jadi Yang di-Pertua Negeri Melaka", only: ["melaka"] },
      // p6
      { date: "2026-08-25", name: "Hari Keputeraan Nabi Muhammad S.A.W. (Maulidur Rasul)" },
      { date: "2026-08-31", name: "Hari Kebangsaan" },
      { date: "2026-09-16", name: "Hari Malaysia" },
      { date: "2026-09-29", name: "Hari Keputeraan Sultan Kelantan", only: ["kelantan"] },
      { date: "2026-09-30", name: "Hari Keputeraan Sultan Kelantan", only: ["kelantan"] },
      { date: "2026-10-10", name: "Hari Jadi Yang di-Pertua Negeri Sarawak", only: ["sarawak"] },
      { date: "2026-11-06", name: "Hari Keputeraan Sultan Perak", only: ["perak"] },
      { date: "2026-11-08", name: "Hari Deepavali", except: ["sarawak"], tentative: true },
      { date: "2026-12-11", name: "Hari Keputeraan Sultan Selangor", only: ["selangor"] },
      { date: "2026-12-24", name: "Christmas Eve", only: ["sabah"] },
      { date: "2026-12-25", name: "Hari Krismas" },
    ],
  },
  {
    year: 2027,
    pdf: "https://www.kabinet.gov.my/storage/2026/08/HKA_2027.pdf",
    cuti: [
      // p4
      { date: "2027-01-01", name: "Tahun Baharu", except: NO_NEW_YEAR },
      { date: "2027-01-06", name: "Israk dan Mikraj", only: ISRAK },
      { date: "2027-01-14", name: "Hari Keputeraan Yang di-Pertuan Besar Negeri Sembilan", only: ["negeri-sembilan"] },
      { date: "2027-01-22", name: "Hari Thaipusam", only: THAIPUSAM },
      { date: "2027-02-01", name: "Hari Wilayah Persekutuan", only: WP },
      { date: "2027-02-06", name: "Tahun Baharu Cina" },
      { date: "2027-02-07", name: "Tahun Baharu Cina (Hari Kedua)" },
      { date: "2027-02-08", name: "Awal Ramadan", only: ["johor", "kedah"], tentative: true },
      { date: "2027-02-20", name: "Hari Pengisytiharan Tarikh Kemerdekaan", only: ["melaka"] },
      { date: "2027-02-24", name: "Hari Nuzul Al-Quran", only: NUZUL },
      { date: "2027-03-04", name: "Hari Ulang Tahun Pertabalan Sultan Terengganu", only: ["terengganu"] },
      { date: "2027-03-10", name: "Hari Raya Puasa", tentative: true },
      { date: "2027-03-11", name: "Hari Raya Puasa (Hari Kedua)", tentative: true },
      { date: "2027-03-12", name: "Hari Raya Puasa (Hari Ketiga)", only: ["melaka"] },
      { date: "2027-03-23", name: "Hari Keputeraan Sultan Johor", only: ["johor"] },
      { date: "2027-03-26", name: "Good Friday", only: ["sabah", "sarawak"] },
      { date: "2027-03-30", name: "Hari Jadi Yang di-Pertua Negeri Sabah", only: ["sabah"] },
      { date: "2027-04-26", name: "Hari Keputeraan Sultan Terengganu", only: ["terengganu"] },
      { date: "2027-05-01", name: "Hari Pekerja" },
      // p5
      { date: "2027-05-16", name: "Hari Arafah", only: ["kelantan", "terengganu"] },
      { date: "2027-05-17", name: "Hari Raya Qurban", tentative: true },
      { date: "2027-05-17", name: "Hari Ulang Tahun Keputeraan Raja Perlis", only: ["perlis"] },
      { date: "2027-05-18", name: "Hari Raya Qurban (Hari Kedua)", only: QURBAN_2, tentative: true },
      { date: "2027-05-20", name: "Hari Wesak" },
      { date: "2027-05-22", name: "Hari Hol Almarhum Sultan Ahmad Shah Al-Musta'in Billah ibni Almarhum Sultan Abu Bakar", only: ["pahang"] },
      { date: "2027-05-30", name: "Pesta Kaamatan (Pesta Menuai)", only: ["labuan", "sabah"] },
      { date: "2027-05-31", name: "Pesta Kaamatan (Pesta Menuai)", only: ["labuan", "sabah"] },
      { date: "2027-06-01", name: "Perayaan Hari Gawai Dayak", only: ["sarawak"] },
      { date: "2027-06-02", name: "Perayaan Hari Gawai Dayak", only: ["sarawak"] },
      { date: "2027-06-06", name: "Awal Muharam (Maal Hijrah)" },
      { date: "2027-06-07", name: "Hari Keputeraan Rasmi Seri Paduka Baginda Yang di-Pertuan Agong" },
      { date: "2027-06-20", name: "Hari Keputeraan Sultan Kedah", only: ["kedah"] },
      { date: "2027-07-07", name: "Hari Ulang Tahun Perisytiharan Tapak Warisan Dunia", only: ["pulau-pinang"] },
      { date: "2027-07-10", name: "Hari Jadi Yang di-Pertua Negeri Pulau Pinang", only: ["pulau-pinang"] },
      { date: "2027-07-11", name: "Hari Hol Almarhum Sultan Iskandar", only: ["johor"] },
      { date: "2027-07-22", name: "Hari Kemerdekaan Sarawak", only: ["sarawak"] },
      { date: "2027-07-30", name: "Hari Keputeraan Sultan Pahang", only: ["pahang"] },
      { date: "2027-08-15", name: "Hari Keputeraan Nabi Muhammad S.A.W. (Maulidur Rasul)" },
      // p6
      { date: "2027-08-24", name: "Hari Jadi Yang di-Pertua Negeri Melaka", only: ["melaka"] },
      { date: "2027-08-31", name: "Hari Kebangsaan" },
      { date: "2027-09-16", name: "Hari Malaysia" },
      { date: "2027-09-29", name: "Hari Keputeraan Sultan Kelantan", only: ["kelantan"] },
      { date: "2027-09-30", name: "Hari Keputeraan Sultan Kelantan", only: ["kelantan"] },
      { date: "2027-10-09", name: "Hari Jadi Yang di-Pertua Negeri Sarawak", only: ["sarawak"] },
      { date: "2027-10-28", name: "Hari Deepavali", except: ["sarawak"], tentative: true },
      { date: "2027-11-05", name: "Hari Keputeraan Sultan Perak", only: ["perak"] },
      { date: "2027-12-11", name: "Hari Keputeraan Sultan Selangor", only: ["selangor"] },
      { date: "2027-12-24", name: "Christmas Eve", only: ["sabah"] },
      { date: "2027-12-25", name: "Hari Krismas" },
      { date: "2027-12-26", name: "Israk dan Mikraj", only: ISRAK },
    ],
  },
];
