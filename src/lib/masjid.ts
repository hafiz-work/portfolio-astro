// Masjid and surau per district for /waktu-solat/masjid (see OPEN-API.md §3 and §6).
// Plan A: JAKIM's SISMIM list page (HTML, 10 a page - the live national register).
// Plan B: the Rewsyaydee/malaysia-masjid-dataset snapshot of SISMIM (CC BY 4.0, 3 Apr 2026) -
//         only for "all types" (it has no type or record code). Then the last good copy.
// Only name + address are kept: phone/fax are personal data in some records (PDPA).
// Check: bun scripts/check-masjid.ts
import { withFallback } from "./fallback";
import { normalizeAuthor } from "./quote-text";

export const PER_PAGE = 10;
export const SISMIM = "https://masjid.islam.gov.my";
const SNAPSHOT = "https://raw.githubusercontent.com/Rewsyaydee/malaysia-masjid-dataset/main/data";

/** SISMIM `jenis` codes (masjid.islam.gov.my/jenis?ids=1 and ?ids=2). */
export const JENIS: { code: string; name: string }[] = [
  { code: "01", name: "Masjid Kerajaan" },
  { code: "02", name: "Masjid Negeri" },
  { code: "03", name: "Masjid Bandar/Bandaraya" },
  { code: "04", name: "Masjid Daerah/Jajahan" },
  { code: "05", name: "Masjid Mukim/Kariah" },
  { code: "06", name: "Masjid Institusi" },
  { code: "07", name: "Masjid Diraja" },
  { code: "08", name: "Masjid Warisan" },
  { code: "09", name: "Masjid Pelancongan" },
  { code: "11", name: "Masjid Ghairu Jamek" },
  { code: "12", name: "Surau" },
  { code: "13", name: "Surau Solat Jumaat" },
];

// SISMIM state code -> the snapshot's `state` value.
const SNAPSHOT_STATE: Record<string, string> = {
  "01": "Johor", "02": "Kedah", "03": "Kelantan", "04": "Melaka", "05": "Negeri Sembilan",
  "06": "Pahang", "07": "Penang", "08": "Perak", "09": "Perlis", "10": "Selangor",
  "11": "Terengganu", "12": "Sabah", "13": "Sarawak", "14": "Kuala Lumpur (FT)",
  "15": "Labuan (FT)", "16": "Putrajaya (FT)",
};

export interface Tempat {
  name: string;
  address: string;
  /** SISMIM record code (detail page); absent in the snapshot. */
  kod?: string;
}

export interface Senarai {
  total: number;
  items: Tempat[];
}

export interface Query {
  negeri: string;
  daerah: { code: string; name: string };
  /** "" = every type. */
  jenis: string;
  page: number;
}

const decode = (s: string) =>
  s
    .replace(/<[^>]*>/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");
const tidy = (s: string) => normalizeAuthor(decode(s)).replace(/\s+,/g, ",").replace(/,$/, "");

/** How many rows page `page` must hold for `total` records. */
const expected = (total: number, page: number) => Math.max(0, Math.min(PER_PAGE, total - (page - 1) * PER_PAGE));

/** SISMIM list page HTML -> records; null unless the page holds exactly the rows its total implies. */
export function parseSismim(html: string, page: number): Senarai | null {
  const total = html.match(/Jumlah Rekod:\s*<b>(\d+)<\/b>/);
  if (!total) return null;
  const items = html
    .split('<div class="card" style="border: 2px solid #3a9ebf;">')
    .slice(1)
    .map((card) => ({
      name: tidy(card.match(/<h4>([\s\S]*?)<\/h4>/)?.[1] ?? ""),
      address: tidy(card.match(/>Alamat<\/label>[\s\S]*?<h6[^>]*>([\s\S]*?)<\/h6>/)?.[1] ?? ""),
      kod: card.match(/maklumatDetailMS\/1\/(\d+)/)?.[1] ?? "",
    }));
  const n = Number(total[1]);
  if (items.length !== expected(n, page) || items.some((t) => !t.name || !t.kod)) return null;
  return { total: n, items };
}

type Row = { name?: unknown; address?: unknown; state?: unknown; district?: unknown };

/** Snapshot rows -> one district's page; null if the district has no rows (wrong data, try next). */
export function fromSnapshot(rows: Row[], q: Query): Senarai | null {
  const state = SNAPSHOT_STATE[q.negeri];
  const district = q.daerah.name.toLowerCase();
  const all = rows.filter(
    (r) => r.state === state && typeof r.district === "string" && r.district.toLowerCase() === district && typeof r.name === "string",
  );
  if (!all.length) return null;
  const start = (q.page - 1) * PER_PAGE;
  return {
    total: all.length,
    items: all.slice(start, start + PER_PAGE).map((r) => ({
      name: tidy(r.name as string),
      address: typeof r.address === "string" ? tidy(r.address) : "",
    })),
  };
}

const text = async (url: string, timeoutMs: number) => {
  const res = await fetch(url, {
    headers: { "User-Agent": "hafizbahtiar.com/waktu-solat/masjid" },
    signal: AbortSignal.timeout(timeoutMs),
  });
  return res.ok ? res.text() : null;
};

export const SISMIM_SOURCE = "JAKIM (SISMIM)";

export async function getSenarai(q: Query) {
  const qs = new URLSearchParams({ jenis: q.jenis, negeri: q.negeri, daerah: q.daerah.code, page: String(q.page) });
  return withFallback<Senarai>(
    `masjid:${q.daerah.code}:${q.jenis}:${q.page}`,
    [
      {
        name: SISMIM_SOURCE,
        load: async () => {
          const html = await text(`${SISMIM}/maklumatMasjidSurau?${qs}`, 10_000);
          return html ? parseSismim(html, q.page) : null;
        },
      },
      {
        name: "Salinan SISMIM 3 Apr 2026 (malaysia-masjid-dataset)",
        // shortcut: downloads both files (~5 MB) on every miss of this plan; fine while it only runs when SISMIM is down.
        load: async () => {
          if (q.jenis) return null;
          const files = await Promise.all(["masjid", "surau"].map((f) => text(`${SNAPSHOT}/${f}.json`, 15_000)));
          if (files.some((f) => !f)) return null;
          const [m, s] = files.map((f) => JSON.parse(f!));
          return Array.isArray(m?.masjid) && Array.isArray(s?.surau) ? fromSnapshot([...m.masjid, ...s.surau], q) : null;
        },
      },
    ],
    { freshS: 24 * 60 * 60, staleS: 30 * 24 * 60 * 60 },
  );
}
