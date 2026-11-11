import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/app/page-header";
import { cn } from "@/lib/utils";
import { requireUser } from "@/server/auth/dal";
import { requestNow } from "@/server/clock";
import { pipelineLeads } from "@/server/leads/queries";
import { sweepIfStale } from "@/server/sla/service";
import { Board, type BoardLead } from "./board";

export const metadata: Metadata = { title: "Pipeline" };

const VIEWS = [
  { value: "all", label: "Todos" },
  { value: "me", label: "Meus leads" },
];

export default async function PipelinePage(props: PageProps<"/pipeline">) {
  const user = await requireUser();
  const { owner } = await props.searchParams;
  const view = owner === "me" ? "me" : "all";
  await sweepIfStale();
  const rows = await pipelineLeads(view, user.id);
  const now = requestNow();

  const leads: BoardLead[] = rows.map(({ lead, ownerName }) => ({
    id: lead.id,
    name: lead.name,
    company: lead.company,
    stage: lead.stage,
    priority: lead.priority,
    value: lead.value,
    ownerName,
    phone: lead.phone,
    ageMs: now - lead.createdAt.getTime(),
    idleMs: now - (lead.lastActivityAt ?? lead.createdAt).getTime(),
    slaStatus: lead.slaStatus,
    slaKind: lead.slaKind,
    slaDueAt: lead.slaDueAt?.toISOString() ?? null,
  }));

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        eyebrow="Funil de vendas"
        title="Pipeline"
        description="Arraste os cards entre as etapas. Fechados dos últimos 30 dias ficam visíveis."
        actions={
          <div className="flex rounded-lg border p-0.5">
            {VIEWS.map((v) => (
              <Link
                key={v.value}
                href={v.value === "all" ? "/pipeline" : `/pipeline?owner=${v.value}`}
                aria-current={view === v.value ? "page" : undefined}
                className={cn(
                  "rounded-md px-3 py-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
                  view === v.value && "bg-secondary text-foreground",
                )}
              >
                {v.label}
              </Link>
            ))}
          </div>
        }
      />
      <Board leads={leads} />
    </div>
  );
}
