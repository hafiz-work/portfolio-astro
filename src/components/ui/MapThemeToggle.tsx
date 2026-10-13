import { useEffect, useState } from "react";
import { Clock, Moon, Sun } from "lucide-react";

/**
 * Map light/dark choice shared by every map (home MapCanvas, PointsMap):
 * a pill that cycles Auto -> Light -> Dark, remembered in localStorage
 * ("map-theme", per browser). Auto follows the site theme (.dark/.light on
 * <html>), then the time of day (6 am-6 pm light) when the site has none.
 *
 *   const { resolvedTheme, preference, cycle } = useMapTheme();
 *   <Map theme={resolvedTheme}> … <MapThemeToggle preference={preference} onCycle={cycle} />
 */
export type MapThemePreference = "auto" | "light" | "dark";

const MAP_THEME_KEY = "map-theme";
const CYCLE: MapThemePreference[] = ["auto", "light", "dark"];

function getTimeTheme(): "light" | "dark" {
  const h = new Date().getHours();
  return h >= 6 && h < 18 ? "light" : "dark";
}

function getAppTheme(): "light" | "dark" {
  if (typeof document === "undefined") return getTimeTheme();
  if (document.documentElement.classList.contains("dark")) return "dark";
  if (document.documentElement.classList.contains("light")) return "light";
  return getTimeTheme();
}

function readStoredPreference(): MapThemePreference {
  try {
    const v = localStorage.getItem(MAP_THEME_KEY);
    if (v === "light" || v === "dark" || v === "auto") return v;
  } catch {}
  return "auto";
}

export function useMapTheme() {
  const [autoTheme, setAutoTheme] = useState<"light" | "dark">(getAppTheme);

  useEffect(() => {
    // Follow the site's own theme switch immediately.
    const observer = new MutationObserver(() => setAutoTheme(getAppTheme()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    // Time-of-day fallback, re-checked every minute (only matters with no site theme).
    const interval = setInterval(() => setAutoTheme(getAppTheme()), 60_000);
    return () => {
      observer.disconnect();
      clearInterval(interval);
    };
  }, []);

  const [preference, setPreference] = useState<MapThemePreference>(readStoredPreference);
  const cycle = () => {
    const next = CYCLE[(CYCLE.indexOf(preference) + 1) % CYCLE.length];
    setPreference(next);
    try {
      localStorage.setItem(MAP_THEME_KEY, next);
    } catch {}
  };

  const resolvedTheme: "light" | "dark" = preference === "auto" ? autoTheme : preference;
  return { resolvedTheme, preference, cycle };
}

const LABELS = {
  en: { auto: "Auto", light: "Day", dark: "Night", aria: "Map theme", hint: "Click to change." },
  ms: { auto: "Auto", light: "Terang", dark: "Gelap", aria: "Tema peta", hint: "Tekan untuk tukar." },
} as const;
const ICONS = { auto: Clock, light: Sun, dark: Moon } as const;

export function MapThemeToggle({
  preference,
  onCycle,
  lang = "en",
  className = "",
}: {
  preference: MapThemePreference;
  onCycle: () => void;
  lang?: "en" | "ms";
  className?: string;
}) {
  const t = LABELS[lang];
  const Icon = ICONS[preference];
  return (
    <button
      type="button"
      onClick={onCycle}
      aria-label={`${t.aria}: ${t[preference]}. ${t.hint}`}
      title={`${t.aria}: ${t[preference]}`}
      className={`flex items-center gap-1.5 rounded-full border border-gray-950/10 bg-white/90 px-2 py-1 text-xs font-medium text-gray-600 shadow-sm backdrop-blur-sm transition-colors hover:bg-white sm:px-2.5 dark:border-white/10 dark:bg-gray-900/90 dark:text-gray-300 dark:hover:bg-gray-900 ${className}`}
    >
      <Icon className="size-3.5 shrink-0" />
      <span className="leading-none">{t[preference]}</span>
    </button>
  );
}
