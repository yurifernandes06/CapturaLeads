import {
  AlarmClockIcon,
  ArrowDownRightIcon,
  ArrowUpRightIcon,
  CircleAlertIcon,
  TimerIcon,
  TrophyIcon,
  UserRoundXIcon,
  UsersRoundIcon,
  type LucideIcon,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { PageHeader } from "@/components/app/page-header";
import { BarList, ColumnChart } from "@/components/charts";
import { PriorityBadge } from "@/components/leads/badges";
import { SlaIndicator } from "@/components/leads/sla-indicator";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDuration } from "@/lib/format";
import { SOURCE_LABEL, STAGE_META } from "@/lib/leads";
import { cn } from "@/lib/utils";
import { requireUser } from "@/server/auth/dal";
import { requestNow } from "@/server/clock";
import { RANGES, getAttentionQueue, getDashboard, type RangeKey } from "@/server/dashboard";
import { getSetting } from "@/server/settings";
import { sweepIfStale } from "@/server/sla/service";

export const metadata: Metadata = { title: "Dashboard" };

const pct = (v: number | null) => (v === null ? "—" : `${Math.round(v * 100)}%`);

export default async function DashboardPage(props: PageProps<"/dashboard">) {
  const user = await requireUser();
  const sp = await props.searchParams;
  const range: RangeKey = typeof sp.range === "string" && sp.range in RANGES ? (sp.range as RangeKey) : "30d";
  // Vendedor começa na própria carteira; admin começa na visão do time.
  const scope = sp.scope === "team" || sp.scope === "me" ? sp.scope : user.role === "admin" ? "team" : "me";
  const ownerId = scope === "me" ? user.id : undefined;

  await sweepIfStale();
  const config = await getSetting("sla");
  const now = requestNow();
  const [data, queue] = await Promise.all([getDashboard({ range, ownerId, config, now }), getAttentionQueue(ownerId)]);
  const { kpis } = data;

  const delta = kpis.prevLeads ? (kpis.newLeads - kpis.prevLeads) / kpis.prevLeads : null;
  const href = (patch: Record<string, string>) => `/dashboard?${new URLSearchParams({ range, scope, ...patch })}`;
  const ownerParam = scope === "me" ? "&owner=me" : "";
  const tickEvery = Math.ceil(data.perDay.length / 8);

  return (
    <div className="grid gap-6">
      <PageHeader
        title={`Olá, ${user.name.split(" ")[0]}`}
        description={scope === "me" ? "Sua carteira de leads." : "Visão do time inteiro."}
        actions={
          <>
            <Segmented
              items={[
                { label: "Minha carteira", href: href({ scope: "me" }), active: scope === "me" },
                { label: "Time", href: href({ scope: "team" }), active: scope === "team" },
              ]}
            />
            <Segmented
              items={Object.keys(RANGES).map((r) => ({
                label: r.replace("d", " dias"),
                href: href({ range: r }),
                active: r === range,
              }))}
            />
          </>
        }
      />

      {kpis.breachedNow || kpis.atRiskNow || kpis.unassigned ? (
        <div className="flex flex-wrap gap-2">
          {kpis.breachedNow ? (
            <AlertPill
              href={`/leads?sla=breached&sort=sla${ownerParam}`}
              icon={AlarmClockIcon}
              className="border-danger/30 bg-danger/8 text-danger"
            >
              {kpis.breachedNow} {kpis.breachedNow === 1 ? "lead com SLA estourado" : "leads com SLA estourado"}
            </AlertPill>
          ) : null}
          {kpis.atRiskNow ? (
            <AlertPill
              href={`/leads?sla=at_risk&sort=sla${ownerParam}`}
              icon={CircleAlertIcon}
              className="border-warning/30 bg-warning/10 text-warning"
            >
              {kpis.atRiskNow} em risco
            </AlertPill>
          ) : null}
          {kpis.unassigned && scope === "team" ? (
            <AlertPill href="/leads?owner=none&stage=open" icon={UserRoundXIcon} className="bg-muted text-muted-foreground">
              {kpis.unassigned} sem responsável
            </AlertPill>
          ) : null}
        </div>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Indicadores">
        <StatTile
          icon={UsersRoundIcon}
          label="Leads novos"
          value={String(kpis.newLeads)}
          foot={
            delta === null ? (
              "sem base de comparação"
            ) : (
              <span className={cn("inline-flex items-center gap-0.5", delta >= 0 ? "text-success" : "text-danger")}>
                {delta >= 0 ? <ArrowUpRightIcon className="size-3.5" /> : <ArrowDownRightIcon className="size-3.5" />}
                {Math.abs(Math.round(delta * 100))}% vs. período anterior
              </span>
            )
          }
        />
        <StatTile
          icon={TimerIcon}
          label="1ª resposta média"
          value={kpis.avgFirstResponse === null ? "—" : formatDuration(kpis.avgFirstResponse)}
          foot="em horário comercial"
        />
        <StatTile
          icon={AlarmClockIcon}
          label="SLA de 1ª resposta cumprido"
          value={pct(kpis.slaCompliance)}
          foot="dos leads respondidos no período"
          tone={kpis.slaCompliance === null ? undefined : kpis.slaCompliance >= 0.9 ? "good" : kpis.slaCompliance >= 0.7 ? "warn" : "bad"}
        />
        <StatTile
          icon={TrophyIcon}
          label="Conversão"
          value={pct(kpis.conversion)}
          foot={`${kpis.wonCount} ${kpis.wonCount === 1 ? "venda" : "vendas"} · ${formatCurrency(kpis.revenue)}`}
        />
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Atender agora</CardTitle>
            <CardDescription>Leads abertos ordenados pela urgência do SLA.</CardDescription>
            <CardAction>
              <Link href={`/leads?stage=open&sort=sla${ownerParam}`} className="text-sm font-medium text-primary hover:underline">
                Ver fila
              </Link>
            </CardAction>
          </CardHeader>
          <CardContent>
            {queue.length ? (
              <ul className="-mx-2 grid">
                {queue.map(({ lead, ownerName }) => (
                  <li key={lead.id}>
                    <Link
                      href={`/leads/${lead.id}`}
                      className="flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-muted/60"
                    >
                      <PriorityBadge priority={lead.priority} showLabel={false} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{lead.name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {STAGE_META[lead.stage].label} · {ownerName ?? "sem responsável"}
                        </p>
                      </div>
                      <SlaIndicator
                        compact
                        status={lead.slaStatus}
                        kind={lead.slaKind}
                        dueAt={lead.slaDueAt?.toISOString() ?? null}
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-10 text-center text-sm text-muted-foreground">Fila vazia. Bom trabalho! 🎉</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Leads por dia</CardTitle>
            <CardDescription>Entradas nos últimos {RANGES[range]} dias.</CardDescription>
          </CardHeader>
          <CardContent>
            <ColumnChart
              label="Leads novos por dia"
              data={data.perDay.map((d) => ({ key: d.day, value: d.count }))}
              formatTick={(key, i) =>
                i % tickEvery === 0 || i === data.perDay.length - 1 ? key.split("-").reverse().slice(0, 2).join("/") : null
              }
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Funil aberto</CardTitle>
            <CardDescription>Leads em andamento por etapa, agora.</CardDescription>
          </CardHeader>
          <CardContent>
            <BarList
              items={data.funnel.map((f) => ({
                label: STAGE_META[f.stage].label,
                value: f.count,
                hint: f.value ? formatCurrency(f.value) : undefined,
                href: `/leads?stage=${f.stage}${ownerParam}`,
              }))}
            />
            <p className="mt-4 text-xs text-muted-foreground">
              Pipeline aberto: <span className="font-medium text-foreground tabular">{formatCurrency(kpis.openValue)}</span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Origem dos leads</CardTitle>
            <CardDescription>De onde vieram no período.</CardDescription>
          </CardHeader>
          <CardContent>
            <BarList
              items={data.bySource.map((s) => ({
                label: SOURCE_LABEL[s.source],
                value: s.count,
                hint: kpis.newLeads ? `${Math.round((s.count / kpis.newLeads) * 100)}%` : undefined,
                href: `/leads?source=${s.source}${ownerParam}`,
              }))}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Motivos de perda</CardTitle>
            <CardDescription>Leads perdidos no período.</CardDescription>
          </CardHeader>
          <CardContent>
            <BarList items={data.lostReasons.map((r) => ({ label: r.reason, value: r.count }))} />
          </CardContent>
        </Card>
      </div>

      {scope === "team" ? (
        <Card className="gap-0 pb-0">
          <CardHeader className="pb-4">
            <CardTitle>Desempenho por vendedor</CardTitle>
            <CardDescription>Leads recebidos no período, velocidade de resposta e resultado.</CardDescription>
          </CardHeader>
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="pl-4">Vendedor</TableHead>
                <TableHead className="text-right">Leads</TableHead>
                <TableHead className="text-right">1ª resposta</TableHead>
                <TableHead className="hidden text-right sm:table-cell">SLA cumprido</TableHead>
                <TableHead className="text-right">Vendas</TableHead>
                <TableHead className="hidden text-right md:table-cell">Conversão</TableHead>
                <TableHead className="pr-4 text-right">Receita</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.ranking.length ? (
                data.ranking.map((r, i) => (
                  <TableRow key={r.id}>
                    <TableCell className="pl-4 font-medium">
                      <span className="mr-2 inline-block w-4 text-muted-foreground tabular">{i + 1}</span>
                      {r.name}
                      {!r.active ? <span className="ml-2 text-xs text-muted-foreground">(inativo)</span> : null}
                    </TableCell>
                    <TableCell className="text-right tabular">{r.leads}</TableCell>
                    <TableCell className="text-right tabular">{r.avgResponse === null ? "—" : formatDuration(r.avgResponse)}</TableCell>
                    <TableCell className="hidden text-right tabular sm:table-cell">{pct(r.slaMet)}</TableCell>
                    <TableCell className="text-right tabular">{r.won}</TableCell>
                    <TableCell className="hidden text-right tabular md:table-cell">{pct(r.conversion)}</TableCell>
                    <TableCell className="pr-4 text-right font-medium tabular">{formatCurrency(r.revenue)}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                    Sem atividade no período.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      ) : null}
    </div>
  );
}

function Segmented({ items }: { items: { label: string; href: string; active: boolean }[] }) {
  return (
    <div className="flex rounded-lg border bg-card p-0.5">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={item.active ? "page" : undefined}
          className={cn(
            "rounded-md px-3 py-1 text-sm font-medium whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground",
            item.active && "bg-secondary text-foreground",
          )}
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
  foot,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  foot: ReactNode;
  tone?: "good" | "warn" | "bad";
}) {
  return (
    <Card className="gap-3">
      <CardContent className="grid gap-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm text-muted-foreground">{label}</span>
          <span className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary">
            <Icon className="size-4" />
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-3xl font-semibold tracking-tight tabular">{value}</span>
          {tone ? (
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-xs font-medium",
                tone === "good" && "bg-success/12 text-success",
                tone === "warn" && "bg-warning/15 text-warning",
                tone === "bad" && "bg-danger/12 text-danger",
              )}
            >
              {tone === "good" ? "saudável" : tone === "warn" ? "atenção" : "crítico"}
            </span>
          ) : null}
        </div>
        <p className="text-xs text-muted-foreground">{foot}</p>
      </CardContent>
    </Card>
  );
}

function AlertPill({
  href,
  icon: Icon,
  className,
  children,
}: {
  href: string;
  icon: LucideIcon;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn("inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-sm font-medium transition-opacity hover:opacity-80", className)}
    >
      <Icon className="size-4" />
      {children}
    </Link>
  );
}
