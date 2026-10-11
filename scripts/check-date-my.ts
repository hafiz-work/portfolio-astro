// bun scripts/check-date-my.ts - dd/mm/yyyy parsing and the calendar grid.
import { addMonths, dmyToIso, isoToDmy, monthGrid } from "../src/lib/date-my";

const eq = (got: unknown, want: unknown, what: string) => {
  if (JSON.stringify(got) !== JSON.stringify(want)) throw new Error(`${what}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
};
eq(isoToDmy("2027-02-08"), "08/02/2027", "iso -> dmy");
eq(isoToDmy("bad"), "", "bad iso");
eq(dmyToIso("08/02/2027"), "2027-02-08", "dmy");
eq(dmyToIso("8/2/2027"), "2027-02-08", "short dmy");
eq(dmyToIso("08-02-2027"), "2027-02-08", "dashes");
eq(dmyToIso("08022027"), "2027-02-08", "digits only");
eq(dmyToIso("29/02/2028"), "2028-02-29", "leap day");
eq(dmyToIso("29/02/2027"), null, "not a leap year");
eq(dmyToIso("31/04/2026"), null, "31 April");
eq(dmyToIso("02/13/2026"), null, "month 13 (US order)");
eq(dmyToIso(""), null, "empty");
const oct = monthGrid(2026, 10); // 1 Oct 2026 is a Thursday
eq(oct.length, 42, "grid size");
eq(oct[0].iso, "2026-09-28", "grid starts on Monday");
eq(oct[3], { iso: "2026-10-01", day: 1, inMonth: true }, "1 Oct on Thursday");
eq(oct.filter((c) => c.inMonth).length, 31, "31 days in Oct");
eq(addMonths("2026-01-31", 1), "2026-02-28", "clamp to Feb");
eq(addMonths("2026-01-15", -1), "2025-12-15", "back a year");
console.log("date-my: ok");
