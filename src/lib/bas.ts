// Live bus/train positions for /bas: data.gov.my GTFS Realtime (protobuf), decoded
// by lib/gtfs-rt, route names from the generated src/data/bas-routes.ts.
// Positions are cached 20 s per feed (every viewer polls the same copy); the stored
// copy lives only 2 minutes - an old bus position is worse than none.

import { BAS_ROUTES } from "../data/bas-routes";
import { withFallback } from "./fallback";
import { decodeVehiclePositions } from "./gtfs-rt";

const API = "https://api.data.gov.my/gtfs-realtime/vehicle-position/";

/** Keep ids/paths in step with scripts/bas/feeds.py. */
export const FEEDS = [
  { id: "rapid-bus-kl", label: "Rapid KL - bas", region: "Lembah Klang", path: "prasarana?category=rapid-bus-kl" },
  { id: "rapid-bus-mrtfeeder", label: "Rapid KL - bas perantara MRT", region: "Lembah Klang", path: "prasarana?category=rapid-bus-mrtfeeder" },
  { id: "rapid-bus-penang", label: "Rapid Penang", region: "Pulau Pinang", path: "prasarana?category=rapid-bus-penang" },
  { id: "ktmb", label: "KTMB - tren", region: "Semenanjung", path: "ktmb" },
  { id: "mybas-johor", label: "myBAS Johor Bahru", region: "Johor", path: "mybas-johor" },
  { id: "mybas-melaka", label: "myBAS Melaka", region: "Melaka", path: "mybas-melaka" },
  { id: "mybas-seremban-a", label: "myBAS Seremban A", region: "Negeri Sembilan", path: "mybas-seremban-a" },
  { id: "mybas-seremban-b", label: "myBAS Seremban B", region: "Negeri Sembilan", path: "mybas-seremban-b" },
  { id: "mybas-ipoh", label: "myBAS Ipoh", region: "Perak", path: "mybas-ipoh" },
  { id: "mybas-alor-setar", label: "myBAS Alor Setar", region: "Kedah", path: "mybas-alor-setar" },
  { id: "mybas-kangar", label: "myBAS Kangar", region: "Perlis", path: "mybas-kangar" },
  { id: "mybas-kota-bharu", label: "myBAS Kota Bharu", region: "Kelantan", path: "mybas-kota-bharu" },
  { id: "mybas-kuala-terengganu", label: "myBAS Kuala Terengganu", region: "Terengganu", path: "mybas-kuala-terengganu" },
  { id: "mybas-kuching", label: "myBAS Kuching", region: "Sarawak", path: "mybas-kuching" },
] as const;
export type FeedId = (typeof FEEDS)[number]["id"];

export interface BusPosition {
  id: string;
  lat: number;
  lng: number;
  /** Route riders know ("300"); "-" when the feed sends none. */
  route: string;
  /** GTFS route_id ("U3000") - names the route-line file public/data/bas/<feed>/<routeId>.json. */
  routeId: string;
  routeName: string;
  plate: string;
  /** Unix seconds of the position. */
  at: number;
}

export interface Positions {
  vehicles: BusPosition[];
  source: string;
  stale: boolean;
}

/** Malaysia's bounding box - feeds sometimes send (0, 0) or junk for parked vehicles. */
export const inMalaysia = (lat: number, lng: number) => lat > 0.8 && lat < 7.6 && lng > 99.5 && lng < 119.5;

/** Raw route_id -> what riders know: "U3000" -> ["300", "Terminal Maluri ~ Lebuh Ampang"]. */
export const routeName = (feed: string, routeId: string): [string, string] =>
  BAS_ROUTES[feed]?.[routeId] ?? [routeId, ""];

export async function getPositions(feed: FeedId): Promise<Positions | null> {
  const f = FEEDS.find((x) => x.id === feed)!;
  const got = await withFallback<BusPosition[]>(
    `bas:${feed}`,
    [
      {
        name: "data.gov.my (GTFS Realtime)",
        load: async () => {
          const res = await fetch(API + f.path, { signal: AbortSignal.timeout(8000) });
          if (!res.ok) return null;
          return decodeVehiclePositions(new Uint8Array(await res.arrayBuffer()))
            .filter((v) => inMalaysia(v.lat, v.lng))
            .map((v) => {
              const [short, long] = routeName(feed, v.routeId);
              return {
                id: v.id || `${v.routeId}-${v.lat}-${v.lng}`,
                lat: Math.round(v.lat * 1e5) / 1e5,
                lng: Math.round(v.lng * 1e5) / 1e5,
                route: short || v.routeId || "-",
                routeId: v.routeId,
                routeName: long,
                plate: v.plate || v.label,
                at: v.timestamp,
              };
            });
        },
      },
    ],
    { freshS: 20, staleS: 120 },
  );
  return got ? { vehicles: got.data, source: got.source, stale: got.stale } : null;
}
