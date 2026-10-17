// Theme preference, shared by the Footer switcher, the account ModeToggle and
// the admin navbar toggle. Same contract as CoreLayout's inline init script
// (which must stay inline): no "theme" key = follow the system, else "light" / "dark".

export type ThemePref = "system" | "light" | "dark";

export function readPref(): ThemePref {
  try {
    const v = localStorage.getItem("theme");
    return v === "light" || v === "dark" ? v : "system";
  } catch {
    return "system";
  }
}

/** Toggle `.dark` on <html> for a preference. */
export function apply(pref: ThemePref): void {
  const dark =
    pref === "dark" ||
    (pref === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
}

/** Store a preference and apply it. */
export function setPref(pref: ThemePref): void {
  try {
    if (pref === "system") localStorage.removeItem("theme");
    else localStorage.setItem("theme", pref);
  } catch {
    /* storage blocked - still apply for this page */
  }
  apply(pref);
}
