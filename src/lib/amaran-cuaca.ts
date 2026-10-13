// Active MET Malaysia weather warnings for /amaran-cuaca (api.data.gov.my/weather/warning).
// MET is the only source, so the fallback is the last good copy (3 h). Times arrive as
// Malaysian wall-clock without a zone ("2026-10-11T18:00:00"). "Tiada Nasihat" rows
// (no advisory) have no valid_to and are dropped. Expiry is checked on every render,
// so a stored copy never shows a warning that has already ended.
import { getJson, withFallback } from "./fallback";

export interface Warning {
  title: string;
  /** Malaysian wall-clock ISO strings, no zone. */
  issued: string;
  from: string;
  to: string;
  text: string;
  instruction: string | null;
}

type Raw = {
  warning_issue?: { issued?: string; title_bm?: string };
  valid_from?: string | null;
  valid_to?: string | null;
  text_bm?: string | null;
  instruction_bm?: string | null;
};

/** Malaysian wall-clock ISO (no zone) -> epoch ms. */
export const mytMs = (s: string) => Date.parse(`${s}+08:00`);

export function parseWarnings(rows: Raw[]): Warning[] {
  return rows
    .filter((r) => r.valid_to && r.warning_issue?.title_bm && r.text_bm)
    .map((r) => ({
      title: r.warning_issue!.title_bm!,
      issued: r.warning_issue!.issued ?? r.valid_from ?? r.valid_to!,
      from: r.valid_from ?? r.warning_issue!.issued ?? r.valid_to!,
      to: r.valid_to!,
      text: r.text_bm!,
      instruction: r.instruction_bm ?? null,
    }));
}

/** Warnings still valid at `now`, newest issue first. */
export const activeWarnings = (list: Warning[], now = Date.now()) =>
  list.filter((w) => mytMs(w.to) >= now).sort((a, b) => mytMs(b.issued) - mytMs(a.issued));

export async function getWarnings(): Promise<{ warnings: Warning[]; source: string; stale: boolean } | null> {
  const got = await withFallback<Warning[]>(
    "amaran-cuaca",
    [{
      name: "MET Malaysia",
      load: async () => {
        const rows = await getJson<Raw[]>("https://api.data.gov.my/weather/warning/");
        return Array.isArray(rows) ? parseWarnings(rows) : null;
      },
    }],
    { freshS: 15 * 60, staleS: 3 * 60 * 60 },
  );
  return got ? { warnings: activeWarnings(got.data), source: got.source, stale: got.stale } : null;
}
