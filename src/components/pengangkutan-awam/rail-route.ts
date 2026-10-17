// Rail journey planner for /pengangkutan-awam (feed "rel"): pure, works only on rel.json.
// Fewest stops with a penalty per change of line - by stops, not live times.
// Adjacent = consecutive station numbers on one line (GTFS stop_ids run in line order, "KJ13");
// a transfer = the same station name on another line. Check: bun scripts/check-rail-route.ts

export type RailStation = { id: string; name: string; lat: number; lng: number; line: string; oku: boolean };
export type Leg = {
  line: string;
  from: RailStation;
  to: RailStation;
  /** The line's end station in the direction of travel ("arah ..."). */
  towards: RailStation;
  stops: number;
  path: RailStation[];
};
export type Journey = { legs: Leg[]; stops: number; transfers: number };

/** A change of line costs this many stops (walking + waiting). */
const TRANSFER = 4;

/** Station number within its line ("KJ10" -> 10, "KG18A" -> 18). */
export const seq = (id: string) => Number(id.match(/\d+/)?.[0] ?? 0);

/** Each station name once (interchanges are one row per line), sorted. */
export const stationNames = (stations: RailStation[]) => [...new Set(stations.map((s) => s.name))].sort((a, b) => a.localeCompare(b, "ms"));

const byLine = (stations: RailStation[]) => {
  const lines = new Map<string, RailStation[]>();
  for (const s of stations) lines.set(s.line, [...(lines.get(s.line) ?? []), s]);
  for (const l of lines.values()) l.sort((a, b) => seq(a.id) - seq(b.id));
  return lines;
};

export function planRoute(stations: RailStation[], fromName: string, toName: string): Journey | null {
  if (fromName === toName) return null;
  const lines = byLine(stations);
  const byId = new Map(stations.map((s) => [s.id, s]));
  const next = new Map<string, [string, number][]>();
  for (const l of lines.values())
    l.forEach((s, i) => next.set(s.id, [l[i - 1], l[i + 1]].filter(Boolean).map((n) => [n.id, 1])));
  for (const s of stations)
    for (const o of stations) if (o.name === s.name && o.id !== s.id) next.get(s.id)!.push([o.id, TRANSFER]);

  // Dijkstra from every platform of the start name. ponytail: O(n²) scan, fine for ~190 stations.
  const dist = new Map<string, number>();
  const prev = new Map<string, string>();
  for (const s of stations) if (s.name === fromName) dist.set(s.id, 0);
  const done = new Set<string>();
  let end: string | undefined;
  while (true) {
    let cur: string | undefined;
    for (const [id, d] of dist) if (!done.has(id) && (cur === undefined || d < dist.get(cur)!)) cur = id;
    if (cur === undefined) return null;
    if (byId.get(cur)!.name === toName) {
      end = cur;
      break;
    }
    done.add(cur);
    for (const [n, w] of next.get(cur)!) {
      const d = dist.get(cur)! + w;
      if (d < (dist.get(n) ?? Infinity)) {
        dist.set(n, d);
        prev.set(n, cur);
      }
    }
  }

  const ids = [end];
  while (prev.has(ids[0])) ids.unshift(prev.get(ids[0])!);
  // Split the station chain into legs at each change of line.
  const legs: Leg[] = [];
  let path: RailStation[] = [];
  for (const s of ids.map((id) => byId.get(id)!)) {
    if (path.length && path[0].line !== s.line) {
      if (path.length > 1) legs.push(leg(path, lines));
      path = [];
    }
    path.push(s);
  }
  if (path.length > 1) legs.push(leg(path, lines));
  const stops = legs.reduce((n, l) => n + l.stops, 0);
  return { legs, stops, transfers: legs.length - 1 };
}

function leg(path: RailStation[], lines: Map<string, RailStation[]>): Leg {
  const from = path[0];
  const to = path.at(-1)!;
  const l = lines.get(from.line)!;
  return { line: from.line, from, to, towards: seq(to.id) > seq(from.id) ? l.at(-1)! : l[0], stops: path.length - 1, path };
}

/** The part of a line shape ([lng, lat][]) between two stations, via the nearest vertices. */
export function sliceShape(shape: [number, number][], a: { lng: number; lat: number }, b: { lng: number; lat: number }) {
  const nearest = (p: { lng: number; lat: number }) => {
    let best = 0;
    shape.forEach(([x, y], i) => {
      const [bx, by] = shape[best];
      if ((x - p.lng) ** 2 + (y - p.lat) ** 2 < (bx - p.lng) ** 2 + (by - p.lat) ** 2) best = i;
    });
    return best;
  };
  const i = nearest(a);
  const j = nearest(b);
  return i <= j ? shape.slice(i, j + 1) : shape.slice(j, i + 1).reverse();
}
