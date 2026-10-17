// bun scripts/check-cukai-jalan.ts - LKM calculator vs JPJ's own guideline figures.
// A = docs/sources/jpj/lkm-petrol-diesel-bajet-2009.pdf, B = docs/sources/jpj/lkm-zev-2026-04-01.pdf.
// Neither guide has a worked example, so the expected values are JPJ's printed numbers:
// flat band rates, and each progressive band's top cc must land on the next band's
// printed "Kadar Asas" (the tables are continuous - a strong check on transcription).
import { expect } from "bun:test";
import { EV_CAR, lkm, type Input } from "../src/lib/cukai-jalan";

let n = 0;
const want = (i: Input, sen: number, what: string) => {
  const r = lkm(i);
  expect(r.ok ? r.sen : r.reason, what).toBe(sen);
  n++;
};
const refuse = (i: Input, what: string) => {
  const r = lkm(i);
  expect(r.ok && r.sen, `${what}: want refusal`).toBe(false);
  n++;
};
const car = (region: Input["region"], kind: Input["kind"], size: number, extra: Partial<Input> = {}): Input => ({
  region, kind, size, ev: false, ...extra,
});

// Semenanjung, saloon individu (AB) - A p1-2.
for (const [cc, sen] of [[1, 2000], [1000, 2000], [1001, 5500], [1200, 5500], [1201, 7000], [1400, 7000], [1401, 9000], [1600, 9000],
  [1800, 28000], [2000, 38000], [2500, 88000], [3000, 213000]]) want(car("semenanjung", "saloon-individu", cc), sen, `AB ${cc}cc`);
// Saloon syarikat (AC) - A p2.
for (const [cc, sen] of [[1000, 2000], [1001, 11000], [1201, 14000], [1600, 18000],
  [1800, 56000], [2000, 76000], [2500, 226000], [3000, 601000]]) want(car("semenanjung", "saloon-syarikat", cc), sen, `AC ${cc}cc`);
// Bukan saloon (AD/AE) - A p3.
for (const [cc, sen] of [[1000, 2000], [1001, 8500], [1201, 10000], [1600, 12000],
  [1800, 36000], [2000, 44000], [2500, 84000], [3000, 164000]]) want(car("semenanjung", "bukan-saloon", cc), sen, `AD ${cc}cc`);
// Motosikal - A p1. 150cc and below: "kadar sedia ada", not printed -> refused.
refuse(car("semenanjung", "motosikal", 150), "AA 150cc");
for (const [cc, sen] of [[151, 3000], [200, 3000], [201, 5000], [251, 18000], [500, 18000], [501, 25000], [800, 25000], [801, 35000]])
  want(car("semenanjung", "motosikal", cc), sen, `AA ${cc}cc`);

// Sabah - A p18-19 (AB/AC one table, owner does not matter), p19 (AD/AE).
for (const kind of ["saloon-individu", "saloon-syarikat"] as const)
  for (const [cc, sen] of [[1000, 2000], [1001, 4400], [1401, 7200], [1800, 22400], [2000, 27400], [2500, 52400], [3000, 102400]])
    want(car("sabah", kind, cc), sen, `Sabah ${kind} ${cc}cc`);
for (const [cc, sen] of [[1001, 4250], [1201, 5000], [1600, 6000], [1800, 19900], [2000, 24300], [2500, 46300], [3000, 90300]])
  want(car("sabah", "bukan-saloon", cc), sen, `Sabah AD ${cc}cc`);
for (const [cc, sen] of [[151, 900], [201, 1200], [251, 3000], [501, 4000], [801, 4200]]) want(car("sabah", "motosikal", cc), sen, `Sabah AA ${cc}cc`);
// p20 iii: Sabah diesel 4WD non-saloon stays at "kadar sedia ada" -> refused.
refuse(car("sabah", "bukan-saloon", 2000, { diesel4wd: true }), "Sabah diesel 4WD");

// Sarawak - A p29-30.
for (const [cc, sen] of [[1001, 4400], [1800, 22400], [3000, 102400]]) want(car("sarawak", "saloon-syarikat", cc), sen, `Sarawak AC ${cc}cc`);
want(car("sarawak", "bukan-saloon", 3000), 90300, "Sarawak AD 3000cc");
want(car("sarawak", "bukan-saloon", 2000, { diesel4wd: true }), 24300, "Sarawak diesel 4WD (no carve-out)");
want(car("sarawak", "motosikal", 250), 1200, "Sarawak AA 250cc");

