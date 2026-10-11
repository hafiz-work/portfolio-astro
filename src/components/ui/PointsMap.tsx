import { useEffect, useMemo, useRef, useState } from "react";
import { Map, MapControls, MapMarker, MapPopup, MapRoute, MarkerContent, type MapRef } from "./map";
import { cn } from "@/lib/utils";

/**
 * Interactive map of labelled points, built on `ui/map.tsx` - for any page that
 * plots a list of places (stations, branches, venues). Props are plain data so
 * an Astro page can pass them straight in (`client:only="react"`).
 *
 * - Fits every point on load; a point is a pill with its `badge` (or a dot).
 * - Click a point (or Tab + Enter) -> it is selected, flown to and gets a popup.
 * - Other scripts can select a point: dispatch `points-map:focus` on window with
 *   `{ detail: { id } }` (e.g. a "nearest to me" button outside the map).
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
};

type PointsMapProps = {
  points: MapPoint[];
  className?: string;
  /** Shown instead of the map when WebGL is unavailable. */
  fallbackLabel?: string;
  /** Zoom used when a point is selected (default 11). */
  focusZoom?: number;
  /** Lines to draw, each a list of [lng, lat] (e.g. a route or a bearing). */
  lines?: [number, number][][];
};

export const POINTS_MAP_FOCUS = "points-map:focus";

export default function PointsMap({
  points,
  className,
  fallbackLabel = "Malaysia",
  focusZoom = 11,
  lines = [],
}: PointsMapProps) {
  const mapRef = useRef<MapRef | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = points.find((p) => p.id === selectedId) ?? null;

  const bounds = useMemo(() => {
    const all = [...points.map((p) => [p.lng, p.lat]), ...lines.flat()];
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
    <Map
      ref={mapRef}
      className={className}
      fallbackLabel={fallbackLabel}
      bounds={bounds ?? undefined}
      fitBoundsOptions={{ padding: 40 }}
    >
      <MapControls position="top-right" showZoom showLocate showFullscreen />
      {lines.map((coordinates, i) => (
        <MapRoute key={i} coordinates={coordinates} color="#0ea5e9" width={3} opacity={0.9} interactive={false} />
      ))}
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
  );
}
