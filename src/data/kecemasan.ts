// Nombor Kecemasan (/kecemasan). A wrong number in an emergency is dangerous, so:
// every entry is copied from the agency's OWN site (`source`), with the date it
// was checked (`verified`). No entry without an official source - news reports
// and directory sites don't count. Re-check every entry at least every 6 months;
// `bun scripts/check-kecemasan.ts` fails once any `verified` is older than that.
//
// Checked 2026-10-11 and left out (no official confirmation yet): 112 from mobiles,
// 991 / 994 as separate lines (999.gov.my lists only 999), Talian HEAL 15555
// (KKM site unreadable; news only), MCMC phone 1-800-188-030 (suspended in 2021,
// no official word since). Highway hotlines: LLM's directory (all 33 listed 2026-10-12).
// Insurers/takaful (checked 2026-10-13), left out: PIAM Accident Assist 15500 /
// 1-300-22-1188 (ended 31 Dec 2022 - kurnia.com/node/6997), Tokio Marine and Liberty
// (official pages block automated reads - number not seen on them), Takaful Ikhlas
// (no official page found), Berjaya Sompo (site points to the MySOMPO app; the only
// number is in a 2018 notice).
// Banks (checked 2026-10-13), left out: Maybank (every official page blocks automated
// reads - number not seen), BSN (no 24-hour fraud line - its page points to NSRC 997),
// Bank Rakyat and OCBC (no official page with the number found).
// NSRC 997 hours: nfcc.jpm.gov.my (operator, updated 10 Aug 2026) says 8 pagi - 8 malam;
// malaysia.gov.my (31 Jul 2026) and some banks say 24 jam. We follow the operator.

export interface Contact {
  name: string;
  /** Shown as written by the agency, e.g. "1-800-88-0000". */
  number?: string;
  /** Link instead of / besides a number: wa.me, mailto:, a portal. */
  href?: string;
  hrefLabel?: string;
  hours?: string;
  note?: string;
  /** The agency's own page the number was copied from. */
  source: string;
  /** ISO date the entry was last checked against `source`. */
  verified: string;
}

export interface Group {
  id: string;
  title: string;
  /** Filter chip label on /kecemasan. */
  short: string;
  intro?: string;
  contacts: Contact[];
}

const V = "2026-10-11";
/** Highway hotlines from LLM's official directory (llm.gov.my/awam/highway), checked: */
const V2 = "2026-10-12";
/** Insurer / takaful roadside lines and bank fraud lines, each from the company's own site, checked: */
const V3 = "2026-10-13";

