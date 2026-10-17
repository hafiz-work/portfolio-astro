import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import PointsMap, { POINTS_MAP_FOCUS, type MapLine, type MapPoint } from "@/components/ui/PointsMap";
import { Select } from "@/components/ui/Select";
import type { BusPosition } from "@/lib/pengangkutan-awam";
import { distanceKm, geoErrorText, locateOnce } from "@/lib/geo";
import { setParam } from "@/lib/url";
import { planRoute, seq, sliceShape, stationNames, type Journey, type RailStation } from "./rail-route";

/**
 * /pengangkutan-awam: live vehicles of one operator on PointsMap, refreshed every 30 s from
 * /pengangkutan-awam/<feed>.json (paused while the tab is hidden, and after IDLE_MS without a tap,
 * scroll or key - a forgotten open tab would otherwise poll all day). The feed sits in ?feed= so a
 * link opens the same operator; a route filter refits the map to that route and
 * draws its line (public/data/pengangkutan-awam/<feed>/<routeId>.json, scripts/pengangkutan-awam/shapes.py).
 * The pseudo-feed "rel" shows the Rapid KL rail network instead (public/data/pengangkutan-awam/rel.json):
 * data.gov.my has no live train positions, so lines + stations + scheduled headway.
 * Tapping a station opens a place panel (StationDetail): every line at that name
 * (interchanges), headway, the stations either side, OKU, directions, "Dari sini"/"Ke sini".
 * URL: ?feed= (else the last feed from localStorage), ?laluan= (bus route), ?stesen= (rail station).
 * The rail journey planner (rail-route.ts) counts stops + changes from rel.json only - no live times.
 */
type Feed = { id: string; label: string; region: string };
type Payload = { vehicles: BusPosition[]; source: string | null; stale: boolean; error?: string };
type RailLine = { id: string; short: string; name: string; ends: string; color: string; headway: [number, number] | null; shapes: [number, number][][] };
type Station = RailStation;
type Rail = { lines: RailLine[]; stations: Station[] };

const RAIL = "rel";
const POLL_MS = 30_000;
const IDLE_MS = 10 * 60_000;
const ACTIVITY = ["pointerdown", "keydown", "wheel", "touchstart"] as const;
const MAP_BOX = "mt-4 h-[70vh] max-h-180 min-h-96 overflow-hidden";
const FEED_KEY = "pengangkutan-awam:feed";
const PILL =
  "rounded-full border border-gray-950/10 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-60 dark:border-white/10 dark:text-gray-200 dark:hover:bg-gray-800";

const param = (key: string) => new URLSearchParams(location.search).get(key);

/** Badge on a line colour: white or gray-950 text, whichever contrasts more (WCAG luminance) - Monorail green, Putrajaya yellow need dark. */
const lineBadge = (hex = "#0284c7") => {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return { backgroundColor: hex, color: (l + 0.05) / 0.055 > 1.05 / (l + 0.05) ? "#030712" : "#fff" };
};

const Skeleton = ({ className = "" }: { className?: string }) => (
  <span className={cn("block rounded-md bg-gray-200 motion-safe:animate-pulse dark:bg-gray-800", className)} aria-hidden="true" />
);
const MapSkeleton = () => (
  <div className="relative h-full">
    <Skeleton className="h-full rounded-none" />
    <span className="sr-only">Memuatkan…</span>
  </div>
);

const ago = (at: number, now: number) => {
  const s = Math.max(0, Math.round(now / 1000 - at));
  return s < 90 ? `${s} saat lalu` : `${Math.round(s / 60)} minit lalu`;
};

