import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { RESUME_URL } from "../lib/constants";

export const prerender = false;

// Stable alias for the current resume (Telegram bot, shared links). The file
// itself stays versioned in public/docs; a new version only bumps RESUME_URL.
export const GET: APIRoute = async ({ request }) => {
  const url = new URL(RESUME_URL, request.url);
  const res = env.ASSETS ? await env.ASSETS.fetch(url) : await fetch(url);
  if (!res.ok) return new Response("Not found", { status: 404 });
  return new Response(res.body, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'inline; filename="Hafiz-Bahtiar-Resume.pdf"',
      "Cache-Control": "public, max-age=300",
    },
  });
};
