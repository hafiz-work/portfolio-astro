// bun scripts/check-rail-route.ts - rail journey planner (src/components/pengangkutan-awam/rail-route.ts)
// against the real network file public/data/pengangkutan-awam/rel.json.
import { expect } from "bun:test";
import { planRoute, sliceShape, stationNames, type RailStation } from "../src/components/pengangkutan-awam/rail-route";
import { distanceKm } from "../src/lib/geo";

const rel = (await Bun.file(new URL("../public/data/pengangkutan-awam/rel.json", import.meta.url)).json()) as { stations: RailStation[] };
const st = rel.stations;

// Same line: Kelana Jaya -> KLCC, no change, towards Gombak (KJ ids count down that way).
const kj = planRoute(st, "Kelana Jaya", "KLCC")!;
expect(kj.transfers, "KJ transfers").toBe(0);
expect(kj.legs.length, "KJ legs").toBe(1);
expect(kj.legs[0].line, "KJ line").toBe("KJ");
expect(kj.legs[0].towards.name, "KJ towards").toBe("Gombak");
expect(kj.stops, "KJ total stops").toBe(kj.legs[0].stops);
expect(kj.legs[0].path[0].name, "KJ path start").toBe("Kelana Jaya");
expect(kj.legs[0].path.at(-1)!.name, "KJ path end").toBe("KLCC");
expect(kj.legs[0].stops, "KJ stops = path - 1").toBe(kj.legs[0].path.length - 1);

// One transfer: Kelana Jaya line -> Ampang line, change at Masjid Jamek.
const ag = planRoute(st, "Kelana Jaya", "Ampang")!;
expect(ag.transfers, "KJ->AG transfers").toBe(1);
expect(ag.legs.map((l) => l.line), "KJ->AG lines").toEqual(["KJ", "AG"]);
expect(ag.legs[0].to.name, "KJ->AG change station").toBe("Masjid Jamek");
expect(ag.legs[1].towards.name, "AG towards").toBe("Ampang");
expect(ag.stops, "KJ->AG total stops").toBe(ag.legs[0].stops + ag.legs[1].stops);

// Shared AG/SP trunk: Sentul Timur -> Bukit Jalil stays on the Sri Petaling line (no needless change).
expect(planRoute(st, "Sentul Timur", "Bukit Jalil")!.transfers, "SP direct").toBe(0);

// Start at an interchange: no transfer counted for picking the right platform.
expect(planRoute(st, "Masjid Jamek", "Ampang")!.transfers, "start at interchange").toBe(0);

// Unknown / same station.
expect(planRoute(st, "Tiada Stesen", "KLCC"), "unknown from").toBeNull();
expect(planRoute(st, "KLCC", "Tiada Stesen"), "unknown to").toBeNull();
expect(planRoute(st, "KLCC", "KLCC"), "same station").toBeNull();

// Names deduped (interchanges once), sorted.
const names = stationNames(st);
expect(names.filter((n) => n === "Masjid Jamek").length, "dedupe Masjid Jamek").toBe(1);
expect(names.length, "names count").toBe(new Set(st.map((s) => s.name)).size);

// Shape slice: nearest vertices, either direction.
const shape: [number, number][] = [[0, 0], [1, 0], [2, 0], [3, 0]];
expect(sliceShape(shape, { lng: 0.9, lat: 0 }, { lng: 2.1, lat: 0 }), "slice forward").toEqual([[1, 0], [2, 0]]);
expect(sliceShape(shape, { lng: 3, lat: 0 }, { lng: 1, lat: 0 }), "slice backward").toEqual([[3, 0], [2, 0], [1, 0]]);

// Haversine: KLCC -> Masjid Jamek is about 1.9 km.
const d = distanceKm(3.1588, 101.7134, 3.1497, 101.6964);
expect(d, "distanceKm").toBeGreaterThanOrEqual(1.7);
expect(d, "distanceKm").toBeLessThanOrEqual(2.2);

// Interchanges joined by the cleaned names (shapes.py): KL Sentral (KJ <-> Monorail), USJ 7 (KJ <-> BRT).
const mono = planRoute(st, "Kelana Jaya", "Tun Sambanthan")!;
expect(mono.legs.some((l) => l.to.name === "KL Sentral" || l.from.name === "KL Sentral"), "KL Sentral transfer").toBe(true);
expect(planRoute(st, "Kelana Jaya", "Sunway Lagoon"), "USJ 7 links the BRT").not.toBeNull();
console.log("check-rail-route: ok", `KJ->AG ${ag.stops} stops via ${ag.legs[0].to.name}`);
