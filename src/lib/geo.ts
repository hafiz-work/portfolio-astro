// Location helpers shared by the Showcase apps - everything runs on the device.

/** Great-circle distance in km (haversine, mean Earth radius). */
export function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number) {
  const r = Math.PI / 180;
  const h = Math.sin(((bLat - aLat) * r) / 2) ** 2 + Math.cos(aLat * r) * Math.cos(bLat * r) * Math.sin(((bLng - aLng) * r) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

/** One location reading (callers check `"geolocation" in navigator` first). */
export const locateOnce = (opts?: PositionOptions) =>
  new Promise<GeolocationCoordinates>((resolve, reject) =>
    navigator.geolocation.getCurrentPosition((p) => resolve(p.coords), reject, { timeout: 15_000, maximumAge: 60_000, ...opts }),
  );

/** Malay wording for a failed reading (no full stop - callers add their own). */
export const geoErrorText = (err: unknown) => {
  const code = (err as GeolocationPositionError | null)?.code;
  return code === 1 ? "Akses lokasi ditolak" : code === 3 ? "Lokasi mengambil masa terlalu lama" : "Lokasi tak dapat dikesan";
};
