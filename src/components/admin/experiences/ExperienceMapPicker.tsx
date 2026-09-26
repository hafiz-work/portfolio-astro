import React, { useEffect, useMemo, useState } from "react";
import type { MapMouseEvent } from "maplibre-gl";
import { Map, MapControls, MapMarker, MarkerContent, useMap } from "../../ui/map";
import { KL_DEFAULT_LATITUDE, KL_DEFAULT_LONGITUDE } from "../../../lib/constants";

type Props = {
  latitudeName?: string;
  longitudeName?: string;
  initialLatitude?: number | null;
  initialLongitude?: number | null;
  className?: string;
};

const DEFAULT_LATITUDE = KL_DEFAULT_LATITUDE;
const DEFAULT_LONGITUDE = KL_DEFAULT_LONGITUDE;

const inputClass =
  "admin-input font-mono";

const labelClass = "admin-label";

function MapClickHandler({ onSelect }: { onSelect: (coords: { latitude: number; longitude: number }) => void }) {
  const { map } = useMap();

  useEffect(() => {
    if (!map) return;
    const handleClick = (event: MapMouseEvent) => {
      onSelect({
        latitude: event.lngLat.lat,
        longitude: event.lngLat.lng,
      });
    };
    map.on("click", handleClick);
    return () => {
      map.off("click", handleClick);
    };
  }, [map, onSelect]);

  return null;
}

export function ExperienceMapPicker({
  latitudeName = "latitude",
  longitudeName = "longitude",
  initialLatitude = null,
  initialLongitude = null,
  className = "",
}: Props) {
  const [latitude, setLatitude] = useState<number>(
    initialLatitude ?? DEFAULT_LATITUDE,
  );
  const [longitude, setLongitude] = useState<number>(
    initialLongitude ?? DEFAULT_LONGITUDE,
  );

  useEffect(() => {
    setLatitude(initialLatitude ?? DEFAULT_LATITUDE);
    setLongitude(initialLongitude ?? DEFAULT_LONGITUDE);
  }, [initialLatitude, initialLongitude]);

  useEffect(() => {
    const handleExternalUpdate = (event: Event) => {
      const detail = (event as CustomEvent<{
        latitude?: number | null;
        longitude?: number | null;
      }>).detail;
      if (!detail) return;
      if (typeof detail.latitude === "number" || detail.latitude === null) {
        setLatitude(detail.latitude ?? DEFAULT_LATITUDE);
      }
      if (typeof detail.longitude === "number" || detail.longitude === null) {
        setLongitude(detail.longitude ?? DEFAULT_LONGITUDE);
      }
    };
    window.addEventListener("experience-map:update", handleExternalUpdate);
    return () => {
      window.removeEventListener("experience-map:update", handleExternalUpdate);
    };
  }, []);

  const center = useMemo<[number, number]>(
    () => [longitude, latitude],
    [latitude, longitude],
  );

  const zoom = 12;

  const handleSelect = (coords: { latitude: number; longitude: number }) => {
    setLatitude(Number(coords.latitude.toFixed(6)));
    setLongitude(Number(coords.longitude.toFixed(6)));
  };

  const handleLocate = (coords: { latitude: number; longitude: number }) => {
    handleSelect(coords);
  };

  const handleMarkerDrag = (coords: { lng: number; lat: number }) => {
    setLatitude(Number(coords.lat.toFixed(6)));
    setLongitude(Number(coords.lng.toFixed(6)));
  };

  const handleClear = () => {
    setLatitude(DEFAULT_LATITUDE);
    setLongitude(DEFAULT_LONGITUDE);
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <label className={labelClass} htmlFor="experience-latitude">
          // Coordinates
        </label>
        <button
          type="button"
          onClick={handleClear}
          className="text-xs font-mono text-gray-500 hover:text-sky-600 dark:text-gray-400 dark:hover:text-sky-400 transition-colors"
        >
          CLEAR
        </button>
      </div>
      <div className="overflow-hidden rounded-lg border border-gray-950/10 dark:border-white/10">
        <div className="h-64 w-full">
          <Map
            className="h-full w-full"
            viewport={{ center, zoom }}
            onViewportChange={() => undefined}
          >
            <MapControls showLocate onLocate={handleLocate} />
            <MapClickHandler onSelect={handleSelect} />
            <MapMarker
              latitude={latitude}
              longitude={longitude}
              draggable
              onDragEnd={handleMarkerDrag}
            >
              <MarkerContent>
                <div className="w-3 h-3 rounded-full bg-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.8)]" />
              </MarkerContent>
            </MapMarker>
          </Map>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className={labelClass} htmlFor="experience-latitude">
            // Latitude
          </label>
          <input
            type="number"
            name={latitudeName}
            step="any"
            className={inputClass}
            id="experience-latitude"
            value={Number.isNaN(latitude) ? "" : latitude}
            onChange={(e) =>
              setLatitude(
                e.target.value === ""
                  ? DEFAULT_LATITUDE
                  : Number(e.target.value),
              )
            }
          />
        </div>
        <div className="space-y-2">
          <label className={labelClass} htmlFor="experience-longitude">
            // Longitude
          </label>
          <input
            type="number"
            name={longitudeName}
            step="any"
            className={inputClass}
            id="experience-longitude"
            value={Number.isNaN(longitude) ? "" : longitude}
            onChange={(e) =>
              setLongitude(
                e.target.value === ""
                  ? DEFAULT_LONGITUDE
                  : Number(e.target.value),
              )
            }
          />
        </div>
      </div>
    </div>
  );
}
