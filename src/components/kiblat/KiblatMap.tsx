import { useEffect, useState } from "react";
import PointsMap from "@/components/ui/PointsMap";
import { KAABAH, formatBearing, qiblaBearing, qiblaPath } from "@/lib/kiblat";

/** `/kiblat`: the great-circle line from the user to the Kaabah, shown once the
 *  page script has a location (it dispatches `kiblat:lokasi` with { lat, lng }). */
export default function KiblatMap() {
  const [here, setHere] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    const onLocation = (e: Event) => setHere((e as CustomEvent<{ lat: number; lng: number }>).detail);
    window.addEventListener("kiblat:lokasi", onLocation);
    return () => window.removeEventListener("kiblat:lokasi", onLocation);
  }, []);

  if (!here) return null;
  return (
    <div className="h-96 overflow-hidden sm:h-120">
      <PointsMap
        key={`${here.lat},${here.lng}`}
        fallbackLabel="Peta tak dapat dipapar di peranti ini"
        lines={[qiblaPath(here.lat, here.lng)]}
        points={[
          {
            id: "anda",
            lat: here.lat,
            lng: here.lng,
            title: "Lokasi anda",
            detail: `Kiblat ${formatBearing(qiblaBearing(here.lat, here.lng))}`,
          },
          {
            id: "kaabah",
            lat: KAABAH.lat,
            lng: KAABAH.lng,
            title: "Kaabah",
            subtitle: "Masjidil Haram, Makkah",
            badge: "🕋",
            markerClass: "bg-gray-950 text-white dark:bg-white dark:text-gray-950",
          },
        ]}
      />
    </div>
  );
}
