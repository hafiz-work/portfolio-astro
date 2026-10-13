// Source: https://www.great-ui.com/r/linkedin-card.json (Great UI Custom License, see README).
// Ported: no Next, no third-party default avatar/banner (props required / optional),
// gray palette, optional connections line, tilt off under prefers-reduced-motion,
// opens on keyboard focus too.
import React, { useState, useRef } from "react";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "motion/react";
import { cn } from "@/lib/utils";

export interface LinkedinCardProps {
  username: string;
  name: string;
  avatarUrl: string;
  bannerUrl?: string;
  headline?: string;
  connections?: number | string;
  location?: string;
  text?: string;
  linkText?: string;
  href?: string;
  className?: string;
  linkClassName?: string;
  labelClassName?: string;
}

const LinkedinIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className={cn("fill-current", className)}>
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
  </svg>
);

export const LinkedinCard = ({
  username,
  name,
  avatarUrl,
  bannerUrl,
  headline,
  connections,
  location,
  text = "Connect on",
  linkText = "LinkedIn",
  href,
  className,
  linkClassName,
  labelClassName,
}: LinkedinCardProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const profileUrl = href || `https://linkedin.com/in/${username}`;
  const tilt = !useReducedMotion();

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

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <span
        className={cn("text-gray-500 dark:text-gray-400", labelClassName)}
      >
        {text}
      </span>
      <div
        className="relative flex w-max flex-col items-start perspective-[1000px]"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={close}
        onFocus={() => setIsHovered(true)}
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
          className="absolute bottom-full left-0 z-50 mb-4 w-80 rounded-2xl border border-dashed border-gray-300 bg-white/95 p-4 shadow-xl backdrop-blur-md after:absolute after:top-full after:left-0 after:h-4 after:w-full dark:border-gray-800 dark:bg-gray-950/80"
        >
          <div className="relative -mx-4 -mt-4 h-20 overflow-hidden rounded-t-2xl bg-linear-to-r from-sky-100 to-gray-100 dark:from-sky-950 dark:to-gray-900">
            {bannerUrl && (
              <img
                src={bannerUrl}
                alt=""
                loading="lazy"
                className="size-full object-cover"
              />
            )}
          </div>
          <div className="pb-2">
            <div className="relative flex justify-between">
              <div className="-mt-10 size-20 rounded-full border-4 border-white bg-white dark:border-gray-950 dark:bg-gray-950">
                <img
                  src={avatarUrl}
                  alt=""
                  width={80}
                  height={80}
                  loading="lazy"
                  className="size-full rounded-full object-cover"
                />
              </div>
              <div className="mt-2 text-gray-950 dark:text-white">
                <LinkedinIcon className="size-6" />
              </div>
            </div>
            <div className="mt-2 text-left">
              <h3 className="text-lg leading-tight font-semibold text-gray-950 dark:text-white">
                {name}
              </h3>
              {headline && (
                <p className="mt-1 line-clamp-2 text-sm text-gray-600 dark:text-gray-400">
                  {headline}
                </p>
              )}
              {location && (
                <p className="mt-1 text-xs text-gray-500">{location}</p>
              )}
              {connections != null && (
                <p className="mt-2 text-xs font-semibold text-gray-950 dark:text-gray-300">
                  {connections} connections
                </p>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default LinkedinCard;

/**
 * Great UI Component - https://great-ui.com - https://github.com/Saurabh-2607/GreatUI
 * Released under the Great UI Custom License Agreement. Author: Saurabh Sharma.
 */
