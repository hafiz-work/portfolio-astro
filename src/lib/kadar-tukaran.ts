// Exchange rates for /kadar-tukaran. Plan A Bank Negara Malaysia (official, no key),
// plan B Frankfurter (European Central Bank reference rates), plan C open.er-api.com,
// then the last good copy (lib/fallback). Colo-cached 30 min.
import { getJson, withFallback } from "./fallback";

const BNM = "https://api.bnm.gov.my/public/exchange-rate";
const FRANKFURTER = "https://api.frankfurter.dev/v1/latest?from=MYR";
const ER_API = "https://open.er-api.com/v6/latest/MYR";

export interface Rate {
  code: string;
  /** Rates are RM per `unit` of the currency (1 or 100, e.g. JPY 100). */
  unit: number;
  buy: number | null;
  sell: number | null;
  middle: number | null;
  date: string;
}

export interface Rates {
  session: string; // "1700" (BNM only)
  updated: string; // "2026-10-09 23:01:22" or a date
  rates: Rate[];
  source: string;
  stale: boolean;
}

type BnmResponse = {
  data?: { currency_code: string; unit: number; rate: { date: string; buying_rate: number | null; selling_rate: number | null; middle_rate: number | null } }[];
  meta?: { session?: string; last_updated?: string };
};

// BNM quotes these per 100 units; the fallbacks keep the same units so the table
// reads the same whichever plan answered.
const PER_100 = new Set(["AED", "NPR", "VND", "TWD", "THB", "SAR", "PKR", "PHP", "MMK", "KRW", "KHR", "JPY", "INR", "IDR", "HKD"]);

/** Malay names for BNM's currency codes (unknown codes show the code). */
export const CURRENCY_NAMES: Record<string, string> = {
  USD: "Dolar Amerika Syarikat", EUR: "Euro", GBP: "Paun Sterling", SGD: "Dolar Singapura",
  AUD: "Dolar Australia", JPY: "Yen Jepun", CNY: "Yuan China", HKD: "Dolar Hong Kong",
  THB: "Baht Thailand", IDR: "Rupiah Indonesia", PHP: "Peso Filipina", BND: "Dolar Brunei",
  SAR: "Riyal Arab Saudi", AED: "Dirham UAE", INR: "Rupee India", KRW: "Won Korea Selatan",
  TWD: "Dolar Taiwan", VND: "Dong Vietnam", CHF: "Franc Switzerland", CAD: "Dolar Kanada",
  NZD: "Dolar New Zealand", PKR: "Rupee Pakistan", NPR: "Rupee Nepal", MMK: "Kyat Myanmar",
  KHR: "Riel Kemboja", EGP: "Paun Mesir", SDR: "Special Drawing Rights (IMF)",
};

// Most-used first; the rest alphabetical.
const FIRST = ["USD", "SGD", "EUR", "GBP", "AUD", "JPY", "CNY", "THB", "IDR", "SAR", "BND", "HKD"];

type Payload = Omit<Rates, "source" | "stale">;

async function fromBnm(): Promise<Payload | null> {
  const json = await getJson<BnmResponse>(BNM, { headers: { Accept: "application/vnd.BNM.API.v1+json" } });
  if (!json?.data?.length) return null;
  return {
    session: json.meta?.session ?? "",
    updated: json.meta?.last_updated ?? "",
    rates: json.data.map((d) => ({
      code: d.currency_code,
      unit: d.unit || 1,
      buy: d.rate.buying_rate,
      sell: d.rate.selling_rate,
      middle: d.rate.middle_rate,
      date: d.rate.date,
    })),
  };
}

/** Plans B/C give "units of X per 1 RM"; turn that into BNM's "RM per unit". Middle rate only. */
const fromPerRinggit = (perRm: Record<string, number>, date: string): Payload | null => {
  const rates = Object.keys(CURRENCY_NAMES)
    .filter((code) => perRm[code] > 0)
    .map((code) => {
      const unit = PER_100.has(code) ? 100 : 1;
      return { code, unit, buy: null, sell: null, middle: unit / perRm[code], date };
    });
  return rates.length ? { session: "", updated: date, rates } : null;
};

async function fromFrankfurter(): Promise<Payload | null> {
  const json = await getJson<{ date?: string; rates?: Record<string, number> }>(FRANKFURTER);
  return json?.rates ? fromPerRinggit(json.rates, json.date ?? "") : null;
}

async function fromErApi(): Promise<Payload | null> {
  const json = await getJson<{ result?: string; time_last_update_unix?: number; rates?: Record<string, number> }>(ER_API);
  if (json?.result !== "success" || !json.rates) return null;
  const date = json.time_last_update_unix ? new Date(json.time_last_update_unix * 1000).toISOString().slice(0, 10) : "";
  return fromPerRinggit(json.rates, date);
}

/** Latest rates (BNM -> ECB -> open.er-api -> last good copy), or null if all fail. */
export async function getRates(): Promise<Rates | null> {
  const got = await withFallback<Payload>(
    "kadar-tukaran",
    [
      { name: "Bank Negara Malaysia", load: fromBnm },
      { name: "Bank Pusat Eropah (Frankfurter)", load: fromFrankfurter },
      { name: "open.er-api.com", load: fromErApi },
    ],
    { freshS: 30 * 60, staleS: 7 * 24 * 60 * 60 },
  );
  if (!got) return null;
  const rank = (c: string) => (FIRST.includes(c) ? FIRST.indexOf(c) : FIRST.length);
  return {
    ...got.data,
    rates: [...got.data.rates].sort((a, b) => rank(a.code) - rank(b.code) || a.code.localeCompare(b.code)),
    source: got.source,
    stale: got.stale,
  };
}
