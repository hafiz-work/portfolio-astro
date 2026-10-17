// bun scripts/check-date-my.ts - dd/mm/yyyy parsing and the calendar grid.
import { expect } from "bun:test";
import { addMonths, dmyToIso, isoToDmy, monthGrid } from "../src/lib/date-my";

expect(isoToDmy("2027-02-08"), "iso -> dmy").toBe("08/02/2027");
expect(isoToDmy("bad"), "bad iso").toBe("");
expect(dmyToIso("08/02/2027"), "dmy").toBe("2027-02-08");
expect(dmyToIso("8/2/2027"), "short dmy").toBe("2027-02-08");
expect(dmyToIso("08-02-2027"), "dashes").toBe("2027-02-08");
expect(dmyToIso("08022027"), "digits only").toBe("2027-02-08");
expect(dmyToIso("29/02/2028"), "leap day").toBe("2028-02-29");
expect(dmyToIso("29/02/2027"), "not a leap year").toBeNull();
expect(dmyToIso("31/04/2026"), "31 April").toBeNull();
expect(dmyToIso("02/13/2026"), "month 13 (US order)").toBeNull();
expect(dmyToIso(""), "empty").toBeNull();
const oct = monthGrid(2026, 10); // 1 Oct 2026 is a Thursday
expect(oct.length, "grid size").toBe(42);
expect(oct[0].iso, "grid starts on Monday").toBe("2026-09-28");
expect(oct[3], "1 Oct on Thursday").toEqual({ iso: "2026-10-01", day: 1, inMonth: true });
expect(oct.filter((c) => c.inMonth).length, "31 days in Oct").toBe(31);
expect(addMonths("2026-01-31", 1), "clamp to Feb").toBe("2026-02-28");
expect(addMonths("2026-01-15", -1), "back a year").toBe("2025-12-15");
console.log("date-my: ok");
