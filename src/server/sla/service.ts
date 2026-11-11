import "server-only";
import { and, eq, inArray, isNull, lt, or, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { OPEN_STAGES } from "@/lib/leads";
import { SLA_KIND_LABEL, type SlaConfig } from "@/lib/sla/config";
import { evaluateSla } from "@/lib/sla/engine";
import { getSetting, setSetting } from "@/server/settings";
import { remindDueTasks } from "@/server/tasks";
import { sendSlaAlert } from "@/server/whatsapp/service";

/**
 * Orquestra o motor de SLA: materializa o resultado no lead (para filtrar e
 * ordenar no banco) e dispara alertas quando um ciclo estoura.
 */

function slaPatch(lead: schema.Lead, config: SlaConfig, now: Date) {
  const r = evaluateSla(lead, config, now);
  return r.kind
    ? { slaKind: r.kind, slaStatus: r.status, slaStartedAt: r.startedAt, slaDueAt: r.dueAt }
    : { slaKind: null, slaStatus: "none" as const, slaStartedAt: null, slaDueAt: null };
}

const changed = (lead: schema.Lead, patch: ReturnType<typeof slaPatch>) =>
  lead.slaKind !== patch.slaKind ||
  lead.slaStatus !== patch.slaStatus ||
  lead.slaDueAt?.getTime() !== patch.slaDueAt?.getTime() ||
  lead.slaStartedAt?.getTime() !== patch.slaStartedAt?.getTime();

export async function refreshLeadSla(leadId: string, config?: SlaConfig) {
  const lead = await db.select().from(schema.leads).where(eq(schema.leads.id, leadId)).get();
  if (!lead) return;
  const cfg = config ?? (await getSetting("sla"));
  const patch = slaPatch(lead, cfg, new Date());
  if (changed(lead, patch)) await db.update(schema.leads).set(patch).where(eq(schema.leads.id, leadId));
  if (patch.slaStatus === "breached") await notifyBreach({ ...lead, ...patch }, cfg);
}

/** Teto de alertas de WhatsApp por sweep: após uma parada longa, o sino avisa todos, o WhatsApp não vira enxurrada. */
const WHATSAPP_ALERTS_PER_SWEEP = 30;

async function notifyBreach(lead: schema.Lead, config: SlaConfig, budget?: { whatsapp: number }) {
  // Um alerta por ciclo: se já avisamos depois que este prazo começou, não repete.
  if (lead.slaNotifiedAt && lead.slaStartedAt && lead.slaNotifiedAt >= lead.slaStartedAt) return;
  const now = new Date();
  // UPDATE condicional: com sweeps simultâneos (cron + render + tick), só um deles alerta.
  const l = schema.leads;
  const claimed = await db
    .update(l)
    .set({ slaNotifiedAt: now })
    .where(
      and(
        eq(l.id, lead.id),
        or(isNull(l.slaNotifiedAt), isNull(l.slaStartedAt), sql`${l.slaNotifiedAt} < ${l.slaStartedAt}`),
      ),
    )
    .returning({ id: l.id });
  if (!claimed.length) return;

  const label = lead.slaKind ? SLA_KIND_LABEL[lead.slaKind] : "SLA";
  await db.insert(schema.activities).values({
    leadId: lead.id,
    type: "sla_breach",
    body: `Prazo de ${label.toLowerCase()} estourado`,
    meta: { kind: lead.slaKind, dueAt: lead.slaDueAt?.toISOString() },
    createdAt: now,
  });

  // Avisa o dono; sem dono, avisa os admins.
  const recipients = lead.ownerId
    ? [lead.ownerId]
    : (
        await db
          .select({ id: schema.users.id })
          .from(schema.users)
          .where(and(eq(schema.users.role, "admin"), eq(schema.users.active, true)))
      ).map((u) => u.id);

  if (recipients.length) {
    await db.insert(schema.notifications).values(
      recipients.map((userId) => ({
        userId,
        leadId: lead.id,
        type: "sla_breach" as const,
        title: `SLA estourado: ${lead.name}`,
        body: `${label} passou do prazo.`,
        createdAt: now,
      })),
    );
  }

  if (config.whatsappAlerts && (!budget || budget.whatsapp-- > 0)) {
    await sendSlaAlert(lead).catch((err) => console.error("[sla] alerta no WhatsApp falhou", err));
  }
}

const SWEEP_BATCH = 100;

let sweeping: Promise<{ updated: number; breached: number; reminded: number }> | null = null;
let lastSweepAt = 0;

/** Recalcula o SLA de todos os leads abertos e dispara alertas. Idempotente. */
export function sweepSla() {
  sweeping ??= (async () => {
    try {
      const config = await getSetting("sla");
      const now = new Date();
      const open = await db.select().from(schema.leads).where(inArray(schema.leads.stage, OPEN_STAGES));
      let breached = 0;
      const budget = { whatsapp: WHATSAPP_ALERTS_PER_SWEEP };
      // Só grava quem mudou, em lotes (uma ida à rede por lote no Turso).
      const updates = open
        .map((lead) => ({ lead, patch: slaPatch(lead, config, now) }))
        .filter(({ lead, patch }) => changed(lead, patch));
      for (let i = 0; i < updates.length; i += SWEEP_BATCH) {
        const chunk = updates.slice(i, i + SWEEP_BATCH).map(({ lead, patch }) =>
          db.update(schema.leads).set(patch).where(eq(schema.leads.id, lead.id)),
        );
        if (chunk.length) await db.batch(chunk as [(typeof chunk)[number], ...typeof chunk]);
      }
      const updated = updates.length;
      for (const lead of open) {
        const patch = slaPatch(lead, config, now);
        if (patch.slaStatus === "breached") {
          breached++;
          await notifyBreach({ ...lead, ...patch }, config, budget);
        }
      }
      // Mesmo relógio, mesmo horário comercial: lembretes de tarefas vencidas.
      const reminded = await remindDueTasks(config, now.getTime()).catch((err) => {
        console.error("[tasks] falha nos lembretes", err);
        return 0;
      });
      // Faxina: sessões expiradas.
      await db.delete(schema.sessions).where(lt(schema.sessions.expiresAt, now));
      lastSweepAt = Date.now();
      await setSetting("ops", { lastSweepAt, lastSweepMs: lastSweepAt - now.getTime() }).catch((err) =>
        console.error("[sla] falha ao registrar o sweep", err),
      );
      return { updated, breached, reminded };
    } finally {
      sweeping = null;
    }
  })();
  return sweeping;
}

/** Sweep preguiçoso: chamado ao abrir telas, roda no máximo 1x por minuto. */
export async function sweepIfStale(maxAgeMs = 60_000) {
  if (Date.now() - lastSweepAt > maxAgeMs) await sweepSla();
}
