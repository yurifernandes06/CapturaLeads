import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { formatPhone } from "@/lib/phone";
import { createLead, findLeadByPhone, recordActivity } from "@/server/leads/service";
import { whatsapp } from "./index";
import type { InboundMessage } from "./types";

/**
 * Casos de uso do WhatsApp: receber (webhook) e enviar (tela do lead).
 */

async function alreadyProcessed(providerMessageId?: string) {
  if (!providerMessageId) return false;
  // Provedores reenviam webhooks em caso de timeout: deduplica pelo id da mensagem.
  const hit = await db
    .select({ id: schema.activities.id })
    .from(schema.activities)
    .where(sql`json_extract(${schema.activities.meta}, '$.providerMessageId') = ${providerMessageId}`)
    .get();
  return Boolean(hit);
}

async function notify(userId: string | null, leadId: string, type: "new_lead" | "new_message", title: string, body?: string) {
  if (!userId) return;
  await db.insert(schema.notifications).values({ userId, leadId, type, title, body: body?.slice(0, 140) ?? null });
}

export async function handleInbound(msg: InboundMessage) {
  if (!msg.from || (await alreadyProcessed(msg.providerMessageId))) return { skipped: true as const };
  const meta = msg.providerMessageId ? { providerMessageId: msg.providerMessageId } : undefined;

  // Mensagem enviada pelo celular da empresa: conta como contato do time.
  if (msg.fromMe) {
    const lead = await findLeadByPhone(msg.from);
    if (!lead) return { skipped: true as const };
    await recordActivity(lead.id, "whatsapp_out", { body: msg.text, meta: { ...meta, viaPhone: true }, at: msg.at });
    return { leadId: lead.id, created: false };
  }

  const existing = await findLeadByPhone(msg.from);
  if (existing) {
    await recordActivity(existing.id, "whatsapp_in", { body: msg.text, meta, at: msg.at });
    // Lead perdido que voltou a falar: reabre para não sumir da fila.
    if (existing.stage === "lost") {
      await db.update(schema.leads).set({ stage: "contacted", closedAt: null, lostReason: null }).where(eq(schema.leads.id, existing.id));
      await recordActivity(existing.id, "system", { body: "Lead voltou a falar no WhatsApp e foi reaberto" });
    }
    await notify(existing.ownerId, existing.id, "new_message", `Nova mensagem de ${existing.name}`, msg.text);
    return { leadId: existing.id, created: false };
  }

  const { lead } = await createLead(
    { name: msg.name?.trim() || formatPhone(msg.from), phone: msg.from, source: "whatsapp", message: msg.text },
    { autoAssign: true, inbound: true },
  );
  await recordActivity(lead.id, "whatsapp_in", { body: msg.text, meta, at: msg.at });
  await notify(lead.ownerId, lead.id, "new_lead", `Novo lead pelo WhatsApp: ${lead.name}`, msg.text);
  return { leadId: lead.id, created: true };
}

export async function sendToLead(leadId: string, body: string, userId: string) {
  const lead = await db.select().from(schema.leads).where(eq(schema.leads.id, leadId)).get();
  if (!lead) throw new Error("Lead não encontrado.");
  if (!lead.phone) throw new Error("Este lead não tem telefone cadastrado.");

  const provider = whatsapp();
  const { providerMessageId } = await provider.sendText(lead.phone, body);
  await recordActivity(leadId, "whatsapp_out", {
    userId,
    body,
    meta: { providerMessageId, provider: provider.name },
  });
}

/** Avisa o vendedor no próprio WhatsApp que um lead estourou o SLA. */
export async function sendSlaAlert(lead: schema.Lead) {
  if (!lead.ownerId) return;
  const owner = await db
    .select({ phone: schema.users.phone, name: schema.users.name })
    .from(schema.users)
    .where(and(eq(schema.users.id, lead.ownerId), eq(schema.users.active, true)))
    .get();
  if (!owner?.phone) return;

  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const text = [
    `⏰ *SLA estourado*`,
    `${owner.name.split(" ")[0]}, o lead *${lead.name}* está esperando resposta.`,
    `${appUrl}/leads/${lead.id}`,
  ].join("\n");
  await whatsapp().sendText(owner.phone, text);
}
