import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/shadcn/ui/button";
import { Input } from "@/components/shadcn/ui/input";
import { Label } from "@/components/shadcn/ui/label";
import { authService } from "../../lib/auth";
import { accountService, errorText } from "../../lib/account";
import { useFormGuard } from "./FormGuard";
import { PASSWORD_MIN, PasswordStrength } from "./PasswordStrength";

const blank = { current: "", next: "", confirm: "" };

/** /account/settings: account settings - for now only the password. */
export function AccountSettings() {
  const [pw, setPw] = useState(blank);
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  // Saving disarms it, so the redirect to /login after a change doesn't prompt.
  useFormGuard(!saving && Object.values(pw).some(Boolean));

  const mismatch = pw.confirm.length > 0 && pw.confirm !== pw.next;
  const tooShort = pw.next.length > 0 && pw.next.length < PASSWORD_MIN;
  const set = (key: keyof typeof blank) => (e: React.ChangeEvent<HTMLInputElement>) => setPw({ ...pw, [key]: e.target.value });

  const save = async (e: React.SubmitEvent) => {
    e.preventDefault();
    if (pw.next.length < PASSWORD_MIN || mismatch) return;
    setSaving(true);
    try {
      await accountService.updatePassword(pw.current, pw.next);
      authService.clearAuthState();
      window.location.href = "/login";
    } catch (err) {
      toast.error(errorText(err));
      setSaving(false);
    }
  };

  const type = show ? "text" : "password";

  return (
    <div className="grid gap-6">
      <header className="grid gap-1 border-b border-border pb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage how you sign in.</p>
      </header>

      <section className="grid max-w-md gap-6">
        <div className="grid gap-1">
          <h2 className="text-lg font-semibold tracking-tight">Change password</h2>
          <p className="text-sm text-muted-foreground">Changing it signs you out everywhere, including here.</p>
        </div>
        <form onSubmit={save} className="grid gap-4">
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="pw-current">Current password</Label>
              <Button type="button" variant="ghost" size="sm" className="-mr-2 h-7 text-muted-foreground" onClick={() => setShow(!show)} aria-pressed={show}>
                {show ? <EyeOff /> : <Eye />}
                {show ? "Hide" : "Show"}
              </Button>
            </div>
            <Input id="pw-current" type={type} autoComplete="current-password" required value={pw.current} onChange={set("current")} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="pw-next">New password</Label>
            <Input id="pw-next" type={type} autoComplete="new-password" minLength={PASSWORD_MIN} maxLength={200} required
              value={pw.next} onChange={set("next")} aria-invalid={tooShort} aria-describedby="pw-next-hints" />
            <PasswordStrength id="pw-next-hints" password={pw.next} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="pw-confirm">Confirm new password</Label>
            <Input id="pw-confirm" type={type} autoComplete="new-password" maxLength={200} required
              value={pw.confirm} onChange={set("confirm")} aria-invalid={mismatch} aria-describedby={mismatch ? "pw-confirm-error" : undefined} />
            {mismatch && <p id="pw-confirm-error" className="text-xs text-destructive">Passwords don't match.</p>}
          </div>
          <div className="pt-2">
            <Button type="submit" disabled={saving || !pw.current || pw.next.length < PASSWORD_MIN || pw.confirm !== pw.next}>
              {saving ? "Changing…" : "Change password"}
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
