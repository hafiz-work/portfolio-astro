import React, { useEffect, useMemo, useRef, useState } from "react";
import { Clock, Sun, Moon, Cuboid, Hexagon } from "lucide-react";
import type { Polygon } from "geojson";
import {
  Map as MapComponent,
  MapControls,
  type MapRef,
  MapMarker,
  MarkerContent,
  MarkerLabel,
  MarkerPopup,
  MapPolygon,
} from "@/components/ui/map";
import klBoundary from "./kl-boundary.json";
import { KL_CENTER } from "@/lib/constants";

const kualaLumpurPolygon = klBoundary as unknown as Polygon;

type MapMarkerData = {
  id: number;
  company: string;
  role: string;
  date: string;
  latitude: number;
  longitude: number;
};

type MapCanvasProps = {
  markers: MapMarkerData[];
  center?: [number, number];
  zoom?: number;
};

type ExperienceMapState = {
  markers?: MapMarkerData[];
  center?: [number, number];
  focusedMarkerId?: number;
};

declare global {
  interface Window {
    __experienceMapState?: ExperienceMapState;
  }
}

// ─── 3D buildings ────────────────────────────────────────────────────────────

const BUILDINGS_LAYER_ID = "3d-buildings";
const PITCH_3D = 55;
// CARTO's tiles top out at z14 and the extrusion layer is gated to the same
// zoom, so enabling 3D from a city-wide view has to zoom in to show anything.
const MIN_ZOOM_3D = 15;

/**
 * Adds/removes the extruded-buildings layer for the current style.
 *
 * CARTO's vector tiles already carry `render_height` / `render_min_height` on
 * the `building` layer (plus a `hide_3d` flag for shapes that must stay flat,
 * e.g. construction sites), so 3D needs no extra tile source and no extra
 * network host. Must be re-run on every `styledata`: switching theme replaces
 * the whole style and drops imperatively-added layers.
 */
function syncBuildingsLayer(map: MapRef, enabled: boolean, theme: "light" | "dark") {
  // Custom styles may not include CARTO's source - nothing to extrude then.
  if (!map.getSource("carto")) return;

  if (!enabled) {
    if (map.getLayer(BUILDINGS_LAYER_ID)) map.removeLayer(BUILDINGS_LAYER_ID);
    return;
  }
  if (map.getLayer(BUILDINGS_LAYER_ID)) return;

  // Insert below the first symbol layer so labels stay readable on top.
  const firstSymbolId = map.getStyle()?.layers?.find((l) => l.type === "symbol")?.id;

  map.addLayer(
    {
      id: BUILDINGS_LAYER_ID,
      type: "fill-extrusion",
      source: "carto",
      "source-layer": "building",
      minzoom: 14,
      filter: ["!=", ["get", "hide_3d"], true],
      paint: {
        "fill-extrusion-color": theme === "dark" ? "#334155" : "#d4d4d8",
        "fill-extrusion-height": ["coalesce", ["get", "render_height"], 8],
        "fill-extrusion-base": ["coalesce", ["get", "render_min_height"], 0],
        "fill-extrusion-opacity": 0.9,
      },
    },
    firstSymbolId,
  );
}

// ─── Theme logic ─────────────────────────────────────────────────────────────

type MapThemePreference = "auto" | "light" | "dark";

const MAP_THEME_KEY = "map-theme";
const PREFERENCE_CYCLE: MapThemePreference[] = ["auto", "light", "dark"];

function getTimeTheme(): "light" | "dark" {
  const h = new Date().getHours();
  return h >= 6 && h < 18 ? "light" : "dark";
}

// Priority 1: .dark/.light class on <html> - follows the app's global toggle.
// Priority 2: time of day (6 am–6 pm = light) - first-visit fallback when no
//             app theme class has been set yet.
function getAppTheme(): "light" | "dark" {
  if (typeof document === "undefined") return getTimeTheme();
  if (document.documentElement.classList.contains("dark")) return "dark";
  if (document.documentElement.classList.contains("light")) return "light";
  return getTimeTheme();
}

function readStoredPreference(): MapThemePreference {
  try {
    const v = localStorage.getItem(MAP_THEME_KEY);
    if (v === "light" || v === "dark" || v === "auto") return v;
  } catch { }
  return "auto";
}

function useMapTheme() {
  const [autoTheme, setAutoTheme] = useState<"light" | "dark">(getAppTheme);

  useEffect(() => {
    // React immediately to the app-wide dark/light toggle.
    const observer = new MutationObserver(() => setAutoTheme(getAppTheme()));
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    // Re-evaluate the time fallback every minute - only matters when the app
    // hasn't set an explicit theme class (e.g. first visit with no preference).
    const interval = setInterval(() => setAutoTheme(getAppTheme()), 60_000);

    return () => {
      observer.disconnect();
      clearInterval(interval);
    };
  }, []);

  const [preference, setPreferenceState] = useState<MapThemePreference>(readStoredPreference);
  const setPreference = (p: MapThemePreference) => {
    setPreferenceState(p);
    try { localStorage.setItem(MAP_THEME_KEY, p); } catch { }
  };

  const resolvedTheme: "light" | "dark" = preference === "auto" ? autoTheme : preference;
  return { resolvedTheme, preference, setPreference };
}

