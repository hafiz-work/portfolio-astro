import React, { useEffect, useState } from "react";
import { Button } from "@/components/shadcn/ui/button";
import { authService } from "../../lib/auth";

// Landing page for the confirmation email. The token is POSTed from the browser
// (never in a server log line) and dropped from the address bar once read.
export function VerifyEmail() {
  const [state, setState] = useState<"pending" | "ok" | "failed">("pending");

  useEffect(() => {
    const token = new URLSearchParams(location.search).get("token");
    history.replaceState(null, "", location.pathname);
    if (!token) {
      setState("failed");
      return;
    }
    authService.verifyEmail(token).then(() => setState("ok"), () => setState("failed"));
  }, []);

  return (
    <div className="grid gap-6">
      <div className="grid gap-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          {state === "pending" ? "Confirming your email…" : state === "ok" ? "Email confirmed" : "Link not valid"}
        </h1>
        <p className="text-sm text-balance text-gray-600 dark:text-gray-400">
          {state === "ok" ? "You can sign in now." : state === "failed" ? "This link is invalid or has expired." : "One moment."}
        </p>
      </div>
      {state !== "pending" && (
        <div>
          {state === "ok"
            ? <Button asChild className="w-full"><a href="/login">Sign in</a></Button>
            : <Button asChild variant="outline" className="w-full"><a href="/register?resend=1">Send a new link</a></Button>}
        </div>
      )}
    </div>
  );
}
