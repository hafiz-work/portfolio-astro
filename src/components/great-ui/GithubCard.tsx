// Source: https://www.great-ui.com/r/github-card.json (Great UI Custom License, see README).
// Ported: no Next/ThemeProvider (theme = `.dark` on <html>), profile comes from props
// (no api.github.com call), contributions are fetched on first hover/focus only,
// gray palette + sky calendar, tilt off under prefers-reduced-motion, opens on keyboard focus too.
import React, { useState, useMemo, useRef } from "react";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "motion/react";
import { cn } from "@/lib/utils";

type Contribution = { date: string; count: number; level: number };

export interface GithubCardProps {
  username: string;
  name: string;
  avatarUrl: string;
  text?: string;
  linkText?: string;
  href?: string;
  className?: string;
  linkClassName?: string;
  labelClassName?: string;
}

// Level 0 = empty day in gray; levels 1-4 in the sky accent (Tailwind hex).
// Light: gray-100, sky-200/300/500/700. Dark: gray-800, sky-900/700/500/400.
const calendar = {
  light: ["#f3f4f6", "#bae6fd", "#7dd3fc", "#0ea5e9", "#0369a1"],
  dark: ["#1f2937", "#0c4a6e", "#0369a1", "#0ea5e9", "#38bdf8"],
};

const DAYS = 119;
const emptyContributions = (): Contribution[] =>
  Array.from({ length: DAYS }, () => ({ date: "", count: 0, level: 0 }));

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

