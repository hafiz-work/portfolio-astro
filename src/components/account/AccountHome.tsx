import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/shadcn/ui/button";
import { Input } from "@/components/shadcn/ui/input";
import { Label } from "@/components/shadcn/ui/label";
import { Textarea } from "@/components/shadcn/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/shadcn/ui/alert";
import { cn } from "@/lib/utils";
import { authService, type Me } from "../../lib/auth";
import { PageLoading } from "./PageLoading";
import { StatusBadge } from "./StatusBadge";
import { accountService, errorText, type ModerationEntry } from "../../lib/account";
import type { ColumnDef } from "@tanstack/react-table";
import { AccountDataTable, asDate } from "./AccountDataTable";

const FIELDS = [
  ["displayName", "Display name", "Shown on your posts"],
  ["location", "Location", ""],
  ["website", "Website", "https://"],
  ["githubUrl", "GitHub", "https://github.com/…"],
  ["linkedinUrl", "LinkedIn", "https://linkedin.com/in/…"],
  ["twitterUrl", "X / Twitter", "https://x.com/…"],
] as const;
const isLink = (k: string) => k.endsWith("Url") || k === "website";
const moderationColumns: ColumnDef<ModerationEntry>[] = [
  { accessorKey: "createdAt", header: "Date", cell: ({ getValue }) => asDate(getValue<string>()) },
  { id: "type", accessorFn: (h) => (h.contentType === "quote" ? "Quote" : "Blog post"), header: "Type", meta: { className: "hidden sm:table-cell" } },
  { accessorKey: "contentTitle", header: "Item", meta: { className: "min-w-40 whitespace-normal font-medium" } },
  {
    accessorKey: "action", header: "Action",
    cell: ({ getValue }) => {
      const a = getValue<ModerationEntry["action"]>();
      return <StatusBadge status={a} />;
    },
  },
  { accessorKey: "reason", header: "Reason", enableSorting: false, meta: { className: "min-w-48 whitespace-normal" } },
];

const SectionHeading = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="grid gap-1">
    <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
    <p className="text-sm text-muted-foreground">{children}</p>
  </div>
);

export function AccountHome() {
  const [me, setMe] = useState<Me | null>(null);
  const [profile, setProfile] = useState<Record<string, string>>({});
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
    const data = Object.fromEntries(
      Object.entries(profile)
        .filter(([k, v]) => v.trim() || isLink(k))
        .map(([k, v]) => [k, isLink(k) && !v.trim() ? null : v.trim()]),
    );
    try {
      await accountService.updateProfile(data);
      toast.success("Profile saved");
    } catch (err) {
      toast.error(errorText(err));
    }
  };

  if (!me) return <PageLoading />;

  return (
    <div className="grid gap-6">
      <header className="grid gap-1 border-b border-border pb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Your account</h1>
        <p className="text-sm text-muted-foreground">Signed in as {me.email}</p>
      </header>

      {moderation.history.length > 0 && (
        <section className="grid gap-6">
          <SectionHeading title="Moderation history">What moderators did to your posts and quotes, and why.</SectionHeading>
          <Alert variant={moderation.strikes > 0 ? "destructive" : "default"}>
            <AlertTitle>{moderation.strikes} strike{moderation.strikes === 1 ? "" : "s"} in 90 days</AlertTitle>
            <AlertDescription>Repeated strikes can lead to a ban.</AlertDescription>
          </Alert>
          <AccountDataTable columns={moderationColumns} data={moderation.history} filterPlaceholder="Filter notices…" pageSize={5} />
        </section>
      )}

      {/* The header's border-b is this page's first hairline, so profile only adds one when moderation sits above it. */}
      <div className={cn("grid max-w-3xl gap-6", moderation.history.length > 0 && "border-t border-border pt-6")}>
        <section className="grid gap-6">
          <SectionHeading title="Profile">Your display name appears on your posts and quotes.</SectionHeading>
          <form onSubmit={saveProfile} className="grid gap-6">
            <div className="grid gap-4 sm:grid-cols-2">
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
            </div>
            <div className="flex flex-wrap gap-2 border-t border-border pt-6">
              <Button type="submit">Save profile</Button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
