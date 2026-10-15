import React from "react";
import { Check, Circle } from "lucide-react";
import { Progress } from "@/components/shadcn/ui/progress";
import { cn } from "@/lib/utils";

// Only length is enforced (backend: 12-200). The rest are hints - forced composition
// rules push people to "Password1!" (NIST 800-63B).
export const PASSWORD_MIN = 12;
const PASSWORD_HINTS: { label: string; test: (p: string) => boolean; required?: boolean }[] = [
  { label: `At least ${PASSWORD_MIN} characters`, test: (p) => p.length >= PASSWORD_MIN, required: true },
  { label: "An uppercase letter", test: (p) => /[A-Z]/.test(p) },
  { label: "A lowercase letter", test: (p) => /[a-z]/.test(p) },
  { label: "A number", test: (p) => /\d/.test(p) },
  { label: "A symbol", test: (p) => /[^A-Za-z0-9]/.test(p) },
];
// Weak -> Strong on the state tokens (destructive / warning / success in shadcn.css).
// progress.tsx tints its own indicator, so the parent re-tints it through its data-slot.
const STRENGTH = [
  { label: "Weak", value: 25, indicator: "**:data-[slot=progress-indicator]:bg-destructive", text: "text-destructive" },
  { label: "Fair", value: 50, indicator: "**:data-[slot=progress-indicator]:bg-warning", text: "text-warning" },
  { label: "Good", value: 75, indicator: "**:data-[slot=progress-indicator]:bg-success", text: "text-success" },
  { label: "Strong", value: 100, indicator: "**:data-[slot=progress-indicator]:bg-success", text: "text-success" },
];
// shortcut: naive length + character-variety score; swap in zxcvbn if it ever matters.
const strengthOf = (p: string) => {
  if (p.length < PASSWORD_MIN) return 0;
  const variety = PASSWORD_HINTS.slice(1).filter((h) => h.test(p)).length;
  return Math.min(3, Math.max(0, variety - 1 + (p.length >= 16 ? 1 : 0)));
};

/** Strength bar (Weak -> Strong) + the character checklist under a new-password field.
 *  Point the input's aria-describedby at `id`. */
export function PasswordStrength({ id, password }: { id: string; password: string }) {
  const strength = STRENGTH[strengthOf(password)]!;
  return (
    <div id={id} className="grid gap-2">
      {password && (
        <div className="flex items-center gap-3">
          <Progress
            value={strength.value}
            aria-label="Password strength"
            // progress.tsx uses `value` for the bar's transform but doesn't pass it to the
            // Radix root, so mirror it - else the bar reads as an indeterminate progressbar.
            aria-valuenow={strength.value}
            aria-valuetext={strength.label}
            className={cn("h-1.5 flex-1", strength.indicator)}
          />
          <span className={cn("w-14 text-right text-xs font-medium", strength.text)} aria-live="polite">
            {strength.label}
          </span>
        </div>
      )}
      <ul className="grid gap-1 text-xs">
        {PASSWORD_HINTS.map((h) => {
          const ok = h.test(password);
          return (
            <li key={h.label} className={cn("flex items-center gap-1.5", ok ? "text-success" : "text-muted-foreground")}>
              {ok ? <Check className="size-3.5" aria-hidden="true" /> : <Circle className="size-3.5" aria-hidden="true" />}
              {h.label}
              {h.required ? " (required)" : ""}
              <span className="sr-only">{ok ? " - done" : " - not yet"}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
