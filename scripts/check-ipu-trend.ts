// bun scripts/check-ipu-trend.ts - APIMS trend rows -> 25 hourly slots, sparkline path.
import { sparkline, toTrend, TREND_HOURS } from "../src/lib/ipu";

const H = 3_600_000;
const end = Date.UTC(2026, 9, 17, 0); // 00:00 "MYT as UTC"
let fail = 0;
const ok = (cond: boolean, msg: string) => (cond ? console.log("ok  ", msg) : (fail++, console.error("FAIL", msg)));

const t = toTrend(
  [
    { STATION_ID: "CA17W", EPOCHDATE: end, API: 160 },
    { STATION_ID: "CA17W", EPOCHDATE: end - 24 * H, API: 172 },
    { STATION_ID: "CA17W", EPOCHDATE: end - 2 * H, API: -1 }, // invalid reading
    { STATION_ID: "CA17W", EPOCHDATE: end - 25 * H, API: 99 }, // outside the window
    { STATION_ID: "CA17W", EPOCHDATE: end + H, API: 99 }, // future
    { STATION_ID: "CA17W", EPOCHDATE: end - H / 2, API: 99 }, // not on the hour
    { STATION_ID: 5, EPOCHDATE: end, API: 1 }, // bad id
    { STATION_ID: "CA01R", EPOCHDATE: end - H, API: 40 },
  ],
  end,
)!;
const s = t.stations.CA17W;
ok(s.length === TREND_HOURS, "25 slots");
ok(s[24] === 160 && s[0] === 172, "newest last, oldest first");
ok(s[22] === null, "negative API -> null");
ok(s.filter((v) => v != null).length === 2, "out-of-window / off-hour rows dropped");
ok(Object.keys(t.stations).join() === "CA17W,CA01R", "non-string ids dropped");
ok(toTrend([], end) === null, "empty -> null");

const sp = sparkline([10, null, 30, 20], 30, 10)!;
ok(sp.min === 10 && sp.max === 30, "min/max");
ok(sp.d === "M0.0,10.0M20.0,0.0L30.0,5.0", `gap breaks the line (${sp.d})`);
ok(sparkline([5, null], 10, 10) === null, "one reading -> null");
ok(sparkline([5, 5], 10, 10)!.d === "M0.0,10.0L10.0,10.0", "flat series stays in the box");

if (fail) process.exit(1);
