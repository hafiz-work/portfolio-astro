// Qibla bearing and distance from any point - great-circle maths, no API.
// Check: bun scripts/check-kiblat.ts
import { distanceKm } from "./geo";

/** Kaabah, Masjidil Haram. */
export const KAABAH = { lat: 21.422487, lng: 39.826206 };

const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;

/** Initial great-circle bearing to the Kaabah, degrees clockwise from true north (0-360). */
export function qiblaBearing(lat: number, lng: number): number {
  const φ1 = rad(lat);
  const φ2 = rad(KAABAH.lat);
  const Δλ = rad(KAABAH.lng - lng);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return (deg(Math.atan2(y, x)) + 360) % 360;
}

/** Great-circle distance to the Kaabah in km (haversine, mean Earth radius). */
export const qiblaDistanceKm = (lat: number, lng: number) => distanceKm(lat, lng, KAABAH.lat, KAABAH.lng);

/** 292.52 -> "292° 31′" (how JAKIM writes the kiblat direction). */
export const formatBearing = (b: number) => {
  const total = Math.round(b * 60);
  return `${Math.floor(total / 60) % 360}° ${String(total % 60).padStart(2, "0")}′`;
};

/** Points along the great circle from (lat, lng) to the Kaabah, as [lng, lat] for a
 *  map line (spherical interpolation; a straight line on the map would be wrong). */
export function qiblaPath(lat: number, lng: number, steps = 64): [number, number][] {
  const toXyz = (la: number, lo: number) => [Math.cos(rad(la)) * Math.cos(rad(lo)), Math.cos(rad(la)) * Math.sin(rad(lo)), Math.sin(rad(la))];
  const a = toXyz(lat, lng);
  const b = toXyz(KAABAH.lat, KAABAH.lng);
  const d = Math.acos(Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]));
  if (d < 1e-9) return [[lng, lat]];
  return Array.from({ length: steps + 1 }, (_, i) => {
    const t = i / steps;
    const ka = Math.sin((1 - t) * d) / Math.sin(d);
    const kb = Math.sin(t * d) / Math.sin(d);
    const [x, y, z] = [0, 1, 2].map((k) => ka * a[k] + kb * b[k]);
    return [deg(Math.atan2(y, x)), deg(Math.atan2(z, Math.hypot(x, y)))] as [number, number];
  });
}
