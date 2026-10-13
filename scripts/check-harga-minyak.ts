// Offline check for the parts of src/lib/harga-minyak.ts that do arithmetic/parsing.
// Run: bun scripts/check-harga-minyak.ts
import { expect } from "bun:test";
import { linePath, parseFuelCsv, priceAxis, weeklyChange } from "../src/lib/harga-minyak.ts";

const csv = `series_type,date,ron95,ron97,diesel,diesel_eastmsia,ron95_budi95,ron95_skps,diesel_skds,diesel_budi
level,2026-09-24,4.57,5.05,5.42,2.15,1.99,2.05,2.15,2.1
change_weekly,2026-10-01,-0.05,-0.05,-0.15,0,0,0,0,0
level,2026-10-01,4.52,5.0,5.27,2.15,1.99,2.05,2.15,2.1
level,2026-10-08,4.67,5.15,5.27,2.15,1.99,2.05,2.15,2.1
level,2017-03-30,2.13,2.41,2.11,2.11,,,,`;

const weeks = parseFuelCsv(csv, 3);
expect(weeks.map((w) => w.date)).toEqual(["2026-10-08", "2026-10-01", "2026-09-24"]); // newest first, levels only
expect(weeks[0].ron95).toBe(4.67);
expect(parseFuelCsv(csv).at(-1)!.ron95_budi95).toBeNull(); // empty CSV cell -> null
expect(weeklyChange(weeks, "ron95")).toBe(0.15); // 4.67 - 4.52, rounded to sen
expect(weeklyChange(weeks, "diesel")).toBe(0);
expect(weeklyChange(weeks.slice(0, 1), "ron95")).toBeNull(); // no previous week

// Chart axis: padded past the data, clean ticks, flat series still gets a range.
expect(priceAxis([4.52, 4.67, 5.27])).toEqual({ min: 4.4, max: 5.4, ticks: [4.4, 4.6, 4.8, 5, 5.2, 5.4] });
expect(priceAxis([2.15, 2.15])).toEqual({ min: 2.1, max: 2.2, ticks: [2.1, 2.15, 2.2] }); // flat -> no zero height
expect(priceAxis([2, 2]).min).toBeLessThan(2); // a value on a tick still gets padding
// Line path: gaps (null) restart the line with M.
expect(linePath([[0, 1], [2, 3], null, [4, 5], [6, 7]])).toBe("M0.0,1.0L2.0,3.0M4.0,5.0L6.0,7.0");
expect(linePath([null, null])).toBe("");

console.log("harga-minyak: ok");