export const KECEMASAN: Group[] = [
  {
    id: "utama",
    short: "Utama",
    title: "Kecemasan utama",
    contacts: [
      {
        name: "MERS 999",
        number: "999",
        hours: "24 jam",
        note: "Polis, Bomba, ambulans (KKM), Angkatan Pertahanan Awam dan Maritim Malaysia. Untuk kecemasan sahaja - salah guna talian 999 ialah satu kesalahan.",
        source: "https://999.gov.my",
        verified: V,
      },
    ],
  },
  {
    id: "lebuh-raya",
    short: "Lebuh raya",
    title: "Lebuh raya",
    intro:
      "Kereta rosak atau kemalangan di lebuh raya? Hubungi operator lebuh raya tersebut - cari nama lebuh raya di kotak carian. Jika tidak pasti, hubungi LLM. Jika ada kecederaan atau bahaya, hubungi 999. Nombor daripada direktori rasmi Lembaga Lebuhraya Malaysia.",
    contacts: [
      {
        name: "PLUS, LINKEDUA, ELITE, BKE, SPDH, JPP",
        number: "1-800-88-0000",
        note: "Lebuhraya Utara Selatan (PLUS); Lebuhraya Laluan Kedua Malaysia-Singapura (LINKEDUA); Lebuhraya Utara Selatan Hubungan Tengah (ELITE); Lebuhraya Butterworth-Kulim (BKE); Lebuhraya Seremban-Port Dickson (SPDH); Jambatan Pulau Pinang (JPP). Konsesi: Projek Lebuhraya Usahasama Berhad. Aplikasi PLUS juga ada butang SOS (plus.com.my).",
        source: "https://www.llm.gov.my/awam/highway",
        verified: V2,
      },
      {
        name: "JPP2",
        number: "1-300-30-2828",
        note: "Jambatan Sultan Abdul Halim Mu'adzam Shah (JPP2). Konsesi: Jambatan Kedua Sdn Bhd.",
        source: "https://www.llm.gov.my/awam/highway/16",
        verified: V2,
      },
      {
        name: "NPE",
        number: "1-300-88-1010",
        note: "Lebuhraya Baru Pantai (NPE). Konsesi: New Pantai Expressway Sdn. Bhd..",
        source: "https://www.llm.gov.my/awam/highway/8",
        verified: V2,
      },
      {
        name: "AKLEH, LKSA, SILK, SUKE, DASH, GCE",
        number: "1800-22-8888",
        note: "Lebuhraya Bertingkat Ampang-Kuala Lumpur (AKLEH); Lebuhraya Kemuning-Shah Alam (LKSA); Lebuhraya Skim Penyuraian Trafik Lingkaran Kajang (SILK); Lebuhraya Sungai Besi-Ulu Klang (SUKE); Lebuhraya Bertingkat Damansara-Shah Alam (DASH); Lebuhraya Koridor Guthrie (GCE). Konsesi: Projek Lintasan Kota Sdn Bhd, Projek Lintasan Shah Alam Sdn Bhd, Sistem Lingkaran Lebuhraya Kajang Sdn. Bhd., Projek Lintasan Sungai Besi-Ulu Klang Sdn. Bhd., Projek Lintasan Damansara-Shah Alam Sdn Bhd (PROLINTAS), PROLINTAS Expressway Sdn Bhd.",
        source: "https://www.llm.gov.my/awam/highway/8",
        verified: V2,
      },
      {
        name: "Grand Saga",
        number: "03-90750505",
        note: "Lebuhraya Cheras Kajang (Grand saga). Konsesi: Grand Saga Sdn Bhd.",
        source: "https://www.llm.gov.my/awam/highway",
        verified: V2,
      },
      {
        name: "LDP",
        number: "03-74947333",
        note: "Lebuhraya Damansara Puchong (LDP). Konsesi: Lingkaran Trans Kota Sdn Bhd.",
        source: "https://www.llm.gov.my/awam/highway/8",
        verified: V2,
      },
      {
        name: "DUKE, SPE",
        number: "03-6251 3100",
        note: "Lebuhraya Duta-Ulu Klang (DUKE); Lebuhraya Setiawangsa-Pantai (SPE). Konsesi: Konsortium Lebuhraya Utara-Timur (KL) Sdn.Bhd, Lebuhraya Duke Fasa 3 Sdn. Bhd.",
        source: "https://www.llm.gov.my/awam/highway/24",
        verified: V2,
      },
      {
        name: "LEKAS",
        number: "1-800-888-021",
        note: "Lebuhraya Kajang-Seremban (LEKAS). Konsesi: Lebuhraya Kajang – Seremban Sdn Bhd.",
        source: "https://www.llm.gov.my/awam/highway/16",
        verified: V2,
      },
      {
        name: "LATAR",
        number: "03-6145 1515",
        note: "Lebuhraya Kuala Lumpur-Kuala Selangor (LATAR). Konsesi: KL-Kuala Selangor Expressway Bhd.",
        source: "https://www.llm.gov.my/awam/highway/16",
        verified: V2,
      },
      {
        name: "MEX",
        number: "03-8315 9111",
        note: "Lebuhraya Kuala Lumpur-Putrajaya (MEX). Konsesi: Maju Expressway Sdn Bhd.",
        source: "https://www.llm.gov.my/awam/highway/16",
        verified: V2,
      },
      {
        name: "KLK, LPT1",
        number: "1-700-818-700",
        note: "Lebuhraya Kuala Lumpur-Karak (KLK); Lebuhraya Pantai Timur Fasa 1 (LPT1). Konsesi: ANIH Berhad.",
        source: "https://www.llm.gov.my/awam/highway",
        verified: V2,
      },
      {
        name: "SKVE",
        number: "1-300-88-0026",
        note: "Lebuhraya Lembah Klang Selatan (SKVE). Konsesi: SKVE Holdings Sdn Bhd.",
        source: "https://www.llm.gov.my/awam/highway/16",
        verified: V2,
      },
      {
        name: "LLB",
        number: "04-3299999",
        note: "Lebuhraya Lingkaran Luar Butterworth (LLB). Konsesi: Lingkaran Luar Butterworth (Penang) Sdn Bhd.",
        source: "https://www.llm.gov.my/awam/highway/8",
        verified: V2,
      },
      {
        name: "LPT2",
        number: "1800 88 0220",
        note: "Lebuhraya Pantai Timur Fasa 2 (LPT 2). Konsesi: Lebuhraya Pantai Timur 2 Sdn Bhd.",
        source: "https://www.llm.gov.my/awam/highway",
        verified: V2,
      },
      {
        name: "WCE",
        number: "1700-81-6600",
        note: "Lebuhraya Pesisiran Pantai Barat (Taiping-Banting). Konsesi: West Coast Expressway Sdn Bhd.",
        source: "https://www.llm.gov.my/awam/highway/24",
        verified: V2,
      },
      {
        name: "NNKSB",
        number: "03-33450333",
        note: "Lebuhraya Pintas Selat Klang Utara Baru (NNKSB). Konsesi: Grand Sepadu (NK) Sdn. Bhd..",
        source: "https://www.llm.gov.my/awam/highway/24",
        verified: V2,
      },
      {
        name: "SDE",
        number: "07-8612222",
        note: "Lebuhraya Senai-Desaru (SDE). Konsesi: Senai Desaru Expressway Berhad.",
        source: "https://www.llm.gov.my/awam/highway/16",
        verified: V2,
      },
      {
        name: "KESAS",
        number: "03-56337188",
        note: "Lebuhraya Shah Alam (KESAS). Konsesi: KESAS Sdn Bhd.",
        source: "https://www.llm.gov.my/awam/highway",
        verified: V2,
      },
      {
        name: "SPRINT",
        number: "03-7494 7376",
        note: "Lebuhraya Skim Penyuraian Trafik Kuala Lumpur Barat (SPRINT). Konsesi: Sistem Penyuraian Trafik KL Barat Sdn Bhd.",
        source: "https://www.llm.gov.my/awam/highway/16",
        verified: V2,
      },
      {
        name: "BESRAYA",
        number: "1-800-88-0999",
        note: "Lebuhraya Sungai Besi (BESRAYA). Konsesi: Besraya (M) Sdn Bhd.",
        source: "https://www.llm.gov.my/awam/highway/8",
        verified: V2,
      },
      {
        name: "SMART",
        number: "1-300-88-7188",
        note: "Sistem Pengurusan Air Banjir dan Terowong (SMART). Konsesi: Syarikat Mengurus Air Banjir & Terowong Sdn Bhd.",
        source: "https://www.llm.gov.my/awam/highway/24",
        verified: V2,
      },
      {
        name: "Lembaga Lebuhraya Malaysia (LLM) - Info Trafik",
        number: "1800-88-7752",
        note: "Hotline info trafik LLM - untuk lebuh raya lain yang tidak disenaraikan di sini.",
        source: "https://www.llm.gov.my",
        verified: V,
      },
    ],
  },
  {
    id: "insurans",
    short: "Tunda",
    title: "Tunda dan bantuan jalan raya (insurans / takaful)",
    intro:
      "Kereta rosak atau kemalangan? Hubungi talian bantuan penanggung insurans atau pengendali takaful motor anda - mereka hantar lori tunda panel dan bantuan baiki kecil. Had tunda dan kelayakan bergantung pada polisi atau sijil anda. Jangan serah kenderaan kepada lori tunda yang datang tanpa dipanggil. Jika ada kecederaan atau bahaya, hubungi 999. Setiap nombor daripada laman rasmi syarikat itu.",
    contacts: [
      {
        name: "AIA Auto Assist / AIA Roadside Assist",
        number: "1800-88-8733",
        hours: "24 jam",
        note: "AIA General. Talian alternatif: +603-7989 0352.",
        source: "https://www.aia.com.my/en/help-support/contact-us/overview.html",
        verified: V3,
      },
      {
        name: "Allianz Road Rangers",
        number: "1800-22-5542",
        hours: "24 jam",
        note: "Allianz General. Bantuan selepas kemalangan dan kerosakan.",
        source: "https://www.allianz.com.my/a-z-reads/automotive/end-to-end-assistance-after-an-accident-anytime-anywhere",
        verified: V3,
      },
      {
        name: "Etiqa Auto Assist",
        number: "1-800-88-6491",
        hours: "24 jam",
        note: "Tunda dan bantuan kerosakan kereta. Dari Singapura, Thailand atau Brunei: +603-2296 8600.",
        source: "https://www.etiqa.com.my/etiqa-auto-assist",
        verified: V3,
      },
      {
        name: "Kurnia Auto Assist",
        number: "1 800 88 3833",
        hours: "24 jam",
        note: "Bantuan kemalangan dan kerosakan di jalan raya.",
        source: "https://www.kurnia.com/contact-us",
        verified: V3,
      },
      {
        name: "MSIG Motor Assist",
        number: "1-300-880-833",
        hours: "24 jam",
        note: "Bantuan kemalangan dan kerosakan motor.",
        source: "https://www.msig.com.my/contact-us",
        verified: V3,
      },
      {
        name: "Takaful Malaysia - Tele Bantuan",
        number: "1-800 888 788",
        note: "Syarikat Takaful Malaysia. Waktu operasi tidak dinyatakan di laman rasmi.",
        source: "https://www.takaful-malaysia.com.my/contact-us",
        verified: V3,
      },
      {
        name: "Zurich Roadside Assistance",
        number: "1-300-88-5566",
        hours: "24 jam",
        note: "WhatsApp (dan panggilan dari talian tetap tempatan): +603-7989 0345.",
        source: "https://www.zurich.com.my/en",
        verified: V3,
      },
    ],
  },
  {
    id: "scam",
    short: "Penipuan",
    title: "Penipuan (scam) dan siber",
    contacts: [
      {
        name: "Pusat Respons Scam Kebangsaan (NSRC)",
        number: "997",
        hours: "8.00 pagi - 8.00 malam setiap hari, termasuk cuti umum",
        note: "Hubungi segera bila sedar ditipu, supaya wang boleh disekat. Di luar waktu ini, hubungi talian 24 jam bank anda. Buat laporan polis dalam masa 24 jam. NSRC, polis dan bank tidak akan meminta kata laluan, PIN, TAC atau OTP anda.",
        source: "https://nfcc.jpm.gov.my/index.php/ms/nsrc",
        verified: V,
      },
      {
        name: "Semak Mule (PDRM)",
        href: "https://semakmule.rmp.gov.my",
        hrefLabel: "semakmule.rmp.gov.my",
        note: "Semak nombor akaun bank atau telefon sebelum membuat bayaran.",
        source: "https://semakmule.rmp.gov.my",
        verified: V,
      },
      {
        name: "Cyber999 (CyberSecurity Malaysia)",
        href: "mailto:cyber999@cybersecurity.my",
        hrefLabel: "cyber999@cybersecurity.my",
        hours: "Isnin - Jumaat, 8.30 pagi - 5.30 petang",
        note: "Laporan insiden keselamatan siber (godam, perisian hasad, akaun dicuri).",
        source: "https://www.cybersecurity.my/portal-main/article/contact-us",
        verified: V,
      },
    ],
  },
  {
    id: "bank",
    short: "Bank",
    title: "Bank - penipuan dan kad hilang",
    intro:
      "Disyaki ditipu, akaun digodam atau kad hilang? Hubungi talian bank anda segera supaya akaun atau kad dapat dibekukan, kemudian NSRC 997 dan buat laporan polis. Banyak aplikasi bank ada butang kill switch untuk bekukan akses serta-merta. Bank tidak akan meminta kata laluan, PIN, TAC atau OTP. Setiap nombor daripada laman rasmi bank itu.",
    contacts: [
      {
        name: "AmBank",
        number: "+603 2178 8888",
        hours: "24 jam untuk lapor penipuan atau kad hilang",
        note: "Talian am Pusat Hubungan 9 pagi - 9 malam mulai 1 Ogos 2026; laporan penipuan dan kad hilang kekal 24/7.",
        source: "https://www.ambank.com.my/announcements/2026/revision-to-ambank-contact-centre-operating-hours",
        verified: V3,
      },
      {
        name: "Bank Islam",
        number: "03-2690 0900",
        note: "Lapor transaksi tanpa kebenaran dengan segera. Waktu operasi tidak dinyatakan di halaman ini.",
        source: "https://www.bankislam.com/seft/",
        verified: V3,
      },
      {
        name: "CIMB",
        number: "+603 6204 7788",
        hours: "24 jam",
        note: "Penipuan atau aktiviti mencurigakan pada akaun.",
        source: "https://www.cimb.com.my/en/personal/help-support/security-and-fraud/money-muling.html",
        verified: V3,
      },
      {
        name: "Hong Leong Bank",
        number: "03-7626 8899",
        hours: "24 jam",
        note: "Pusat Hubungan HLB - lapor penipuan atau scam.",
        source: "https://www.hlb.com.my/en/business-banking/connect-biz/report-a-scam-fraud.html",
        verified: V3,
      },
      {
        name: "Public Bank - kad ATM / debit hilang",
        number: "603-2170 8000",
        hours: "24 jam",
        note: "Kad kredit Visa / Mastercard hilang: 603-2176 8555 (24 jam). Penipuan perbankan dalam talian: talian yang sama atau Case Management 03-2177 3555.",
        source: "https://pbebank.com/en/cards/cards-help-centre/report-cancellation-of-lost-or-stolen-cards/",
        verified: V3,
      },
      {
        name: "RHB",
        number: "03-9206-8118",
        note: "Pusat Hubungan Pelanggan RHB - lapor penipuan. Waktu operasi tidak dinyatakan di halaman ini.",
        source: "https://rhbgroup.com/others/fraud-awareness/FAQ/Credit-Cards/index.html",
        verified: V3,
      },
      {
        name: "UOB",
        number: "+6 03-2612 8100",
        hours: "24 jam",
        note: "Talian Laporan Penipuan.",
        source: "https://uob.com.my/default/security-alert.page",
        verified: V3,
      },
    ],
  },
  {
    id: "sokongan",
    short: "Sokongan",
    title: "Sokongan emosi dan kebajikan",
    contacts: [
      {
        name: "Befrienders Kuala Lumpur",
        number: "03-7627 2929",
        hours: "24 jam, setiap hari",
        note: "Sokongan emosi, percuma dan sulit.",
        source: "https://befrienders.org.my",
        verified: V,
      },
      {
        name: "Talian Kasih (KPWKM)",
        number: "15999",
        href: "https://wa.me/60192615999",
        hrefLabel: "WhatsApp 019-261 5999",
        note: "Kebajikan wanita, kanak-kanak, warga emas, OKU dan keluarga, termasuk keganasan rumah tangga.",
        source: "https://www.kpwkm.gov.my",
        verified: V,
      },
    ],
  },
  {
    id: "apm",
    short: "APM",
    title: "Angkatan Pertahanan Awam (APM) - talian 24 jam negeri",
    intro: "Untuk bencana seperti banjir. Dalam kecemasan, 999 tetap pilihan pertama.",
    contacts: [
      ["Johor", "07-2349706"],
      ["Kedah", "04-7323810"],
      ["Kelantan", "09-7474091"],
      ["Melaka", "06-2324028"],
      ["Negeri Sembilan", "06-7645755"],
      ["Pahang", "09-5445991"],
      ["Perak", "05-5278715"],
      ["Perlis", "04-9777991"],
      ["Pulau Pinang", "04-2263876"],
      ["Sabah", "088-232440"],
      ["Sarawak", "082-433896"],
      ["Selangor", "03-33710820"],
      ["Terengganu", "09-6668246"],
      ["WP Kuala Lumpur", "03-26871400"],
    ].map(([negeri, number]) => ({
      name: `APM ${negeri}`,
      number,
      hours: "24 jam",
      source: "https://www.civildefence.gov.my",
      verified: V,
    })),
  },
];