export default function PengangkutanAwamMap({ feeds }: { feeds: Feed[] }) {
  const [feed, setFeed] = useState<string | null>(null);
  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(FEED_KEY);
    } catch { }
    const known = (id: string | null) => feeds.some((f) => f.id === id);
    const fromUrl = param("feed");
    setFeed(known(fromUrl) ? fromUrl : known(saved) ? saved : feeds[0].id);
  }, [feeds]);

  const pickFeed = (id: string) => {
    setFeed(id);
    try {
      localStorage.setItem(FEED_KEY, id);
    } catch { }
    setParam("feed", id);
    setParam("laluan", null);
    setParam("stesen", null);
  };
  if (!feed)
    return (
      <div>
        <div className="flex flex-wrap items-end gap-3 px-2">
          <Skeleton className="h-16 w-full sm:w-80" />
          <Skeleton className="h-16 w-full sm:w-96" />
        </div>
        <div className={MAP_BOX}>
          <MapSkeleton />
        </div>
      </div>
    );

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
  const [picked, setPicked] = useState<string | null>(null);
  const [near, setNear] = useState<{ busy?: boolean; text: string }>({ text: "" });
  useEffect(() => setRoute(param("laluan") ?? ""), []);
  const pickRoute = (r: string) => {
    setRoute(r);
    setParam("laluan", r || null);
  };
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());
  const [lines, setLines] = useState<MapLine[]>([]);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    let stop = false;
    let timer = 0;
    let lastActive = Date.now();
    let idle = false;
    const ctrl = new AbortController();
    const load = async () => {
      try {
        const res = await fetch(`/pengangkutan-awam/${feed}.json`, { signal: ctrl.signal });
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
        if (Date.now() - lastActive > IDLE_MS) {
          // Nobody is looking: stop until the next tap/scroll/key (onActive).
          idle = true;
          setPaused(true);
          return;
        }
        if (!document.hidden) await load();
        if (!stop) schedule();
      }, POLL_MS);
    };
    const onActive = () => {
      lastActive = Date.now();
      if (!idle) return;
      idle = false;
      setPaused(false);
      load().then(schedule);
    };
    const onVisible = () => {
      if (document.hidden) return;
      if (idle) onActive();
      else load().then(schedule);
    };
    load().then(schedule);
    document.addEventListener("visibilitychange", onVisible);
    for (const type of ACTIVITY) window.addEventListener(type, onActive, { passive: true });
    return () => {
      stop = true;
      ctrl.abort();
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
      for (const type of ACTIVITY) window.removeEventListener(type, onActive);
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
  // A ?laluan= with no bus on it right now is ignored, not an empty map.
  const active = routes.some((r) => r.value === route) ? route : "";
  const shown = active ? vehicles.filter((v) => v.route === active) : vehicles;

  // "Bas terdekat": one location reading, nearest vehicle shown, all on the device.
  const nearest = () => {
    if (!("geolocation" in navigator)) return setNear({ text: "lokasi tidak disokong pada peranti ini" });
    setNear({ busy: true, text: "mencari lokasi anda…" });
    locateOnce().then(
      (coords) => {
        const best = shown
          .map((v) => ({ v, km: distanceKm(coords.latitude, coords.longitude, v.lat, v.lng) }))
          .sort((a, b) => a.km - b.km)[0];
        if (!best) return setNear({ text: "tiada bas untuk dipilih" });
        setPicked(best.v.id);
        window.dispatchEvent(new CustomEvent(POINTS_MAP_FOCUS, { detail: { id: best.v.id } }));
        const km = best.km < 1 ? `${Math.round(best.km * 1000)} m` : `${best.km.toFixed(1)} km`;
        setNear({ text: `bas terdekat ${km} dari anda (${best.v.route === "-" ? "laluan tidak diketahui" : `Laluan ${best.v.route}`})` });
      },
      (err) => setNear({ text: geoErrorText(err).toLowerCase() }),
    );
  };

  // The picked route's line(s): every route_id riding under that number.
  const routeIds = useMemo(
    () => [...new Set(shown.map((v) => v.routeId).filter(Boolean))].sort().join(","),
    [active, data], // eslint-disable-line react-hooks/exhaustive-deps
  );
  useEffect(() => {
    setLines([]);
    if (!active || active === "-" || !routeIds) return;
    let stop = false;
    Promise.all(
      routeIds.split(",").map((id) =>
        fetch(`/data/pengangkutan-awam/${feed}/${encodeURIComponent(id)}.json`)
          .then((r) => (r.ok ? (r.json() as Promise<[number, number][][]>) : []))
          .catch(() => []),
      ),
    ).then((all) => !stop && setLines(all.flat().map((coordinates) => ({ coordinates, color: "#0284c7", width: 4 }))));
    return () => {
      stop = true;
    };
  }, [feed, active, routeIds]);

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
          value={active}
          onChange={(v) => pickRoute(String(v))}
          options={[{ value: "", label: `Semua laluan (${routes.length})` }, ...routes]}
          className="w-full sm:w-96"
        />
        <button type="button" onClick={nearest} disabled={loading || near.busy || !shown.length} className={PILL}>
          Bas terdekat
        </button>
        <p className="py-2 text-sm/6 text-gray-600 dark:text-gray-400" aria-live="polite">
          {loading ? (
            <Skeleton className="inline-block h-4 w-56 align-middle" />
          ) : (
            `${shown.length} kenderaan · ${paused ? "kemas kini dijeda (tiada aktiviti) - sentuh atau tatal untuk sambung" : "dikemas kini setiap 30 saat"}${data?.stale ? " · data simpanan" : ""}${active && lines.length ? " · garisan laluan dipaparkan" : ""}${near.text ? ` · ${near.text}` : ""}`
          )}
        </p>
      </div>
      <div className={MAP_BOX}>
        {points.length > 0 ? (
          <PointsMap
            // Remount when the route line arrives so the map refits to it.
            key={`${feed}:${active}:${lines.length}`}
            points={points}
            lines={lines}
            focusZoom={14}
            fallbackLabel="Peta tak dapat dipapar di peranti ini"
            searchPlaceholder="Cari laluan atau bas…"
            initialId={picked && shown.some((v) => v.id === picked) ? picked : undefined}
            onSelect={setPicked}
          />
        ) : loading ? (
          <MapSkeleton />
        ) : (
          <div className="flex h-full items-center justify-center px-6 text-center text-sm/6 text-gray-600 dark:text-gray-400">
            {data?.error ??
              `Tiada kedudukan sah daripada ${current.label} sekarang - mungkin di luar waktu operasi, atau sumber tidak menghantar kedudukan.`}
          </div>
        )}
      </div>
    </div>
  );
}

