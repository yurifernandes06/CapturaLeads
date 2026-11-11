"use client";

import { AlarmClockIcon, PauseIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { formatDuration } from "@/lib/format";
import { SLA_KIND_LABEL, SLA_STATUS_META, type SlaKind, type SlaStatus } from "@/lib/sla/config";
import { cn } from "@/lib/utils";

/**
 * Contagem regressiva do SLA. O status vem do servidor (motor); aqui só
 * atualizamos o texto do tempo a cada 30 s para a tela não ficar velha.
 */
export function SlaIndicator({
  status,
  kind,
  dueAt,
  compact,
  paused,
}: {
  status: SlaStatus;
  kind: SlaKind | null;
  dueAt: string | null;
  compact?: boolean;
  paused?: boolean;
}) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const update = () => setNow(Date.now());
    const first = setTimeout(update, 0);
    const id = setInterval(update, 30_000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, []);

  if (status === "none" || !dueAt || !kind) {
    return compact ? <span className="text-xs text-muted-foreground">—</span> : null;
  }

  const meta = SLA_STATUS_META[status];
  const diffMin = now === null ? null : (new Date(dueAt).getTime() - now) / 60_000;
  const live = diffMin !== null && diffMin < 0 ? "breached" : status;
  const liveMeta = SLA_STATUS_META[live];
  const timeText =
    diffMin === null ? meta.label : diffMin >= 0 ? `vence em ${formatDuration(diffMin)}` : `atrasado ${formatDuration(-diffMin)}`;

  return (
    <span
      title={`${SLA_KIND_LABEL[kind]} · ${liveMeta.label}`}
      className={cn(
        "inline-flex h-5.5 items-center gap-1 rounded-full px-2 text-xs font-medium whitespace-nowrap tabular",
        liveMeta.className,
        live === "breached" && "motion-safe:animate-[pulse_2.5s_ease-in-out_infinite]",
      )}
    >
      {paused ? <PauseIcon className="size-3" /> : <AlarmClockIcon className="size-3" />}
      {compact ? timeText : `${SLA_KIND_LABEL[kind]} · ${timeText}`}
    </span>
  );
}
