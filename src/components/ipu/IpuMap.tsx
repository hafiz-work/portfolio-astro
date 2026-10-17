import { useEffect, useState } from "react";
import PointsMap, { type MapPoint } from "@/components/ui/PointsMap";
import type { MetDay, Now, Period } from "@/lib/cuaca";

/**
 * /ipu map: PointsMap + a station panel (card on the map from sm, bottom sheet on
 * phones) - IPU reading, today's MET forecast (pagi/petang/malam, the current part
 * marked) and Open-Meteo's estimate for now. Props are plain data from the page.
 *
 * Selection is mirrored to `?stesen=` (replaceState, shareable) and localStorage
 * `ipu-stesen` (reopened when the URL has none). The page's legend filters points
 * by band tone through the `ipu:filter` window event ({ detail: { tones } }, empty = all).
 */
export type IpuPoint = MapPoint & {
  api: number | null;
  band: string | null;
  pollutant: string | null;
  /** "10:00 ptg" */
  time: string;
  met: MetDay | null;
  now: Now | null;
  /** BANDS tone, null = no reading. */
  tone: string | null;
  /** 24-hour IPU sparkline (APIMS trend, 100 x 32 box). */
  trend: { d: string; min: number; max: number } | null;
};

const KEY = "ipu-stesen";

const PARTS: [Period, string][] = [
  ["morning", "Pagi"],
  ["afternoon", "Petang"],
  ["night", "Malam"],
];

export default function IpuMap({ points, period, initialId }: { points: IpuPoint[]; period: Period; initialId?: string }) {
  const byId = new Map(points.map((p) => [p.id, p]));
  const [tones, setTones] = useState<string[]>([]);
  // undefined until the effect has read localStorage, so PointsMap mounts with its final initialId.
  const [start, setStart] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(KEY);
    } catch {}
    setStart(initialId ?? (saved && byId.has(saved) ? saved : null));
    // Bands pressed before this island hydrated.
    setTones([...document.querySelectorAll<HTMLElement>("#ipu-filter [aria-pressed=true][data-tone]")].map((b) => b.dataset.tone!).filter(Boolean));
    const onFilter = (e: Event) => setTones((e as CustomEvent<{ tones: string[] }>).detail?.tones ?? []);
    window.addEventListener("ipu:filter", onFilter);
    return () => window.removeEventListener("ipu:filter", onFilter);
  }, []);

  const onSelect = (id: string | null) => {
    try {
      if (id) localStorage.setItem(KEY, id);
      else localStorage.removeItem(KEY);
    } catch {}
    const url = new URL(location.href);
    if (id) url.searchParams.set("stesen", id);
    else url.searchParams.delete("stesen");
    history.replaceState(history.state, "", url);
  };

  if (start === undefined) return null;
  return (
    <PointsMap
      points={tones.length ? points.filter((p) => p.tone && tones.includes(p.tone)) : points}
      fallbackLabel="Peta tak dapat dipapar di peranti ini"
      initialId={start ?? undefined}
      onSelect={onSelect}
      searchPlaceholder="Cari stesen…"
      renderDetail={(p) => <StationPanel s={byId.get(p.id)!} period={period} />}
    />
  );
}

function StationPanel({ s, period }: { s: IpuPoint; period: Period }) {
  return (
    <div className="p-4 pt-3 sm:pt-4">
      <h2 className="pr-8 text-xl font-semibold tracking-tight">{s.title}</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400">{s.subtitle}</p>

      <div className={`mt-4 flex items-center gap-3 rounded-xl p-3 ${s.effect ? `rain ${s.effect === "storm" ? "rain-storm" : ""}` : ""}`}>
        <span className={`flex size-14 shrink-0 items-center justify-center rounded-xl text-xl font-semibold tabular-nums ${s.markerClass}`}>
          {s.api ?? "-"}
        </span>
        <div>
          <p className="font-medium">{s.band ?? "Tiada bacaan"}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            IPU{s.pollutant ? ` · ${s.pollutant}` : ""} · bacaan {s.time}
          </p>
        </div>
      </div>

      {s.trend && (
        <section className="mt-4">
          <h3 className="text-sm font-semibold">IPU 24 jam lalu</h3>
          <svg viewBox="-2 -2 104 36" preserveAspectRatio="none" className="mt-2 h-12 w-full overflow-visible" role="img" aria-label={`IPU 24 jam lalu, antara ${s.trend.min} dan ${s.trend.max}`}>
            <path d={s.trend.d} fill="none" vectorEffect="non-scaling-stroke" strokeWidth={2} strokeLinejoin="round" className="stroke-sky-600 dark:stroke-sky-400" />
          </svg>
          <p className="mt-1 flex justify-between text-xs text-gray-500 tabular-nums dark:text-gray-400">
            <span>24 jam lalu</span>
            <span>
              Rendah {s.trend.min} · Tinggi {s.trend.max}
            </span>
            <span>Kini</span>
          </p>
        </section>
      )}

      {s.met && (
        <section className="mt-4">
          <h3 className="text-sm font-semibold">Ramalan cuaca hari ini</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            MET Malaysia, {s.met.place}
            {s.met.min != null && s.met.max != null && ` · ${s.met.min}-${s.met.max}°C`}
          </p>
          <dl className="mt-2 divide-y divide-gray-950/5 text-sm dark:divide-white/10">
            {PARTS.map(([key, label]) => (
              <div key={key} className="flex justify-between gap-3 py-1.5">
                <dt className={key === period ? "font-semibold text-sky-600 dark:text-sky-400" : "text-gray-500 dark:text-gray-400"}>
                  {label}
                  {key === period && " (sekarang)"}
                </dt>
                <dd className="text-right">{s.met![key] ?? "-"}</dd>
              </div>
            ))}
          </dl>
          <a
            href={`/ramalan-cuaca?lokasi=${encodeURIComponent(s.met.id)}`}
            className="mt-2 inline-block text-sm font-medium text-sky-600 hover:underline dark:text-sky-400"
          >
            Ramalan 7 hari →
          </a>
        </section>
      )}

      {s.now && (
        <section className="mt-4 rounded-xl bg-gray-950/5 p-3 dark:bg-white/5">
          <h3 className="text-sm font-semibold">Anggaran sekarang</h3>
          <p className="mt-0.5 text-sm">
            {s.now.text} · {s.now.temp}°C{s.now.rain > 0 && ` · hujan ${s.now.rain} mm`}
          </p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Open-Meteo - model cuaca global, bukan cerapan MET. Boleh berbeza dengan keadaan sebenar.
          </p>
        </section>
      )}
    </div>
  );
}