function RailView({ feedSelect }: { feedSelect: React.ReactNode }) {
  const [rail, setRail] = useState<Rail | null>(null);
  const [error, setError] = useState(false);
  const [line, setLine] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  useEffect(() => {
    setSelected(param("stesen"));
    fetch("/data/pengangkutan-awam/rel.json")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setRail)
      .catch(() => setError(true));
  }, []);
  const onSelect = (id: string | null) => {
    setSelected(id);
    setParam("stesen", id);
  };

  const byId = new Map(rail?.lines.map((l) => [l.id, l]));
  const names = useMemo(() => (rail ? stationNames(rail.stations) : []), [rail]);
  const journey = useMemo(() => (rail && from && to ? planRoute(rail.stations, from, to) : null), [rail, from, to]);

  // A planned journey replaces the network: only its stations and its stretch of each line, thick.
  const lines: MapLine[] = journey
    ? journey.legs.map((leg) => {
      const l = byId.get(leg.line);
      return {
        coordinates: l?.shapes[0] ? sliceShape(l.shapes[0], leg.from, leg.to) : leg.path.map((s) => [s.lng, s.lat] as [number, number]),
        color: l?.color ?? "#0284c7",
        width: 7,
      };
    })
    : (rail?.lines ?? [])
      .filter((l) => !line || l.id === line)
      .flatMap((l) => l.shapes.map((coordinates) => ({ coordinates, color: l.color, width: 4 })));
  // Interchanges are one row per line at the same spot: label the name once.
  const named = new Set<string>();
  const stations = journey ? journey.legs.flatMap((leg) => leg.path) : (rail?.stations ?? []).filter((s) => !line || s.line === line);
  const points: MapPoint[] = [...new Map(stations.map((s) => [s.id, s])).values()].map((s) => {
    const l = byId.get(s.line);
    const label = named.has(s.name) ? undefined : (named.add(s.name), s.name);
    return {
      id: s.id,
      lat: s.lat,
      lng: s.lng,
      title: s.name,
      label,
      subtitle: l ? `${l.name} · ${s.id}` : s.id,
      detail: [l?.headway ? `Tren setiap ${l.headway[0]}-${l.headway[1]} minit (jadual)` : "", s.oku ? "Mesra OKU" : ""]
        .filter(Boolean)
        .join(" · "),
      color: l?.color,
    };
  });
  const stationOptions = (none: string) => [{ value: "", label: none }, ...names.map((n) => ({ value: n, label: n }))];

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
        <p className="py-2 text-sm/6 text-gray-600 dark:text-gray-400">
          Peta rangkaian dan stesen. Kedudukan tren langsung tidak disediakan oleh data.gov.my.
        </p>
      </div>
      {rail ? (
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 px-2 text-xs/5 text-gray-600 dark:text-gray-400" aria-label="Warna laluan">
          {rail.lines.map((l) => (
            <li key={l.id} className="flex items-center gap-1.5">
              <span className="h-1.5 w-4 rounded-full" style={{ backgroundColor: l.color }} aria-hidden="true" />
              {l.name}
            </li>
          ))}
        </ul>
      ) : (
        !error && <Skeleton className="mx-2 mt-3 h-5 w-2/3" />
      )}

      <section aria-labelledby="rancang-perjalanan" className="mt-6 px-2">
        <h2 id="rancang-perjalanan" className="text-base font-semibold tracking-tight">
          Rancang perjalanan
        </h2>
        <div className="mt-2 flex flex-wrap items-end gap-3">
          <Select label="Dari" value={from} onChange={(v) => setFrom(String(v))} options={stationOptions("Pilih stesen")} className="w-full sm:w-72" />
          <Select label="Ke" value={to} onChange={(v) => setTo(String(v))} options={stationOptions("Pilih stesen")} className="w-full sm:w-72" />
          <button
            type="button"
            onClick={() => {
              setFrom(to);
              setTo(from);
            }}
            disabled={!from && !to}
            className={PILL}
          >
            Tukar arah
          </button>
          {(from || to) && (
            <button
              type="button"
              onClick={() => {
                setFrom("");
                setTo("");
              }}
              className={PILL}
            >
              Kosongkan
            </button>
          )}
        </div>
        {from && to && rail && <JourneySteps journey={journey} rail={rail} same={from === to} />}
      </section>

      <div className={MAP_BOX}>
        {rail ? (
          <PointsMap
            key={`${line}:${journey ? `${from}>${to}` : ""}`}
            points={points}
            lines={lines}
            focusZoom={14}
            fallbackLabel="Peta tak dapat dipapar di peranti ini"
            searchPlaceholder="Cari stesen…"
            initialId={selected && points.some((p) => p.id === selected) ? selected : undefined}
            onSelect={onSelect}
            renderDetail={(p, select) => (
              <StationDetail rail={rail} id={p.id} shownLine={journey ? "-" : line} select={select} onFrom={setFrom} onTo={setTo} />
            )}
          />
        ) : error ? (
          <div className="flex h-full items-center justify-center text-sm/6 text-gray-600 dark:text-gray-400">Peta rel tidak dapat dimuatkan.</div>
        ) : (
          <MapSkeleton />
        )}
      </div>
    </div>
  );
}

