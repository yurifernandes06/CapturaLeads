import { ArrowLeftIcon, BuildingIcon, MailIcon, MegaphoneIcon, TagIcon, WalletIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { LiveRefresh } from "@/components/app/live-refresh";
import { PriorityBadge, WhatsAppIcon } from "@/components/leads/badges";
import { SlaIndicator } from "@/components/leads/sla-indicator";
import { Timeline } from "@/components/leads/timeline";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDateTime, formatDuration, formatRelative, initials } from "@/lib/format";
import { SOURCE_LABEL, STAGE_META } from "@/lib/leads";
import { formatPhone, whatsappLink } from "@/lib/phone";
import { evaluateSla } from "@/lib/sla/engine";
import { suggestedDueAt, toLocalDateTime } from "@/lib/tasks";
import { cn } from "@/lib/utils";
import { requireUser } from "@/server/auth/dal";
import { requestNow } from "@/server/clock";
import { getLead, listOwners } from "@/server/leads/queries";
import { getSetting } from "@/server/settings";
import { listLeadTasks, toTaskView } from "@/server/tasks";
import { whatsapp } from "@/server/whatsapp";
import { ActivityComposer } from "./activity-composer";
import { DeleteLeadButton, EditLeadButton, OwnerSelect, StageControl } from "./lead-controls";
import { LeadTasks } from "./lead-tasks";
import { WhatsAppComposer } from "./whatsapp-composer";

export const metadata: Metadata = { title: "Lead" };

