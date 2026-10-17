// @ts-check
/// <reference lib="webworker" />
// Plain JS on purpose: browsers load it straight from public/ (no Vite build).
// Type check (kept out of the Astro program - its DOM lib clashes with webworker):
//   npx tsc --noEmit --allowJs --checkJs --strict --skipLibCheck --target es2022 --lib es2022,webworker public/sw.js
// Light offline mode for the Showcase apps. Registered by PublicLayout (production only).
// Pages: network first, the last good copy when the network fails, marked with
// <html data-salinan> so PublicLayout shows "Anda di luar talian - ini salinan terakhir".
// Hashed /_astro/* assets: cache first (immutable), so a stored page still has its CSS/JS.
// Nothing else is touched: no /admin, /account, /login, /register, /api, no POST,
// no cross-origin - those never reach respondWith.
//
// Bump VERSION to drop every stored copy on the next visit.
// KILL SWITCH: replace this whole file with
//   self.addEventListener("install", () => self.skipWaiting());
//   self.addEventListener("activate", (e) => e.waitUntil(caches.keys()
//     .then((ks) => Promise.all(ks.map((k) => caches.delete(k))))
//     .then(() => self.registration.unregister())));
// and deploy; every browser drops the worker on its next visit.
const sw = /** @type {ServiceWorkerGlobalScope} */ (/** @type {unknown} */ (self));
const VERSION = "v1";
const CACHE = `showcase-${VERSION}`;

// Keep in step with the `apps` hrefs in src/pages/showcase.astro.
const PAGES = new Set([
  "/showcase",
  "/pengangkutan-awam",
  "/kecemasan",
  "/waktu-solat",
  "/ramalan-cuaca",
  "/amaran-cuaca",
  "/gempa",
  "/tarikh-hijri",
  "/kiblat",
  "/ipu",
  "/harga-minyak",
  "/kadar-tukaran",
  "/derma-darah",
  "/inflasi",
  "/kalkulator-gaji",
  "/kalkulator-bil-elektrik",
  "/kalkulator-cukai-jalan",
  "/kiraan-detik",
  "/cuti-umum",
  "/takwim-sekolah",
]);

sw.addEventListener("install", () => sw.skipWaiting());
sw.addEventListener("activate", (e) =>
  e.waitUntil(
    caches
      .keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => sw.clients.claim()),
  ),
);

/** @param {Response} res */
const storable = (res) =>
  res.ok && res.type === "basic" && !res.redirected && !/no-store|private/.test(res.headers.get("Cache-Control") ?? "");

sw.addEventListener("fetch", (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin || req.headers.has("Authorization")) return;

  // ponytail: /_astro grows by one set per deploy until VERSION is bumped; prune by age if it matters.
  if (url.pathname.startsWith("/_astro/")) {
    e.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ??
          fetch(req).then((res) => {
            if (storable(res)) {
              const copy = res.clone();
              e.waitUntil(caches.open(CACHE).then((c) => c.put(req, copy)));
            }
            return res;
          }),
      ),
    );
    return;
  }

  // Page fetches: real navigations and ClientRouter's fetch() of the same URL.
  if (!PAGES.has(url.pathname.replace(/(.)\/$/, "$1"))) return;
  e.respondWith(
    fetch(req)
      .then((res) => {
        if (storable(res) && (res.headers.get("Content-Type") ?? "").includes("text/html")) {
          const copy = res.clone();
          e.waitUntil(caches.open(CACHE).then((c) => c.put(url.href, copy)));
        }
        return res;
      })
      .catch(async () => {
        // Same query first (?zone=…), else any stored copy of that page.
        const hit = (await caches.match(url.href)) ?? (await caches.match(url.href, { ignoreSearch: true }));
        if (!hit) return Response.error();
        const html = (await hit.text()).replace("<html", "<html data-salinan");
        // The body grew by the attribute: drop the stored length/encoding headers.
        const headers = new Headers(hit.headers);
        headers.delete("Content-Length");
        headers.delete("Content-Encoding");
        return new Response(html, { headers });
      }),
  );
});
