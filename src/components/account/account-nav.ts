import { FileText, Quote, UserRound } from "lucide-react";
import type { Me } from "../../lib/auth";

/** AccountHeader (the session guard) publishes the signed-in user here once it is
 *  known; AccountSidebar listens instead of calling /me itself - a second refresh in
 *  parallel could race the rotating refresh token. */
export const ACCOUNT_ME_EVENT = "account:me";
declare global {
  interface Window {
    __accountMe?: Me;
  }
}
export const publishMe = (me: Me) => {
  window.__accountMe = me;
  window.dispatchEvent(new CustomEvent(ACCOUNT_ME_EVENT, { detail: me }));
};

/** Account sections - shared by the sidebar (lg) and the tabs bar (mobile). */
export const ACCOUNT_LINKS = [
  { href: "/account", label: "Profile", icon: UserRound },
  { href: "/account/blog", label: "Blog posts", icon: FileText },
  { href: "/account/quotes", label: "Quotes", icon: Quote },
];

export const initials = (me: Me) =>
  (me.profile?.displayName || me.name || me.email)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
