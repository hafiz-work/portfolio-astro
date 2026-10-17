// bun scripts/check-kiblat.ts - qibla bearing vs JAKIM's published zone bearings.
import { expect } from "bun:test";
import { KAABAH, formatBearing, qiblaBearing, qiblaDistanceKm, qiblaPath } from "../src/lib/kiblat";

// JAKIM e-solat zone bearings (checked 2026-10-11): WLY01 292°31′16″, SBH07 290°40′37″.
// Zones are areas, so a city point lands within a degree of the zone figure.
expect(qiblaBearing(3.139, 101.6869), "Kuala Lumpur").toBeWithin(292.52 - 0.2, 292.52 + 0.2);
expect(qiblaBearing(5.9804, 116.0735), "Kota Kinabalu").toBeWithin(290.68 - 1, 290.68 + 1);
expect(qiblaDistanceKm(3.139, 101.6869), "KL distance km").toBeWithin(7000 - 200, 7000 + 200);
expect(formatBearing(292.5211), "formatBearing 292.5211").toBe("292° 31′");
expect(formatBearing(359.999), "formatBearing 359.999").toBe("0° 00′");
// Great-circle path: starts here, ends at the Kaabah, first leg heads along the bearing.
const path = qiblaPath(3.139, 101.6869);
expect(path[0][0], "path start lng").toBeWithin(101.6869 - 1e-6, 101.6869 + 1e-6);
expect(path.at(-1)![1], "path end lat").toBeWithin(KAABAH.lat - 1e-6, KAABAH.lat + 1e-6);
expect(path.at(-1)![0], "path end lng").toBeWithin(KAABAH.lng - 1e-6, KAABAH.lng + 1e-6);
const [lng1, lat1] = path[1];
const firstLeg = (Math.atan2(lng1 - 101.6869, lat1 - 3.139) * 180) / Math.PI + 360;
expect(firstLeg % 360, "first leg direction").toBeWithin(292.5 - 2, 292.5 + 2);
console.log("check-kiblat: ok", formatBearing(qiblaBearing(3.139, 101.6869)), Math.round(qiblaDistanceKm(3.139, 101.6869)), "km");