export default async function LeadPage(props: PageProps<"/leads/[id]">) {
  const user = await requireUser();
  const { id } = await props.params;
  const [data, owners, slaConfig, templates, taskRows] = await Promise.all([
    getLead(id),
    listOwners(),
    getSetting("sla"),
    getSetting("whatsappTemplates"),
    listLeadTasks(id),
  ]);
  if (!data) notFound();

  const { lead, ownerName, activities } = data;
  const now = requestNow();
  const ownerMap = new Map(owners.map((o) => [o.id, o.name]));
  const firstName = lead.name.split(" ")[0];
  const sla = evaluateSla(lead, slaConfig, new Date(now));
  const tz = slaConfig.timezone;
  const tasks = taskRows.map(({ task, assigneeName }) => toTaskView(task, { now, timezone: tz, user }, { assigneeName }));

  return (
    <div className="grid gap-6">
      <LiveRefresh lead={lead.id} />
      <div>
        <Link
          href="/leads"
          className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeftIcon className="size-4" /> Leads
        </Link>
        <div className="relative flex flex-wrap items-center justify-between gap-4 overflow-hidden rounded-2xl border bg-card p-5 sm:p-6">
          <div aria-hidden className="pointer-events-none absolute -top-24 -left-24 size-72 rounded-full bg-primary/15 blur-3xl" />
          <div className="relative flex min-w-0 items-center gap-4">
            <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-primary font-heading text-lg font-semibold text-primary-foreground shadow-[0_10px_30px_-12px_var(--primary)]">
              {initials(lead.name)}
            </span>
          <div className="min-w-0">
            <p className="mb-1 flex items-center gap-2 eyebrow">
              <span className={cn("size-1.5 rounded-full", STAGE_META[lead.stage].dot)} />
              {STAGE_META[lead.stage].label}
            </p>
            <div className="flex items-center gap-2">
              <h1 className="truncate font-heading text-2xl font-semibold tracking-tight">{lead.name}</h1>
              <EditLeadButton
                leadId={lead.id}
                defaults={{
                  name: lead.name,
                  phone: lead.phone ? formatPhone(lead.phone) : "",
                  email: lead.email ?? "",
                  company: lead.company ?? "",
                  priority: lead.priority,
                  source: lead.source,
                  value: lead.value ? (lead.value / 100).toFixed(2).replace(".", ",") : "",
                  tags: lead.tags.join(", "),
                }}
              />
              {user.role === "admin" ? <DeleteLeadButton leadId={lead.id} name={lead.name} /> : null}
            </div>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              <PriorityBadge priority={lead.priority} />
              <span>Entrou {formatRelative(lead.createdAt, now)} via {SOURCE_LABEL[lead.source]}</span>
            </p>
          </div>
          </div>
          <div className="relative flex flex-wrap items-center gap-2">
            {lead.phone ? (
              <Button
                variant="outline"
                className="border-whatsapp/40 text-whatsapp hover:bg-whatsapp/10 hover:text-whatsapp"
                nativeButton={false}
                render={<a href={whatsappLink(lead.phone, `Olá, ${firstName}!`)} target="_blank" rel="noreferrer" />}
              >
                <WhatsAppIcon /> Abrir conversa
              </Button>
            ) : null}
            <StageControl leadId={lead.id} stage={lead.stage} />
          </div>
        </div>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="grid gap-6" aria-label="Atividades">
          <ActivityComposer
            leadId={lead.id}
            extraTabs={[
              {
                id: "whatsapp",
                label: "WhatsApp",
                icon: <WhatsAppIcon />,
                content: (
                  <WhatsAppComposer
                    leadId={lead.id}
                    hasPhone={Boolean(lead.phone)}
                    templates={templates}
                    vars={{ nome: lead.name, empresa: lead.company, vendedor: ownerName ?? user.name }}
                    providerLabel={whatsapp().label}
                  />
                ),
              },
            ]}
          />
          <Card>
            <CardHeader>
              <CardTitle>Histórico</CardTitle>
            </CardHeader>
            <CardContent>
              <Timeline items={activities} owners={ownerMap} now={now} />
            </CardContent>
          </Card>
        </section>

        <aside className="grid gap-6 lg:sticky lg:top-20">
          <Card className={cn(sla.status === "breached" && "ring-danger/40", sla.status === "at_risk" && "ring-warning/40")}>
            <CardHeader>
              <CardTitle>SLA</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm">
              {sla.kind ? (
                <>
                  <SlaIndicator
                    status={sla.status}
                    kind={sla.kind}
                    dueAt={sla.dueAt.toISOString()}
                    paused={sla.paused}
                  />
                  <div className="grid gap-2">
                    <Milestone label="Prazo" date={sla.dueAt} />
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">Consumido</span>
                      <span className="tabular">
                        {formatDuration(sla.elapsedMinutes)} de {formatDuration(sla.targetMinutes)}
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          sla.status === "breached" ? "bg-danger" : sla.status === "at_risk" ? "bg-warning" : "bg-success",
                        )}
                        style={{ width: `${Math.min(100, (sla.elapsedMinutes / sla.targetMinutes) * 100)}%` }}
                      />
                    </div>
                    {sla.paused ? (
                      <p className="text-xs text-muted-foreground">Fora do expediente: o relógio do SLA está pausado.</p>
                    ) : null}
                  </div>
                </>
              ) : (
                <p className="text-muted-foreground">Lead fechado, sem SLA ativo.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tarefas</CardTitle>
            </CardHeader>
            <CardContent>
              <LeadTasks
                leadId={lead.id}
                tasks={tasks}
                defaultDue={toLocalDateTime(suggestedDueAt(now, tz, slaConfig.businessHours.start), tz)}
                currentUserId={user.id}
                owners={owners.filter((o) => o.active).map(({ id, name }) => ({ id, name }))}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Responsável</CardTitle>
            </CardHeader>
            <CardContent>
              <OwnerSelect
                leadId={lead.id}
                ownerId={lead.ownerId}
                owners={owners.filter((o) => o.active || o.id === lead.ownerId).map(({ id, name }) => ({ id, name }))}
              />
              {!ownerName ? <p className="mt-2 text-xs text-warning">Este lead ainda não tem dono.</p> : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Dados do lead</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm">
              <Detail icon={<WhatsAppIcon className="size-4" />} label="WhatsApp">
                {lead.phone ? formatPhone(lead.phone) : "—"}
              </Detail>
              <Detail icon={<MailIcon />} label="E-mail">
                {lead.email ? (
                  <a href={`mailto:${lead.email}`} className="hover:text-primary">
                    {lead.email}
                  </a>
                ) : (
                  "—"
                )}
              </Detail>
              <Detail icon={<BuildingIcon />} label="Empresa">
                {lead.company ?? "—"}
              </Detail>
              <Detail icon={<WalletIcon />} label="Valor estimado">
                <span className="tabular">{lead.value ? formatCurrency(lead.value) : "—"}</span>
              </Detail>
              <Detail icon={<TagIcon />} label="Tags">
                {lead.tags.length ? (
                  <span className="flex flex-wrap gap-1">
                    {lead.tags.map((t) => (
                      <Link
                        key={t}
                        href={`/leads?tag=${encodeURIComponent(t)}`}
                        className="rounded-md bg-white/[0.06] px-1.5 py-0.5 text-xs ring-1 ring-white/[0.06] hover:bg-primary/15 hover:ring-primary/30"
                      >
                        {t}
                      </Link>
                    ))}
                  </span>
                ) : (
                  "—"
                )}
              </Detail>
              {lead.utmSource || lead.utmCampaign ? (
                <Detail icon={<MegaphoneIcon />} label="Campanha">
                  {[lead.utmSource, lead.utmMedium, lead.utmCampaign].filter(Boolean).join(" / ")}
                </Detail>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Marcos de contato</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 text-sm">
              <Milestone label="Primeira resposta" date={lead.firstResponseAt} />
              <Milestone label="Última mensagem do lead" date={lead.lastInboundAt} />
              <Milestone label="Último contato do time" date={lead.lastOutboundAt} />
              <Milestone label="Fechado em" date={lead.closedAt} />
              {lead.lostReason ? (
                <p className="text-muted-foreground">
                  Motivo da perda: <span className="text-foreground">{lead.lostReason}</span>
                </p>
              ) : null}
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function Detail({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 text-muted-foreground [&_svg]:size-4">{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="eyebrow">{label}</div>
        <div className="break-words">{children}</div>
      </div>
    </div>
  );
}

function Milestone({ label, date }: { label: string; date: Date | null }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular text-right">{date ? formatDateTime(date) : "—"}</span>
    </div>
  );
}
