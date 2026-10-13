import { lazy, Suspense, useEffect, useRef, useState } from "react";

// Lanyard (three.js, ~170KB gz) is decoration in the hero. Mounted client:only so
// three never enters the SSR bundle. Hero.astro renders two boxes (beside the intro
// on xl, below it on smaller screens); `media` picks which one mounts, and three is
// only imported once that box scrolls into view.
const Lanyard = lazy(() => import("../react-bits/lanyard"));

export default function HeroLanyard({ media }: { media: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [matches, setMatches] = useState(false);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(media);
    const sync = () => setMatches(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, [media]);

  useEffect(() => {
    if (!matches || seen || !box.current) return;
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) setSeen(true);
    }, { rootMargin: "200px" });
    io.observe(box.current);
    return () => io.disconnect();
  }, [matches, seen]);

  return (
    // Same bezel as the hero profile card.
    <div ref={box} className="h-full rounded-4xl bg-gray-950/5 p-2 ring-1 ring-gray-950/10 ring-inset dark:bg-white/10 dark:ring-white/10">
      <div className="pattern relative h-full overflow-hidden rounded-3xl bg-white ring-1 ring-gray-950/5 dark:bg-gray-950 dark:ring-white/10">
        {matches && seen && (
          <Suspense fallback={null}>
            <Lanyard frontImage="/lanyard/card.svg" strapColor="#0284c7" anchor="center" size={0.6} strapLength={0.5} />
          </Suspense>
        )}
        <span className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 font-mono text-[11px] tracking-widest text-gray-500 uppercase">
          Drag the card
        </span>
      </div>
    </div>
  );
}
