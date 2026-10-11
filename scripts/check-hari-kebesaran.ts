// Offline check for src/lib/hari-kebesaran.ts (JAKIM unreachable -> Umm al-Qura estimates).
// Run: bun scripts/check-hari-kebesaran.ts
import { expect } from "bun:test";

globalThis.fetch = (() => Promise.reject(new Error("offline"))) as unknown as typeof fetch;
const { getUpcomingEvents, EVENTS } = await import("../src/lib/hari-kebesaran.ts");

const events = await getUpcomingEvents("2026-10-11");
const by = Object.fromEntries(events.map((e) => [e.key, e]));

expect(events.length).toBe(EVENTS.length);
expect(events.every((e) => e.source === "anggaran")).toBe(true);
// Soonest first, all on/after today.
expect(events.map((e) => e.daysLeft)).toEqual([...events.map((e) => e.daysLeft)].sort((a, b) => a - b));
expect(by.ramadan.date).toBe("2027-02-08");
expect(by.aidilfitri.date).toBe("2027-03-09");
expect(by.aidiladha.date).toBe("2027-05-16");
expect(by.ramadan.hijriYear).toBe(1448);
// An event on "today" counts with 0 days left.
const onRamadan = await getUpcomingEvents("2027-02-08");
expect(onRamadan.find((e) => e.key === "ramadan")?.daysLeft).toBe(0);

console.log("hari-kebesaran: ok");
