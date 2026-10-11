import { useEffect, useMemo, useState } from "react";
import PointsMap, { type MapPoint } from "@/components/ui/PointsMap";
import { Select } from "@/components/ui/Select";
import type { BusPosition } from "@/lib/bas";

/**
 * /bas: live vehicles of one operator on PointsMap, refreshed every 30 s from
 * /bas/<feed>.json (paused while the tab is hidden). The feed sits in ?feed= so a
 * link opens the same operator; a route filter refits the map to that route.
 */
type Feed = { id: string; label: string; region: string };
type Payload = { vehicles: BusPosition[]; source: string | null; stale: boolean; error?: string };

const POLL_MS = 30_000;

const ago = (at: number, now: number) => {
  const s = Math.max(0, Math.round(now / 1000 - at));
  return s < 90 ? `${s} saat lalu` : `${Math.round(s / 60)} minit lalu`;
};

export default function BasMap({ feeds }: { feeds: Feed[] }) {
  const [feed, setFeed] = useState(() => {
    const fromUrl = new URLSearchParams(location.search).get("feed");
    return feeds.some((f) => f.id === fromUrl) ? fromUrl! : feeds[0].id;
  });
  const [route, setRoute] = useState("");
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    let stop = false;
    let timer = 0;
    const ctrl = new AbortController();
    setLoading(true);
    setData(null);
    const load = async () => {
      try {
        const res = await fetch(`/bas/${feed}.json`, { signal: ctrl.signal });
        const json = (await res.json()) as Payload;
        if (!stop) setData(json);
      } catch {
        if (!stop) setData((d) => d ?? { vehicles: [], source: null, stale: false, error: "Sumber tidak dapat dicapai." });
      } finally {
        if (!stop) {
          setLoading(false);
          setNow(Date.now());
        }
      }
    };
    const schedule = () => {
      clearTimeout(timer);
      timer = window.setTimeout(async () => {
        if (!document.hidden) await load();
        if (!stop) schedule();
      }, POLL_MS);
    };
    const onVisible = () => {
      if (!document.hidden) load().then(schedule);
    };
    load().then(schedule);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stop = true;
      ctrl.abort();
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [feed]);

  const pickFeed = (id: string) => {
    setFeed(id);
    setRoute("");
    const url = new URL(location.href);
    url.searchParams.set("feed", id);
    history.replaceState(history.state, "", url);
  };

  const vehicles = data?.vehicles ?? [];
  const routes = useMemo(() => {
    const names = new Map<string, string>();
    for (const v of vehicles) names.set(v.route, v.routeName);
    return [...names]
      .sort(([a], [b]) => a.localeCompare(b, "ms", { numeric: true }))
      .map(([r, name]) => ({ value: r, label: r === "-" ? "Tanpa nombor laluan" : name ? `${r} - ${name}` : r }));
  }, [vehicles]);
  const shown = route ? vehicles.filter((v) => v.route === route) : vehicles;
  const points: MapPoint[] = shown.map((v) => ({
    id: v.id,
    lat: v.lat,
    lng: v.lng,
    title: v.route === "-" ? "Laluan tidak diketahui" : `Laluan ${v.route}`,
    subtitle: v.routeName || undefined,
    detail: [v.plate, v.at ? `kedudukan ${ago(v.at, now)}` : ""].filter(Boolean).join(" · "),
    badge: v.route === "-" ? undefined : v.route.length > 7 ? `${v.route.slice(0, 6)}…` : v.route,
    markerClass: "bg-sky-600 text-white dark:bg-sky-500",
  }));
  const current = feeds.find((f) => f.id === feed)!;

  return (
    <div>
      <div className="flex flex-wrap items-end gap-3 px-2">
        <Select
          label="Operator"
          value={feed}
          onChange={(v) => pickFeed(String(v))}
          options={feeds.map((f) => ({ value: f.id, label: `${f.label} (${f.region})` }))}
          className="w-full sm:w-80"
        />
        <Select
          label="Laluan"
          value={route}
          onChange={(v) => setRoute(String(v))}
          options={[{ value: "", label: `Semua laluan (${routes.length})` }, ...routes]}
          className="w-full sm:w-96"
        />
        <p className="text-sm/6 text-gray-600 dark:text-gray-400" aria-live="polite">
          {loading
            ? "Memuatkan…"
            : `${shown.length} kenderaan · dikemas kini setiap 30 saat${data?.stale ? " · data simpanan" : ""}`}
        </p>
      </div>
      <div className="mt-4 h-[70vh] max-h-180 min-h-96 overflow-hidden">
        {points.length > 0 ? (
          <PointsMap
            key={`${feed}:${route}`}
            points={points}
            focusZoom={14}
            fallbackLabel="Peta tak dapat dipapar di peranti ini"
          />
        ) : (
          !loading && (
            <div className="flex h-full items-center justify-center px-6 text-center text-sm/6 text-gray-600 dark:text-gray-400">
              {data?.error ??
                `Tiada kedudukan sah daripada ${current.label} sekarang - mungkin di luar waktu operasi, atau sumber tidak menghantar kedudukan.`}
            </div>
          )
        )}
      </div>
    </div>
  );
}
