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

  const section = activeAccountLink(path);
  const leaf = section
    ? path
      .slice(section.href.length)
      .split("/")
      .filter(Boolean)
      .filter((segment) => !/^\d+$/.test(segment))
      .pop()
    : undefined;

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <AccountSidebar path={path} me={me} />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mr-2 data-[orientation=vertical]:h-4"
          />
          <Breadcrumb>
            <BreadcrumbList>
              {section ? (
                <BreadcrumbItem>
                  <BreadcrumbLink href="/account">Account</BreadcrumbLink>
                </BreadcrumbItem>
              ) : (
                <BreadcrumbItem>
                  <BreadcrumbPage>Account</BreadcrumbPage>
                </BreadcrumbItem>
              )}
              {section && (
                <>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    {section.href === path ? (
                      <BreadcrumbPage>{section.label}</BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink href={section.href}>
                        {section.label}
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                </>
              )}
              {leaf && (
                <>
                  <BreadcrumbSeparator />
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
              <Button asChild variant="ghost" className="h-10 gap-2 px-2">
                <a href="/account" aria-label="Profile">
                  <Avatar className="size-7 rounded-lg">
                    <AvatarFallback className="rounded-lg text-xs">
                      {initials(me)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="max-w-40 truncate text-sm font-medium max-sm:hidden">
                    {me.profile?.displayName || me.name}
                  </span>
                </a>
              </Button>
            )}
          </div>
        </header>
        {/* SidebarInset is the <main>. @container: pages lay out by this column's width
            (the sidebar collapses), not the viewport's. */}
        <div className="@container flex-1 p-4 md:p-6 lg:p-8">{children}</div>
      </SidebarInset>

      {/* Action feedback (save/delete) surfaces as toasts; one Toaster for the whole app shell. */}
      <Toaster />
    </SidebarProvider>
  );
}
