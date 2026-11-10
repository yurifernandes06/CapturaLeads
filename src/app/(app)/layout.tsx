import Link from "next/link";
import { Suspense, cache } from "react";
import { MobileNav } from "@/components/app/mobile-nav";
import { NavLinks, NavLinksFallback, type NavBadges } from "@/components/app/nav";
import { NotificationBell } from "@/components/app/notification-bell";
import { UserMenu } from "@/components/app/user-menu";
import { Logo } from "@/components/logo";
import { Skeleton } from "@/components/ui/skeleton";
import { formatRelative } from "@/lib/format";
import { requireUser } from "@/server/auth/dal";
import { requestNow } from "@/server/clock";
import { listNotifications } from "@/server/notifications";
import { getSetting } from "@/server/settings";
import { countAwaiting } from "@/server/inbox";
import { countDueTasks } from "@/server/tasks";

async function CurrentUserMenu() {
  const user = await requireUser();
  const { items, unread } = await listNotifications(user.id);
  const now = requestNow();
  return (
    <div className="flex items-center gap-1">
      <NotificationBell
        unread={unread}
        items={items.map((n) => ({
          id: n.id,
          type: n.type,
          title: n.title,
          body: n.body,
          leadId: n.leadId,
          read: Boolean(n.readAt),
          when: formatRelative(n.createdAt, now),
        }))}
      />
      <UserMenu user={user} />
    </div>
  );
}

/** Sidebar e menu mobile pedem os mesmos contadores: uma consulta por request. */
const navBadges = cache(async (): Promise<NavBadges> => {
  const user = await requireUser();
  const { timezone } = await getSetting("sla");
  const [tasks, inbox] = await Promise.all([countDueTasks(user.id, requestNow(), timezone), countAwaiting(user.id)]);
  return { "/tasks": tasks, "/inbox": inbox };
});

async function SidebarNav() {
  return <NavLinks badges={await navBadges()} />;
}

async function MobileNavWithBadges() {
  return <MobileNav badges={await navBadges()} />;
}

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-svh">
      <aside className="sticky top-0 hidden h-svh w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar px-3 pt-5 pb-4 text-sidebar-foreground lg:flex">
        <Link href="/dashboard" className="mb-8 px-2">
          <Logo className="text-sidebar-accent-foreground" />
        </Link>
        <p className="mb-2 px-3 eyebrow text-sidebar-foreground/40">Menu</p>
        <Suspense fallback={<NavLinksFallback />}>
          <SidebarNav />
        </Suspense>
        <div className="mt-auto rounded-xl border border-sidebar-border bg-gradient-to-b from-primary/12 to-transparent p-3.5">
          <p className="eyebrow text-primary">Atalho</p>
          <p className="mt-1.5 text-xs leading-relaxed text-sidebar-foreground/70">
            Digite <kbd className="rounded border border-sidebar-border bg-sidebar-accent px-1 font-mono text-[0.65rem]">/</kbd>{" "}
            no chat para usar respostas rápidas.
          </p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 sm:px-6 lg:px-8">
          <Suspense fallback={<MobileNav />}>
            <MobileNavWithBadges />
          </Suspense>
          <Link href="/dashboard" className="lg:hidden">
            <Logo compact />
          </Link>
          <div className="flex min-w-0 flex-1 items-center gap-2" />
          <Suspense fallback={<Skeleton className="h-8 w-40" />}>
            <CurrentUserMenu />
          </Suspense>
        </header>
        <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-10">{children}</main>
      </div>
    </div>
  );
}
