import "server-only";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import type { StoredMedia } from "@/lib/media";
import { audit } from "@/server/audit";
import { deleteMedia } from "@/server/media/storage";

export const ANONYMIZED_NAME = "Titular anonimizado";

/**
 * Anonimiza um lead a pedido do titular (LGPD, art. 18): apaga dados pessoais,
 * mensagens, notificações e anexos, mas mantém o registro do lead (etapa, origem,
 * valor e datas) para as métricas do funil continuarem corretas.
 */
export async function anonymizeLead(leadId: string, actor: { id: string; name: string }) {
  const lead = await db.select({ id: schema.leads.id }).from(schema.leads).where(eq(schema.leads.id, leadId)).get();
  if (!lead) throw new Error("Lead não encontrado.");

  const activities = await db
    .select({ meta: schema.activities.meta })
    .from(schema.activities)
    .where(eq(schema.activities.leadId, leadId));
  const mediaKeys = activities
    .map((a) => (a.meta?.media as StoredMedia | undefined)?.key)
    .filter((key): key is string => Boolean(key));

  const now = new Date();
  await db.batch([
    db
      .update(schema.leads)
      .set({
        name: ANONYMIZED_NAME,
        phone: null,
        email: null,
        company: null,
        message: null,
        tags: [],
        utmTerm: null,
        utmContent: null,
        clickId: null,
        referrer: null,
        landingPage: null,
        anonymizedAt: now,
      })
      .where(eq(schema.leads.id, leadId)),
    db.delete(schema.activities).where(eq(schema.activities.leadId, leadId)),
    db.delete(schema.notifications).where(eq(schema.notifications.leadId, leadId)),
    db.insert(schema.activities).values({
      leadId,
      userId: actor.id,
      type: "system",
      body: "Dados pessoais anonimizados a pedido do titular (LGPD).",
      createdAt: now,
    }),
  ]);

  // Depois do banco: se o storage falhar, os dados já não apontam para os arquivos.
  await deleteMedia(mediaKeys).catch((err) => console.error("[lgpd] falha ao apagar mídia", { leadId }, err));
  // Sem nome nem telefone no log: só o id.
  await audit(actor, "lead.anonymize", "Lead anonimizado a pedido do titular", { type: "lead", id: leadId }, {
    mediaFiles: mediaKeys.length,
  });
}
