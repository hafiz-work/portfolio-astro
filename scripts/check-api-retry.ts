// Check for src/lib/api-client.ts: a 401 gets exactly one refresh + retry, never a loop.
// Run: bun scripts/check-api-retry.ts
import { expect } from "bun:test";

const seen: string[] = [];
let answer = 401; // what the protected endpoint returns
(globalThis as any).fetch = async (url: string) => {
  const path = new URL(url).pathname;
  seen.push(path);
  if (path.endsWith("/auth/refresh")) return new Response("{}", { status: 200 }); // refresh always "works"
  return new Response(JSON.stringify({ success: answer === 200, data: { ok: true }, error: "nope" }), { status: answer });
};
const { ApiClient, ApiError } = await import("../src/lib/api-client.ts");
class Probe extends ApiClient {
  call() { return this.get<{ ok: boolean }>("/me"); }
}
const api = new Probe("https://api.test/v1");

// Endpoint keeps answering 401 while refresh succeeds: one refresh, one retry, then an error.
const err = await api.call().then(() => null, (e) => e);
expect(err).toBeInstanceOf(ApiError);
expect(err.status).toBe(401);
expect(seen).toEqual(["/v1/me", "/v1/auth/refresh", "/v1/me"]);

// Normal case still works: 401 -> refresh -> retry succeeds.
seen.length = 0;
let first = true;
(globalThis as any).fetch = async (url: string) => {
  const path = new URL(url).pathname;
  seen.push(path);
  if (path.endsWith("/auth/refresh")) return new Response("{}", { status: 200 });
  const status = first ? 401 : 200;
  first = false;
  return new Response(JSON.stringify({ success: status === 200, data: { ok: true } }), { status });
};
expect(await api.call()).toEqual({ ok: true });
expect(seen).toEqual(["/v1/me", "/v1/auth/refresh", "/v1/me"]);

console.log("api-retry: ok");
