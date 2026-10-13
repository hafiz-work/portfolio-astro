// Offline check for the Hijri <-> Masihi converter (src/lib/hari-kebesaran.ts).
// Run: bun scripts/check-tarikh-hijri.ts
import { expect } from "bun:test";

// Fixture: JAKIM takwim for 2026 = Umm al-Qura one day later until 2026-10-11, then
// the same (matches JAKIM on 2026-10-11 = 29 Rabiulakhir 1448 and 1 Ramadan 1447 =
// 2026-02-19), so Rabiulakhir 1448 has 29 days here but 30 in Umm al-Qura.
const uq = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" });
const hijriOf = (t: number) => {
  const p = Object.fromEntries(uq.formatToParts(new Date(t)).map((x) => [x.type, x.value]));
  return `${parseInt(p.relatedYear ?? p.year, 10)}-${p.month}-${p.day}`;
};
const start = Date.parse("2026-01-01T00:00:00Z");
const rows = Array.from({ length: 365 }, (_, i) => ({ hijri: hijriOf(start + (i < 284 ? i - 1 : i) * 86_400_000) }));
let online = true;
globalThis.fetch = (async () => {
  if (!online) throw new Error("offline");
  return Response.json({ status: "OK!", prayerTime: rows });
}) as unknown as typeof fetch;

const { toHijri, toMasihi } = await import("../src/lib/hari-kebesaran.ts");
const today = "2026-10-11";

// JAKIM pair, both ways.
expect(await toHijri("2026-10-11", today)).toEqual({ masihi: "2026-10-11", hijri: "1448-04-29", source: "jakim" });
expect(await toMasihi("1448-04-29", today)).toEqual({ masihi: "2026-10-11", hijri: "1448-04-29", source: "jakim" });
expect(await toMasihi("1447-09-01", today)).toEqual({ masihi: "2026-02-19", hijri: "1447-09-01", source: "jakim" });
// JAKIM's month length wins over Umm al-Qura's.
expect("error" in (await toMasihi("1448-04-30", today))).toBe(true);

// Outside JAKIM's year -> Umm al-Qura estimate, flagged.
const est = await toHijri("2027-02-08", today);
expect(est).toEqual({ masihi: "2027-02-08", hijri: "1448-09-01", source: "anggaran" });
expect(await toMasihi("1448-09-01", today)).toEqual({ masihi: "2027-02-08", hijri: "1448-09-01", source: "anggaran" });
// Round trip on estimates across a wide range.
for (let t = Date.parse("1950-03-07T00:00:00Z"); t < Date.parse("2090-01-01T00:00:00Z"); t += 997 * 86_400_000) {
  const ymd = new Date(t).toISOString().slice(0, 10);
  const h = await toHijri(ymd, today);
  if ("error" in h) throw new Error(`${ymd}: ${h.error}`);
  expect((await toMasihi(h.hijri, today)) as unknown).toEqual(h);
}

// Impossible / out-of-range input.
for (const bad of ["1448-13-01", "1448-00-10", "1448-04-31", "1448-04-00", "1200-01-01", "1700-01-01"]) {
  expect("error" in (await toMasihi(bad, today))).toBe(true);
}
for (const bad of ["1800-01-01", "2026-02-30", "2200-01-01"]) {
  expect("error" in (await toHijri(bad, today))).toBe(true);
}

// JAKIM down: same date falls back to the estimate.
online = false;
expect(await toHijri("2026-10-11", today)).toEqual({ masihi: "2026-10-11", hijri: "1448-04-30", source: "anggaran" });

expect(await toMasihi("1448-04-30", today)).toEqual({ masihi: "2026-10-11", hijri: "1448-04-30", source: "anggaran" });

console.log("tarikh-hijri: ok");
