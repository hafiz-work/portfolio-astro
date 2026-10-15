// bun scripts/check-kecemasan.ts - every emergency number has an official https
// source, a sane dial string, and was verified in the last 6 months.
import { KECEMASAN, dialString, telHref, vcard } from "../src/data/kecemasan";

const MAX_AGE_DAYS = 183;
const today = Date.parse(new Date().toISOString().slice(0, 10));
const errors: string[] = [];
const seen = new Set<string>();

for (const g of KECEMASAN) {
  for (const c of g.contacts) {
    const at = `${g.id} / ${c.name}`;
    if (!c.number && !c.href) errors.push(`${at}: no number or link`);
    if (!/^https:\/\//.test(c.source)) errors.push(`${at}: source must be an https URL`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(c.verified)) errors.push(`${at}: verified must be YYYY-MM-DD`);
    const age = (today - Date.parse(c.verified)) / 86_400_000;
    if (age > MAX_AGE_DAYS) errors.push(`${at}: verified ${c.verified} (${Math.round(age)} days ago) - re-check against ${c.source}`);
    if (c.number) {
      const d = dialString(c.number);
      // "+603 2178 8888" (as some banks write it) is the same line as "03-2178 8888".
      if (!/^(\+60\d{8,10}|\d{3,12})$/.test(d)) errors.push(`${at}: odd number "${c.number}"`);
      const key = d.replace(/^\+60/, "0");
      if (seen.has(key)) errors.push(`${at}: duplicate number ${c.number}`);
      seen.add(key);
    }
  }
}
if (dialString("1-800-88-0000") !== "1800880000" || dialString("03-7627 2929") !== "0376272929") errors.push("dialString");
for (const [n, want] of [["+603 6204 7788", "tel:+60362047788"], ["+6 03-2612 8100", "tel:+60326128100"], ["999", "tel:999"], ["15999", "tel:15999"], ["1-800-88-0000", "tel:1800880000"], ["03-7627 2929", "tel:+60376272929"], ["088-232440", "tel:+6088232440"]]) {
  if (telHref(n) !== want) errors.push(`telHref(${n}) = ${telHref(n)}, want ${want}`);
}
// vCard: CRLF, escaped , ; \ and newlines, number in +60 form.
const vc = vcard({ id: "t", title: "A, B", short: "", contacts: [] }, { name: "X; Y", number: "03-2178 8888", note: "a\nb", source: "https://x.my", verified: "2026-01-01" });
for (const want of ["FN:X\\; Y\r\n", "ORG:A\\, B", "TEL;TYPE=WORK,VOICE:+60321788888", "NOTE:a\\nb\\nSumber", "END:VCARD\r\n"]) {
  if (!vc.includes(want)) errors.push(`vcard missing ${JSON.stringify(want)}`);
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log(`kecemasan: ok (${seen.size} numbers)`);
