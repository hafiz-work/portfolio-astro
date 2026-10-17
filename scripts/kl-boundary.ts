// bun scripts/kl-boundary.ts - one-off: Kuala Lumpur boundary polygon from Nominatim
// -> src/components/home/kl-boundary.json (the home map's KL outline). Run once, commit the JSON.
const res = await fetch("https://nominatim.openstreetmap.org/search.php?q=Kuala+Lumpur&polygon_geojson=1&format=json", {
  // Nominatim usage policy: identify the app.
  headers: { "User-Agent": "hafizbahtiar.com portfolio (kl-boundary script)" },
});
if (!res.ok) throw new Error(`Nominatim ${res.status}`);
const results = (await res.json()) as { osm_type: string; class: string; geojson: unknown }[];
const kl = results.find((r) => r.osm_type === "relation" && r.class === "boundary");
if (!kl) throw new Error("Not found");
await Bun.write("src/components/home/kl-boundary.json", JSON.stringify(kl.geojson));
console.log("Saved");

export {}; // top-level await needs a module
