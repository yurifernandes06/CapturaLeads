"use client";

import { AlarmClockIcon, BellIcon, CheckCheckIcon, ListTodoIcon, MessageCircleIcon, SparklesIcon } from "lucide-react";
import Link from "next/link";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { NotificationType } from "@/db/schema";
import { cn } from "@/lib/utils";
import { markAllNotificationsRead } from "./notifications-actions";

export type BellItem = {
  id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  leadId: string | null;
  read: boolean;
  when: string;
};

const ICON = {
  sla_breach: { icon: AlarmClockIcon, className: "bg-danger/12 text-danger" },
  sla_at_risk: { icon: AlarmClockIcon, className: "bg-warning/15 text-warning" },
  new_lead: { icon: SparklesIcon, className: "bg-primary/12 text-primary" },
  new_message: { icon: MessageCircleIcon, className: "bg-whatsapp/15 text-whatsapp" },
  task_due: { icon: ListTodoIcon, className: "bg-warning/15 text-warning" },
} satisfies Record<NotificationType, unknown>;

export function NotificationBell({ items, unread }: { items: BellItem[]; unread: number }) {
  const [pending, startTransition] = useTransition();

  return (
    <Popover>
      <PopoverTrigger
        render={<Button variant="ghost" size="icon" className="relative" aria-label={`Notificações (${unread} não lidas)`} />}
      >
        <BellIcon />
        {unread ? (
          <span className="absolute top-1 right-1 grid h-4 min-w-4 place-items-center rounded-full bg-danger px-1 text-[10px] font-semibold text-white tabular">
            {unread > 99 ? "99+" : unread}
          </span>
        ) : null}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[22rem] gap-0 p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <p className="text-sm font-semibold">Notificações</p>
          {unread ? (
            <Button
              variant="ghost"
              size="xs"
              disabled={pending}
              onClick={() => startTransition(() => markAllNotificationsRead())}
            >
              <CheckCheckIcon /> Marcar como lidas
            </Button>
          ) : null}
        </div>
        <ul className="max-h-[60svh] overflow-y-auto">
          {items.length === 0 ? (
            <li className="px-4 py-10 text-center text-sm text-muted-foreground">Tudo em dia por aqui. ✨</li>
          ) : (
            items.map((n) => {
              const { icon: Icon, className } = ICON[n.type];
              const content = (
                <>
                  <span className={cn("grid size-8 shrink-0 place-items-center rounded-full", className)}>
                    <Icon className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{n.title}</span>
                    {n.body ? <span className="block truncate text-xs text-muted-foreground">{n.body}</span> : null}
                    <span className="mt-0.5 block text-[11px] text-muted-foreground">{n.when}</span>
                  </span>
                  {!n.read ? <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" aria-label="Não lida" /> : null}
                </>
              );
              return (
                <li key={n.id} className="border-b last:border-0">
                  {n.leadId ? (
                    <Link href={`/leads/${n.leadId}`} className="flex gap-3 px-4 py-3 transition-colors hover:bg-muted/60">
                      {content}
                    </Link>
                  ) : (
                    <div className="flex gap-3 px-4 py-3">{content}</div>
                  )}
                </li>
              );
            })
          )}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
