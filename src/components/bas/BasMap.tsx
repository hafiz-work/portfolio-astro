import { useEffect, useMemo, useState } from "react";
import PointsMap, { type MapLine, type MapPoint } from "@/components/ui/PointsMap";
import { Select } from "@/components/ui/Select";
import type { BusPosition } from "@/lib/bas";

/**
 * /bas: live vehicles of one operator on PointsMap, refreshed every 30 s from
 * /bas/<feed>.json (paused while the tab is hidden). The feed sits in ?feed= so a
 * link opens the same operator; a route filter refits the map to that route and
 * draws its line (public/data/bas/<feed>/<routeId>.json, scripts/bas/shapes.py).
 * The pseudo-feed "rel" shows the Rapid KL rail network instead (public/data/rel.json):
 * data.gov.my has no live train positions, so lines + stations + scheduled headway.
 */
type Feed = { id: string; label: string; region: string };
type Payload = { vehicles: BusPosition[]; source: string | null; stale: boolean; error?: string };
type Rail = {
  lines: { id: string; short: string; name: string; ends: string; color: string; headway: [number, number] | null; shapes: [number, number][][] }[];
  stations: { id: string; name: string; lat: number; lng: number; line: string; oku: boolean }[];
};

export const RAIL = "rel";
const POLL_MS = 30_000;
const MAP_BOX = "mt-4 h-[70vh] max-h-180 min-h-96 overflow-hidden";

const ago = (at: number, now: number) => {
  const s = Math.max(0, Math.round(now / 1000 - at));
  return s < 90 ? `${s} saat lalu` : `${Math.round(s / 60)} minit lalu`;
};

export default function BasMap({ feeds }: { feeds: Feed[] }) {
  const [feed, setFeed] = useState(() => {
    const fromUrl = new URLSearchParams(location.search).get("feed");
    return feeds.some((f) => f.id === fromUrl) ? fromUrl! : feeds[0].id;
  });

  const pickFeed = (id: string) => {
    setFeed(id);
    const url = new URL(location.href);
    url.searchParams.set("feed", id);
    history.replaceState(history.state, "", url);
  };

  const feedSelect = (
    <Select
      label="Operator"
      value={feed}
      onChange={(v) => pickFeed(String(v))}
      options={feeds.map((f) => ({ value: f.id, label: `${f.label} (${f.region})` }))}
      className="w-full sm:w-80"
    />
  );
  return feed === RAIL ? <RailView feedSelect={feedSelect} /> : <BusView key={feed} feed={feed} feeds={feeds} feedSelect={feedSelect} />;
}

function BusView({ feed, feeds, feedSelect }: { feed: string; feeds: Feed[]; feedSelect: React.ReactNode }) {
  const [route, setRoute] = useState("");
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());
  const [lines, setLines] = useState<MapLine[]>([]);

  useEffect(() => {
    let stop = false;
    let timer = 0;
    const ctrl = new AbortController();
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

  const vehicles = data?.vehicles ?? [];
  const routes = useMemo(() => {
    const names = new Map<string, string>();
    for (const v of vehicles) names.set(v.route, v.routeName);
    return [...names]
      .sort(([a], [b]) => a.localeCompare(b, "ms", { numeric: true }))
      .map(([r, name]) => ({ value: r, label: r === "-" ? "Tanpa nombor laluan" : name ? `${r} - ${name}` : r }));
  }, [vehicles]);
  const shown = route ? vehicles.filter((v) => v.route === route) : vehicles;

  // The picked route's line(s): every route_id riding under that number.
  const routeIds = useMemo(
    () => [...new Set(shown.map((v) => v.routeId).filter(Boolean))].sort().join(","),
    [route, data], // eslint-disable-line react-hooks/exhaustive-deps
  );
  useEffect(() => {
    setLines([]);
    if (!route || route === "-" || !routeIds) return;
    let stop = false;
    Promise.all(
      routeIds.split(",").map((id) =>
        fetch(`/data/bas/${feed}/${encodeURIComponent(id)}.json`)
          .then((r) => (r.ok ? (r.json() as Promise<[number, number][][]>) : []))
          .catch(() => []),
      ),
    ).then((all) => !stop && setLines(all.flat().map((coordinates) => ({ coordinates, color: "#0284c7", width: 4 }))));
    return () => {
      stop = true;
    };
  }, [feed, route, routeIds]);

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
        {feedSelect}
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
            : `${shown.length} kenderaan · dikemas kini setiap 30 saat${data?.stale ? " · data simpanan" : ""}${route && lines.length ? " · garisan laluan dipaparkan" : ""}`}
        </p>
      </div>
      <div className={MAP_BOX}>
        {points.length > 0 ? (
          <PointsMap
            // Remount when the route line arrives so the map refits to it.
            key={`${feed}:${route}:${lines.length}`}
            points={points}
            lines={lines}
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

function RailView({ feedSelect }: { feedSelect: React.ReactNode }) {
  const [rail, setRail] = useState<Rail | null>(null);
  const [error, setError] = useState(false);
  const [line, setLine] = useState("");

  useEffect(() => {
    fetch("/data/rel.json")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setRail)
      .catch(() => setError(true));
  }, []);

  const byId = new Map(rail?.lines.map((l) => [l.id, l]));
  const lines: MapLine[] = (rail?.lines ?? [])
    .filter((l) => !line || l.id === line)
    .flatMap((l) => l.shapes.map((coordinates) => ({ coordinates, color: l.color, width: 4 })));
  const points: MapPoint[] = (rail?.stations ?? [])
    .filter((s) => !line || s.line === line)
    .map((s) => {
      const l = byId.get(s.line);
      return {
        id: s.id,
        lat: s.lat,
        lng: s.lng,
        title: s.name,
        subtitle: l ? `${l.name} · ${s.id}` : s.id,
        detail: [
          l?.headway ? `Tren setiap ${l.headway[0]}-${l.headway[1]} minit (jadual)` : "",
          s.oku ? "Mesra OKU" : "",
        ]
          .filter(Boolean)
          .join(" · "),
        color: l?.color,
      };
    });

  return (
    <div>
      <div className="flex flex-wrap items-end gap-3 px-2">
        {feedSelect}
        <Select
          label="Laluan"
          value={line}
          onChange={(v) => setLine(String(v))}
          options={[
            { value: "", label: `Semua laluan (${rail?.lines.length ?? 0})` },
            ...(rail?.lines ?? []).map((l) => ({ value: l.id, label: `${l.name} - ${l.ends}` })),
          ]}
          className="w-full sm:w-96"
        />
        <p className="text-sm/6 text-gray-600 dark:text-gray-400">
          Peta rangkaian dan stesen. Kedudukan tren langsung tidak disediakan oleh data.gov.my.
        </p>
      </div>
      {rail && (
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 px-2 text-xs/5 text-gray-600 dark:text-gray-400" aria-label="Warna laluan">
          {rail.lines.map((l) => (
            <li key={l.id} className="flex items-center gap-1.5">
              <span className="h-1.5 w-4 rounded-full" style={{ backgroundColor: l.color }} aria-hidden="true" />
              {l.name}
            </li>
          ))}
        </ul>
      )}
      <div className={MAP_BOX}>
        {rail ? (
          <PointsMap key={line} points={points} lines={lines} focusZoom={14} fallbackLabel="Peta tak dapat dipapar di peranti ini" />
        ) : (
          <div className="flex h-full items-center justify-center text-sm/6 text-gray-600 dark:text-gray-400">
            {error ? "Peta rel tidak dapat dimuatkan." : "Memuatkan…"}
          </div>
        )}
      </div>
    </div>
  );
}
