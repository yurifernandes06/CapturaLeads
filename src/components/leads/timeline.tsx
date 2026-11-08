import {
  AlarmClockIcon,
  ArrowRightLeftIcon,
  InfoIcon,
  PhoneIcon,
  SparklesIcon,
  StickyNoteIcon,
  UserRoundCheckIcon,
  type LucideIcon,
} from "lucide-react";
import type { Activity } from "@/db/schema";
import { formatDateTime, formatRelative } from "@/lib/format";
import { SOURCE_LABEL, STAGE_META, type ActivityType, type Source, type Stage } from "@/lib/leads";
import { cn } from "@/lib/utils";
import { WhatsAppIcon } from "./badges";

type Item = { activity: Activity; userName: string | null };

const ICONS: Record<ActivityType, { icon: LucideIcon | typeof WhatsAppIcon; className: string }> = {
  created: { icon: SparklesIcon, className: "bg-primary/12 text-primary" },
  note: { icon: StickyNoteIcon, className: "bg-warning/15 text-warning" },
  call: { icon: PhoneIcon, className: "bg-info/12 text-info" },
  whatsapp_in: { icon: WhatsAppIcon, className: "bg-whatsapp/15 text-whatsapp" },
  whatsapp_out: { icon: WhatsAppIcon, className: "bg-whatsapp/15 text-whatsapp" },
  stage_change: { icon: ArrowRightLeftIcon, className: "bg-chart-4/12 text-chart-4" },
  assignment: { icon: UserRoundCheckIcon, className: "bg-secondary text-secondary-foreground" },
  sla_breach: { icon: AlarmClockIcon, className: "bg-danger/12 text-danger" },
  system: { icon: InfoIcon, className: "bg-muted text-muted-foreground" },
};

function title({ activity: a, userName }: Item, owners: Map<string, string>): string {
  const who = userName ?? "Sistema";
  const meta = (a.meta ?? {}) as Record<string, string | undefined>;
  switch (a.type) {
    case "created":
      return `Lead criado via ${SOURCE_LABEL[(meta.source as Source) ?? "manual"]}${userName ? ` por ${userName}` : ""}`;
    case "note":
      return `${who} adicionou uma nota`;
    case "call":
      return `${who} registrou uma ligação`;
    case "whatsapp_in":
      return "Mensagem recebida no WhatsApp";
    case "whatsapp_out":
      return `${who} enviou WhatsApp`;
    case "stage_change": {
      const from = STAGE_META[meta.from as Stage]?.label ?? meta.from;
      const to = STAGE_META[meta.to as Stage]?.label ?? meta.to;
      return `${who} moveu de ${from} para ${to}${meta.lostReason ? ` (${meta.lostReason})` : ""}`;
    }
    case "assignment":
      return meta.ownerId ? `${who} atribuiu a ${owners.get(meta.ownerId) ?? "outro usuário"}` : `${who} removeu o responsável`;
    case "sla_breach":
      return "SLA estourado";
    default:
      return a.body && !userName ? a.body : `${who}: ${a.body ?? "atualização"}`;
  }
}

export function Timeline({ items, owners, now }: { items: Item[]; owners: Map<string, string>; now: number }) {
  if (!items.length) return <p className="text-sm text-muted-foreground">Sem atividades ainda.</p>;

  return (
    <ol className="relative grid gap-5 before:absolute before:top-2 before:bottom-2 before:left-4 before:w-px before:bg-border">
      {items.map((item) => {
        const { activity: a } = item;
        const { icon: Icon, className } = ICONS[a.type];
        const showBody = a.body && !["system", "sla_breach"].includes(a.type);
        const isMessage = a.type === "whatsapp_in" || a.type === "whatsapp_out";
        return (
          <li key={a.id} className="relative flex gap-3">
            <span className={cn("relative z-10 grid size-8 shrink-0 place-items-center rounded-full ring-4 ring-card", className)}>
              <Icon className="size-4" />
            </span>
            <div className="min-w-0 flex-1 pt-1">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                <p className="text-sm font-medium">{title(item, owners)}</p>
                <time className="text-xs text-muted-foreground" dateTime={a.createdAt.toISOString()} title={formatDateTime(a.createdAt)}>
                  {formatRelative(a.createdAt, now)}
                </time>
              </div>
              {showBody ? (
                <p
                  className={cn(
                    "mt-1.5 text-sm whitespace-pre-wrap",
                    isMessage
                      ? cn(
                          "w-fit max-w-prose rounded-2xl px-3 py-2",
                          a.type === "whatsapp_in" ? "rounded-tl-sm bg-muted" : "rounded-tr-sm bg-whatsapp/12",
                        )
                      : "text-muted-foreground",
                  )}
                >
                  {a.body}
                </p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
