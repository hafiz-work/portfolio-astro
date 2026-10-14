// Offline check for src/lib/ramalan-cuaca.ts parsers + src/data/cuaca-lokasi.ts.
// Run: bun scripts/check-ramalan-cuaca.ts
import { expect } from "bun:test";
import { LOKASI } from "../src/data/cuaca-lokasi.ts";
import { fromToday, parseMet, parseOpenMeteo, todayMY, wmoText } from "../src/lib/ramalan-cuaca.ts";

// MET: sorted oldest first, incomplete rows dropped, empty strings -> null.
const met = parseMet([
  { date: "2026-10-14", morning_forecast: "Tiada hujan", afternoon_forecast: "Ribut petir di beberapa tempat", night_forecast: "", summary_forecast: "Ribut petir di beberapa tempat", summary_when: "Petang", min_temp: 24, max_temp: 33 },
  { date: "2026-10-13", morning_forecast: null, afternoon_forecast: null, night_forecast: null, summary_forecast: "Tiada hujan", summary_when: "", min_temp: 23, max_temp: 32 },
  { date: "2026-10-15", morning_forecast: null, afternoon_forecast: null, night_forecast: null, summary_forecast: null, summary_when: null, min_temp: 24, max_temp: 32 },
]);
expect(met.map((d) => d.date)).toEqual(["2026-10-13", "2026-10-14"]);
expect(met[0]!.when).toBeNull();
expect(met[1]!.night).toBeNull();
expect(met[1]!.afternoon).toBe("Ribut petir di beberapa tempat");

// Open-Meteo: codes in Malay, rounded temperatures, missing values dropped.
const om = parseOpenMeteo({
  daily: { time: ["2026-10-13", "2026-10-14"], weather_code: [95, 3], temperature_2m_min: [23.6, 24.2], temperature_2m_max: [32.4, null as unknown as number] },
});
expect(om).toHaveLength(1);
expect(om[0]).toMatchObject({ summary: "Ribut petir", min: 24, max: 32, morning: null });
expect(parseOpenMeteo({})).toEqual([]);
expect(wmoText(12345)).toBe("Tiada maklumat");

// Stored copies never show past days.
expect(fromToday(met, "2026-10-14").map((d) => d.date)).toEqual(["2026-10-14"]);
expect(todayMY(new Date("2026-10-13T16:30:00Z"))).toBe("2026-10-14"); // 00:30 in KL

// Generated locations: unique ids, coordinates only inside Malaysia, the default exists.
const ids = new Set(LOKASI.map((l) => l.id));
expect(ids.size).toBe(LOKASI.length);
for (const l of LOKASI) {
  if (l.lat == null) continue;
  expect(l.lat > 0.8 && l.lat < 7.5 && l.lng! > 99.5 && l.lng! < 119.5).toBe(true);
}
expect(ids.has("Tn079")).toBe(true);

console.log(`ramalan-cuaca: ok (${LOKASI.length} lokasi, ${LOKASI.filter((l) => l.lat != null).length} with Plan B)`);
