import React, { useEffect, type ReactNode } from "react";
import { useDefaultLayout, useGroupRef } from "react-resizable-panels";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/shadcn/ui/breadcrumb";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/shadcn/ui/resizable";
import { Toaster } from "@/components/shadcn/ui/sonner";
import { AccountNavbar } from "./AccountNavbar";
import { AccountSidebar } from "./AccountSidebar";
import { activeAccountLink } from "./AccountHeader";

const LAYOUT_KEY = "react-resizable-panels:account-shell";

// The library reads its saved layout while rendering. The server can't, so the
// hydrated DOM would keep the default widths (React doesn't patch style attributes
// on hydration). So: never read during render (same default on server and client),
// write after a drag, and restore the saved widths once mounted (effect below).
const writeOnlyStorage = {
  getItem: () => null,
  setItem: (key: string, value: string) => {
    try {
      localStorage.setItem(key, value);
    } catch { }
  },
};

const humanize = (segment: string) =>
  decodeURIComponent(segment)
    .replace(/[-_]+/g, " ")
    .replace(/\b[a-z]/g, (c) => c.toUpperCase());

// The whole signed-in account screen: shadcn background, the full-width top navbar
// (session guard + identity + account menu + the mobile section drawer), then
// sidebar | content edge to edge. lg and up the sidebar is a resizable panel (layout
// remembered per browser); below lg the group falls back to a plain block and the
// navbar drawer carries the section nav. One tree at every size, so the page's nested
// islands (children) never remount.
export function AccountShell({ path, children }: { path: string; children?: ReactNode }) {
  const layout = useDefaultLayout({ id: "account-shell", storage: writeOnlyStorage, onlySaveAfterUserInteractions: true });
  const groupRef = useGroupRef();
  useEffect(() => {
    // Next frame: the group registers its panels in its own effects first.
    const id = requestAnimationFrame(() => {
      try {
        const saved = JSON.parse(localStorage.getItem(LAYOUT_KEY) ?? "null");
        if (saved && typeof saved.nav === "number" && typeof saved.main === "number") groupRef.current?.setLayout(saved);
      } catch { }
    });
    return () => cancelAnimationFrame(id);
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
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <AccountNavbar path={path} />

      <div className="w-full grow px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <ResizablePanelGroup
          orientation="horizontal"
          groupRef={groupRef}
          defaultLayout={layout.defaultLayout}
          onLayoutChanged={layout.onLayoutChanged}
          // Library default is overflow:hidden, which would break the sticky sidebar.
          style={{ height: "auto", overflow: "visible" }}
          className="max-lg:block!"
        >
          <ResizablePanel id="nav" defaultSize="22%" minSize={200} maxSize={360} style={{ overflow: "visible" }}>
            {/* Below lg the sidebar is hidden (the navbar drawer takes over). */}
            <div className="sticky top-20 pr-4 max-lg:hidden xl:pr-6">
              <AccountSidebar path={path} />
            </div>
          </ResizablePanel>
          <ResizableHandle className="max-lg:hidden" />
          <ResizablePanel id="main" minSize="50%">
            {/* @container: pages lay out by the panel's width (it resizes), not the viewport's. */}
            <main className="@container min-w-0 lg:pl-8">
              <Breadcrumb className="mb-6">
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
                          <BreadcrumbLink href={section.href}>{section.label}</BreadcrumbLink>
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
              {children}
            </main>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      <footer className="py-6 text-center text-xs text-muted-foreground">
        <a href="/" className="hover:text-foreground">hafizbahtiar.com</a>
      </footer>

      {/* Action feedback (save/delete) surfaces as toasts; one Toaster for the whole app shell. */}
      <Toaster />
    </div>
  );
}
