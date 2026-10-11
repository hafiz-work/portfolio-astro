// Qibla bearing and distance from any point - great-circle maths, no API.
// Check: bun scripts/check-kiblat.ts

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
export function qiblaDistanceKm(lat: number, lng: number): number {
  const h =
    Math.sin(rad(KAABAH.lat - lat) / 2) ** 2 +
    Math.cos(rad(lat)) * Math.cos(rad(KAABAH.lat)) * Math.sin(rad(KAABAH.lng - lng) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

/** 292.52 -> "292° 31′" (how JAKIM writes the kiblat direction). */
export const formatBearing = (b: number) => {
  const total = Math.round(b * 60);
  return `${Math.floor(total / 60) % 360}° ${String(total % 60).padStart(2, "0")}′`;
};
