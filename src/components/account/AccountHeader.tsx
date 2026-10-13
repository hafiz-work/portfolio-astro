import React, { useEffect, useState } from "react";
import { LogOut, Shield } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/shadcn/ui/avatar";
import { Button } from "@/components/shadcn/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/shadcn/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@/components/shadcn/ui/tabs";
import { authService, can, type Me } from "../../lib/auth";
import { ACCOUNT_LINKS as LINKS, initials, publishMe } from "./account-nav";

// Account bar under the site navbar on small screens (AccountSidebar takes over on lg):
// section tabs (links) + the account menu.
// Also the client guard: no session -> /login (the middleware already bounced
// cookieless visits).
export function AccountHeader({ path }: { path: string }) {
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    void (async () => {
      if (!authService.isAuthenticated() && !(await authService.tryRefresh())) {
        window.location.replace("/login");
        return;
      }
      const who = await authService.me();
      if (!who) window.location.replace("/login");
      else {
        setMe(who);
        publishMe(who);
      }
    })();
  }, []);

  const signOut = async () => {
    await authService.logout();
    window.location.href = "/";
  };

  return (
    <div className="flex items-center gap-3">
      <Tabs value={LINKS.some((l) => l.href === path) ? path : LINKS[0].href} className="min-w-0 grow">
        <TabsList aria-label="Account" className="max-w-full overflow-x-auto">
          {LINKS.map((l) => (
            <TabsTrigger key={l.href} value={l.href} asChild>
              <a href={l.href} aria-current={path === l.href ? "page" : undefined}>
                {l.label}
              </a>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="shrink-0 rounded-full" aria-label="Account menu" disabled={!me}>
            <Avatar className="size-8">
              <AvatarFallback>{me ? initials(me) : ""}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {me && (
            <DropdownMenuLabel className="font-normal">
              <p className="truncate text-sm font-medium">{me.profile?.displayName || me.name}</p>
              <p className="truncate text-xs text-muted-foreground">{me.email}</p>
            </DropdownMenuLabel>
          )}
          <DropdownMenuSeparator />
          {can(me, "admin.access") && (
            <DropdownMenuItem asChild>
              <a href="/admin">
                <Shield />
                Admin
              </a>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onSelect={signOut}>
            <LogOut />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
