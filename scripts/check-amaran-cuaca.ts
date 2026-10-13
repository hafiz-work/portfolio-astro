// Offline check for src/lib/amaran-cuaca.ts parsing + expiry filter.
// Run: bun scripts/check-amaran-cuaca.ts
import { expect } from "bun:test";
import { activeWarnings, parseWarnings } from "../src/lib/amaran-cuaca.ts";

const row = (issued: string, from: string, to: string | null, title = "Amaran Ribut Petir") => ({
  warning_issue: { issued, title_bm: title },
  valid_from: to ? from : null,
  valid_to: to,
  text_bm: "Ribut petir dijangka.",
  instruction_bm: null,
});
const list = parseWarnings([
  row("2026-10-11T14:00:00", "2026-10-10T00:00:00", "2026-10-14T23:59:00", "Amaran Angin Kencang"),
  row("2026-10-11T16:45:00", "2026-10-11T16:00:00", "2026-10-11T20:00:00"),
  row("2026-10-11T17:30:00", "", null, "Tiada Nasihat"), // no advisory -> dropped
]);
expect(list.map((w) => w.title)).toEqual(["Amaran Angin Kencang", "Amaran Ribut Petir"]);

// 19:59 MYT = 11:59Z: both active, newest issue first.
expect(activeWarnings(list, Date.parse("2026-10-11T11:59:00Z")).map((w) => w.issued)).toEqual([
  "2026-10-11T16:45:00",
  "2026-10-11T14:00:00",
]);
// 20:01 MYT: the 20:00 warning has expired (times are MYT, not UTC).
expect(activeWarnings(list, Date.parse("2026-10-11T12:01:00Z")).length).toBe(1);
expect(activeWarnings(list, Date.parse("2026-10-15T00:00:00+08:00"))).toEqual([]);

console.log("amaran-cuaca: ok");
