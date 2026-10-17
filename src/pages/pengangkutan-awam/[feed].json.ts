import type { APIRoute } from "astro";
import { FEEDS, getPositions, type FeedId } from "../../lib/pengangkutan-awam";

export const prerender = false;

// /pengangkutan-awam/<feed>.json - live positions for the /pengangkutan-awam map (polled every 30 s).
export const GET: APIRoute = async ({ params }) => {
  const feed = FEEDS.find((f) => f.id === params.feed)?.id as FeedId | undefined;
  if (!feed) return new Response(JSON.stringify({ error: "Suapan tidak dikenali." }), { status: 404, headers: { "Content-Type": "application/json" } });
  const data = await getPositions(feed);
  return new Response(JSON.stringify(data ?? { vehicles: [], source: null, stale: false, error: "Sumber tidak dapat dicapai." }), {
    status: data ? 200 : 502,
    headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=15" },
  });
};
