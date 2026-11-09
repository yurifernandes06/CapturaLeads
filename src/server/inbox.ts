import "server-only";
import { and, count, desc, eq, gt, inArray, isNotNull, isNull, max, notInArray, or, sql, type SQL } from "drizzle-orm";
import { db, schema } from "@/db";
import type { InboxFilter } from "@/lib/inbox";

/** Conversas = leads com mensagens de WhatsApp. Consultas do inbox. */
const a = schema.activities;
const l = schema.leads;
const MESSAGE_TYPES = ["whatsapp_in", "whatsapp_out"] as const;
const CLOSED = ["won", "lost"] as const;

/** Mesma regra de `isAwaitingReply`, em SQL, para filtrar e contar no banco. */
const awaitingSql = () =>
  and(
    notInArray(l.stage, [...CLOSED]),
    isNotNull(l.lastInboundAt),
    or(isNull(l.lastOutboundAt), gt(l.lastInboundAt, l.lastOutboundAt)),
  )!;

export async function listConversations({ filter, userId, limit = 100 }: { filter: InboxFilter; userId: string; limit?: number }) {
  const last = db
    .select({ leadId: a.leadId, lastAt: max(a.createdAt).as("last_at") })
    .from(a)
    .where(inArray(a.type, [...MESSAGE_TYPES]))
    .groupBy(a.leadId)
    .as("last");

  const conds: SQL[] = [];
  if (filter === "awaiting") conds.push(awaitingSql());
  if (filter === "mine") conds.push(eq(l.ownerId, userId));

  // Último recado de cada conversa (subconsulta correlacionada: lista é curta e indexada por lead).
  const lastMessage = sql<string | null>`(
    select ${a.body} from ${a}
    where ${a.leadId} = ${l.id} and ${a.type} in ('whatsapp_in', 'whatsapp_out')
    order by ${a.createdAt} desc limit 1
  )`;
  const lastDirection = sql<"whatsapp_in" | "whatsapp_out" | null>`(
    select ${a.type} from ${a}
    where ${a.leadId} = ${l.id} and ${a.type} in ('whatsapp_in', 'whatsapp_out')
    order by ${a.createdAt} desc limit 1
  )`;

  return db
    .select({
      lead: l,
      ownerName: schema.users.name,
      lastAt: last.lastAt,
      lastMessage,
      lastDirection,
    })
    .from(l)
    .innerJoin(last, eq(last.leadId, l.id))
    .leftJoin(schema.users, eq(l.ownerId, schema.users.id))
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(last.lastAt))
    .limit(limit);
}

/** Mensagens de WhatsApp de um lead, em ordem cronológica (últimas 200). */
export async function listMessages(leadId: string) {
  const rows = await db
    .select({ id: a.id, type: a.type, body: a.body, createdAt: a.createdAt, userName: schema.users.name })
    .from(a)
    .leftJoin(schema.users, eq(a.userId, schema.users.id))
    .where(and(eq(a.leadId, leadId), inArray(a.type, [...MESSAGE_TYPES])))
    .orderBy(desc(a.createdAt))
    .limit(200);
  return rows.reverse();
}

/** Conversas dos meus leads esperando resposta (contador do menu). */
export async function countAwaiting(userId: string) {
  const [row] = await db
    .select({ n: count() })
    .from(l)
    .where(and(eq(l.ownerId, userId), awaitingSql()));
  return row?.n ?? 0;
}
