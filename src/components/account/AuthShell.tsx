import React, { type ReactNode } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/shadcn/ui/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/shadcn/ui/breadcrumb";

const perks = [
  "Write blog posts in Markdown",
  "Share quotes worth keeping",
  "Published straight away, moderated by people",
];

/** Public auth screen (sign in / register / verify): brand panel left, form right.
 *  A self-contained shadcn/ui page - no public site navbar or gutters. */
export function AuthShell({
  title,
  switchTo,
  children,
}: {
  title: string;
  switchTo?: { href: string; label: string };
  children?: ReactNode;
}) {
  return (
    <div className="grid min-h-dvh bg-background text-foreground lg:grid-cols-2">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-primary p-10 text-primary-foreground lg:flex">
        <div
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,currentColor_1px,transparent_1px),linear-gradient(to_bottom,currentColor_1px,transparent_1px)] bg-size-[48px_48px] opacity-[0.08]"
          aria-hidden="true"
        />
        <span aria-hidden="true" />
        <div className="relative max-w-md">
          <p className="font-mono text-xs tracking-widest text-primary-foreground/70 uppercase">
            Community
          </p>
          <h2 className="mt-4 text-4xl font-medium tracking-tighter text-balance">
            Write, share, and keep the good lines.
          </h2>
          <ul className="mt-8 grid gap-3 text-sm text-primary-foreground/80">
            {perks.map((perk) => (
              <li key={perk} className="flex items-center gap-3">
                <Check className="h-4 w-4 text-primary-foreground" />
                {perk}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-primary-foreground/60">
          &copy; {new Date().getFullYear()} Hafiz Bahtiar
        </p>
      </aside>

      <main className="flex flex-col bg-background p-6 md:p-10">
        <div className="flex items-center justify-between gap-4">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/">Home</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{title}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          {switchTo && (
            <Button asChild variant="ghost">
              <a href={switchTo.href}>{switchTo.label}</a>
            </Button>
          )}
        </div>
        <div className="flex grow items-center justify-center py-10">
          <div className="w-full max-w-sm">{children}</div>
        </div>
      </main>
    </div>
  );
}
