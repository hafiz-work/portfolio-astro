import { useRef, useState } from "react";
import PointsMap, { type MapPoint } from "@/components/ui/PointsMap";
import { isoToDmy } from "@/lib/date-my";
import { distanceKm, geoErrorText, locateOnce } from "@/lib/geo";
import { POINTS_MAP_FOCUS } from "@/lib/map-view";

/**
 * "Masjid terdekat" on /waktu-solat/masjid: one location reading, then the nearest
 * masjid/surau from the static OpenStreetMap extract (public/data/masjid/osm.json,
 * scripts/masjid/osm.ts) - distance is computed here, the location never leaves the device.
 * OSM is not JAKIM's list (not every SISMIM record is mapped), and the page says so.
 */
type Place = [lat: number, lng: number, name: string | null, kind: 0 | 1 | 2, osmId: string];
type Near = MapPoint & { km: number; osmId: string };

const KIND = ["Masjid", "Surau", "Tempat solat"] as const;
const MARKER = ["bg-sky-600", "bg-sky-300", "bg-gray-400"];
const SHOW = 30; // nearest shown on the map
const LIST = 10;
const MAX_KM = 15;

const fmtKm = (km: number) => (km < 1 ? `${Math.round(km * 100) * 10} m` : `${km.toFixed(1)} km`);
const directions = (p: Near) => `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`;
const osmHref = (id: string) =>
  `https://www.openstreetmap.org/${{ n: "node", w: "way", r: "relation" }[id[0]]}/${id.slice(1)}`;

export default function MasjidTerdekat() {
  const [state, setState] = useState<
    | { kind: "idle" }
    | { kind: "busy" }
    | { kind: "error"; text: string }
    | { kind: "done"; me: { latitude: number; longitude: number }; near: Near[]; date: string }
  >({ kind: "idle" });
  const mapBox = useRef<HTMLDivElement>(null);

  const find = async () => {
    if (!("geolocation" in navigator)) return setState({ kind: "error", text: geoErrorText(null) });
    setState({ kind: "busy" });
    let coords: GeolocationCoordinates;
    try {
      coords = await locateOnce({ enableHighAccuracy: true });
    } catch (err) {
      return setState({ kind: "error", text: geoErrorText(err) });
    }
    try {
      const res = await fetch("/data/masjid/osm.json");
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as { date: string; places: Place[] };
      const near = data.places
        .map(([lat, lng, name, kind, osmId]) => ({ lat, lng, name, kind, osmId, km: distanceKm(coords.latitude, coords.longitude, lat, lng) }))
        .filter((p) => p.km <= MAX_KM)
        .sort((a, b) => a.km - b.km)
        .slice(0, SHOW)
        .map((p) => ({
          id: p.osmId,
          osmId: p.osmId,
          lat: p.lat,
          lng: p.lng,
          km: p.km,
          title: p.name ?? `${KIND[p.kind]} (tiada nama)`,
          subtitle: `${KIND[p.kind]} · ${fmtKm(p.km)}`,
          label: p.name ?? undefined,
          markerClass: MARKER[p.kind],
        }));
      setState({ kind: "done", me: { latitude: coords.latitude, longitude: coords.longitude }, near, date: data.date });
    } catch {
      setState({ kind: "error", text: "Data peta tak dapat dimuatkan" });
    }
  };

  const focus = (id: string) => {
    mapBox.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    window.dispatchEvent(new CustomEvent(POINTS_MAP_FOCUS, { detail: { id } }));
  };

  return (
    <div className="grid gap-4">
      <div className="mx-2 flex flex-wrap items-center gap-3">
        <button type="button" onClick={find} disabled={state.kind === "busy"} className="btn-pill btn-pill-primary">
          {state.kind === "busy" ? "Mencari…" : state.kind === "done" ? "Cari semula" : "Cari masjid terdekat"}
        </button>
        <p className="text-sm text-gray-600 dark:text-gray-400" role="status">
          {state.kind === "error"
            ? `${state.text}.`
            : "Jarak dikira dalam peranti anda - lokasi tidak dihantar ke mana-mana."}
        </p>
      </div>

      {state.kind === "done" &&
        (state.near.length ? (
          <>
            <div ref={mapBox} className="h-[60vh] max-h-160 min-h-80 overflow-hidden">
              <PointsMap
                key={`${state.me.latitude},${state.me.longitude}`}
                points={state.near}
                me={state.me}
                focusZoom={16}
                labelZoom={15}
                renderDetail={(p) => {
                  const n = p as Near;
                  return (
                    <div className="p-4 pt-3 sm:pt-4">
                      <h2 className="pr-8 text-xl font-semibold tracking-tight">{n.title}</h2>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{n.subtitle} dari anda</p>
                      <p className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                        <a href={directions(n)} target="_blank" rel="noopener noreferrer" className="link">
                          Arah ke sini
                        </a>
                        <a href={osmHref(n.osmId)} target="_blank" rel="noopener noreferrer" className="link">
                          Lihat di OpenStreetMap
                        </a>
                      </p>
                    </div>
                  );
                }}
              />
            </div>
            <ol className="grid grid-cols-1 gap-px bg-gray-950/5 sm:grid-cols-2 dark:bg-white/10">
              {state.near.slice(0, LIST).map((p) => (
                <li key={p.id} className="flex items-baseline justify-between gap-3 bg-white px-4 py-3 sm:px-6 dark:bg-gray-950">
                  <button type="button" onClick={() => focus(p.id)} className="cursor-pointer text-left font-medium text-gray-950 hover:text-sky-600 dark:text-white dark:hover:text-sky-400">
                    {p.title}
                  </button>
                  <span className="shrink-0 font-mono text-xs tracking-widest text-gray-500 tabular-nums dark:text-gray-400">
                    {fmtKm(p.km)}
                  </span>
                </li>
              ))}
            </ol>
          </>
        ) : (
          <p className="mx-2 text-sm/7 text-gray-600 dark:text-gray-400">
            Tiada masjid atau surau dalam {MAX_KM} km yang dipetakan di OpenStreetMap. Gunakan senarai JAKIM di bawah.
          </p>
        ))}

      {state.kind === "done" && (
        <p className="mx-2 max-w-3xl text-xs/5 text-gray-500 dark:text-gray-400">
          Lokasi dari{" "}
          <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="link">
            © penyumbang OpenStreetMap
          </a>{" "}
          (ODbL), data {isoToDmy(state.date)} - bukan senarai rasmi JAKIM; tidak semua masjid dan surau
          telah dipetakan, dan nama mungkin berbeza.
        </p>
      )}
    </div>
  );
}
