import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from "react";
import { X } from "lucide-react";
import { Map, MapControls, MapMarker, MapPopup, MapRoute, MarkerContent, MarkerLabel, type MapRef } from "./map";
import { cn } from "@/lib/utils";
import { MapThemeToggle, useMapTheme } from "./MapThemeToggle";
import { geoErrorText, locateOnce } from "@/lib/geo";
import { POINTS_MAP_FOCUS } from "@/lib/map-view";

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
 * - `renderDetail` swaps the popup for a place panel (Google Maps style): a card on
 *   the map's left from sm up, a bottom sheet on phones. Esc / X closes it.
 * - A point's `label` (e.g. a station name) shows under it once zoomed to `labelZoom`.
 * - `initialId` selects a point once the map has loaded; `onSelect` hears every change.
 * - `searchPlaceholder` adds a search box (title / subtitle / label) under the pills.
 * - A point whose lat/lng changes between renders glides there (live vehicles).
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
  /** Second popup line, e.g. the weather. */
  extra?: string;
  /** Animated rain behind the marker (`.rain` in index.css); "storm" adds lightning. */
  effect?: "rain" | "storm";
  /** Name shown under the marker from `labelZoom` in (station names). */
  label?: string;
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
  /** Zoom from which point `label`s show (default 13 - below that they overlap). */
  labelZoom?: number;
  /** Place panel for the selected point instead of the popup; `select` moves to another point. */
  renderDetail?: (point: MapPoint, select: (id: string) => void) => ReactNode;
  /** Point to select once the map has loaded (e.g. from the URL). Unknown ids are ignored. */
  initialId?: string;
  /** Called whenever the selection changes (null = closed). */
  onSelect?: (id: string | null) => void;
  /** Shows a search box over the map with this placeholder. */
  searchPlaceholder?: string;
  /** A location the page already read (initial value only) - shown as the "Anda di sini" dot. */
  me?: { longitude: number; latitude: number };
};

// Case- and accent-insensitive match key.
const fold = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

export { POINTS_MAP_FOCUS };

// Last known user location, so the dot survives the map remounting (route switch).
let lastMe: { longitude: number; latitude: number } | null = null;

