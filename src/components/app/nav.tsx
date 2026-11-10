"use client";

import {
  KanbanSquareIcon,
  LayoutDashboardIcon,
  ListTodoIcon,
  MessagesSquareIcon,
  SettingsIcon,
  UsersRoundIcon,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export type NavItem = { href: string; label: string; icon: LucideIcon };

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboardIcon },
  { href: "/inbox", label: "Inbox", icon: MessagesSquareIcon },
  { href: "/leads", label: "Leads", icon: UsersRoundIcon },
  { href: "/pipeline", label: "Pipeline", icon: KanbanSquareIcon },
  { href: "/tasks", label: "Tarefas", icon: ListTodoIcon },
  { href: "/settings", label: "Configurações", icon: SettingsIcon },
];

/** Contadores por rota (ex.: tarefas que vencem hoje). */
export type NavBadges = Partial<Record<string, number>>;

export function NavLinks({ onNavigate, badges }: { onNavigate?: () => void; badges?: NavBadges }) {
  const pathname = usePathname();
  return <NavList pathname={pathname} onNavigate={onNavigate} badges={badges} />;
}

/** Fallback sem estado ativo, usado no static shell enquanto a URL não é conhecida. */
export function NavLinksFallback() {
  return <NavList pathname="" />;
}

function NavList({ pathname, onNavigate, badges }: { pathname: string; onNavigate?: () => void; badges?: NavBadges }) {
  return (
    <nav className="grid gap-1">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        const badge = badges?.[href];
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group relative flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              active &&
                "bg-sidebar-accent text-sidebar-accent-foreground before:absolute before:inset-y-2 before:-left-3 before:w-[3px] before:rounded-r-full before:bg-sidebar-primary before:shadow-[0_0_12px_var(--sidebar-primary)]",
            )}
          >
            <Icon
              className={cn(
                "size-[1.05rem] text-sidebar-foreground/45 transition-colors group-hover:text-sidebar-accent-foreground",
                active && "text-sidebar-primary",
              )}
            />
            {label}
            {badge ? (
              <span
                className="ml-auto min-w-5 rounded-md bg-primary px-1.5 text-center font-mono text-[0.7rem] leading-5 font-semibold text-primary-foreground tabular"
                aria-label={`${badge} pendentes`}
              >
                {badge > 99 ? "99+" : badge}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
