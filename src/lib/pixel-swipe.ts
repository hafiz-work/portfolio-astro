// Pixel swipe page transition on ClientRouter navigations (public pages only).
// Drawing ported from Great UI "Pixel Swipe Page Transition"
// (https://www.great-ui.com/components/pixel-swipe-page-transition, Great UI Custom
// License - free to use here, never republish as a UI kit). The React provider is
// dropped: ClientRouter already owns navigation, so we hook its events instead.
//
// Cover runs alongside the page fetch (wrapped `loader`), the swap happens behind a
// fully covered screen, then the band carries on and reveals the new page.

type Dir = "left" | "right" | "top" | "bottom"; // side the band enters from

const COLOR = "#0ea5e9"; // sky-500
const CELL = 7;
const BAND = 52;
const FLICK = 0.34;
const OVER = 0.8;
const PHASE_MS = 440; // per half (cover / reveal); the original is 700

// Navbar order (first path segment); home is the logo, leftmost.
const ORDER = ["", "projects", "blog", "quotes"];
// Admin/account have their own shells (and form-guard owns the loader there).
const SKIP = /^\/(admin|account|login|register|verify-email)(\/|$)/;

const section = (u: URL) => u.pathname.split("/")[1] ?? "";
const depth = (u: URL) => u.pathname.split("/").filter(Boolean).length;

type NavEvent = Event & {
  from: URL;
  to: URL;
  direction: string;
  navigationType: string;
  loader: () => Promise<void>;
};

/** Which side the band enters from, so the motion matches where the user is going. */
const pick = (e: NavEvent): Dir => {
  if (e.navigationType === "traverse") return e.direction === "back" ? "left" : "right";
  const a = section(e.from);
  const b = section(e.to);
  if (a === b) return depth(e.to) > depth(e.from) ? "bottom" : depth(e.to) < depth(e.from) ? "top" : "right";
  const ia = ORDER.indexOf(a);
  const ib = ORDER.indexOf(b);
  if (ia < 0 || ib < 0) return "right";
  return ib > ia ? "right" : "left";
};

const cubicBezier = (p1x: number, p1y: number, p2x: number, p2y: number) => {
  const cx = 3 * p1x, bx = 3 * (p2x - p1x) - cx, ax = 1 - cx - bx;
  const cy = 3 * p1y, by = 3 * (p2y - p1y) - cy, ay = 1 - cy - by;
  const fx = (t: number) => ((ax * t + bx) * t + cx) * t;
  const fy = (t: number) => ((ay * t + by) * t + cy) * t;
  const dfx = (t: number) => (3 * ax * t + 2 * bx) * t + cx;
  return (x: number) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 8; i++) {
      const err = fx(t) - x;
      const d = dfx(t);
      if (Math.abs(err) < 1e-4 || Math.abs(d) < 1e-6) break;
      t -= err / d;
    }
    return fy(Math.min(1, Math.max(0, t)));
  };
};
const ease = cubicBezier(0.85, 0, 0.15, 1);

const hash = (x: number, y: number, s: number) => {
  let h = (x * 374761393) ^ (y * 668265263) ^ (s * 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
};

let raf = 0;
let covered = false;
let lastDir: Dir = "right";

const canvas = () => document.getElementById("pixel-swipe") as HTMLCanvasElement | null;

/**
 * One frame. Positions are measured from the side the band enters (`fwd` = left/top),
 * so all four directions share one path: `u` is the band edge, cover fills behind it,
 * reveal fills ahead of it, and cells within BAND of the edge are dithered.
 */
const draw = (ctx: CanvasRenderingContext2D, W: number, H: number, dir: Dir, phase: "cover" | "reveal", p: number) => {
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = COLOR;
  const horiz = dir === "left" || dir === "right";
  const fwd = dir === "left" || dir === "top";
  const L = horiz ? W : H;
  const M = horiz ? H : W;
  const u = -BAND + p * (L + 2 * BAND);

  const span = (a: number, b: number) => {
    a = Math.max(0, a);
    b = Math.min(L, b);
    if (b <= a) return;
    const s = fwd ? a : L - b;
    if (horiz) ctx.fillRect(s, 0, b - a, M);
    else ctx.fillRect(0, s, M, b - a);
  };
  if (phase === "cover") span(0, u - BAND);
  else span(u + BAND, L);

  const seed = phase === "cover" ? 0 : 91;
  for (let g = Math.floor((u - BAND) / CELL); g <= Math.ceil((u + BAND) / CELL); g++) {
    const c = g * CELL + CELL / 2;
    if (c < 0 || c > L) continue;
    const dist = phase === "cover" ? u - c : c - u;
    const pos = fwd ? g * CELL : L - (g + 1) * CELL;
    for (let k = 0; k * CELL < M; k++) {
      if ((dist / BAND) * 0.5 + 0.5 + (Math.random() - 0.5) * FLICK > hash(g, k, seed)) {
        if (horiz) ctx.fillRect(pos, k * CELL, CELL + OVER, CELL + OVER);
        else ctx.fillRect(k * CELL, pos, CELL + OVER, CELL + OVER);
      }
    }
  }
};

const run = (dir: Dir, phase: "cover" | "reveal") =>
  new Promise<void>((resolve) => {
    const cv = canvas();
    const ctx = cv?.getContext("2d");
    if (!cv || !ctx) return resolve();
    cancelAnimationFrame(raf);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = window.innerWidth;
    const H = window.innerHeight;
    cv.width = W * dpr;
    cv.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / PHASE_MS);
      draw(ctx, W, H, dir, phase, ease(p));
      if (p < 1) raf = requestAnimationFrame(tick);
      else {
        if (phase === "reveal") ctx.clearRect(0, 0, W, H);
        resolve();
      }
    };
    raf = requestAnimationFrame(tick);
  });

const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

document.addEventListener("astro:before-preparation", (ev) => {
  const e = ev as NavEvent;
  if (reduced() || !canvas()) return;
  if (SKIP.test(e.from.pathname) || SKIP.test(e.to.pathname)) return;
  if (e.from.pathname === e.to.pathname) return; // in-page hash scroll, nothing swaps
  lastDir = pick(e);
  const load = e.loader;
  e.loader = async () => {
    await Promise.all([run(lastDir, "cover"), load()]);
    covered = true;
  };
});

// The swap happens under a full cover; skip the default view-transition crossfade,
// whose static snapshots would freeze the reveal.
document.addEventListener("astro:before-swap", (ev) => {
  const vt = (ev as Event & { viewTransition?: ViewTransition }).viewTransition;
  if (!covered || !vt) return;
  vt.ready.catch(() => {}); // skipping rejects `ready`; expected, not an error
  vt.skipTransition();
});

document.addEventListener("astro:after-swap", () => {
  if (!covered) return;
  covered = false;
  void run(lastDir, "reveal");
});
