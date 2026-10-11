// Check for src/lib/fallback.ts with an in-memory Cache API and fake sources.
// Run: bun scripts/check-fallback.ts
import { expect } from "bun:test";

const store = new Map<string, string>();
(globalThis as any).caches = {
  default: {
    match: async (req: Request) => (store.has(req.url) ? new Response(store.get(req.url)) : undefined),
    put: async (req: Request, res: Response) => void store.set(req.url, await res.text()),
  },
};
const { withFallback } = await import("../src/lib/fallback.ts");
const keep = { freshS: 60, staleS: 600 };

let calls = 0;
const plans = (c: () => Promise<number | null>) => [
  { name: "A", load: async () => (calls++, null) }, // "no data" -> next plan
  { name: "B", load: async () => { calls++; throw new Error("down"); } }, // error -> next plan
  { name: "C", load: async () => (calls++, c()) },
];

// 1. A and B fail, C answers.
let got = await withFallback("k", plans(async () => 42), keep);
expect(got).toEqual({ data: 42, source: "C", stale: false });
expect(calls).toBe(3);

// 2. Fresh copy: no source is called.
got = await withFallback("k", plans(async () => 7), keep);
expect(got).toEqual({ data: 42, source: "C", stale: false });
expect(calls).toBe(3);

// 3. Fresh expired, every plan fails -> last good copy, flagged stale.
for (const k of store.keys()) if (k.includes("/fresh/")) store.delete(k);
got = await withFallback("k", plans(async () => null), keep);
expect(got).toEqual({ data: 42, source: "C", stale: true });

// 4. Nothing cached and every plan fails -> null.
expect(await withFallback("other", plans(async () => null), keep)).toBeNull();

console.log("fallback: ok");