function JourneySteps({ journey, rail, same }: { journey: Journey | null; rail: Rail; same: boolean }) {
  if (!journey)
    return (
      <p className="mt-3 text-sm/6 text-gray-600 dark:text-gray-400">
        {same ? "Stesen mula dan destinasi sama." : "Tiada laluan rel ditemui antara dua stesen ini."}
      </p>
    );
  const lineOf = (id: string) => rail.lines.find((l) => l.id === id);
  const Badge = ({ id }: { id: string }) => {
    const l = lineOf(id);
    return (
      <span className="rounded px-1.5 py-0.5 text-xs font-semibold whitespace-nowrap" style={lineBadge(l?.color)}>
        {l?.name ?? id}
      </span>
    );
  };
  return (
    <div className="mt-3 max-w-2xl">
      <p className="text-sm font-medium">
        {journey.stops} hentian · {journey.transfers ? `${journey.transfers} kali tukar laluan` : "tanpa tukar laluan"}
      </p>
      <ol className="mt-2 space-y-2 border-l-2 border-gray-950/10 pl-4 text-sm/6 text-gray-700 dark:border-white/10 dark:text-gray-300">
        {journey.legs.map((leg, i) => (
          <li key={i}>
            Naik <Badge id={leg.line} /> di <strong>{leg.from.name}</strong> arah {leg.towards.name}, {leg.stops} hentian
            {i < journey.legs.length - 1 ? (
              <>
                , tukar di <strong>{leg.to.name}</strong> ke <Badge id={journey.legs[i + 1].line} />.
              </>
            ) : (
              <>
                , turun di <strong>{leg.to.name}</strong>.
              </>
            )}
          </li>
        ))}
      </ol>
      <p className="mt-2 text-xs/5 text-gray-500 dark:text-gray-400">
        Dikira ikut bilangan hentian dan peta rangkaian (setiap tukar laluan dikira seperti beberapa hentian), bukan masa tren sebenar
        atau gangguan semasa. Semak pengumuman Rapid KL sebelum bertolak.
      </p>
    </div>
  );
}

