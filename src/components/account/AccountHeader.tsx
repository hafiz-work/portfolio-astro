import React from "react";
import { Button } from "@/components/shadcn/ui/button";
import { cn } from "@/lib/utils";
import { ACCOUNT_LINKS } from "./account-nav";

/** Nested routes count as a section too (/account/quotes/new -> /account/quotes). */
export const isAccountLinkActive = (path: string, href: string) =>
  path === href || path.startsWith(`${href}/`);

/** The most specific link a path belongs to - /account prefixes everything, so the
 *  longest matching href wins. */
export const activeAccountLink = (
  path: string,
): (typeof ACCOUNT_LINKS)[number] | undefined =>
  ACCOUNT_LINKS.filter((link) => isAccountLinkActive(path, link.href)).sort(
    (a, b) => b.href.length - a.href.length,
  )[0];

/** Section navigation (Profile / Blog posts / Quotes): the lg sidebar list and the
 *  mobile drawer share it. AccountNavbar renders it inside the Sheet. */
export function AccountNavLinks({
  path,
  onNavigate,
  className,
}: {
  path: string;
  onNavigate?: () => void;
  className?: string;
}) {
  const activeHref = activeAccountLink(path)?.href;

  return (
    <ul className={cn("flex flex-col gap-1", className)}>
      {ACCOUNT_LINKS.map(({ href, label, icon: Icon }) => {
        const active = href === activeHref;
        return (
          <li key={href}>
            <Button
              asChild
              variant={active ? "secondary" : "ghost"}
              className="w-full justify-start"
            >
              <a
                href={href}
                aria-current={active ? "page" : undefined}
                onClick={onNavigate}
              >
                <Icon />
                {label}
              </a>
            </Button>
          </li>
        );
      })}
    </ul>
  );
}
