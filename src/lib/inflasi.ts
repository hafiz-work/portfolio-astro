// Monthly CPI inflation for /inflasi (DOSM, via data.gov.my dataset `cpi_headline_inflation`).
// Plan A: data.gov.my API. Then the last good copy (lib/fallback) - no second provider
// publishes DOSM's division breakdown. Monthly release, so long cache times.
import { getJson, withFallback } from "./fallback";
import { formatIsoMs } from "./date-my";

const MONTHS = 12;
// 14 rows a month ("overall" + 13 divisions) x 12 months: the latest release + the trend.
const API = `https://api.data.gov.my/data-catalogue?id=cpi_headline_inflation&sort=-date&limit=${14 * MONTHS}`;

/** Division code -> Malay label, as data.gov.my's ms-MY catalogue page names them (MCOICOP). */
export const DIVISIONS = {
  "01": "Makanan & Minuman",
  "02": "Minuman Alkohol & Tembakau",
  "03": "Pakaian & Kasut",
  "04": "Perumahan, Utiliti, Gas & Bahan Api Lain",
  "05": "Hiasan, Perkakasan & Penyelenggaraan Isi Rumah",
  "06": "Kesihatan",
  "07": "Pengangkutan",
  "08": "Maklumat & Komunikasi",
  "09": "Rekreasi, Sukan & Kebudayaan",
  "10": "Pendidikan",
  "11": "Restoran & Perkhidmatan Penginapan",
  "12": "Insurans & Perkhidmatan Kewangan",
  "13": "Penjagaan Diri, Perlindungan Sosial & Pelbagai Barangan dan Perkhidmatan",
} as const;
export type DivisionCode = keyof typeof DIVISIONS;
// Sorted: Object.keys lists integer-like keys ("10".."13") before "01".
const CODES = (Object.keys(DIVISIONS) as DivisionCode[]).sort();

export interface Inflation {
  /** Reference month, `YYYY-MM-01`. */
  month: string;
  overall: { mom: number; yoy: number };
  /** 01..13 in code order. */
  divisions: { code: DivisionCode; name: string; mom: number; yoy: number }[];
  /** Headline yoy, oldest first, up to 12 months ending at `month`. */
  trend: { month: string; yoy: number }[];
}

type Row = { date: string; division: string; inflation_mom: number; inflation_yoy: number };

const isRow = (r: unknown): r is Row => {
  const x = r as Row;
  return (
    !!x &&
    typeof x.date === "string" &&
    /^\d{4}-\d{2}-01$/.test(x.date) &&
    (x.division === "overall" || Object.hasOwn(DIVISIONS, x.division)) &&
    Number.isFinite(x.inflation_mom) &&
    Number.isFinite(x.inflation_yoy)
  );
};

/** API rows -> the latest release + trend; null if any row is malformed or the latest month is incomplete. */
export function parseInflation(rows: unknown): Inflation | null {
  if (!Array.isArray(rows) || !rows.length || !rows.every(isRow)) return null;
  const month = rows.reduce((m, r) => (r.date > m ? r.date : m), "");
  const latest = new Map(rows.filter((r) => r.date === month).map((r) => [r.division, r]));
  const overall = latest.get("overall");
  if (!overall || CODES.some((c) => !latest.has(c))) return null;
  return {
    month,
    overall: { mom: overall.inflation_mom, yoy: overall.inflation_yoy },
    divisions: CODES.map((code) => {
      const r = latest.get(code)!;
      return { code, name: DIVISIONS[code], mom: r.inflation_mom, yoy: r.inflation_yoy };
    }),
    trend: rows
      .filter((r) => r.division === "overall")
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-MONTHS)
      .map((r) => ({ month: r.date, yoy: r.inflation_yoy })),
  };
}

/** "2026-08-01" -> "Ogos 2026". */
export const monthLabel = (ymd: string, month: "long" | "short" = "long") => formatIsoMs(ymd, { month, year: "numeric" });

export async function getInflation(): Promise<(Inflation & { source: string; stale: boolean }) | null> {
  const got = await withFallback<Inflation>(
    "inflasi",
    [{ name: "DOSM (data.gov.my)", load: async () => parseInflation(await getJson(API)) }],
    { freshS: 12 * 60 * 60, staleS: 45 * 24 * 60 * 60 },
  );
  return got ? { ...got.data, source: got.source, stale: got.stale } : null;
}
