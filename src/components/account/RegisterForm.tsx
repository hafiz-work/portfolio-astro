import React, { useEffect, useRef, useState } from "react";
import { Check, Circle } from "lucide-react";
import { Button } from "@/components/shadcn/ui/button";
import { Input } from "@/components/shadcn/ui/input";
import { Label } from "@/components/shadcn/ui/label";
import { Alert, AlertDescription } from "@/components/shadcn/ui/alert";
import { authService } from "../../lib/auth";
import { createTurnstile } from "../../lib/turnstile";

// Only length is enforced (backend: 12-200). The rest are hints - forced composition
// rules push people to "Password1!" (NIST 800-63B).
const PASSWORD_HINTS: { label: string; test: (p: string) => boolean; required?: boolean }[] = [
  { label: "At least 12 characters", test: (p) => p.length >= 12, required: true },
  { label: "An uppercase letter", test: (p) => /[A-Z]/.test(p) },
  { label: "A lowercase letter", test: (p) => /[a-z]/.test(p) },
  { label: "A number", test: (p) => /\d/.test(p) },
  { label: "A symbol", test: (p) => /[^A-Za-z0-9]/.test(p) },
];
const STRENGTH = [
  { label: "Weak", bar: "bg-red-500" },
  { label: "Fair", bar: "bg-amber-500" },
  { label: "Good", bar: "bg-sky-500" },
  { label: "Strong", bar: "bg-sky-600 dark:bg-sky-400" },
];
// ponytail: naive length + character-variety score; swap in zxcvbn if it ever matters.
const strengthOf = (p: string) => {
  if (p.length < 12) return 0;
  const variety = PASSWORD_HINTS.slice(1).filter((h) => h.test(p)).length;
  return Math.min(3, Math.max(0, variety - 1 + (p.length >= 16 ? 1 : 0)));
};

type Field = "name" | "email" | "password" | "confirm";
type FieldErrors = Partial<Record<Field, string>>;

const FieldError = ({ id, message }: { id: string; message?: string }) =>
  message ? <p id={`${id}-error`} className="text-xs text-red-600 dark:text-red-400">{message}</p> : null;