function StationDetail({
  rail,
  id,
  shownLine,
  select,
  onFrom,
  onTo,
}: {
  rail: Rail;
  id: string;
  shownLine: string;
  select: (id: string) => void;
  onFrom: (name: string) => void;
  onTo: (name: string) => void;
}) {
  const station = rail.stations.find((s) => s.id === id)!;
  const here = rail.stations.filter((s) => s.name === station.name);
  const directions = `https://www.google.com/maps/dir/?api=1&destination=${station.lat},${station.lng}&travelmode=transit`;
  return (
    <div className="p-4 pt-3 sm:pt-4">
      <h2 className="pr-8 text-xl font-semibold tracking-tight">{station.name}</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Stesen {here.length > 1 ? `pertukaran · ${here.length} laluan` : "rel"}
        {station.oku ? " · Mesra OKU" : ""}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <a
          href={directions}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center rounded-full bg-sky-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-sky-700 dark:bg-sky-500 dark:hover:bg-sky-400"
        >
          Arah ke sini
        </a>
        <button type="button" onClick={() => onFrom(station.name)} className={PILL}>
          Dari sini
        </button>
        <button type="button" onClick={() => onTo(station.name)} className={PILL}>
          Ke sini
        </button>
      </div>
      <ul className="mt-4 divide-y divide-gray-950/5 dark:divide-white/10">
        {here.map((s) => {
          const l = rail.lines.find((x) => x.id === s.line);
          const onLine = rail.stations.filter((x) => x.line === s.line).sort((a, b) => seq(a.id) - seq(b.id));
          const i = onLine.findIndex((x) => x.id === s.id);
          const near = [onLine[i - 1], onLine[i + 1]].filter(Boolean);
          const canGo = !shownLine || shownLine === s.line;
          return (
            <li key={s.id} className="py-3">
              <p className="flex items-center gap-2 text-sm font-medium">
                <span className="rounded px-1.5 py-0.5 text-xs font-semibold" style={lineBadge(l?.color)}>
                  {s.id}
                </span>
                {l?.name ?? s.line}
              </p>
              {l?.ends && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{l.ends}</p>}
              {l?.headway && (
                <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">
                  Tren setiap {l.headway[0]}-{l.headway[1]} minit (jadual)
                </p>
              )}
              {near.length > 0 && (
                <p className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                  Stesen bersebelahan:
                  {near.map((n) =>
                    canGo ? (
                      <button
                        key={n.id}
                        type="button"
                        onClick={() => select(n.id)}
                        className="rounded-full border border-gray-950/10 px-2 py-0.5 font-medium text-gray-700 hover:bg-gray-100 dark:border-white/10 dark:text-gray-200 dark:hover:bg-gray-800"
                      >
                        {n.name}
                      </button>
                    ) : (
                      <span key={n.id} className="font-medium text-gray-700 dark:text-gray-200">{n.name}</span>
                    ),
                  )}
                </p>
              )}
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Kekerapan ikut jadual GTFS Prasarana, bukan masa tren sebenar.</p>
    </div>
  );
}
