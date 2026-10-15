import React from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { Button } from "@/components/shadcn/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/shadcn/ui/dropdown-menu";

type Pref = "system" | "light" | "dark";

// Same contract as the public Footer switcher and CoreLayout's init script:
// no "theme" key = follow the system, else "light" / "dark".
const setTheme = (pref: Pref) => {
  try {
    if (pref === "system") localStorage.removeItem("theme");
    else localStorage.setItem("theme", pref);
  } catch {
    /* storage blocked - still apply for this page */
  }
  const dark = pref === "dark" || (pref === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
};

/** shadcn mode-toggle: icon button + Light / Dark / System menu. */
export function ModeToggle() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Toggle theme">
          {/* CSS picks the icon, so server and client render the same markup. */}
          <Sun className="dark:hidden" />
          <Moon className="hidden dark:block" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => setTheme("light")}>
          <Sun />
          Light
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => setTheme("dark")}>
          <Moon />
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => setTheme("system")}>
          <Monitor />
          System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
