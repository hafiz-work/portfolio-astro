// Server-rendered SVG line charts (LineChart.astro, /ipu sparkline). Check: bun scripts/check-harga-minyak.ts

/** Y axis for the chart: clean RM ticks around the prices, always padded past the
 *  data so a flat series (all prices equal) still has height. */
export const priceAxis = (values: number[]) => {
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const step = [0.05, 0.1, 0.2, 0.5, 1].find((s) => (hi - lo) / s <= 4) ?? 2;
  // Integer tick indexes avoid float drift (4.4 not 4.3999…); ±1e-9 pushes a value that
  // sits exactly on a tick out to the next one.
  const [from, to] = [Math.floor(lo / step - 1e-9), Math.ceil(hi / step + 1e-9)];
  const ticks = Array.from({ length: to - from + 1 }, (_, i) => Number(((from + i) * step).toFixed(2)));
  return { min: ticks[0], max: ticks.at(-1)!, ticks };
};

/** SVG path through points; a null (missing week) breaks the line into a gap. */
export const linePath = (points: ([number, number] | null)[]) =>
  points.map((p, i) => (p ? `${points[i - 1] ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}` : "")).join("");
