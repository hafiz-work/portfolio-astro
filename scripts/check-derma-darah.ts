// Offline check for src/lib/derma-darah.ts (parsing/validation of data.gov.my blood_donations).
// Run: bun scripts/check-derma-darah.ts
// Fixture: real rows from api.data.gov.my/data-catalogue?id=blood_donations&sort=-date&limit=155,
// fetched 2026-10-14 (every blood type for 13 + 12 Okt 2026, "all" back to 13 Sep 2026), in the API's own order.
import { expect } from "bun:test";
import { dayLabel, parseDonations } from "../src/lib/derma-darah.ts";

const rows = [
  { date: "2026-10-13", donations: 407, blood_type: "b" },
  { date: "2026-10-13", donations: 561, blood_type: "o" },
  { date: "2026-10-13", donations: 1363, blood_type: "all" },
  { date: "2026-10-13", donations: 78, blood_type: "ab" },
  { date: "2026-10-13", donations: 317, blood_type: "a" },
  { date: "2026-10-12", donations: 313, blood_type: "b" },
  { date: "2026-10-12", donations: 1111, blood_type: "all" },
  { date: "2026-10-12", donations: 440, blood_type: "o" },
  { date: "2026-10-12", donations: 258, blood_type: "a" },
  { date: "2026-10-12", donations: 100, blood_type: "ab" },
  { date: "2026-10-11", donations: 2501, blood_type: "all" },
  { date: "2026-10-10", donations: 2077, blood_type: "all" },
  { date: "2026-10-09", donations: 903, blood_type: "all" },
  { date: "2026-10-08", donations: 1560, blood_type: "all" },
  { date: "2026-10-07", donations: 1347, blood_type: "all" },
  { date: "2026-10-06", donations: 1288, blood_type: "all" },
  { date: "2026-10-05", donations: 825, blood_type: "all" },
  { date: "2026-10-04", donations: 2572, blood_type: "all" },
  { date: "2026-10-03", donations: 2021, blood_type: "all" },
  { date: "2026-10-02", donations: 903, blood_type: "all" },
  { date: "2026-10-01", donations: 1644, blood_type: "all" },
  { date: "2026-09-30", donations: 1750, blood_type: "all" },
  { date: "2026-09-29", donations: 1276, blood_type: "all" },
  { date: "2026-09-28", donations: 982, blood_type: "all" },
  { date: "2026-09-27", donations: 2739, blood_type: "all" },
  { date: "2026-09-26", donations: 2046, blood_type: "all" },
  { date: "2026-09-25", donations: 892, blood_type: "all" },
  { date: "2026-09-24", donations: 1616, blood_type: "all" },
  { date: "2026-09-23", donations: 1432, blood_type: "all" },
  { date: "2026-09-22", donations: 1303, blood_type: "all" },
  { date: "2026-09-21", donations: 1048, blood_type: "all" },
  { date: "2026-09-20", donations: 2943, blood_type: "all" },
  { date: "2026-09-19", donations: 1979, blood_type: "all" },
  { date: "2026-09-18", donations: 1094, blood_type: "all" },
  { date: "2026-09-17", donations: 1605, blood_type: "all" },
  { date: "2026-09-16", donations: 3264, blood_type: "all" },
  { date: "2026-09-15", donations: 1825, blood_type: "all" },
  { date: "2026-09-14", donations: 1070, blood_type: "all" },
  { date: "2026-09-13", donations: 2815, blood_type: "all" },
];

const got = parseDonations(rows)!;
expect(got.date).toBe("2026-10-13"); // newest date wins
expect(got.total).toBe(1363);
// Fixed order A, B, AB, O with Malay labels.
expect(got.types).toEqual([
  { type: "a", label: "A", donations: 317 },
  { type: "b", label: "B", donations: 407 },
  { type: "ab", label: "AB", donations: 78 },
  { type: "o", label: "O", donations: 561 },
]);
// Trend: the 30 newest "all" days, oldest first (13 Sep drops off).
expect(got.trend.length).toBe(30);
expect(got.trend[0].date).toBe("2026-09-14");
expect(got.trend.at(-1)).toEqual({ date: "2026-10-13", donations: 1363 });
expect(got.trend.find((t) => t.date === "2026-10-12")!.donations).toBe(1111);

// Order of the response doesn't matter.
expect(parseDonations([...rows].reverse())!.date).toBe("2026-10-13");

// Malformed responses are rejected (null -> next plan, never cached).
const bad = (patch: Record<string, unknown>) => parseDonations([...rows, { ...rows[0], ...patch }]);
expect(parseDonations(null)).toBeNull();
expect(parseDonations({ rows })).toBeNull(); // not an array
expect(parseDonations([])).toBeNull();
expect(bad({ donations: null })).toBeNull();
expect(bad({ donations: "407" })).toBeNull();
expect(bad({ donations: -1 })).toBeNull();
expect(bad({ donations: 1.5 })).toBeNull();
expect(bad({ date: "2026-10" })).toBeNull();
expect(bad({ blood_type: "rh" })).toBeNull();
expect(bad({ blood_type: "constructor" })).toBeNull(); // prototype key, not a blood type
// Latest date missing a blood type -> incomplete day, rejected.
expect(parseDonations(rows.filter((r) => !(r.date === "2026-10-13" && r.blood_type === "ab")))).toBeNull();

expect(dayLabel("2026-10-13")).toBe("13 Oktober 2026");

console.log("derma-darah: ok");