// Langkawi & Pangkor - A p14: <=1000cc RM20, above that 50% of the Semenanjung rate.
for (const r of ["langkawi", "pangkor"] as const) {
  want(car(r, "saloon-individu", 1000), 2000, `${r} 1000cc`);
  want(car(r, "saloon-individu", 3000), 106500, `${r} AB 3000cc = 50% of RM2,130`);
  want(car(r, "saloon-syarikat", 1001), 5500, `${r} AC 1001cc = 50% of RM110`);
  want(car(r, "motosikal", 801), 17500, `${r} AA 801cc = 50% of RM350`);
  refuse(car(r, "motosikal", 125), `${r} AA 125cc`);
}
// Labuan - A p25: <=1000cc RM20, above that 50% of the Sabah petrol rate.
want(car("labuan", "saloon-individu", 1000), 2000, "Labuan 1000cc");
want(car("labuan", "saloon-individu", 1800), 11200, "Labuan AB 1800cc = 50% of RM224");
want(car("labuan", "bukan-saloon", 3000, { diesel4wd: true }), 45150, "Labuan AD 3000cc = 50% of Sabah petrol RM903");
want(car("labuan", "motosikal", 801), 2100, "Labuan AA 801cc = 50% of RM42");
// 50% of an odd-sen amount: JPJ states no rounding rule, we round half up and say so.
const odd = lkm(car("labuan", "saloon-individu", 1801));
expect(odd.ok && odd.rounded, "Labuan 1801cc should be flagged as rounded").toBe(true);

// EV cars (AB-AE, any owner) - B p1-3, by motor power in watts.
const ev = (region: Input["region"], kind: Input["kind"], w: number): Input => ({ region, kind, size: w, ev: true });
// Spot rows where B's step size changes (p2-3), so a mid-table typo is caught.
for (const [w, sen] of [[220000, 30500], [320000, 61500], [420000, 114000], [520000, 216500], [530000, 231500],
  [620000, 369000], [720000, 571500], [820000, 824000], [920000, 1126500]]) want(ev("semenanjung", "saloon-syarikat", w), sen, `EV ${w}W`);
for (const [w, sen] of [[1, 2000], [50000, 2000], [50001, 3000], [100000, 7000], [100001, 8000], [110001, 10000], [210001, 30500],
  [600000, 336500], [1000000, 1406500], [1010000, 1441500], [1010001, 2000000], [2000000, 2000000]])
  for (const kind of ["saloon-individu", "bukan-saloon"] as const) want(ev("semenanjung", kind, w), sen, `EV ${kind} ${w}W`);
want(ev("sabah", "saloon-syarikat", 150000), 16000, "EV Sabah 150kW");
want(ev("sarawak", "saloon-syarikat", 150000), 16000, "EV Sarawak 150kW");
// B p7 §12: Langkawi & Labuan 50%. Pangkor is not named for EVs -> refused.
want(ev("langkawi", "saloon-individu", 150000), 8000, "EV Langkawi 150kW");
want(ev("labuan", "saloon-individu", 50001), 1500, "EV Labuan 50.001kW");
refuse(ev("pangkor", "saloon-individu", 150000), "EV Pangkor");
// EV motorcycles - B p1: <=7,500W RM2 flat; above, base rate with a 50% exemption (§1.3).
want(ev("semenanjung", "motosikal", 7500), 200, "EV AA 7.5kW");
want(ev("semenanjung", "motosikal", 7501), 450, "EV AA 7.501kW = 50% of RM9");
want(ev("sabah", "motosikal", 40001), 2100, "EV AA >40kW = 50% of RM42");
want(ev("langkawi", "motosikal", 7500), 100, "EV AA Langkawi 7.5kW = 50% of RM2");
// §1.3 exemption + §12 island 50%: whether both apply is not stated -> refused.
refuse(ev("labuan", "motosikal", 10000), "EV AA Labuan >7.5kW");

// Table shape: B's bands run in 10,000 W steps from 50,000 W and never go down.
for (let i = 1; i < EV_CAR.bands.length - 1; i++) {
  const [a, b] = [EV_CAR.bands[i - 1], EV_CAR.bands[i]];
  expect(b.max, `EV band ${i} max`).toBe(a.max! + 10000);
  expect(b.sen!, `EV band ${i} goes down`).toBeGreaterThanOrEqual(a.sen!);
}

// Input validation.
for (const size of [0, -1, 1.5, NaN, Infinity]) refuse(car("semenanjung", "saloon-individu", size), `size ${size}`);

console.log(`check-cukai-jalan: ok (${n} cases)`);
