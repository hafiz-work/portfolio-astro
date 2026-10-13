import React from "react";
import { ChevronsUpDown, Globe, LogOut, Shield, UserRound } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/shadcn/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/shadcn/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarRail,
  useSidebar,
} from "@/components/shadcn/ui/sidebar";
import { authService, can, type Me } from "../../lib/auth";
import { ACCOUNT_LINKS, activeAccountLink, initials } from "./account-nav";

/** The account AppSidebar (shadcn sidebar-07): brand, section links, the user menu.
 *  Collapses to icons on desktop; below md the Sidebar renders itself in a Sheet. */
export function AccountSidebar({ path, me }: { path: string; me: Me | null }) {
  const activeHref = activeAccountLink(path)?.href;

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild tooltip="hafizbahtiar.com">
              <a href="/">
                <img src="/brand/logo.svg" alt="" width={32} height={32} className="size-8 shrink-0" />
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">hafizbahtiar</span>
                  <span className="truncate text-xs text-muted-foreground">Account</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Account</SidebarGroupLabel>
          <SidebarMenu>
            {ACCOUNT_LINKS.map(({ href, label, icon: Icon }) => (
              <SidebarMenuItem key={href}>
                <SidebarMenuButton asChild isActive={href === activeHref} tooltip={label}>
                  <a href={href} aria-current={href === activeHref ? "page" : undefined}>
                    <Icon />
                    <span>{label}</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>{me ? <NavUser me={me} /> : <SidebarMenuSkeleton showIcon />}</SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

function NavUser({ me }: { me: Me }) {
  const { isMobile } = useSidebar();
  const name = me.profile?.displayName || me.name;

  const signOut = async () => {
    await authService.logout();
    window.location.href = "/";
  };

  const identity = (
    <>
      <Avatar className="size-8 rounded-lg">
        <AvatarFallback className="rounded-lg">{initials(me)}</AvatarFallback>
      </Avatar>
      <div className="grid flex-1 text-left text-sm leading-tight">
        <span className="truncate font-medium">{name}</span>
        <span className="truncate text-xs text-muted-foreground">{me.email}</span>
      </div>
    </>
  );

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              {identity}
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5">{identity}</div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem asChild>
                <a href="/account">
                  <UserRound />
                  Profile
                </a>
              </DropdownMenuItem>
              {can(me, "admin.access") && (
                <DropdownMenuItem asChild>
                  <a href="/admin">
                    <Shield />
                    Admin
                  </a>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem asChild>
                <a href="/">
                  <Globe />
                  Website
                </a>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={signOut}>
              <LogOut />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
