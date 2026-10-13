import React, { useEffect, useState } from "react";
import { Button } from "@/components/shadcn/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/shadcn/ui/card";
import { Input } from "@/components/shadcn/ui/input";
import { Label } from "@/components/shadcn/ui/label";
import { Textarea } from "@/components/shadcn/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/shadcn/ui/alert";
import { Badge } from "@/components/shadcn/ui/badge";
import { authService, type Me } from "../../lib/auth";
import { accountService, errorText, type ModerationEntry } from "../../lib/account";
import type { ColumnDef } from "@tanstack/react-table";
import { AccountDataTable, asDate } from "./AccountDataTable";

// /account: profile, password, and what moderation did to my content (and why).
const FIELDS = [
  ["displayName", "Display name", "Shown on your posts"],
  ["location", "Location", ""],
  ["website", "Website", "https://"],
  ["githubUrl", "GitHub", "https://github.com/…"],
  ["linkedinUrl", "LinkedIn", "https://linkedin.com/in/…"],
  ["twitterUrl", "X / Twitter", "https://x.com/…"],
] as const;
const isLink = (k: string) => k.endsWith("Url") || k === "website";
const actionVariant = { reject: "destructive", restore: "secondary", delete: "outline" } as const;
const moderationColumns: ColumnDef<ModerationEntry>[] = [
  { accessorKey: "createdAt", header: "Date", cell: ({ getValue }) => asDate(getValue<string>()) },
  { id: "type", accessorFn: (h) => (h.contentType === "quote" ? "Quote" : "Blog post"), header: "Type", meta: { className: "hidden sm:table-cell" } },
  { accessorKey: "contentTitle", header: "Item", meta: { className: "min-w-40 whitespace-normal font-medium" } },
  {
    accessorKey: "action", header: "Action",
    cell: ({ getValue }) => {
      const a = getValue<ModerationEntry["action"]>();
      return <Badge variant={actionVariant[a] ?? "outline"} className="capitalize">{a}</Badge>;
    },
  },
  { accessorKey: "reason", header: "Reason", enableSorting: false, meta: { className: "min-w-48 whitespace-normal" } },
];

type Msg = { ok: boolean; text: string } | null;
const Notice = ({ msg }: { msg: Msg }) =>
  msg ? (
    <Alert variant={msg.ok ? "default" : "destructive"} aria-live="polite"><AlertDescription>{msg.text}</AlertDescription></Alert>
  ) : null;

export function AccountHome() {
  const [me, setMe] = useState<Me | null>(null);
  const [profile, setProfile] = useState<Record<string, string>>({});
  const [profileMsg, setProfileMsg] = useState<Msg>(null);
  const [pw, setPw] = useState({ current: "", next: "" });
  const [pwMsg, setPwMsg] = useState<Msg>(null);
  const [moderation, setModeration] = useState<{ strikes: number; history: ModerationEntry[] }>({ strikes: 0, history: [] });

  useEffect(() => {
    void (async () => {
      const who = await authService.me();
      if (!who) return;
      setMe(who);
      setProfile(Object.fromEntries(Object.entries(who.profile ?? {}).map(([k, v]) => [k, v ?? ""])));
      setModeration(await accountService.moderation().catch(() => ({ strikes: 0, history: [] })));
    })();
  }, []);

  const saveProfile = async (e: React.SubmitEvent) => {
    e.preventDefault();
    // Empty link fields clear the link; empty text fields are left unchanged.
    const data = Object.fromEntries(
      Object.entries(profile)
        .filter(([k, v]) => v.trim() || isLink(k))
        .map(([k, v]) => [k, isLink(k) && !v.trim() ? null : v.trim()]),
    );
    try {
      await accountService.updateProfile(data);
      setProfileMsg({ ok: true, text: "Profile saved." });
    } catch (err) {
      setProfileMsg({ ok: false, text: errorText(err) });
    }
  };

  const savePassword = async (e: React.SubmitEvent) => {
    e.preventDefault();
    if (pw.next.length < 12) {
      setPwMsg({ ok: false, text: "The new password needs at least 12 characters." });
      return;
    }
    try {
      await accountService.updatePassword(pw.current, pw.next);
      // Every session was revoked, this one included.
      authService.clearAuthState();
      window.location.href = "/login";
    } catch (err) {
      setPwMsg({ ok: false, text: errorText(err) });
    }
  };

  if (!me) return <p className="text-sm text-muted-foreground">Loading…</p>;

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Your account</h1>
        <p className="text-sm text-muted-foreground">Signed in as {me.email}</p>
      </div>

      {moderation.history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Moderation history</CardTitle>
            <CardDescription>What moderators did to your posts and quotes, and why.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <Alert variant={moderation.strikes > 0 ? "destructive" : "default"}>
              <AlertTitle>{moderation.strikes} strike{moderation.strikes === 1 ? "" : "s"} in 90 days</AlertTitle>
              <AlertDescription>Repeated strikes can lead to a ban.</AlertDescription>
            </Alert>
            <AccountDataTable columns={moderationColumns} data={moderation.history} filterPlaceholder="Filter notices…" pageSize={5} />
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 @4xl:grid-cols-[minmax(0,1fr)_22rem]">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Your display name appears on your posts and quotes.</CardDescription>
          </CardHeader>
          <form onSubmit={saveProfile}>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              {FIELDS.map(([key, text, placeholder]) => (
                <div key={key} className="grid gap-2">
                  <Label htmlFor={key}>{text}</Label>
                  <Input id={key} placeholder={placeholder} value={profile[key] ?? ""}
                    onChange={(e) => setProfile({ ...profile, [key]: e.target.value })} />
                </div>
              ))}
              <div className="grid gap-2 sm:col-span-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea id="bio" rows={3} maxLength={1000} value={profile.bio ?? ""}
                  onChange={(e) => setProfile({ ...profile, bio: e.target.value })} />
              </div>
              <div className="sm:col-span-2"><Notice msg={profileMsg} /></div>
            </CardContent>
            <CardFooter><Button type="submit">Save profile</Button></CardFooter>
          </form>
        </Card>

        <Card className="self-start">
          <CardHeader>
            <CardTitle>Password</CardTitle>
            <CardDescription>Changing it signs you out everywhere.</CardDescription>
          </CardHeader>
          <form onSubmit={savePassword}>
            <CardContent className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="pw-current">Current password</Label>
                <Input id="pw-current" type="password" autoComplete="current-password" value={pw.current}
                  onChange={(e) => setPw({ ...pw, current: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="pw-next">New password</Label>
                <Input id="pw-next" type="password" autoComplete="new-password" minLength={12} value={pw.next}
                  onChange={(e) => setPw({ ...pw, next: e.target.value })} />
              </div>
              <Notice msg={pwMsg} />
            </CardContent>
            <CardFooter><Button type="submit" variant="outline">Change password</Button></CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
