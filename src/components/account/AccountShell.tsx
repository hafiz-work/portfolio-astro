import React, { useEffect, useState, type ReactNode } from "react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/shadcn/ui/breadcrumb";
import { Avatar, AvatarFallback } from "@/components/shadcn/ui/avatar";
import { Button } from "@/components/shadcn/ui/button";
import { Separator } from "@/components/shadcn/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/shadcn/ui/sidebar";
import { Toaster } from "@/components/shadcn/ui/sonner";
import { authService, type Me } from "../../lib/auth";
import { AccountSidebar } from "./AccountSidebar";
import { ConfirmHost } from "./ConfirmDialog";
import { ModeToggle } from "./ModeToggle";
import { activeAccountLink, initials } from "./account-nav";

const humanize = (segment: string) =>
  decodeURIComponent(segment)
    .replace(/[-_]+/g, " ")
    .replace(/\b[a-z]/g, (c) => c.toUpperCase());

// The signed-in account screen (shadcn sidebar-07): AccountSidebar + an inset with
// the breadcrumb bar and the page. This is the session guard and the only /me
// caller - one refresh at a time, the refresh token rotates.
export function AccountShell({
  path,
  defaultOpen = true,
  children,
}: {
  path: string;
  defaultOpen?: boolean;
  children?: ReactNode;
}) {
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    void (async () => {
      // No session -> /login (the middleware has already bounced cookieless visits).
      if (!authService.isAuthenticated() && !(await authService.tryRefresh())) {
        window.location.replace("/login");
        return;
      }
      const who = await authService.me();
      if (!who) window.location.replace("/login");
      else setMe(who);
    })();
  }, []);

  // Back after sign-out can restore this page from the back/forward cache (no request,
  // effects don't re-run). No session flag any more -> leave at once.
  useEffect(() => {
    const onShow = (e: PageTransitionEvent) => {
      if (e.persisted && !authService.isAuthenticated()) window.location.replace("/login");
    };
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, []);

  const section = activeAccountLink(path);
  // Pages outside the sidebar sections (e.g. /account/settings) hang off "Account".
  const leaf = path
    .slice((section?.href ?? "/account").length)
    .split("/")
    .filter(Boolean)
    .filter((segment) => !/^\d+$/.test(segment))
    .pop();

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <AccountSidebar path={path} me={me} />
      <SidebarInset>
        {/* Sticky: stays while the page scrolls; opaque so content slides under it. */}
        <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b border-border/60 bg-background px-4 md:rounded-t-[10px]">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mr-2 data-[orientation=vertical]:h-4"
          />
          <Breadcrumb>
            <BreadcrumbList>
              {/* /account is the dashboard: just "Dashboard". Elsewhere: Account / section / leaf. */}
              {path !== "/account" && (
                <>
                  <BreadcrumbItem>
                    <BreadcrumbLink href="/account">Account</BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                </>
              )}
              {section && (
                <BreadcrumbItem>
                  {section.href === path ? (
                    <BreadcrumbPage>{section.label}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink href={section.href}>
                      {section.label}
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
              )}
              {leaf && (
                <>
                  {section && <BreadcrumbSeparator />}
                  <BreadcrumbItem>
                    <BreadcrumbPage>{humanize(leaf)}</BreadcrumbPage>
                  </BreadcrumbItem>
                </>
              )}
            </BreadcrumbList>
          </Breadcrumb>
          <div className="ml-auto flex items-center gap-1">
            <ModeToggle />
            {me && (
              <Button
                asChild
                variant="ghost"
                size="icon"
                className="rounded-full"
              >
                <a
                  href="/account/profile"
                  aria-label="Profile"
                  title={me.profile?.displayName || me.name}
                >
                  <Avatar className="size-8">
                    <AvatarFallback className="text-xs">
                      {initials(me)}
                    </AvatarFallback>
                  </Avatar>
                </a>
              </Button>
            )}
          </div>
        </header>
        {/* SidebarInset is the <main>. @container: pages lay out by this column's width
            (the sidebar collapses), not the viewport's. */}
        <div className="@container flex flex-1 flex-col p-4 md:p-6 lg:p-8">
          {children}
        </div>
      </SidebarInset>

      {/* Action feedback (save/delete) surfaces as toasts; one Toaster for the whole app shell. */}
      <Toaster />
      <ConfirmHost />
    </SidebarProvider>
  );
}