// ─── Theme toggle button ─────────────────────────────────────────────────────

const PREF_META: Record<MapThemePreference, { label: string; Icon: React.FC<{ className?: string }> }> = {
  auto: { label: "Auto", Icon: ({ className }) => <Clock className={className} /> },
  light: { label: "Day", Icon: ({ className }) => <Sun className={className} /> },
  dark: { label: "Night", Icon: ({ className }) => <Moon className={className} /> },
};

function MapThemeToggle({
  preference,
  onCycle,
}: {
  preference: MapThemePreference;
  onCycle: () => void;
}) {
  const { label, Icon } = PREF_META[preference];
  return (
    <button
      type="button"
      onClick={onCycle}
      aria-label={`Map theme: ${label}. Click to cycle.`}
      className="flex items-center gap-1.5 rounded-full bg-white/90 border border-slate-200 px-2 py-1 sm:px-2.5 text-xs font-medium text-slate-600 shadow-sm backdrop-blur-sm hover:bg-white transition-colors"
    >
      <Icon className="w-3.5 h-3.5 shrink-0" />
      <span className="leading-none">{label}</span>
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

const MapCanvas = ({
  markers,
  center = KL_CENTER,
  zoom = 11,
}: MapCanvasProps) => {
  const mapRef = useRef<MapRef | null>(null);
  const isMapLoadedRef = useRef(false);
  const pendingFlyRef = useRef<{ center: [number, number]; zoom: number } | null>(null);
  const [activeMarkerId, setActiveMarkerId] = useState<number | null>(
    markers[0]?.id ?? null,
  );
  const [markersState, setMarkersState] = useState<MapMarkerData[]>(markers);
  const markersRef = useRef<MapMarkerData[]>(markers);
  const [centerState, setCenterState] = useState<[number, number]>(center);
  const [is3D, setIs3D] = useState(false);
  const [showBoundary, setShowBoundary] = useState(true);
  const { resolvedTheme, preference, setPreference } = useMapTheme();

  const updateMarkers = (nextMarkers: MapMarkerData[]) => {
    markersRef.current = nextMarkers;
    setMarkersState(nextMarkers);
  };

  const moveTo = (nextCenter: [number, number], nextZoom = 13) => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (mapRef.current && isMapLoadedRef.current) {
      mapRef.current.flyTo({
        center: nextCenter,
        zoom: nextZoom,
        duration: reducedMotion ? 0 : 1200,
      });
    } else {
      pendingFlyRef.current = { center: nextCenter, zoom: nextZoom };
    }
  };

  const handleMapLoad = () => {
    isMapLoadedRef.current = true;
    if (pendingFlyRef.current && mapRef.current) {
      mapRef.current.flyTo({
        ...pendingFlyRef.current,
        duration: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 1200,
      });
      pendingFlyRef.current = null;
    }
  };

  // Fixed: use native Map directly (no longer shadowed by the component import)
  const markerCoordinates = useMemo(
    () =>
      new Map(
        markersState.map((m) => [m.id, [m.longitude, m.latitude] as [number, number]]),
      ),
    [markersState],
  );

  useEffect(() => {
    if (!markersState.some((m) => m.id === activeMarkerId)) {
      setActiveMarkerId(markersState[0]?.id ?? null);
    }
  }, [activeMarkerId, markersState]);

  useEffect(() => {
    const handleFocusMarker = (event: Event) => {
      const markerId = (event as CustomEvent<{ markerId?: number }>).detail
        ?.markerId;
      if (typeof markerId !== "number") return;
      const marker = markersRef.current.find((item) => item.id === markerId);
      const coordinates =
        markerCoordinates.get(markerId) ??
        (marker
          ? ([marker.longitude, marker.latitude] as [number, number])
          : undefined);
      if (!coordinates) return;

      setActiveMarkerId(markerId);

      moveTo(coordinates, Math.max(mapRef.current?.getZoom() ?? 13, 13));
    };

    window.addEventListener("map-focus-marker", handleFocusMarker);
    return () => window.removeEventListener("map-focus-marker", handleFocusMarker);
  }, [markerCoordinates]);

  // Listen for client-side marker/center updates (populated after fetch)
  useEffect(() => {
    const handleSetMarkers = (e: Event) => {
      const detail = (e as CustomEvent<{ markers: MapMarkerData[] }>).detail;
      if (detail?.markers) updateMarkers(detail.markers);
    };
    const handleSetCenter = (e: Event) => {
      const detail = (e as CustomEvent<{ center: [number, number] }>).detail;
      if (!detail?.center) return;
      setCenterState(detail.center);
      moveTo(detail.center, zoom);
    };
    window.addEventListener("map:set-markers", handleSetMarkers);
    window.addEventListener("map:set-center", handleSetCenter);

    const cached = window.__experienceMapState;
    if (cached?.markers) updateMarkers(cached.markers);
    if (cached?.center) {
      setCenterState(cached.center);
      moveTo(cached.center, zoom);
    }
    if (typeof cached?.focusedMarkerId === "number") {
      window.requestAnimationFrame(() => {
        window.dispatchEvent(
          new CustomEvent("map-focus-marker", {
            detail: { markerId: cached.focusedMarkerId },
          }),
        );
      });
    }

    return () => {
      window.removeEventListener("map:set-markers", handleSetMarkers);
      window.removeEventListener("map:set-center", handleSetCenter);
    };
  }, []);

  const cyclePreference = () => {
    const next =
      PREFERENCE_CYCLE[
      (PREFERENCE_CYCLE.indexOf(preference) + 1) % PREFERENCE_CYCLE.length
      ];
    setPreference(next);
  };

  // Tilt the camera and (un)extrude buildings. `styledata` re-applies the layer
  // after a theme switch, which loads a fresh style.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const apply = () => {
      if (!map.isStyleLoaded()) return;
      syncBuildingsLayer(map, is3D, resolvedTheme);
    };

    apply();
    map.easeTo({
      ...(is3D
        ? { pitch: PITCH_3D, zoom: Math.max(map.getZoom(), MIN_ZOOM_3D) }
        : { pitch: 0 }),
      duration: reducedMotion ? 0 : 700,
    });
    map.on("styledata", apply);
    return () => {
      map.off("styledata", apply);
    };
  }, [is3D, resolvedTheme]);

  return (
    <div className="h-full w-full relative">
      <MapComponent
        ref={mapRef}
        theme={resolvedTheme}
        center={centerState}
        zoom={zoom}
        className="h-full w-full"
        onLoad={handleMapLoad}
      >
        <MapControls position="bottom-right" showZoom={true} showLocate={true} />

        {showBoundary && (
          <MapPolygon
            id="kuala-lumpur-boundary"
            coordinates={kualaLumpurPolygon.coordinates}
            fillColor="#22c55e"
            fillOpacity={0.15}
            outlineColor="#16a34a"
            outlineWidth={2}
            interactive={false}
          />
        )}

        {markersState.map((marker) => {
          const isActive = marker.id === activeMarkerId;
          return (
            <MapMarker
              key={marker.id}
              longitude={marker.longitude}
              latitude={marker.latitude}
              onClick={() => setActiveMarkerId(marker.id)}
            >
              <MarkerContent className="relative">
                <div
                  className={`h-3 w-3 rounded-full transition-all ${isActive
                    ? "bg-blue-400 shadow-[0_0_18px_rgba(59,130,246,0.9)] scale-125"
                    : "bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.7)]"
                    }`}
                />
                <MarkerLabel
                  className={`text-[11px] font-medium ${isActive
                    ? resolvedTheme === "dark" ? "text-blue-200" : "text-blue-700"
                    : resolvedTheme === "dark" ? "text-white" : "text-slate-900"
                    }`}
                >
                  {marker.company}
                </MarkerLabel>
              </MarkerContent>
              <MarkerPopup closeButton={true}>
                <div className="text-sm font-semibold text-slate-900">
                  {marker.company} ({marker.role})
                </div>
                <div className="text-xs text-slate-500">{marker.date}</div>
              </MarkerPopup>
            </MapMarker>
          );
        })}
      </MapComponent>

      <div className="absolute bottom-3 left-3 z-10 flex items-center gap-2">
        <MapThemeToggle preference={preference} onCycle={cyclePreference} />
        <button
          type="button"
          onClick={() => setIs3D((v) => !v)}
          aria-pressed={is3D}
          aria-label={`Buildings: ${is3D ? "3D" : "flat"}. Click to toggle.`}
          className="flex items-center gap-1.5 rounded-full bg-white/90 border border-slate-200 px-2 py-1 sm:px-2.5 text-xs font-medium text-slate-600 shadow-sm backdrop-blur-sm hover:bg-white transition-colors"
        >
          <Cuboid className="w-3.5 h-3.5 shrink-0" />
          <span className="leading-none">{is3D ? "3D" : "2D"}</span>
        </button>
        <button
          type="button"
          onClick={() => setShowBoundary((v) => !v)}
          aria-pressed={showBoundary}
          aria-label={`Kuala Lumpur boundary: ${showBoundary ? "shown" : "hidden"}. Click to toggle.`}
          className={`flex items-center gap-1.5 rounded-full bg-white/90 border border-slate-200 px-2 py-1 sm:px-2.5 text-xs font-medium shadow-sm backdrop-blur-sm hover:bg-white transition-colors ${showBoundary ? "text-slate-600" : "text-slate-400 opacity-70"}`}
        >
          <Hexagon className="w-3.5 h-3.5 shrink-0" />
          <span className="leading-none">KL</span>
        </button>
      </div>
    </div>
  );
};

export default MapCanvas;
