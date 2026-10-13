// Plan A -> B -> C -> last good copy, for every module that fetches public data
// (Waktu Solat, Kadar Tukaran, Kiraan Detik, Peringatan). Malaysian sources come
// first; each later plan is a different provider of the same data.
//
// Two colo-cache entries per key:
//   - fresh: served without touching any source until `freshS` runs out;
//   - stale: the same payload kept for `staleS`, used only when every plan fails,
//     and reported as `stale: true` so the page can say "data simpanan".
// Bad responses never reach the cache: a source returns null to mean "try the next".

export interface Source<T> {
  /** Shown to readers ("e-solat JAKIM", "Bank Negara Malaysia", …). */
  name: string;
  load: () => Promise<T | null>;
}

export interface Fetched<T> {
  data: T;
  source: string;
  /** All plans failed; this is the last good copy. */
  stale: boolean;
}

// Keys live on the site's own hostname (Cache API keys belong to the zone).
const keyFor = (key: string, kind: "fresh" | "stale") =>
  new Request(`https://hafizbahtiar.com/__cache/${kind}/${encodeURIComponent(key)}`);

const cacheStore = () => (globalThis.caches as unknown as { default?: Cache } | undefined)?.default;

async function read<T>(cache: Cache | undefined, req: Request): Promise<{ data: T; source: string } | null> {
  try {
    const hit = await cache?.match(req);
    return hit ? ((await hit.json()) as { data: T; source: string }) : null;
  } catch {
    return null;
  }
}

export async function withFallback<T>(
  key: string,
  sources: Source<T>[],
  { freshS, staleS }: { freshS: number; staleS: number },
): Promise<Fetched<T> | null> {
  const cache = cacheStore();
  const fresh = await read<T>(cache, keyFor(key, "fresh"));
  if (fresh) return { ...fresh, stale: false };

  for (const source of sources) {
    try {
      const data = await source.load();
      if (data == null) continue;
      const body = JSON.stringify({ data, source: source.name });
      const put = (kind: "fresh" | "stale", maxAge: number) =>
        cache?.put(keyFor(key, kind), new Response(body, {
          headers: { "Content-Type": "application/json", "Cache-Control": `public, max-age=${maxAge}` },
        }));
      await Promise.all([put("fresh", freshS), put("stale", staleS)]).catch(() => {});
      return { data, source: source.name, stale: false };
    } catch {
      // next plan
    }
  }

  const old = await read<T>(cache, keyFor(key, "stale"));
  return old ? { ...old, stale: true } : null;
}

/** GET JSON with a timeout; null on any non-2xx (so withFallback moves on). */
export async function getJson<T>(url: string, init: RequestInit & { timeoutMs?: number } = {}): Promise<T | null> {
  const res = await fetch(url, {
    ...init,
    headers: { Accept: "application/json", ...init.headers },
    signal: AbortSignal.timeout(init.timeoutMs ?? 6000),
  });
  return res.ok ? ((await res.json()) as T) : null;
}
