import Link from "next/link";
import { Suspense } from "react";
import { MobileNav } from "@/components/app/mobile-nav";
import { NavLinks, NavLinksFallback } from "@/components/app/nav";
import { NotificationBell } from "@/components/app/notification-bell";
import { UserMenu } from "@/components/app/user-menu";
import { Logo } from "@/components/logo";
import { Skeleton } from "@/components/ui/skeleton";
import { formatRelative } from "@/lib/format";
import { requireUser } from "@/server/auth/dal";
import { requestNow } from "@/server/clock";
import { listNotifications } from "@/server/notifications";

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

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-svh">
      <aside className="sticky top-0 hidden h-svh w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar p-3 text-sidebar-foreground lg:flex">
        <Link href="/dashboard" className="mb-6 px-2 pt-1.5">
          <Logo className="text-sidebar-accent-foreground" />
        </Link>
        <Suspense fallback={<NavLinksFallback />}>
          <NavLinks />
        </Suspense>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/85 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/70 sm:px-6">
          <MobileNav />
          <div className="flex min-w-0 flex-1 items-center gap-2" />
          <Suspense fallback={<Skeleton className="h-8 w-40" />}>
            <CurrentUserMenu />
          </Suspense>
        </header>
        <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 sm:px-6 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
