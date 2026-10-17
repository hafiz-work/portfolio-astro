// bun scripts/check-rail-route.ts - rail journey planner (src/components/pengangkutan-awam/rail-route.ts)
// against the real network file public/data/pengangkutan-awam/rel.json.
import { distanceKm, planRoute, sliceShape, stationNames, type RailStation } from "../src/components/pengangkutan-awam/rail-route";

const rel = (await Bun.file(new URL("../public/data/pengangkutan-awam/rel.json", import.meta.url)).json()) as { stations: RailStation[] };
const st = rel.stations;
const eq = (a: unknown, b: unknown, what: string) => {
  if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${what}: got ${JSON.stringify(a)}, want ${JSON.stringify(b)}`);
};

// Same line: Kelana Jaya -> KLCC, no change, towards Gombak (KJ ids count down that way).
const kj = planRoute(st, "Kelana Jaya", "KLCC")!;
eq(kj.transfers, 0, "KJ transfers");
eq(kj.legs.length, 1, "KJ legs");
eq(kj.legs[0].line, "KJ", "KJ line");
eq(kj.legs[0].towards.name, "Gombak", "KJ towards");
eq(kj.stops, kj.legs[0].stops, "KJ total stops");
eq(kj.legs[0].path[0].name, "Kelana Jaya", "KJ path start");
eq(kj.legs[0].path.at(-1)!.name, "KLCC", "KJ path end");
eq(kj.legs[0].stops, kj.legs[0].path.length - 1, "KJ stops = path - 1");

// One transfer: Kelana Jaya line -> Ampang line, change at Masjid Jamek.
const ag = planRoute(st, "Kelana Jaya", "Ampang")!;
eq(ag.transfers, 1, "KJ->AG transfers");
eq(ag.legs.map((l) => l.line), ["KJ", "AG"], "KJ->AG lines");
eq(ag.legs[0].to.name, "Masjid Jamek", "KJ->AG change station");
eq(ag.legs[1].towards.name, "Ampang", "AG towards");
eq(ag.stops, ag.legs[0].stops + ag.legs[1].stops, "KJ->AG total stops");

// Shared AG/SP trunk: Sentul Timur -> Bukit Jalil stays on the Sri Petaling line (no needless change).
eq(planRoute(st, "Sentul Timur", "Bukit Jalil")!.transfers, 0, "SP direct");

// Start at an interchange: no transfer counted for picking the right platform.
eq(planRoute(st, "Masjid Jamek", "Ampang")!.transfers, 0, "start at interchange");

// Unknown / same station.
eq(planRoute(st, "Tiada Stesen", "KLCC"), null, "unknown from");
eq(planRoute(st, "KLCC", "Tiada Stesen"), null, "unknown to");
eq(planRoute(st, "KLCC", "KLCC"), null, "same station");

// Names deduped (interchanges once), sorted.
const names = stationNames(st);
eq(names.filter((n) => n === "Masjid Jamek").length, 1, "dedupe Masjid Jamek");
eq(names.length, new Set(st.map((s) => s.name)).size, "names count");

// Shape slice: nearest vertices, either direction.
const shape: [number, number][] = [[0, 0], [1, 0], [2, 0], [3, 0]];
eq(sliceShape(shape, { lng: 0.9, lat: 0 }, { lng: 2.1, lat: 0 }), [[1, 0], [2, 0]], "slice forward");
eq(sliceShape(shape, { lng: 3, lat: 0 }, { lng: 1, lat: 0 }), [[3, 0], [2, 0], [1, 0]], "slice backward");

// Haversine: KLCC -> Masjid Jamek is about 1.9 km.
const d = distanceKm(3.1588, 101.7134, 3.1497, 101.6964);
if (d < 1.7 || d > 2.2) throw new Error(`distanceKm ${d}`);

// Interchanges joined by the cleaned names (shapes.py): KL Sentral (KJ <-> Monorail), USJ 7 (KJ <-> BRT).
const mono = planRoute(st, "Kelana Jaya", "Tun Sambanthan")!;
eq(mono.legs.some((l) => l.to.name === "KL Sentral" || l.from.name === "KL Sentral"), true, "KL Sentral transfer");
eq(planRoute(st, "Kelana Jaya", "Sunway Lagoon") === null, false, "USJ 7 links the BRT");
console.log("check-rail-route: ok", `KJ->AG ${ag.stops} stops via ${ag.legs[0].to.name}`);
