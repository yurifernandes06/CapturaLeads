"use client";

import { KanbanSquareIcon, LayoutDashboardIcon, SettingsIcon, UsersRoundIcon, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export type NavItem = { href: string; label: string; icon: LucideIcon };

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboardIcon },
  { href: "/leads", label: "Leads", icon: UsersRoundIcon },
  { href: "/pipeline", label: "Pipeline", icon: KanbanSquareIcon },
  { href: "/settings", label: "Configurações", icon: SettingsIcon },
];

export function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return <NavList pathname={pathname} onNavigate={onNavigate} />;
}

/** Fallback sem estado ativo, usado no static shell enquanto a URL não é conhecida. */
export function NavLinksFallback() {
  return <NavList pathname="" />;
}

function NavList({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav className="grid gap-0.5">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group flex h-9 items-center gap-3 rounded-lg px-3 text-sm font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              active && "bg-sidebar-accent text-sidebar-accent-foreground",
            )}
          >
            <Icon
              className={cn(
                "size-4 text-sidebar-foreground/60 transition-colors group-hover:text-sidebar-accent-foreground",
                active && "text-sidebar-primary",
              )}
            />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
