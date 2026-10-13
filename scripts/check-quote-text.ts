// bun scripts/check-quote-text.ts - quote/author tidying keeps proper nouns.
import { normalizeAuthor, normalizeQuote, normalizeTagName } from "../src/lib/quote-text";

const eq = (got: string, want: string, what: string) => {
  if (got !== want) throw new Error(`${what}: got "${got}", want "${want}"`);
};
eq(normalizeQuote("  sabar itu   indah "), "Sabar itu indah", "spaces + first letter");
eq(normalizeQuote("Allah tidak membebani seseorang melainkan sesuai kesanggupannya."), "Allah tidak membebani seseorang melainkan sesuai kesanggupannya.", "proper noun kept");
eq(normalizeQuote("ilmu tanpa amal. AMAL tanpa ilmu."), "Ilmu tanpa amal. AMAL tanpa ilmu.", "mixed case left alone");
eq(normalizeQuote("JANGAN BERPUTUS ASA. TERUS BERUSAHA!"), "Jangan berputus asa. Terus berusaha!", "shouting -> sentence case");
eq(normalizeQuote("“stay hungry, stay foolish.”"), "“Stay hungry, stay foolish.”", "after opening quote mark");
eq(normalizeQuote("AI"), "AI", "short caps (acronym) kept");
eq(normalizeAuthor("steve jobs"), "Steve Jobs", "all lower -> title");
eq(normalizeAuthor("STEVE JOBS"), "Steve Jobs", "all upper -> title");
eq(normalizeAuthor("Imam al-Ghazali"), "Imam al-Ghazali", "mixed kept");
eq(normalizeAuthor("  tun dr. mahathir "), "Tun Dr. Mahathir", "spaces + title");
eq(normalizeTagName("  MOTIVASI "), "Motivasi", "tag upper");
eq(normalizeTagName("self   IMPROVEMENT"), "Self improvement", "tag mixed");
console.log("quote-text: ok");
