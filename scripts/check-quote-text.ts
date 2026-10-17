// bun scripts/check-quote-text.ts - quote/author tidying keeps proper nouns.
import { expect } from "bun:test";
import { normalizeAuthor, normalizeQuote, normalizeTagName } from "../src/lib/quote-text";

expect(normalizeQuote("  sabar itu   indah "), "spaces + first letter").toBe("Sabar itu indah");
expect(normalizeQuote("Allah tidak membebani seseorang melainkan sesuai kesanggupannya."), "proper noun kept").toBe("Allah tidak membebani seseorang melainkan sesuai kesanggupannya.");
expect(normalizeQuote("ilmu tanpa amal. AMAL tanpa ilmu."), "mixed case left alone").toBe("Ilmu tanpa amal. AMAL tanpa ilmu.");
expect(normalizeQuote("JANGAN BERPUTUS ASA. TERUS BERUSAHA!"), "shouting -> sentence case").toBe("Jangan berputus asa. Terus berusaha!");
expect(normalizeQuote("“stay hungry, stay foolish.”"), "after opening quote mark").toBe("“Stay hungry, stay foolish.”");
expect(normalizeQuote("AI"), "short caps (acronym) kept").toBe("AI");
expect(normalizeAuthor("steve jobs"), "all lower -> title").toBe("Steve Jobs");
expect(normalizeAuthor("STEVE JOBS"), "all upper -> title").toBe("Steve Jobs");
expect(normalizeAuthor("Imam al-Ghazali"), "mixed kept").toBe("Imam al-Ghazali");
expect(normalizeAuthor("  tun dr. mahathir "), "spaces + title").toBe("Tun Dr. Mahathir");
expect(normalizeTagName("  MOTIVASI "), "tag upper").toBe("Motivasi");
expect(normalizeTagName("self   IMPROVEMENT"), "tag mixed").toBe("Self improvement");
console.log("quote-text: ok");