/** "1-800-88-0000" / "03-7627 2929" -> "1800880000" / "0376272929". */
export const dialString = (n: string) => n.replace(/[^\d+]/g, "");

/** tel: href. Ordinary lines (leading 0) in +60 form so they also dial from a
 *  foreign SIM; short codes (999, 997, 15999) and 1-800 toll-free stay as is -
 *  they only work inside Malaysia anyway. */
export const telHref = (n: string) => {
  const d = dialString(n);
  return `tel:${/^0\d{8,}$/.test(d) ? `+60${d.slice(1)}` : d}`;
};

/** URL slug for a contact's vCard: group id + position (only contacts with a number get one). */
export const vcardSlug = (g: Group, i: number) => `${g.id}-${i + 1}`;

const vEsc = (s: string) => s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/([,;])/g, "\\$1");

/** vCard 3.0 (the version both iOS Contacts and Android's importer read) for one contact.
 *  shortcut: long lines are not folded at 75 octets - both importers accept them; fold if one rejects. */
export const vcard = (g: Group, c: Contact) =>
  [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `N:;${vEsc(c.name)};;;`,
    `FN:${vEsc(c.name)}`,
    `ORG:${vEsc(g.title)}`,
    c.number && `TEL;TYPE=WORK,VOICE:${telHref(c.number).slice(4)}`,
    `URL:${vEsc(c.href?.startsWith("http") ? c.href : c.source)}`,
    `NOTE:${vEsc([c.hours, c.note, `Sumber: ${c.source} (disemak ${c.verified})`].filter(Boolean).join("\n"))}`,
    "CATEGORIES:Kecemasan",
    "END:VCARD",
  ]
    .filter(Boolean)
    .join("\r\n") + "\r\n";
