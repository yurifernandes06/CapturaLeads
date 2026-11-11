import "server-only";
import { desc } from "drizzle-orm";
import { db, schema } from "@/db";
import type { AuditAction } from "@/lib/audit";

type Actor = { id: string; name: string };

/**
 * Registra uma ação sensível. Nunca derruba a operação principal:
 * se a gravação falhar, o evento vai para o log do servidor.
 */
export async function audit(
  actor: Actor,
  action: AuditAction,
  summary: string,
  target?: { type: "lead" | "user"; id: string },
  meta?: Record<string, unknown>,
) {
  try {
    await db.insert(schema.auditLogs).values({
      actorId: actor.id,
      actorName: actor.name,
      action,
      summary: summary.slice(0, 300),
      targetType: target?.type ?? null,
      targetId: target?.id ?? null,
      meta,
    });
  } catch (err) {
    console.error("[audit] falha ao registrar", { action, actor: actor.id, summary }, err);
  }
}

export async function listAuditLogs(limit = 200) {
  return db.select().from(schema.auditLogs).orderBy(desc(schema.auditLogs.createdAt)).limit(limit);
}
