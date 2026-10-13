import React, { useEffect, useState } from "react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/shadcn/ui/button";
import { Separator } from "@/components/shadcn/ui/separator";
import { authService, type Me } from "../../lib/auth";
import { AccountNavLinks } from "./AccountHeader";
import { ACCOUNT_ME_EVENT } from "./account-nav";

/** Account section navigation (lg and up; the mobile drawer in AccountNavbar takes
 *  over below lg). Identity and the account menu live in the navbar, so this keeps
 *  just the section links and a sign out. AccountNavbar owns the session guard and
 *  /me; this waits for the user it publishes. */
export function AccountSidebar({ path }: { path: string }) {
  const [me, setMe] = useState<Me | null>(null);
  useEffect(() => {
    if (window.__accountMe) setMe(window.__accountMe);
    const onMe = (e: Event) => setMe((e as CustomEvent<Me>).detail);
    window.addEventListener(ACCOUNT_ME_EVENT, onMe);
    return () => window.removeEventListener(ACCOUNT_ME_EVENT, onMe);
  }, []);

  const signOut = async () => {
    await authService.logout();
    window.location.href = "/";
  };

  return (
    <nav aria-label="Account" className="flex flex-col gap-4">
      <AccountNavLinks path={path} />
      <Separator />
      <Button
        variant="ghost"
        className="w-full justify-start"
        onClick={signOut}
        disabled={!me}
      >
        <LogOut />
        Sign out
      </Button>
    </nav>
  );
}
