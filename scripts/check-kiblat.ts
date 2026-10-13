// bun scripts/check-kiblat.ts - qibla bearing vs JAKIM's published zone bearings.
import { KAABAH, formatBearing, qiblaBearing, qiblaDistanceKm, qiblaPath } from "../src/lib/kiblat";

const near = (a: number, b: number, tol: number, what: string) => {
  if (Math.abs(a - b) > tol) throw new Error(`${what}: got ${a.toFixed(3)}, want ${b} ±${tol}`);
};
// JAKIM e-solat zone bearings (checked 2026-10-11): WLY01 292°31′16″, SBH07 290°40′37″.
// Zones are areas, so a city point lands within a degree of the zone figure.
near(qiblaBearing(3.139, 101.6869), 292.52, 0.2, "Kuala Lumpur");
near(qiblaBearing(5.9804, 116.0735), 290.68, 1, "Kota Kinabalu");
near(qiblaDistanceKm(3.139, 101.6869), 7000, 200, "KL distance km");
if (formatBearing(292.5211) !== "292° 31′") throw new Error(formatBearing(292.5211));
if (formatBearing(359.999) !== "0° 00′") throw new Error(formatBearing(359.999));
// Great-circle path: starts here, ends at the Kaabah, first leg heads along the bearing.
const path = qiblaPath(3.139, 101.6869);
near(path[0][0], 101.6869, 1e-6, "path start lng");
near(path.at(-1)![1], KAABAH.lat, 1e-6, "path end lat");
near(path.at(-1)![0], KAABAH.lng, 1e-6, "path end lng");
const [lng1, lat1] = path[1];
const firstLeg = (Math.atan2(lng1 - 101.6869, lat1 - 3.139) * 180) / Math.PI + 360;
near(firstLeg % 360, 292.5, 2, "first leg direction");
console.log("check-kiblat: ok", formatBearing(qiblaBearing(3.139, 101.6869)), Math.round(qiblaDistanceKm(3.139, 101.6869)), "km");
