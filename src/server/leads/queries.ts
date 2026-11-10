import "server-only";
import { TZDate } from "@date-fns/tz";
import { and, asc, count, desc, eq, gte, inArray, isNull, like, lt, or, sql, type SQL } from "drizzle-orm";
import { db, schema } from "@/db";
import type { LeadFilters } from "@/lib/lead-filters";
import { OPEN_STAGES } from "@/lib/leads";

export const PAGE_SIZE = 25;
export const DEFAULT_TIMEZONE = "America/Sao_Paulo";

const priorityRank = sql`case ${schema.leads.priority} when 'high' then 0 when 'medium' then 1 else 2 end`;

function dayStart(date: string, tz: string) {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  return new Date(new TZDate(y, m - 1, d, tz).getTime());
}

export function buildLeadWhere(filters: LeadFilters, currentUserId: string, tz = DEFAULT_TIMEZONE) {
  const l = schema.leads;
  const conds: SQL[] = [];

  if (filters.q) {
    const term = `%${filters.q.replace(/[%_]/g, "")}%`;
    const digits = filters.q.replace(/\D/g, "");
    const ors = [like(l.name, term), like(l.email, term), like(l.company, term), like(l.utmCampaign, term)];
    if (digits.length >= 4) ors.push(like(l.phone, `%${digits}%`));
    conds.push(or(...ors)!);
  }
  if (filters.stage === "open") conds.push(inArray(l.stage, OPEN_STAGES));
  else if (filters.stage) conds.push(eq(l.stage, filters.stage));
  if (filters.source) conds.push(eq(l.source, filters.source));
  if (filters.priority) conds.push(eq(l.priority, filters.priority));
  if (filters.owner === "me") conds.push(eq(l.ownerId, currentUserId));
  else if (filters.owner === "none") conds.push(isNull(l.ownerId));
  else if (filters.owner) conds.push(eq(l.ownerId, filters.owner));
  if (filters.sla) conds.push(eq(l.slaStatus, filters.sla));
  if (filters.tag) conds.push(sql`exists (select 1 from json_each(${l.tags}) as je where je.value = ${filters.tag})`);
  if (filters.from) conds.push(gte(l.createdAt, dayStart(filters.from, tz)));
  if (filters.to) {
    const end = dayStart(filters.to, tz);
    end.setTime(end.getTime() + 24 * 60 * 60 * 1000);
    conds.push(lt(l.createdAt, end));
  }
  return conds.length ? and(...conds) : undefined;
}

function orderBy(sort: LeadFilters["sort"]) {
  const l = schema.leads;
  switch (sort) {
    case "oldest":
      return [asc(l.createdAt)];
    case "value":
      return [desc(l.value), desc(l.createdAt)];
    case "name":
      return [asc(sql`${l.name} collate nocase`)];
    case "sla":
      return [
        sql`case ${l.slaStatus} when 'breached' then 0 when 'at_risk' then 1 when 'ok' then 2 else 3 end`,
        sql`${l.slaDueAt} is null`,
        asc(l.slaDueAt),
      ];
    case "activity":
      return [asc(sql`coalesce(${l.lastActivityAt}, ${l.createdAt})`)];
    default:
      return [desc(l.createdAt)];
  }
}

export async function listLeads(filters: LeadFilters, currentUserId: string) {
  const where = buildLeadWhere(filters, currentUserId);
  const page = filters.page ?? 1;

  const [rows, [totals]] = await Promise.all([
    db
      .select({ lead: schema.leads, ownerName: schema.users.name })
      .from(schema.leads)
      .leftJoin(schema.users, eq(schema.leads.ownerId, schema.users.id))
      .where(where)
      .orderBy(...orderBy(filters.sort))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db.select({ total: count() }).from(schema.leads).where(where),
  ]);

  const total = totals?.total ?? 0;
  return { rows, total, page, pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

/** Lista para exportação (sem paginação, com teto de segurança). */
export async function exportLeads(filters: LeadFilters, currentUserId: string) {
  return db
    .select({ lead: schema.leads, ownerName: schema.users.name })
    .from(schema.leads)
    .leftJoin(schema.users, eq(schema.leads.ownerId, schema.users.id))
    .where(buildLeadWhere(filters, currentUserId))
    .orderBy(...orderBy(filters.sort))
    .limit(10_000);
}

export async function getLead(id: string) {
  const row = await db
    .select({ lead: schema.leads, ownerName: schema.users.name })
    .from(schema.leads)
    .leftJoin(schema.users, eq(schema.leads.ownerId, schema.users.id))
    .where(eq(schema.leads.id, id))
    .get();
  if (!row) return null;

  const activities = await db
    .select({ activity: schema.activities, userName: schema.users.name })
    .from(schema.activities)
    .leftJoin(schema.users, eq(schema.activities.userId, schema.users.id))
    .where(eq(schema.activities.leadId, id))
    .orderBy(desc(schema.activities.createdAt))
    .limit(300);

  return { ...row, activities };
}

export async function listOwners() {
  return db
    .select({ id: schema.users.id, name: schema.users.name, active: schema.users.active })
    .from(schema.users)
    .orderBy(asc(schema.users.name));
}

export async function listTags() {
  const rows = await db.all<{ tag: string; n: number }>(
    sql`select je.value as tag, count(*) as n from leads, json_each(leads.tags) as je group by je.value order by n desc limit 50`,
  );
  return rows.map((r) => r.tag);
}

export async function pipelineLeads(ownerFilter: string | undefined, currentUserId: string) {
  const conds: SQL[] = [];
  if (ownerFilter === "me") conds.push(eq(schema.leads.ownerId, currentUserId));
  else if (ownerFilter && ownerFilter !== "all") conds.push(eq(schema.leads.ownerId, ownerFilter));
  // Fechados aparecem só se movidos nos últimos 30 dias, para o quadro não crescer sem fim.
  const recent = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  conds.push(or(inArray(schema.leads.stage, OPEN_STAGES), gte(schema.leads.closedAt, recent))!);

  return db
    .select({ lead: schema.leads, ownerName: schema.users.name })
    .from(schema.leads)
    .leftJoin(schema.users, eq(schema.leads.ownerId, schema.users.id))
    .where(and(...conds))
    .orderBy(priorityRank, desc(schema.leads.createdAt))
    .limit(500);
}
