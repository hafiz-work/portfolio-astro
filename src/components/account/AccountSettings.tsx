import React, { useEffect, useState } from "react";
import { Copy, ExternalLink, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/shadcn/ui/button";
import { Input } from "@/components/shadcn/ui/input";
import { Label } from "@/components/shadcn/ui/label";
import { Switch } from "@/components/shadcn/ui/switch";
import { ApiError } from "../../lib/api-client";
import { copyText } from "../../lib/clipboard";
import { usernameProblem } from "../../lib/username";
import { authService } from "../../lib/auth";
import { accountService, errorText } from "../../lib/account";
import { useFormGuard } from "./FormGuard";
import { PASSWORD_MIN, PasswordStrength } from "./PasswordStrength";

const blank = { current: "", next: "", confirm: "" };

/** /account/settings: the public profile (username + visibility) and the password. */
export function AccountSettings() {
  const [pw, setPw] = useState(blank);
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const profile = usePublicProfileForm();
  // Saving the password disarms it, so the redirect to /login after a change doesn't prompt.
  useFormGuard((!saving && Object.values(pw).some(Boolean)) || profile.dirty);

  const mismatch = pw.confirm.length > 0 && pw.confirm !== pw.next;
  const tooShort = pw.next.length > 0 && pw.next.length < PASSWORD_MIN;
  const set = (key: keyof typeof blank) => (e: React.ChangeEvent<HTMLInputElement>) => setPw({ ...pw, [key]: e.target.value });

  const save = async (e: React.SubmitEvent) => {
    e.preventDefault();
    if (pw.next.length < PASSWORD_MIN || mismatch) return;
    setSaving(true);
    try {
      await accountService.updatePassword(pw.current, pw.next);
      // Revoke the server session too - the copy promises a sign-out everywhere.
      const revoked = await authService.logout();
      window.location.href = revoked ? "/login" : "/login?session=unrevoked";
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
        <p className="text-sm text-muted-foreground">Your public profile and how you sign in.</p>
      </header>

      <PublicProfileSection form={profile} />

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

const SERVER_ERRORS: Record<string, string> = {
  username_taken: "That username is taken.",
  username_required: "Choose a valid username before making your profile public.",
};

/** State for the "Public profile" form: what was last saved vs what's in the fields. */
function usePublicProfileForm() {
  const [saved, setSaved] = useState<{ username: string; profilePublic: boolean } | null>(null);
  const [username, setUsername] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
    void authService.me().then((me) => {
      if (!me) return;
      const s = { username: me.username ?? "", profilePublic: !!me.profilePublic };
      setSaved(s);
      setUsername(s.username);
      setIsPublic(s.profilePublic);
    });
  }, []);

  const value = username.trim().toLowerCase();
  const problem = value ? usernameProblem(value) : null;
  const dirty = !!saved && (value !== saved.username || isPublic !== saved.profilePublic);

  const save = async (e: React.SubmitEvent) => {
    e.preventDefault();
    if (problem) return setError(problem);
    const data = { username: value || null, profilePublic: !!value && isPublic };
    setSaving(true);
    setError(null);
    try {
      await accountService.updateProfile(data);
      const next = { username: value, profilePublic: data.profilePublic };
      setSaved(next);
      setUsername(value);
      setIsPublic(next.profilePublic);
      // The cached /me object is shared by the shell and survives ClientRouter navigations.
      const me = await authService.me();
      if (me) Object.assign(me, { username: value || null, profilePublic: next.profilePublic });
      toast.success("Public profile saved");
    } catch (err) {
      const body = err instanceof ApiError ? err.data : null;
      if (body?.field === "username") setError(SERVER_ERRORS[body.code] ?? errorText(err));
      else toast.error(errorText(err));
    } finally {
      setSaving(false);
    }
  };

  return { saved, username, setUsername, isPublic, setIsPublic, error, setError, saving, origin, value, problem, dirty, save };
}

function PublicProfileSection({ form }: { form: ReturnType<typeof usePublicProfileForm> }) {
  const { saved, username, setUsername, isPublic, setIsPublic, error, setError, saving, origin, value, problem, dirty, save } = form;
  const shown = error ?? problem;
  const url = saved?.profilePublic && saved.username ? `${origin}/u/${saved.username}` : null;
  const host = origin.replace(/^https?:\/\//, "");

  const copy = async () => {
    if (url && (await copyText(url))) toast.success("Link copied");
    else toast.error("Couldn't copy the link");
  };

  return (
    <section className="grid max-w-md gap-6">
      <div className="grid gap-1">
        <h2 className="text-lg font-semibold tracking-tight">Public profile</h2>
        <p className="text-sm text-muted-foreground">
          Off by default. When on, anyone can see your display name, bio, links, posts and quotes at your profile URL.
        </p>
      </div>
      <form onSubmit={save} className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="username">Username</Label>
          <div className="flex items-center gap-2">
            <span className="shrink-0 text-sm text-muted-foreground">{host}/u/</span>
            <Input id="username" autoComplete="off" autoCapitalize="none" spellCheck={false} maxLength={30}
              disabled={!saved} value={username} placeholder="your-name"
              onChange={(e) => {
                setUsername(e.target.value);
                setError(null);
                if (!e.target.value.trim()) setIsPublic(false);
              }}
              aria-invalid={!!shown} aria-describedby={shown ? "username-error" : "username-hint"} />
          </div>
          {shown ? (
            <p id="username-error" className="text-xs text-destructive">{shown}</p>
          ) : (
            <p id="username-hint" className="text-xs text-muted-foreground">3-30 lowercase letters, digits or hyphens. Clearing it makes your profile private.</p>
          )}
        </div>
        <div className="flex items-center justify-between gap-4">
          <Label htmlFor="profile-public">Show my profile publicly</Label>
          {/* Needs a valid username in the field; the server re-checks (username_required). */}
          <Switch id="profile-public" checked={isPublic} onCheckedChange={setIsPublic} disabled={!saved || !value || !!problem} />
        </div>
        {url && (
          <div className="grid gap-2">
            <p className="truncate text-sm text-muted-foreground" title={url}>{url}</p>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={copy}><Copy />Copy link</Button>
              <Button asChild variant="outline" size="sm">
                <a href={url} target="_blank" rel="noopener"><ExternalLink />Open</a>
              </Button>
            </div>
          </div>
        )}
        <div className="pt-2">
          <Button type="submit" disabled={saving || !dirty || !!problem}>{saving ? "Saving…" : "Save public profile"}</Button>
        </div>
      </form>
    </section>
  );
}