export default function PointsMap({
  points,
  className,
  fallbackLabel = "Malaysia",
  focusZoom = 11,
  lines = [],
  labelZoom = 13,
  renderDetail,
  initialId,
  onSelect,
  searchPlaceholder,
  me: knownMe,
}: PointsMapProps) {
  const mapRef = useRef<MapRef | null>(null);
  const { resolvedTheme, preference, cycle } = useMapTheme();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [me, setMeState] = useState(knownMe ?? lastMe);
  // null = idle, "busy", else the error shown on the pill.
  const [locating, setLocating] = useState<string | null>(null);
  const setMe = (c: { longitude: number; latitude: number }) => {
    lastMe = c;
    setMeState(c);
  };
  // "Lokasi saya" pill: one reading, then fly there (keeps the current zoom if closer).
  const locate = () => {
    if (!("geolocation" in navigator)) return setLocating(geoErrorText(null));
    setLocating("busy");
    locateOnce().then(
      (coords) => {
        setMe({ longitude: coords.longitude, latitude: coords.latitude });
        setLocating(null);
        const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        mapRef.current?.flyTo({
          center: [coords.longitude, coords.latitude],
          zoom: Math.max(mapRef.current.getZoom(), 14),
          duration: reduced ? 0 : 1200,
        });
      },
      (err) => setLocating(geoErrorText(err)),
    );
  };
  const [showLabels, setShowLabels] = useState(false);
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
    // The side panel covers the left 20rem: centre the point in what is left.
    const panel = renderDetail && window.matchMedia("(min-width: 40rem)").matches;
    mapRef.current?.flyTo({
      center: [p.lng, p.lat],
      zoom: Math.max(mapRef.current.getZoom(), focusZoom),
      offset: panel ? [170, 0] : [0, 0],
      duration: reduced ? 0 : 1000,
    });
  };
  const selectRef = useRef(select);
  selectRef.current = select;

  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const firstSelect = useRef(true);
  useEffect(() => {
    if (firstSelect.current) return void (firstSelect.current = false);
    onSelectRef.current?.(selectedId);
  }, [selectedId]);
  // The selected point left the list (a filter, a bus out of the feed): close it, so
  // onSelect(null) clears whatever the page keeps (URL, storage).
  useEffect(() => {
    if (selectedId && !points.some((p) => p.id === selectedId)) setSelectedId(null);
  }, [points, selectedId]);

  // Search box (combobox): up to 8 matches on title / subtitle / label.
  const searchId = useId();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const matches = useMemo(() => {
    const q = fold(query.trim());
    if (!q) return [];
    return points.filter((p) => fold([p.title, p.subtitle, p.label].filter(Boolean).join(" ")).includes(q)).slice(0, 8);
  }, [points, query]);
  const pick = (p: MapPoint) => {
    setQuery(p.title);
    setOpen(false);
    select(p.id);
  };
  const onSearchKey = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      setOpen(true);
      if (matches.length) setActive((a) => (a + (e.key === "ArrowDown" ? 1 : matches.length - 1)) % matches.length);
    } else if (e.key === "Enter" && open && matches[active]) {
      e.preventDefault();
      pick(matches[active]);
    } else if (e.key === "Escape" && (open || query)) {
      e.stopPropagation();
      if (open) setOpen(false);
      else setQuery("");
    }
  };

  // Phone bottom sheet: drag the handle down to close, up to expand.
  const [sheetFull, setSheetFull] = useState(false);
  const [drag, setDrag] = useState<{ y0: number; dy: number } | null>(null);
  useEffect(() => {
    if (!selectedId) setSheetFull(false);
  }, [selectedId]);
  // Read the release point itself: the last pointermove may not have rendered yet.
  const endDrag = (clientY: number) => {
    if (!drag) return;
    const dy = clientY - drag.y0;
    if (dy < -60) setSheetFull(true);
    else if (dy > 80 && sheetFull) setSheetFull(false);
    else if (dy > 80) setSelectedId(null);
    setDrag(null);
  };
  const sheetBase = sheetFull ? "90dvh" : "60dvh";
  const dragStyle = !drag
    ? undefined
    : drag.dy > 0
      ? { transform: `translateY(${drag.dy}px)` }
      : { maxHeight: `min(90dvh, calc(${sheetBase} + ${-drag.dy}px))` };

  useEffect(() => {
    const onFocus = (e: Event) => {
      const id = (e as CustomEvent<{ id?: string }>).detail?.id;
      if (id) selectRef.current(id);
    };
    window.addEventListener(POINTS_MAP_FOCUS, onFocus);
    return () => window.removeEventListener(POINTS_MAP_FOCUS, onFocus);
  }, []);

  useEffect(() => {
    if (!selectedId || !renderDetail) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setSelectedId(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId, renderDetail]);

  return (
    <div className="relative h-full w-full">
      <Map
        ref={mapRef}
        theme={resolvedTheme}
        className={className}
        fallbackLabel={fallbackLabel}
        bounds={bounds ?? undefined}
        fitBoundsOptions={{ padding: 40, maxZoom: focusZoom }}
        onViewportChange={(v) => setShowLabels(v.zoom >= labelZoom)}
        onLoad={() => initialId && selectRef.current(initialId)}
      >
        <MapControls position="top-right" showZoom showFullscreen lang="ms" />
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
          <MapMarker key={p.id} longitude={p.lng} latitude={p.lat} moveDuration={1000} onClick={() => select(p.id)}>
            <MarkerContent>
              {p.effect && (
                <span
                  className={cn("rain pointer-events-none absolute top-1/2 left-1/2 size-14 -translate-1/2 rounded-full bg-sky-500/15", p.effect === "storm" && "rain-storm")}
                  aria-hidden="true"
                />
              )}
              <button
                type="button"
                aria-label={[p.title, p.detail, p.extra].filter(Boolean).join(", ")}
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
              {showLabels && p.label && (
                <MarkerLabel
                  position="bottom"
                  className="pointer-events-none text-[11px] font-semibold text-gray-950 [text-shadow:0_0_3px_#fff,0_0_3px_#fff] dark:text-white dark:[text-shadow:0_0_3px_#030712,0_0_3px_#030712]"
                >
                  {p.label}
                </MarkerLabel>
              )}
            </MarkerContent>
          </MapMarker>
        ))}
        {selected && !renderDetail && (
          <MapPopup
            key={selected.id}
            longitude={selected.lng}
            latitude={selected.lat}
            offset={18}
            closeButton
            lang="ms"
            onClose={() => setSelectedId(null)}
            className="min-w-48 pr-7"
          >
            <p className="text-sm font-semibold">{selected.title}</p>
            {selected.subtitle && <p className="text-xs text-gray-500 dark:text-gray-400">{selected.subtitle}</p>}
            {selected.detail && <p className="mt-1 text-xs font-medium">{selected.detail}</p>}
            {selected.extra && <p className="mt-0.5 text-xs text-gray-600 dark:text-gray-300">{selected.extra}</p>}
          </MapPopup>
        )}
      </Map>
      {selected && renderDetail && (
        <section
          aria-label={selected.title}
          style={dragStyle}
          className={cn(
            "fixed inset-x-0 bottom-0 z-50 overflow-y-auto rounded-t-2xl border-t border-gray-950/10 bg-white pb-[calc(5.5rem+env(safe-area-inset-bottom))] text-gray-950 shadow-2xl sm:absolute sm:inset-x-auto sm:bottom-auto sm:left-3 sm:z-20 sm:w-80 sm:rounded-xl sm:border sm:pb-0 sm:shadow-lg dark:border-white/10 dark:bg-gray-900 dark:text-white",
            sheetFull ? "max-h-[90dvh]" : "max-h-[60dvh]",
            searchPlaceholder ? "sm:top-24 sm:max-h-[calc(100%-6.75rem)]" : "sm:top-13 sm:max-h-[calc(100%-4rem)]",
            !drag && "motion-safe:transition-[transform,max-height] motion-safe:duration-200",
          )}
        >
          <div
            className="flex cursor-grab touch-none justify-center py-2 sm:hidden"
            aria-hidden="true"
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              setDrag({ y0: e.clientY, dy: 0 });
            }}
            onPointerMove={(e) => {
              const y = e.clientY;
              setDrag((d) => d && { y0: d.y0, dy: y - d.y0 });
            }}
            onPointerUp={(e) => endDrag(e.clientY)}
            onPointerCancel={() => setDrag(null)}
          >
            <div className="h-1 w-10 rounded-full bg-gray-300 dark:bg-gray-700" />
          </div>
          <button
            type="button"
            onClick={() => setSelectedId(null)}
            aria-label="Tutup"
            className="absolute top-3 right-3 rounded-full p-1.5 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            <X className="size-4" />
          </button>
          {renderDetail(selected, select)}
        </section>
      )}
      <div className="pointer-events-none absolute top-3 right-14 left-3 z-30 flex flex-col items-start gap-2 *:pointer-events-auto">
        <div className="flex flex-wrap items-center gap-2">
          <MapThemeToggle lang="ms" preference={preference} onCycle={cycle} />
          <button
            type="button"
            onClick={locate}
            disabled={locating === "busy"}
            className="flex items-center gap-1.5 rounded-full border border-gray-950/10 bg-white/90 px-2 py-1 text-xs font-medium text-gray-600 shadow-sm backdrop-blur-sm transition-colors hover:bg-white disabled:opacity-60 sm:px-2.5 dark:border-white/10 dark:bg-gray-900/90 dark:text-gray-300 dark:hover:bg-gray-900"
          >
            <span className="size-2 rounded-full bg-sky-500" aria-hidden="true" />
            <span className="leading-none">
              {locating === "busy" ? "Mencari…" : (locating ?? "Lokasi saya")}
            </span>
          </button>
        </div>
        {searchPlaceholder && (
          <div className="relative w-full sm:w-72">
            <label htmlFor={`${searchId}-input`} className="sr-only">
              {searchPlaceholder}
            </label>
            <input
              id={`${searchId}-input`}
              type="search"
              role="combobox"
              aria-expanded={open && query.trim() !== ""}
              aria-controls={`${searchId}-list`}
              aria-autocomplete="list"
              aria-activedescendant={open && matches[active] ? `${searchId}-${active}` : undefined}
              autoComplete="off"
              placeholder={searchPlaceholder}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActive(0);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              onBlur={() => setOpen(false)}
              onKeyDown={onSearchKey}
              className="w-full rounded-full border border-gray-950/10 bg-white/95 px-3 py-1.5 text-sm text-gray-950 shadow-sm backdrop-blur-sm placeholder:text-gray-500 focus:outline-2 focus:outline-offset-1 focus:outline-sky-500 dark:border-white/10 dark:bg-gray-900/95 dark:text-white dark:placeholder:text-gray-400"
            />
            {open && query.trim() !== "" && (
              <ul
                id={`${searchId}-list`}
                role="listbox"
                aria-label={searchPlaceholder}
                className="absolute inset-x-0 top-full mt-1 max-h-72 overflow-y-auto rounded-xl border border-gray-950/10 bg-white py-1 text-sm text-gray-950 shadow-lg dark:border-white/10 dark:bg-gray-900 dark:text-white"
              >
                {matches.length ? (
                  matches.map((p, i) => (
                    <li
                      key={p.id}
                      id={`${searchId}-${i}`}
                      role="option"
                      aria-selected={i === active}
                      // mousedown, not click: runs before the input's blur closes the list.
                      onMouseDown={(e) => {
                        e.preventDefault();
                        pick(p);
                      }}
                      onMouseEnter={() => setActive(i)}
                      className={cn("cursor-pointer px-3 py-1.5", i === active && "bg-sky-50 dark:bg-sky-500/15")}
                    >
                      <span className="block truncate font-medium">{p.title}</span>
                      {p.subtitle && <span className="block truncate text-xs text-gray-500 dark:text-gray-400">{p.subtitle}</span>}
                    </li>
                  ))
                ) : (
                  <li role="presentation" className="px-3 py-1.5 text-gray-500 dark:text-gray-400">
                    Tiada padanan
                  </li>
                )}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
