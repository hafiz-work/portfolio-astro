import { useEffect, useMemo, useRef, useState } from "react";
import { Map, MapControls, MapMarker, MapPopup, MapRoute, MarkerContent, type MapRef } from "./map";
import { cn } from "@/lib/utils";
import { MapThemeToggle, useMapTheme } from "./MapThemeToggle";

/**
 * Interactive map of labelled points, built on `ui/map.tsx` - for any page that
 * plots a list of places (stations, branches, venues). Props are plain data so
 * an Astro page can pass them straight in (`client:only="react"`).
 *
 * - Fits every point on load; a point is a pill with its `badge` (or a dot).
 * - Click a point (or Tab + Enter) -> it is selected, flown to and gets a popup.
 * - Other scripts can select a point: dispatch `points-map:focus` on window with
 *   `{ detail: { id } }` (e.g. a "nearest to me" button outside the map).
 * - The locate control (top-right) asks for the user's location once and marks it with a
 *   pulsing "Anda di sini" dot (nothing is stored or sent anywhere).
 * - Auto / Terang / Gelap map theme pill (top-left), shared with the home map.
 * - Optional `lines` ([lng, lat][] each) are drawn under the points and fitted too.
 */
export type MapPoint = {
  id: string;
  lat: number;
  lng: number;
  title: string;
  subtitle?: string;
  /** Extra popup line, e.g. "IPU 87 · Sederhana". */
  detail?: string;
  /** Short text inside the marker, e.g. a reading. Omit for a plain dot. */
  badge?: string | number;
  /** Tailwind classes for the marker's colour, e.g. "bg-sky-500 text-white". */
  markerClass?: string;
  /** Data-driven colour (hex, e.g. a rail line's official colour) - overrides markerClass's background. */
  color?: string;
};

/** A line: [lng, lat] points, optionally with its own colour (default sky). */
export type MapLine = [number, number][] | { coordinates: [number, number][]; color?: string; width?: number };

type PointsMapProps = {
  points: MapPoint[];
  className?: string;
  /** Shown instead of the map when WebGL is unavailable. */
  fallbackLabel?: string;
  /** Zoom used when a point is selected (default 11). */
  focusZoom?: number;
  /** Lines to draw (a route, a bearing, a rail line). */
  lines?: MapLine[];
};

export const POINTS_MAP_FOCUS = "points-map:focus";

// Last known user location, so the dot survives the map remounting (route switch).
let lastMe: { longitude: number; latitude: number } | null = null;

