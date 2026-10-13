import React, { useEffect, useState } from "react";
import { LogOut, Menu, Shield } from "lucide-react";
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/shadcn/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/shadcn/ui/tooltip";
import { authService, can, type Me } from "../../lib/auth";
import { AccountNavLinks } from "./AccountHeader";
import { initials, publishMe } from "./account-nav";

/** Full-width account bar: brand on the left, identity + account menu on the right.
 *  On mobile the section nav lives in a Sheet drawer; on lg the sidebar carries it.
 *  This is the always-mounted island, so the session guard lives here too: no
 *  session -> /login (the middleware has already bounced cookieless visits). */
export function AccountNavbar({ path }: { path: string }) {
  const [me, setMe] = useState<Me | null>(null);
  const [navOpen, setNavOpen] = useState(false);

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
    <TooltipProvider>
      <Sheet open={navOpen} onOpenChange={setNavOpen}>
        <header className="sticky top-0 z-40 w-full border-b border-border bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75">
          <div className="flex h-14 w-full items-center gap-2 px-4 sm:h-16 sm:px-6 lg:px-8">
            {/* Icon-only triggers, so the tooltip carries the label on hover. */}
            <Tooltip>
              <TooltipTrigger asChild>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="lg:hidden"
                    aria-label="Open account navigation"
                  >
                    <Menu />
                  </Button>
                </SheetTrigger>
              </TooltipTrigger>
              <TooltipContent>Menu</TooltipContent>
            </Tooltip>

            <a
              href="/"
              aria-label="Hafiz Bahtiar - home"
              className="inline-flex items-center"
            >
              <img
                src="/brand/wordmark.svg"
                alt="hafizbahtiar"
                width={383}
                height={120}
                className="h-7 w-auto sm:h-8"
              />
            </a>

            <div className="ml-auto flex items-center gap-2">
              <DropdownMenu>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-full"
                        aria-label="Account menu"
                      >
                        <Avatar className="size-8">
                          <AvatarFallback>{me ? initials(me) : ""}</AvatarFallback>
                        </Avatar>
                      </Button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent>Account</TooltipContent>
                </Tooltip>
                <DropdownMenuContent align="end" className="w-56">
                  {me && (
                    <DropdownMenuLabel className="font-normal">
                      <p className="truncate text-sm font-medium">
                        {me.profile?.displayName || me.name}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {me.email}
                      </p>
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
          </div>
        </header>

        <SheetContent side="left" className="w-80 max-w-[85vw]" aria-describedby={undefined}>
          <SheetHeader>
            <SheetTitle>Account</SheetTitle>
          </SheetHeader>
          <AccountNavLinks path={path} onNavigate={() => setNavOpen(false)} className="px-4" />
        </SheetContent>
      </Sheet>
    </TooltipProvider>
  );
}
