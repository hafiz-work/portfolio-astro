import { FileText, LayoutDashboard, Quote } from "lucide-react";
import type { Me } from "../../lib/auth";

/** Account sections - the sidebar menu and the breadcrumb. */
export const ACCOUNT_LINKS = [
  { href: "/account", label: "Dashboard", icon: LayoutDashboard },
  { href: "/account/blog", label: "Blog posts", icon: FileText },
  { href: "/account/quotes", label: "Quotes", icon: Quote },
];

/** Nested routes count as a section too (/account/quotes/new -> /account/quotes).
 *  The dashboard (/account) is exact-only - it prefixes every account path. */
export const isAccountLinkActive = (path: string, href: string) =>
  path === href || (href !== "/account" && path.startsWith(`${href}/`));

/** The most specific link a path belongs to - /account prefixes everything, so the
 *  longest matching href wins. Pages outside the sidebar (profile, settings) get none. */
export const activeAccountLink = (
  path: string,
): (typeof ACCOUNT_LINKS)[number] | undefined =>
  ACCOUNT_LINKS.filter((link) => isAccountLinkActive(path, link.href)).sort(
    (a, b) => b.href.length - a.href.length,
  )[0];

export const initials = (me: Me) =>
  (me.profile?.displayName || me.name || me.email)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
