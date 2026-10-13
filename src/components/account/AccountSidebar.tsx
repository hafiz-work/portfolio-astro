import React, { useEffect, useState } from "react";
import { LogOut, Shield } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/shadcn/ui/avatar";
import { Button } from "@/components/shadcn/ui/button";
import { Separator } from "@/components/shadcn/ui/separator";
import { authService, can, type Me } from "../../lib/auth";
import { ACCOUNT_LINKS, ACCOUNT_ME_EVENT, initials } from "./account-nav";

// Account side navigation (lg and up; AccountHeader is the mobile bar). AccountHeader
// owns the session guard and /me; this waits for the user it publishes.
export function AccountSidebar({ path }: { path: string }) {
  const [me, setMe] = useState<Me | null>(null);
  useEffect(() => {
    // Islands render on the server too: read window only here.
    if (window.__accountMe) setMe(window.__accountMe);
    const onMe = (e: Event) => setMe((e as CustomEvent<Me>).detail);
    window.addEventListener(ACCOUNT_ME_EVENT, onMe);
    return () => window.removeEventListener(ACCOUNT_ME_EVENT, onMe);
  }, []);

  const signOut = async () => {
    await authService.logout();
    window.location.href = "/";
  };

  return (
    <nav aria-label="Account" className="flex flex-col gap-4">
      <div className="flex items-center gap-3 px-2">
        <Avatar className="size-10">
          <AvatarFallback>{me ? initials(me) : ""}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{me ? me.profile?.displayName || me.name : "…"}</p>
          <p className="truncate text-xs text-muted-foreground">{me?.email ?? ""}</p>
        </div>
      </div>
      <Separator />
      <ul className="flex flex-col gap-1">
        {ACCOUNT_LINKS.map(({ href, label, icon: Icon }) => (
          <li key={href}>
            <Button asChild variant={path === href ? "secondary" : "ghost"} className="w-full justify-start">
              <a href={href} aria-current={path === href ? "page" : undefined}>
                <Icon />
                {label}
              </a>
            </Button>
          </li>
        ))}
      </ul>
      <Separator />
      <div className="flex flex-col gap-1">
        {can(me, "admin.access") && (
          <Button asChild variant="ghost" className="w-full justify-start">
            <a href="/admin">
              <Shield />
              Admin
            </a>
          </Button>
        )}
        <Button variant="ghost" className="w-full justify-start" onClick={signOut} disabled={!me}>
          <LogOut />
          Sign out
        </Button>
      </div>
    </nav>
  );
}
