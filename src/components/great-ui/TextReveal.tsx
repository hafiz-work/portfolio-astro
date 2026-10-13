// Adapted from Great UI "Text Reveal" (https://www.great-ui.com/components/text-reveal,
// Great UI Custom License, see README). Not a verbatim copy: inline text only (it
// sits inside our own heading/paragraph), our palette with a sky "cursor" letter,
// no blur/watermark, real text kept for SEO + screen readers, plain text under
// prefers-reduced-motion and before hydration.
import React, { useEffect, useRef, useState } from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
} from "motion/react";

// Tailwind palette (hex so motion can interpolate): sky-500 accent.
const HIGHLIGHT = "#0ea5e9";

interface TextRevealProps {
  text: string;
  /** Final text colour, light / dark. Match the element's own text-* classes. */
  color?: [light: string, dark: string];
  /** Unrevealed colour, light / dark. */
  dimColor?: [light: string, dark: string];
}

export default function TextReveal({
  text,
  color = ["#030712", "#ffffff"], // gray-950 / white
  dimColor = ["#d1d5db", "#374151"], // gray-300 / gray-700
}: TextRevealProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduced = useReducedMotion();
  const [isDark, setIsDark] = useState<boolean | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    const check = () => setIsDark(root.classList.contains("dark"));
    check();
    const observer = new MutationObserver(check);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  // Reveal while the text travels from 90% to 55% of the viewport height.
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 0.9", "start 0.55"],
  });

  // SSR / pre-hydration / reduced motion: plain text in the element's own colour.
  if (reduced || isDark === null) return <span ref={ref}>{text}</span>;

  const total = Array.from(text.replace(/ /g, "")).length;
  const theme = isDark ? 1 : 0;
  let index = 0;

  return (
    <span ref={ref}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {text.split(" ").map((word, w) => (
          <React.Fragment key={w}>
            {w > 0 && " "}
            <span className="inline-block">
              {Array.from(word).map((char) => {
                const i = index++;
                return (
                  <Char
                    key={i}
                    progress={scrollYProgress}
                    range={[i / total, (i + 1) / total]}
                    from={dimColor[theme]}
                    to={color[theme]}
                  >
                    {char}
                  </Char>
                );
              })}
            </span>
          </React.Fragment>
        ))}
      </span>
    </span>
  );
}

function Char({
  children,
  progress,
  range: [start, end],
  from,
  to,
}: {
  children: string;
  progress: MotionValue<number>;
  range: [number, number];
  from: string;
  to: string;
}) {
  const color = useTransform(
    progress,
    [start, start + 0.75 * (end - start), end],
    [from, HIGHLIGHT, to],
  );
  return <motion.span style={{ color }}>{children}</motion.span>;
}