export const GithubCard = ({
  username,
  name,
  avatarUrl,
  text = "Follow me on",
  linkText = "GitHub",
  href,
  className,
  linkClassName,
  labelClassName,
}: GithubCardProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const [contributions, setContributions] = useState<Contribution[] | null>(null);
  const requested = useRef(false);
  const tilt = !useReducedMotion();

  // Third-party call (CSP connect-src allows this host) - only once someone
  // actually opens the card, so page views don't leak visitor IPs to it.
  const loadContributions = () => {
    if (requested.current) return;
    requested.current = true;
    fetch(`https://github-contributions-api.jogruber.de/v4/${username}`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data: { contributions?: Contribution[] }) => {
        const today = new Date();
        const past = (data.contributions ?? [])
          .filter((d) => new Date(d.date) <= today)
          .sort((a, b) => a.date.localeCompare(b.date));
        setContributions(past.slice(-DAYS));
      })
      .catch(() => setContributions([]));
  };

  const open = () => {
    setIsHovered(true);
    loadContributions();
  };

  const isDark =
    typeof document !== "undefined" &&
    document.documentElement.classList.contains("dark");
  const days = contributions?.length ? contributions : emptyContributions();
  const total = useMemo(
    () => days.reduce((acc, d) => acc + d.count, 0),
    [days],
  );

  const linkRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const mouseXSpring = useSpring(x, { stiffness: 300, damping: 20 });
  const mouseYSpring = useSpring(y, { stiffness: 300, damping: 20 });
  const maxRotate = 5;
  const rotateX = useTransform(
    mouseYSpring,
    (val) => maxRotate - ((val + 20) / 40) * (2 * maxRotate),
  );
  const rotateY = useTransform(
    mouseXSpring,
    (val) => -maxRotate + ((val + 20) / 40) * (2 * maxRotate),
  );

  const tiltTo = (el: HTMLElement | null) => (e: React.MouseEvent) => {
    if (!tilt || !el) return;
    const rect = el.getBoundingClientRect();
    x.set(((e.clientX - rect.left - rect.width / 2) / (rect.width / 2)) * 20);
    y.set(((e.clientY - rect.top - rect.height / 2) / (rect.height / 2)) * 20);
  };

  const close = () => {
    setIsHovered(false);
    x.set(0);
    y.set(0);
  };

  const profileUrl = href || `https://github.com/${username}`;

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <span
        className={cn("text-gray-500 dark:text-gray-400", labelClassName)}
      >
        {text}
      </span>
      <div
        className="relative flex w-max flex-col items-start perspective-[1000px]"
        onMouseEnter={open}
        onMouseLeave={close}
        onFocus={open}
        onBlur={close}
      >
        <div
          ref={linkRef}
          onMouseMove={(e) => tiltTo(linkRef.current)(e)}
        >
          <a href={profileUrl} target="_blank" rel="noopener noreferrer">
            <span
              className={cn(
                "font-medium text-gray-950 underline decoration-gray-950/20 underline-offset-4 transition-colors hover:decoration-gray-950 dark:text-white dark:decoration-white/20 dark:hover:decoration-white",
                linkClassName,
              )}
            >
              {linkText}
            </span>
          </a>
        </div>

        <motion.div
          ref={cardRef}
          aria-hidden={!isHovered}
          onMouseMove={(e) => tiltTo(cardRef.current)(e)}
          initial="hidden"
          style={{
            x: mouseXSpring,
            rotateX,
            rotateY,
            transformStyle: "preserve-3d",
          }}
          animate={isHovered ? "visible" : "hidden"}
          variants={{
            hidden: {
              opacity: 0,
              y: 6,
              scale: 0.98,
              filter: "blur(2px)",
              pointerEvents: "none",
              transformOrigin: "bottom left",
              transition: { duration: 0.15, ease: "easeIn" },
            },
            visible: {
              opacity: 1,
              y: 0,
              scale: 1,
              filter: "blur(0px)",
              pointerEvents: "auto",
              transformOrigin: "bottom left",
              transition: { duration: 0.22, ease: [0.16, 1, 0.3, 1] },
            },
          }}
          className="absolute bottom-full left-0 z-50 mb-4 w-80 rounded-2xl border border-dashed border-gray-300 bg-white/95 p-6 shadow-xl backdrop-blur-md after:absolute after:top-full after:left-0 after:h-4 after:w-full dark:border-gray-800 dark:bg-gray-950/80"
        >
          <div className="mb-4 flex items-center gap-4">
            <img
              src={avatarUrl}
              alt=""
              width={48}
              height={48}
              loading="lazy"
              className="size-12 rounded-full border border-gray-200 object-cover shadow-sm dark:border-gray-700 dark:shadow-none"
            />
            <div className="flex flex-col text-left">
              <span className="text-base font-semibold text-gray-950 dark:text-white">
                {name}
              </span>
              <a
                href={profileUrl}
                target="_blank"
                rel="noopener noreferrer"
                tabIndex={isHovered ? 0 : -1}
                className="text-sm text-gray-500 transition-colors hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
              >
                @{username}
              </a>
            </div>
          </div>

          <div className="mx-auto grid w-max grid-flow-col grid-rows-7 gap-1 select-none">
            {days.map((day, index) => (
              <div key={day.date || index} className="group/cell relative">
                <div
                  style={{
                    backgroundColor: (isDark ? calendar.dark : calendar.light)[
                      day.level
                    ],
                  }}
                  className="size-3 rounded-[2.5px] transition-transform duration-300 hover:z-10 hover:scale-125"
                />
                {day.date && (
                  <div className="pointer-events-none absolute bottom-full left-1/2 z-60 mb-2 hidden -translate-x-1/2 rounded bg-gray-900/95 px-2 py-1 text-[10px] font-semibold whitespace-nowrap text-white shadow-md group-hover/cell:block dark:bg-gray-100/95 dark:text-gray-900">
                    <span>{day.count} commits</span> on {formatDate(day.date)}
                  </div>
                )}
              </div>
            ))}
          </div>

          <span className="mt-3 block text-left font-mono text-xs text-gray-500 dark:text-gray-400">
            {contributions === null
              ? "Loading contributions…"
              : contributions.length
                ? `${total.toLocaleString()} contributions in the last ${DAYS} days`
                : "Contributions unavailable"}
          </span>
        </motion.div>
      </div>
    </div>
  );
};

export default GithubCard;

/**
 * Great UI Component - https://great-ui.com - https://github.com/Saurabh-2607/GreatUI
 * Released under the Great UI Custom License Agreement. Author: Saurabh Sharma.
 */
