import "server-only";
import { TZDate } from "@date-fns/tz";
import { and, asc, eq, gte, inArray, lt, or, sql, type SQL } from "drizzle-orm";
import { db, schema } from "@/db";
import { topCampaigns } from "@/lib/attribution";
import { OPEN_STAGES, SOURCES, STAGES, type Source, type Stage } from "@/lib/leads";
import type { SlaConfig } from "@/lib/sla/config";
import { firstResponseMetric } from "@/lib/sla/engine";

export const RANGES = { "7d": 7, "30d": 30, "90d": 90 } as const;
export type RangeKey = keyof typeof RANGES;

const DAY = 24 * 60 * 60 * 1000;

function dayKey(d: Date, tz: string) {
  const z = new TZDate(d.getTime(), tz);
  return `${z.getFullYear()}-${String(z.getMonth() + 1).padStart(2, "0")}-${String(z.getDate()).padStart(2, "0")}`;
}

/** Métricas do painel. `ownerId` restringe à carteira de um vendedor. */
export async function getDashboard(opts: { range: RangeKey; ownerId?: string; config: SlaConfig; now: number }) {
  const { config, now } = opts;
  const days = RANGES[opts.range];
  const tz = config.timezone;

  // Início do período = meia-noite (no fuso do negócio) de N-1 dias atrás.
  const today = new TZDate(now, tz);
  const start = new Date(new TZDate(today.getFullYear(), today.getMonth(), today.getDate() - (days - 1), tz).getTime());
  const prevStart = new Date(start.getTime() - days * DAY);

  const owner: SQL | undefined = opts.ownerId ? eq(schema.leads.ownerId, opts.ownerId) : undefined;
  const l = schema.leads;

  const [periodLeads, prevCount, closedInPeriod, openLeads, users] = await Promise.all([
    db.select().from(l).where(and(gte(l.createdAt, start), owner)),
    db
      .select({ n: sql<number>`count(*)` })
      .from(l)
      .where(and(gte(l.createdAt, prevStart), lt(l.createdAt, start), owner))
      .get(),
    db
      .select({ stage: l.stage, ownerId: l.ownerId, lostReason: l.lostReason, value: l.value })
      .from(l)
      .where(and(inArray(l.stage, ["won", "lost"]), gte(l.closedAt, start), owner)),
    db.select().from(l).where(and(inArray(l.stage, OPEN_STAGES), owner)),
    db.select({ id: schema.users.id, name: schema.users.name, active: schema.users.active }).from(schema.users).orderBy(asc(schema.users.name)),
  ]);

  // KPIs de primeira resposta (leads do período que já foram respondidos)
  const responses = periodLeads.map((lead) => firstResponseMetric(lead, config)).filter((m) => m !== null);
  const avgFirstResponse = responses.length ? responses.reduce((s, m) => s + m.minutes, 0) / responses.length : null;
  const slaCompliance = responses.length ? responses.filter((m) => m.met).length / responses.length : null;

  const won = closedInPeriod.filter((c) => c.stage === "won");
  const conversion = closedInPeriod.length ? won.length / closedInPeriod.length : null;

  // Série diária
  const perDay = new Map<string, number>();
  for (let i = 0; i < days; i++) perDay.set(dayKey(new Date(start.getTime() + i * DAY + 12 * 60 * 60 * 1000), tz), 0);
  for (const lead of periodLeads) {
    const k = dayKey(lead.createdAt, tz);
    perDay.set(k, (perDay.get(k) ?? 0) + 1);
  }

  const bySource = SOURCES.map((source) => ({
    source,
    count: periodLeads.filter((lead) => lead.source === source).length,
  }))
    .filter((s) => s.count > 0)
    .sort((a, b) => b.count - a.count) as { source: Source; count: number }[];

  const funnel = STAGES.filter((s) => OPEN_STAGES.includes(s)).map((stage) => {
    const items = openLeads.filter((lead) => lead.stage === stage);
    return { stage: stage as Stage, count: items.length, value: items.reduce((s, x) => s + x.value, 0) };
  });

  const lostReasons = Object.entries(
    closedInPeriod
      .filter((c) => c.stage === "lost")
      .reduce<Record<string, number>>((acc, c) => {
        const k = c.lostReason ?? "Outro";
        acc[k] = (acc[k] ?? 0) + 1;
        return acc;
      }, {}),
  )
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count);

  const ranking = users
    .map((u) => {
      const mine = periodLeads.filter((lead) => lead.ownerId === u.id);
      const myResponses = mine.map((lead) => firstResponseMetric(lead, config)).filter((m) => m !== null);
      const myClosed = closedInPeriod.filter((c) => c.ownerId === u.id);
      const myWon = myClosed.filter((c) => c.stage === "won");
      return {
        id: u.id,
        name: u.name,
        active: u.active,
        leads: mine.length,
        avgResponse: myResponses.length ? myResponses.reduce((s, m) => s + m.minutes, 0) / myResponses.length : null,
        slaMet: myResponses.length ? myResponses.filter((m) => m.met).length / myResponses.length : null,
        won: myWon.length,
        revenue: myWon.reduce((s, c) => s + c.value, 0),
        conversion: myClosed.length ? myWon.length / myClosed.length : null,
      };
    })
    .filter((r) => r.leads > 0 || r.won > 0)
    .sort((a, b) => b.revenue - a.revenue || b.won - a.won || b.leads - a.leads);

  return {
    range: opts.range,
    kpis: {
      newLeads: periodLeads.length,
      prevLeads: prevCount?.n ?? 0,
      avgFirstResponse,
      slaCompliance,
      conversion,
      wonCount: won.length,
      revenue: won.reduce((s, c) => s + c.value, 0),
      openValue: openLeads.reduce((s, x) => s + x.value, 0),
      breachedNow: openLeads.filter((x) => x.slaStatus === "breached").length,
      atRiskNow: openLeads.filter((x) => x.slaStatus === "at_risk").length,
      unassigned: openLeads.filter((x) => !x.ownerId).length,
    },
    perDay: [...perDay.entries()].map(([day, count]) => ({ day, count })),
    bySource,
    funnel,
    lostReasons,
    campaigns: topCampaigns(periodLeads),
    ranking,
  };
}

/** Fila "atender agora": leads abertos mais urgentes pelo SLA. */
export async function getAttentionQueue(ownerId: string | undefined, limit = 8) {
  const l = schema.leads;
  return db
    .select({ lead: l, ownerName: schema.users.name })
    .from(l)
    .leftJoin(schema.users, eq(l.ownerId, schema.users.id))
    .where(and(inArray(l.stage, OPEN_STAGES), or(eq(l.slaStatus, "breached"), eq(l.slaStatus, "at_risk"), eq(l.slaStatus, "ok")), ownerId ? eq(l.ownerId, ownerId) : undefined))
    .orderBy(sql`case ${l.slaStatus} when 'breached' then 0 when 'at_risk' then 1 else 2 end`, asc(l.slaDueAt))
    .limit(limit);
}
