// Generate public/data/masjid/osm.json - OpenStreetMap masjid/surau in Malaysia with coordinates,
// for "Masjid terdekat" on /waktu-solat/masjid (distance is computed in the browser).
//
// SISMIM (JAKIM) has no coordinates, so this list is OSM's own - it is not matched to SISMIM
// (names differ; no name-based matching). One Overpass query for the whole country instead of
// one per visitor: Overpass takes ~20 s a query, and this way the location never leaves the device.
//
// Licence: OSM data is ODbL. This file is an extract of OSM only, published under the ODbL with
// "© OpenStreetMap contributors" attribution (shown on the page).
//
// Run: bun scripts/masjid/osm.ts   (never edit the generated file by hand; re-run every few months)
// Bun, not Python: macOS's system Python (LibreSSL 2.8) can't complete TLS with overpass-api.de.

const OUT = new URL("../../public/data/masjid/osm.json", import.meta.url);
const MIRRORS = ["https://overpass-api.de/api/interpreter", "https://overpass.private.coffee/api/interpreter"];
const QUERY = `[out:json][timeout:180];
area["ISO3166-1"="MY"][admin_level=2]->.my;
nwr["amenity"="place_of_worship"]["religion"="muslim"](area.my);
out center tags;`;
const MAX_AGE_DAYS = 30; // a mirror whose OSM copy is older than this is skipped
const SURAU = /\b(surau|musolla|musalla|musholla|mushola|madrasah|prayer room|bilik solat)\b/i;
const MASJID = /\b(masjid|mosque)\b/i;

type El = { type: string; id: number; lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> };
type Res = { elements: El[]; remark?: string; osm3s: { timestamp_osm_base: string } };

async function fetchOsm(): Promise<Res> {
  for (const url of MIRRORS) {
    try {
      const res = await fetch(url, {
        method: "POST",
        body: new URLSearchParams({ data: QUERY }),
        headers: { "User-Agent": "hafizbahtiar.com masjid-osm generator" },
        signal: AbortSignal.timeout(240_000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as Res;
      // Overpass reports a timeout/out-of-memory as 200 + "remark" with partial results.
      if (data.remark) throw new Error(data.remark);
      const age = (Date.now() - Date.parse(data.osm3s.timestamp_osm_base)) / 86_400_000;
      if (age > MAX_AGE_DAYS) throw new Error(`OSM copy is ${Math.round(age)} days old`);
      return data;
    } catch (e) {
      console.log(`${url}: ${e}`);
    }
  }
  throw new Error("every Overpass mirror failed");
}

/** 0 masjid, 1 surau, 2 unknown (unnamed or neither word). */
const kind = (name: string | null) => (!name ? 2 : SURAU.test(name) ? 1 : MASJID.test(name) ? 0 : 2);
const r5 = (n: number) => Math.round(n * 1e5) / 1e5;

const data = await fetchOsm();
const places = data.elements
  .map((el) => {
    const lat = el.lat ?? el.center?.lat;
    const lng = el.lon ?? el.center?.lon;
    if (lat == null || lng == null) return null;
    const name = (el.tags?.["name:ms"] ?? el.tags?.name ?? "").replace(/\s+/g, " ").trim() || null;
    return [r5(lat), r5(lng), name, kind(name), `${el.type[0]}${el.id}`] as const;
  })
  .filter((p) => p !== null)
  .sort((a, b) => a[0] - b[0] || a[1] - b[1]);

if (places.length < 5000) throw new Error(`only ${places.length} places - Overpass returned too little, not writing`);
const json = JSON.stringify({
  date: data.osm3s.timestamp_osm_base.slice(0, 10),
  licence: "ODbL 1.0 - © OpenStreetMap contributors - https://www.openstreetmap.org/copyright",
  // [lat, lng, name | null, 0 masjid / 1 surau / 2 unknown, OSM id (n/w/r + number)]
  places,
});
await Bun.write(OUT, json);
console.log(`wrote ${OUT.pathname} (${places.length} places, ${places.filter((p) => p[2]).length} named, ${Math.round(json.length / 1024)} KB)`);
