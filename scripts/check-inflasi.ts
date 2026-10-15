// Offline check for src/lib/inflasi.ts (parsing/validation of data.gov.my cpi_headline_inflation).
// Run: bun scripts/check-inflasi.ts
// Fixture: real rows from api.data.gov.my/data-catalogue?id=cpi_headline_inflation&sort=-date,
// fetched 2026-10-14 (all of Ogos 2026 + "overall" back to Ogos 2025), in the API's own order.
import { expect } from "bun:test";
import { monthLabel, parseInflation } from "../src/lib/inflasi.ts";

const rows = [
  { date: "2026-08-01", division: "03", inflation_mom: 0.0, inflation_yoy: 0.1 },
  { date: "2026-08-01", division: "02", inflation_mom: 0.1, inflation_yoy: 2.8 },
  { date: "2026-08-01", division: "09", inflation_mom: 0.1, inflation_yoy: 1.1 },
  { date: "2026-08-01", division: "overall", inflation_mom: 0.3, inflation_yoy: 1.9 },
  { date: "2026-08-01", division: "11", inflation_mom: 0.4, inflation_yoy: 2.1 },
  { date: "2026-08-01", division: "01", inflation_mom: 0.2, inflation_yoy: 1.9 },
  { date: "2026-08-01", division: "10", inflation_mom: 0.1, inflation_yoy: 1.9 },
  { date: "2026-08-01", division: "04", inflation_mom: 0.4, inflation_yoy: 2.1 },
  { date: "2026-08-01", division: "06", inflation_mom: 0.2, inflation_yoy: 1.3 },
  { date: "2026-08-01", division: "12", inflation_mom: 0.0, inflation_yoy: 1.0 },
  { date: "2026-08-01", division: "07", inflation_mom: 0.6, inflation_yoy: 2.0 },
  { date: "2026-08-01", division: "13", inflation_mom: 0.5, inflation_yoy: 3.2 },
  { date: "2026-08-01", division: "08", inflation_mom: 0.0, inflation_yoy: 2.6 },
  { date: "2026-08-01", division: "05", inflation_mom: 0.2, inflation_yoy: 0.4 },
  { date: "2026-07-01", division: "overall", inflation_mom: 0.0, inflation_yoy: 1.8 },
  { date: "2026-06-01", division: "overall", inflation_mom: 0.0, inflation_yoy: 1.9 },
  { date: "2026-05-01", division: "overall", inflation_mom: 0.1, inflation_yoy: 2.0 },
  { date: "2026-04-01", division: "overall", inflation_mom: 0.4, inflation_yoy: 1.9 },
  { date: "2026-03-01", division: "overall", inflation_mom: 0.3, inflation_yoy: 1.7 },
  { date: "2026-02-01", division: "overall", inflation_mom: 0.2, inflation_yoy: 1.4 },
  { date: "2026-01-01", division: "overall", inflation_mom: 0.1, inflation_yoy: 1.6 },
  { date: "2025-12-01", division: "overall", inflation_mom: 0.3, inflation_yoy: 1.6 },
  { date: "2025-11-01", division: "overall", inflation_mom: 0.0, inflation_yoy: 1.4 },
  { date: "2025-10-01", division: "overall", inflation_mom: -0.1, inflation_yoy: 1.3 },
  { date: "2025-09-01", division: "overall", inflation_mom: 0.2, inflation_yoy: 1.5 },
  { date: "2025-08-01", division: "overall", inflation_mom: 0.1, inflation_yoy: 1.3 },
];

const got = parseInflation(rows)!;
expect(got.month).toBe("2026-08-01"); // newest month wins
expect(got.overall).toEqual({ mom: 0.3, yoy: 1.9 });
// 13 divisions in code order 01..13, named from data.gov.my's Malay labels.
expect(got.divisions.map((d) => d.code)).toEqual(["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12", "13"]);
expect(got.divisions[0]).toEqual({ code: "01", name: "Makanan & Minuman", mom: 0.2, yoy: 1.9 });
expect(got.divisions[12].yoy).toBe(3.2);
// Trend: 12 newest "overall" months, oldest first (Ogos 2025 drops off).
expect(got.trend.length).toBe(12);
expect(got.trend[0]).toEqual({ month: "2025-09-01", yoy: 1.5 });
expect(got.trend.at(-1)).toEqual({ month: "2026-08-01", yoy: 1.9 });

// Order of the response doesn't matter.
expect(parseInflation([...rows].reverse())!.month).toBe("2026-08-01");

// Malformed responses are rejected (null -> next plan, never cached).
const bad = (patch: Record<string, unknown>) => parseInflation([...rows, { ...rows[0], ...patch }]); // complete month + one bad row
expect(parseInflation(null)).toBeNull();
expect(parseInflation({ rows })).toBeNull(); // not an array
expect(parseInflation([])).toBeNull();
expect(bad({ inflation_yoy: null })).toBeNull();
expect(bad({ inflation_mom: "0.1" })).toBeNull();
expect(bad({ date: "2026-08" })).toBeNull();
expect(bad({ division: "14" })).toBeNull();
expect(bad({ division: "constructor" })).toBeNull(); // prototype key, not a division
// Latest month missing a division -> incomplete release, rejected.
expect(parseInflation(rows.filter((r) => r.division !== "07"))).toBeNull();

expect(monthLabel("2026-08-01")).toBe("Ogos 2026");

console.log("inflasi: ok");
