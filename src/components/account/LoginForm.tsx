import React, { useEffect, useRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/shadcn/ui/button";
import { Input } from "@/components/shadcn/ui/input";
import { Label } from "@/components/shadcn/ui/label";
import { Alert, AlertDescription } from "@/components/shadcn/ui/alert";
import { authService, homeFor } from "../../lib/auth";
import { createTurnstile } from "../../lib/turnstile";

type Status = { kind: "error" | "success"; text: string; resend?: boolean } | null;
type BlockedBody = { code?: string; data?: { reason?: string; expiresAt?: string | null } };

// Map API errors to clean copy. Never surface raw technical messages here.
const describe = (error: unknown): Status => {
  const message = error instanceof Error ? error.message : "";
  const status = (error as { status?: number })?.status;
  const body = (error as { data?: BlockedBody })?.data;
  // 403 = right password, but the account may not sign in (hono-workers AuthBlockedError).
  if (status === 403 && body?.code === "email_unverified") {
    return { kind: "error", text: "Confirm your email first - check your inbox for the link.", resend: true };
  }
  if (status === 403 && body?.code === "account_banned") {
    const until = body.data?.expiresAt ? `until ${new Date(body.data.expiresAt).toLocaleString()}` : "permanently";
    return { kind: "error", text: `This account is banned ${until}. Reason: ${body.data?.reason ?? "-"}` };
  }
  if (message.toLowerCase().includes("captcha")) return { kind: "error", text: "Spam check failed. Please reload the page and try again." };
  if (status === 401 || status === 400) return { kind: "error", text: "Invalid email or password." };
  if (status === 429) return { kind: "error", text: "Too many attempts. Please wait a minute." };
  return { kind: "error", text: "Couldn't sign you in right now. Please try again." };
};

export function LoginForm({ siteKey }: { siteKey: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<Status>(null);
  const turnstile = useRef<ReturnType<typeof createTurnstile> | null>(null);
  const failures = useRef({ count: 0, lockUntil: 0 });

  useEffect(() => {
    turnstile.current = createTurnstile("turnstile-login", siteKey, "login");
    // Already signed in (refresh cookie still valid)? Go home.
    if (authService.isAuthenticated()) {
      void authService.tryRefresh().then(async (ok) => {
        if (ok) window.location.href = homeFor(await authService.me());
        else authService.clearAuthState();
      });
    }
  }, [siteKey]);

  const submit = async (e: React.SubmitEvent) => {
    e.preventDefault();
    if (busy) return;
    if (!email.trim() || !password) {
      setStatus({ kind: "error", text: "Please enter your email and password." });
      return;
    }
    const f = failures.current;
    if (Date.now() < f.lockUntil) {
      setStatus({ kind: "error", text: `Too many attempts. Try again in ${Math.ceil((f.lockUntil - Date.now()) / 1000)}s.` });
      return;
    }

    setBusy(true);
    setStatus(null);
    try {
      const captchaToken = siteKey ? await turnstile.current!.execute() : "";
      if (siteKey && !captchaToken) throw new Error("captcha");
      const result = await authService.login(email.trim(), password, captchaToken || undefined);
      if (!result) throw new Error("Invalid email or password.");
      f.count = 0;
      const home = homeFor(await authService.me());
      setStatus({ kind: "success", text: home === "/admin" ? "Redirecting to dashboard..." : "Signed in." });
      window.location.href = home;
    } catch (error) {
      if (++f.count >= 5) {
        f.lockUntil = Date.now() + 60_000;
        f.count = 0;
      }
      setStatus(describe(error));
      setBusy(false);
    } finally {
      turnstile.current?.reset();
    }
  };

  return (
    <div className="grid gap-6">
      <div className="grid gap-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
        <p className="text-sm text-balance text-muted-foreground">Welcome back to hafizbahtiar.com.</p>
      </div>
      <form onSubmit={submit} noValidate>
        <div className="grid gap-4">
          {status && (
            <Alert variant={status.kind === "error" ? "destructive" : "default"} aria-live="polite">
              <AlertDescription>
                {status.text}
                {status.resend && (
                  <a href="/register?resend=1" className="ml-1 font-medium underline underline-offset-4">Send the link again</a>
                )}
              </AlertDescription>
            </Alert>
          )}
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" autoComplete="username" inputMode="email" placeholder="you@example.com"
              value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input id="password" type={show ? "text" : "password"} autoComplete="current-password" className="pr-10"
                value={password} onChange={(e) => setPassword(e.target.value)} required />
              <Button type="button" variant="ghost" size="icon" className="absolute top-0 right-0"
                onClick={() => setShow(!show)} aria-label={show ? "Hide password" : "Show password"}>
                {show ? <EyeOff /> : <Eye />}
              </Button>
            </div>
          </div>
          {siteKey && <div id="turnstile-login" className="flex justify-center" />}
        </div>
        <div className="mt-6 flex flex-col gap-3">
          <Button type="submit" className="w-full" disabled={busy}>{busy ? "Signing in..." : "Sign in"}</Button>
          <p className="text-sm text-muted-foreground">
            No account yet? <a href="/register" className="underline underline-offset-4">Create one</a>
          </p>
        </div>
      </form>
    </div>
  );
}
