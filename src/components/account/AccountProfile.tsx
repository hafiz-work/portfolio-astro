import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/shadcn/ui/button";
import { Input } from "@/components/shadcn/ui/input";
import { Label } from "@/components/shadcn/ui/label";
import { Textarea } from "@/components/shadcn/ui/textarea";
import { authService, type Me } from "../../lib/auth";
import { PageLoading } from "./PageLoading";
import { accountService, errorText } from "../../lib/account";

const FIELDS = [
  ["displayName", "Display name", "Shown on your posts"],
  ["location", "Location", ""],
  ["website", "Website", "https://"],
  ["githubUrl", "GitHub", "https://github.com/…"],
  ["linkedinUrl", "LinkedIn", "https://linkedin.com/in/…"],
  ["twitterUrl", "X / Twitter", "https://x.com/…"],
] as const;
const isLink = (k: string) => k.endsWith("Url") || k === "website";
const SectionHeading = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="grid gap-1">
    <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
    <p className="text-sm text-muted-foreground">{children}</p>
  </div>
);

/** /account/profile: the public-facing profile fields. */
export function AccountProfile() {
  const [me, setMe] = useState<Me | null>(null);
  const [profile, setProfile] = useState<Record<string, string>>({});

  useEffect(() => {
    void (async () => {
      const who = await authService.me();
      if (!who) return;
      setMe(who);
      setProfile(Object.fromEntries(Object.entries(who.profile ?? {}).map(([k, v]) => [k, v ?? ""])));
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
        <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
        <p className="text-sm text-muted-foreground">Signed in as {me.email}</p>
      </header>

      <div className="grid max-w-3xl gap-6">
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