export default function PointsMap({
  points,
  className,
  fallbackLabel = "Malaysia",
  focusZoom = 11,
  lines = [],
}: PointsMapProps) {
  const mapRef = useRef<MapRef | null>(null);
  const { resolvedTheme, preference, cycle } = useMapTheme();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [me, setMeState] = useState(lastMe);
  const [locating, setLocating] = useState<"idle" | "busy" | "denied" | "failed">("idle");
  const setMe = (c: { longitude: number; latitude: number }) => {
    lastMe = c;
    setMeState(c);
  };
  // "Lokasi saya" pill: one reading, then fly there (keeps the current zoom if closer).
  const locate = () => {
    if (!("geolocation" in navigator)) return setLocating("failed");
    setLocating("busy");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setMe({ longitude: coords.longitude, latitude: coords.latitude });
        setLocating("idle");
        const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        mapRef.current?.flyTo({
          center: [coords.longitude, coords.latitude],
          zoom: Math.max(mapRef.current.getZoom(), 14),
          duration: reduced ? 0 : 1200,
        });
      },
      (err) => setLocating(err.code === err.PERMISSION_DENIED ? "denied" : "failed"),
      { timeout: 15000, maximumAge: 60_000 },
    );
  };
  const selected = points.find((p) => p.id === selectedId) ?? null;

  const bounds = useMemo(() => {
    const all = [...points.map((p) => [p.lng, p.lat]), ...lines.flatMap((l) => (Array.isArray(l) ? l : l.coordinates))];
    if (!all.length) return null;
    const lngs = all.map((c) => c[0]);
    const lats = all.map((c) => c[1]);
    return [
      [Math.min(...lngs), Math.min(...lats)],
      [Math.max(...lngs), Math.max(...lats)],
    ] as [[number, number], [number, number]];
  }, [points, lines]);

  const select = (id: string) => {
    const p = points.find((x) => x.id === id);
    if (!p) return;
    setSelectedId(id);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    mapRef.current?.flyTo({
      center: [p.lng, p.lat],
      zoom: Math.max(mapRef.current.getZoom(), focusZoom),
      duration: reduced ? 0 : 1000,
    });
  };
  const selectRef = useRef(select);
  selectRef.current = select;

  useEffect(() => {
    const onFocus = (e: Event) => {
      const id = (e as CustomEvent<{ id?: string }>).detail?.id;
      if (id) selectRef.current(id);
    };
    window.addEventListener(POINTS_MAP_FOCUS, onFocus);
    return () => window.removeEventListener(POINTS_MAP_FOCUS, onFocus);
  }, []);

  return (
    <div className="relative h-full w-full">
      <Map
        ref={mapRef}
        theme={resolvedTheme}
        className={className}
        fallbackLabel={fallbackLabel}
        bounds={bounds ?? undefined}
        fitBoundsOptions={{ padding: 40 }}
      >
        <MapControls position="top-right" showZoom showLocate showFullscreen onLocate={setMe} />
        {me && (
          <MapMarker longitude={me.longitude} latitude={me.latitude}>
            <MarkerContent>
              <span className="relative flex size-4" role="img" aria-label="Anda di sini" title="Anda di sini">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-sky-400 opacity-60 motion-reduce:animate-none" />
                <span className="relative inline-flex size-4 rounded-full border-2 border-white bg-sky-500 shadow-md dark:border-gray-950" />
              </span>
            </MarkerContent>
          </MapMarker>
        )}
        {lines.map((l, i) => {
          const line = Array.isArray(l) ? { coordinates: l } : l;
          return (
            <MapRoute
              key={i}
              coordinates={line.coordinates}
              color={line.color ?? "#0ea5e9"}
              width={line.width ?? 3}
              opacity={0.9}
              interactive={false}
            />
          );
        })}
        {points.map((p) => (
          <MapMarker key={p.id} longitude={p.lng} latitude={p.lat} onClick={() => select(p.id)}>
            <MarkerContent>
              <button
                type="button"
                aria-label={[p.title, p.detail].filter(Boolean).join(", ")}
                aria-pressed={p.id === selectedId}
                className={cn(
                  "flex items-center justify-center rounded-full font-semibold tabular-nums shadow-md ring-2 ring-white transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 dark:ring-gray-950",
                  p.badge == null ? "size-3.5" : "h-6 min-w-6 px-1.5 text-[11px]",
                  p.markerClass ?? "bg-sky-500 text-white",
                  p.id === selectedId && "scale-125",
                )}
                style={p.color ? { backgroundColor: p.color, color: "#fff" } : undefined}
              >
                {p.badge}
              </button>
            </MarkerContent>
          </MapMarker>
        ))}
        {selected && (
          <MapPopup
            key={selected.id}
            longitude={selected.lng}
            latitude={selected.lat}
            offset={18}
            closeButton
            onClose={() => setSelectedId(null)}
            className="min-w-48 pr-7"
          >
            <p className="text-sm font-semibold">{selected.title}</p>
            {selected.subtitle && <p className="text-xs text-gray-500 dark:text-gray-400">{selected.subtitle}</p>}
            {selected.detail && <p className="mt-1 text-xs font-medium">{selected.detail}</p>}
          </MapPopup>
        )}
      </Map>
      <div className="absolute top-3 left-3 z-10 flex flex-wrap items-center gap-2">
        <MapThemeToggle lang="ms" preference={preference} onCycle={cycle} />
        <button
          type="button"
          onClick={locate}
          disabled={locating === "busy"}
          className="flex items-center gap-1.5 rounded-full border border-gray-950/10 bg-white/90 px-2 py-1 text-xs font-medium text-gray-600 shadow-sm backdrop-blur-sm transition-colors hover:bg-white disabled:opacity-60 sm:px-2.5 dark:border-white/10 dark:bg-gray-900/90 dark:text-gray-300 dark:hover:bg-gray-900"
        >
          <span className="size-2 rounded-full bg-sky-500" aria-hidden="true" />
          <span className="leading-none">
            {locating === "busy"
              ? "Mencari…"
              : locating === "denied"
                ? "Lokasi disekat"
                : locating === "failed"
                  ? "Lokasi tak dapat dikesan"
                  : "Lokasi saya"}
          </span>
        </button>
      </div>
    </div>
  );
}
