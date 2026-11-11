"use client";

import Link from "next/link";
import { useOptimistic, useState, useTransition } from "react";
import { toast } from "sonner";
import { PriorityBadge, WhatsAppIcon } from "@/components/leads/badges";
import { LostReasonDialog } from "@/components/leads/lost-reason-dialog";
import { SlaIndicator } from "@/components/leads/sla-indicator";
import { formatCurrency, formatDuration } from "@/lib/format";
import { STAGES, STAGE_META, type Priority, type Stage } from "@/lib/leads";
import { whatsappLink } from "@/lib/phone";
import type { SlaKind, SlaStatus } from "@/lib/sla/config";
import { cn } from "@/lib/utils";
import { moveStageAction } from "../leads/actions";

export type BoardLead = {
  id: string;
  name: string;
  company: string | null;
  stage: Stage;
  priority: Priority;
  value: number;
  ownerName: string | null;
  phone: string | null;
  ageMs: number;
  idleMs: number;
  slaStatus: SlaStatus;
  slaKind: SlaKind | null;
  slaDueAt: string | null;
};

type Move = { id: string; stage: Stage };

export function Board({ leads }: { leads: BoardLead[] }) {
  const [, startTransition] = useTransition();
  const [optimistic, applyMove] = useOptimistic(leads, (state, move: Move) =>
    state.map((l) => (l.id === move.id ? { ...l, stage: move.stage } : l)),
  );
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<Stage | null>(null);
  // Soltar em "Perdido" só move depois que o motivo for escolhido; cancelar deixa o card onde estava.
  const [losing, setLosing] = useState<BoardLead | null>(null);

  const move = (id: string, stage: Stage, lostReason?: string) => {
    const lead = optimistic.find((l) => l.id === id);
    if (!lead || lead.stage === stage) return;
    if (stage === "lost" && !lostReason) {
      setLosing(lead);
      return;
    }
    startTransition(async () => {
      applyMove({ id, stage });
      const res = await moveStageAction(id, stage, lostReason);
      if (!res.ok) toast.error(res.error);
      else if (stage === "won") toast.success(`${lead.name}: venda ganha! 🎉`);
      else if (stage === "lost") toast(`${lead.name} marcado como perdido (${lostReason}).`);
    });
  };

  return (
    <div className="-mx-4 flex flex-1 snap-x gap-3 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:px-6">
      <LostReasonDialog
        key={losing?.id}
        open={Boolean(losing)}
        leadName={losing?.name}
        onOpenChange={(open) => !open && setLosing(null)}
        onConfirm={(reason) => losing && move(losing.id, "lost", reason)}
      />
      {STAGES.map((stage) => {
        const items = optimistic.filter((l) => l.stage === stage);
        const total = items.reduce((sum, l) => sum + l.value, 0);
        return (
          <section
            key={stage}
            aria-label={STAGE_META[stage].label}
            onDragOver={(e) => {
              e.preventDefault();
              setOver(stage);
            }}
            onDragLeave={() => setOver((s) => (s === stage ? null : s))}
            onDrop={(e) => {
              e.preventDefault();
              setOver(null);
              const id = e.dataTransfer.getData("text/plain");
              if (id) move(id, stage);
            }}
            className={cn(
              "flex w-72 shrink-0 snap-start flex-col rounded-xl border bg-black/50 transition-colors",
              over === stage && dragging && "border-primary/60 bg-primary/[0.06] shadow-[0_0_40px_-20px_var(--primary)]",
            )}
          >
            <header className="flex items-center justify-between gap-2 border-b border-border/60 px-3 py-3">
              <div className="flex items-center gap-2">
                <span className={cn("size-2 rounded-full", STAGE_META[stage].dot)} />
                <h2 className="font-heading text-sm font-semibold">{STAGE_META[stage].label}</h2>
                <span className="rounded-md bg-white/[0.06] px-1.5 font-mono text-[0.7rem] text-muted-foreground tabular">{items.length}</span>
              </div>
              {total ? <span className="text-xs text-muted-foreground tabular">{formatCurrency(total)}</span> : null}
            </header>
            <div className="flex min-h-32 flex-1 flex-col gap-2 overflow-y-auto p-2">
              {items.map((lead) => (
                <article
                  key={lead.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData("text/plain", lead.id);
                    e.dataTransfer.effectAllowed = "move";
                    setDragging(lead.id);
                  }}
                  onDragEnd={() => setDragging(null)}
                  className={cn(
                    "group cursor-grab rounded-lg border bg-card p-3 shadow-[inset_0_1px_0_oklch(1_0_0/4%)] transition-all hover:border-white/15 hover:bg-[color-mix(in_oklch,var(--card),white_3%)] active:cursor-grabbing",
                    dragging === lead.id && "opacity-50",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <Link href={`/leads/${lead.id}`} className="min-w-0 font-medium hover:text-primary-text">
                      <span className="line-clamp-2 text-sm">{lead.name}</span>
                    </Link>
                    <PriorityBadge priority={lead.priority} showLabel={false} />
                  </div>
                  {lead.company ? <p className="mt-0.5 truncate text-xs text-muted-foreground">{lead.company}</p> : null}
                  <div className="mt-3 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span className="truncate">{lead.ownerName ?? "Sem responsável"}</span>
                    <div className="flex items-center gap-2">
                      {lead.value ? <span className="tabular text-foreground">{formatCurrency(lead.value)}</span> : null}
                      {lead.phone ? (
                        <a
                          href={whatsappLink(lead.phone)}
                          target="_blank"
                          rel="noreferrer"
                          aria-label={`WhatsApp de ${lead.name}`}
                          className="hover:text-whatsapp"
                        >
                          <WhatsAppIcon className="size-3.5" />
                        </a>
                      ) : null}
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-muted-foreground/80">Parado há {formatDuration(lead.idleMs / 60000)}</span>
                    {lead.slaStatus === "at_risk" || lead.slaStatus === "breached" ? (
                      <SlaIndicator compact status={lead.slaStatus} kind={lead.slaKind} dueAt={lead.slaDueAt} />
                    ) : null}
                  </div>
                </article>
              ))}
              {!items.length ? (
                <p className="grid flex-1 place-items-center rounded-lg border border-dashed py-6 text-xs text-muted-foreground">
                  Solte um lead aqui
                </p>
              ) : null}
            </div>
          </section>
        );
      })}
    </div>
  );
}