// mode "resend" (from /login: ?resend=1) asks only for the email and re-sends the link.
export function RegisterForm({ siteKey, mode }: { siteKey: string; mode: "register" | "resend" }) {
  const resend = mode === "resend";
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  // Field problems sit under their field; `error` (top alert) is for the rest - captcha, 429, network.
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const turnstile = useRef<ReturnType<typeof createTurnstile> | null>(null);

  useEffect(() => {
    turnstile.current = createTurnstile("turnstile-register", siteKey, "register");
  }, [siteKey]);

  const submit = async (e: React.SubmitEvent) => {
    e.preventDefault();
    if (busy) return;
    const email = form.email.trim();
    const found: FieldErrors = {};
    if (!resend && !form.name.trim()) found.name = "Enter your name.";
    if (!email) found.email = "Enter your email.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) found.email = "Enter a valid email address.";
    if (!resend && form.password.length < 12) found.password = `Use at least 12 characters (${form.password.length} now).`;
    if (!resend && !found.password && form.password !== form.confirm) found.confirm = "Passwords don't match.";
    setErrors(found);
    setError(null);
    const first = (["name", "email", "password", "confirm"] as const).find((k) => found[k]);
    if (first) {
      document.getElementById(first)?.focus();
      return;
    }
    setBusy(true);
    try {
      const captchaToken = siteKey ? await turnstile.current!.execute() : "";
      if (siteKey && !captchaToken) throw new Error("captcha");
      if (resend) await authService.resendVerification(email, captchaToken || undefined);
      else await authService.register({ email, password: form.password, name: form.name.trim(), captchaToken: captchaToken || undefined });
      // Same answer whether or not the email exists - the API never says.
      setSentTo(email);
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      const status = (err as { status?: number })?.status;
      // The API names the field on a validation 400 (ValidationError.field).
      const field = (err as { data?: { field?: string } })?.data?.field;
      if (status === 400 && message && (field === "name" || field === "email" || field === "password")) {
        setErrors({ [field]: message.replace(/^\w+: /, "") });
        document.getElementById(field)?.focus();
        return;
      }
      setError(
        message.toLowerCase().includes("captcha") ? "Spam check failed. Please reload the page and try again."
          : status === 429 ? "Too many attempts. Please wait a minute."
            : status === 400 && message ? message.replace(/^\w+: /, "")
              : "Something went wrong. Please try again.",
      );
    } finally {
      setBusy(false);
      turnstile.current?.reset();
    }
  };

  if (sentTo) {
    return (
      <div className="grid gap-6">
        <div className="grid gap-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Check your email</h1>
          <p className="text-sm text-balance text-gray-600 dark:text-gray-400">
            If {sentTo} can be registered, a confirmation link is on its way. It expires in 24 hours.
          </p>
        </div>
        <div>
          <Button asChild variant="outline" className="w-full"><a href="/login">Back to sign in</a></Button>
        </div>
      </div>
    );
  }

  const strength = STRENGTH[strengthOf(form.password)];
  const mismatch = form.confirm.length > 0 && form.confirm !== form.password;
  const confirmError = errors.confirm ?? (mismatch ? "Passwords don't match." : undefined);
  // Typing in a field clears its own error.
  const set = (key: Field) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [key]: e.target.value });
    if (errors[key]) setErrors({ ...errors, [key]: undefined });
  };
  const invalid = (key: Field, message = errors[key]) => ({
    "aria-invalid": !!message,
    "aria-describedby": message ? `${key}-error` : undefined,
  });

  return (
    <div className="grid gap-6">
      <div className="grid gap-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">{resend ? "Resend confirmation" : "Create an account"}</h1>
        <p className="text-sm text-balance text-gray-600 dark:text-gray-400">
          {resend ? "We'll send the confirmation link again." : "Write blog posts and share quotes. Posts go live straight away and are moderated."}
        </p>
      </div>
      <form onSubmit={submit} noValidate>
        <div className="grid gap-4">
          {error && (
            <Alert variant="destructive" aria-live="polite"><AlertDescription>{error}</AlertDescription></Alert>
          )}
          {!resend && (
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" autoComplete="name" maxLength={100} placeholder="How your name appears on posts" value={form.name} onChange={set("name")} {...invalid("name")} required />
              <FieldError id="name" message={errors.name} />
            </div>
          )}
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" autoComplete="email" maxLength={255} inputMode="email" placeholder="you@example.com" value={form.email} onChange={set("email")} {...invalid("email")} required />
            <FieldError id="email" message={errors.email} />
          </div>
          {!resend && (
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" autoComplete="new-password" minLength={12} maxLength={200} placeholder="At least 12 characters" value={form.password} onChange={set("password")} aria-invalid={!!errors.password} aria-describedby={errors.password ? "password-error password-hints" : "password-hints"} required />
              <FieldError id="password" message={errors.password} />
              <div id="password-hints" className="grid gap-2">
                {form.password && (
                  <div className="flex items-center gap-3">
                    <div className="grid flex-1 grid-cols-4 gap-1" aria-hidden="true">
                      {STRENGTH.map((_, i) => (
                        <div key={i} className={`h-1 rounded-full ${i <= strengthOf(form.password) ? strength.bar : "bg-gray-950/10 dark:bg-white/10"}`} />
                      ))}
                    </div>
                    <span className="w-14 text-right text-xs font-medium text-gray-600 dark:text-gray-400" aria-live="polite">{strength.label}</span>
                  </div>
                )}
                <ul className="grid gap-1 text-xs">
                  {PASSWORD_HINTS.map((h) => {
                    const ok = h.test(form.password);
                    return (
                      <li key={h.label} className={`flex items-center gap-1.5 ${ok ? "text-sky-700 dark:text-sky-400" : "text-gray-500 dark:text-gray-400"}`}>
                        {ok ? <Check className="size-3.5" aria-hidden="true" /> : <Circle className="size-3.5" aria-hidden="true" />}
                        {h.label}{h.required ? " (required)" : ""}
                        <span className="sr-only">{ok ? " - done" : " - not yet"}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          )}
          {!resend && (
            <div className="grid gap-2">
              <Label htmlFor="confirm">Confirm password</Label>
              <Input id="confirm" type="password" autoComplete="new-password" maxLength={200} value={form.confirm} onChange={set("confirm")} {...invalid("confirm", confirmError)} required />
              <FieldError id="confirm" message={confirmError} />
            </div>
          )}
          {siteKey && <div id="turnstile-register" className="flex justify-center" />}
        </div>
        <div className="mt-6 flex flex-col gap-3">
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Sending..." : resend ? "Send link" : "Create account"}
          </Button>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Already have an account? <a href="/login" className="underline underline-offset-4">Sign in</a>
          </p>
        </div>
      </form>
    </div>
  );
}
