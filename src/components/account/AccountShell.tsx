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
import { AccountSidebar } from "./AccountSidebar";
import { ACCOUNT_LINKS } from "./account-nav";

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

// lg and up: resizable sidebar | content (layout remembered per browser). Below lg the
// group falls back to a plain block (sidebar + handle hidden; AccountHeader's tabs take
// over). One tree at every size, so the page's nested islands (children) never remount.
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
  const current = ACCOUNT_LINKS.find((l) => l.href === path);

  return (
    <ResizablePanelGroup
      orientation="horizontal"
      groupRef={groupRef}
      defaultLayout={layout.defaultLayout}
      onLayoutChanged={layout.onLayoutChanged}
      // Library default is overflow:hidden, which would break the sticky sidebar.
      style={{ height: "auto", overflow: "visible" }}
      className="max-lg:block!"
    >
      <ResizablePanel id="nav" defaultSize="22%" minSize="16%" maxSize="32%" style={{ overflow: "visible" }}>
        {/* Below lg the sidebar is hidden (AccountHeader's tabs bar takes over). */}
        <div className="sticky top-20 pr-4 max-lg:hidden">
          <AccountSidebar path={path} />
        </div>
      </ResizablePanel>
      <ResizableHandle withHandle className="max-lg:hidden" />
      <ResizablePanel id="main" minSize="50%">
        {/* @container: pages lay out by the panel's width (it resizes), not the viewport's. */}
        <main className="@container min-w-0 lg:pl-8">
          {current && (
            <Breadcrumb className="mb-6">
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="/account">Account</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>{current.label}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          )}
          {children}
        </main>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
