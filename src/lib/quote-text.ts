// Tidy quote text/author before saving (account + admin forms), so the list doesn't
// look messy - without lowercasing everything, which would wreck proper nouns
// ("Allah", "Rasulullah ﷺ", "Malaysia", "AI", "Steve Jobs").
// Check: bun scripts/check-quote-text.ts

const collapse = (s: string) => s.replace(/\s+/g, " ").trim();
const letters = (s: string) => s.replace(/[^\p{L}]/gu, "");
const upperShare = (s: string) => {
  const l = letters(s);
  return l.length ? l.replace(/[^\p{Lu}]/gu, "").length / l.length : 0;
};
const capFirst = (s: string) => s.replace(/^(\P{L}*)(\p{L})/u, (_, pre, c) => pre + c.toLocaleUpperCase("ms-MY"));

/** Quote: tidy spaces; ALL-CAPS "shouting" -> sentence case; first letter upper. */
export function normalizeQuote(text: string): string {
  let t = collapse(text);
  if (letters(t).length >= 8 && upperShare(t) > 0.7) {
    t = t.toLocaleLowerCase("ms-MY").replace(/([.!?]\s+)(\p{L})/gu, (_, p, c) => p + c.toLocaleUpperCase("ms-MY"));
  }
  return capFirst(t);
}

/** Tag (category label) name: tidy spaces, all lowercase, first letter upper - tags
 *  are short labels, so one consistent look matters more than case ("MOTIVASI" -> "Motivasi"). */
export function normalizeTagName(name: string): string {
  return capFirst(collapse(name).toLocaleLowerCase("ms-MY"));
}

/** Author: tidy spaces; only when typed all upper or all lower, Title Case it. */
export function normalizeAuthor(name: string): string {
  const t = collapse(name);
  const share = upperShare(t);
  if (letters(t).length < 2 || (share > 0 && share < 1)) return t;
  return t.toLocaleLowerCase("ms-MY").replace(/(^|[\s(-])(\p{L})/gu, (_, p, c) => p + c.toLocaleUpperCase("ms-MY"));
}
