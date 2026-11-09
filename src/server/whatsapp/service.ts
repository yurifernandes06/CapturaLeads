import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import type { StoredMedia } from "@/lib/media";
import { formatPhone } from "@/lib/phone";
import { createLead, findLeadByPhone, recordActivity } from "@/server/leads/service";
import { saveMedia } from "@/server/media/storage";
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

/**
 * Baixa o anexo do provedor e guarda no storage. Falha não derruba a mensagem:
 * ela entra só com o rótulo ("📷 Imagem") e o erro vai para o log.
 */
async function storeInboundMedia(msg: InboundMessage): Promise<StoredMedia | undefined> {
  if (!msg.media) return undefined;
  try {
    const file = await whatsapp().downloadMedia(msg.media);
    const saved = await saveMedia(file.data, file.mimeType);
    return { ...saved, kind: msg.media.kind, fileName: msg.media.fileName, caption: msg.media.caption };
  } catch (err) {
    console.error("[whatsapp] falha ao baixar mídia", err);
    return undefined;
  }
}

export async function handleInbound(msg: InboundMessage) {
  if (!msg.from || (await alreadyProcessed(msg.providerMessageId))) return { skipped: true as const };
  const media = await storeInboundMedia(msg);
  const meta =
    msg.providerMessageId || media
      ? { ...(msg.providerMessageId && { providerMessageId: msg.providerMessageId }), ...(media && { media }) }
      : undefined;

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

/** Lembra o responsável no próprio WhatsApp que uma tarefa venceu. */
export async function sendTaskReminder(input: {
  phone: string;
  userName: string;
  taskTitle: string;
  leadId: string;
  leadName: string;
}) {
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const text = [
    `📝 *Tarefa vencida*`,
    `${input.userName.split(" ")[0]}, está na hora de: *${input.taskTitle}*`,
    `Lead: ${input.leadName}`,
    `${appUrl}/leads/${input.leadId}`,
  ].join("\n");
  await whatsapp().sendText(input.phone, text);
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
