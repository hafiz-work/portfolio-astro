// Nombor Kecemasan (/kecemasan). A wrong number in an emergency is dangerous, so:
// every entry is copied from the agency's OWN site (`source`), with the date it
// was checked (`verified`). No entry without an official source - news reports
// and directory sites don't count. Re-check every entry at least every 6 months;
// `bun scripts/check-kecemasan.ts` fails once any `verified` is older than that.
//
// Checked 2026-10-11 and left out (no official confirmation yet): 112 from mobiles,
// 991 / 994 as separate lines (999.gov.my lists only 999), Talian HEAL 15555
// (KKM site unreadable; news only), MCMC phone 1-800-188-030 (suspended in 2021,
// no official word since), highway operators other than those below.

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
  intro?: string;
  contacts: Contact[];
}

const V = "2026-10-11";

export const KECEMASAN: Group[] = [
  {
    id: "utama",
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
    title: "Lebuh raya",
    intro:
      "Kereta rosak atau kemalangan di lebuh raya? Hubungi operator lebuh raya tersebut. Jika tidak pasti siapa operatornya, hubungi LLM. Jika ada kecederaan atau bahaya, hubungi 999.",
    contacts: [
      {
        name: "PLUSLine (lebuh raya PLUS)",
        number: "1-800-88-0000",
        note: "Untuk kecemasan dan bantuan di lebuh raya PLUS. Aplikasi PLUS juga ada butang SOS.",
        source: "https://www.plus.com.my",
        verified: V,
      },
      {
        name: "Prolintas - AKLEH, GCE, LKSA, Kajang SILK, SUKE, DASH",
        number: "1-800-22-8888",
        note: "Talian kecemasan (Emergency Hotline) Prolintas.",
        source: "https://www.prolintas.com.my",
        verified: V,
      },
      {
        name: "LPT2 (Lebuhraya Pantai Timur Fasa 2)",
        number: "1-800-88-0220",
        note: "Talian bebas tol LPT2.",
        source: "https://www.lpt2.com.my",
        verified: V,
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
    id: "scam",
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
    id: "sokongan",
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

/** "1-800-88-0000" / "03-7627 2929" -> "1800880000" / "0376272929" for tel: links. */
export const dialString = (n: string) => n.replace(/[^\d+]/g, "");
