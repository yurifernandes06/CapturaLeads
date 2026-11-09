import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { env } from "@/lib/env";
import { normalizePhone } from "@/lib/phone";
import { WebhookAuthError, WhatsAppSendError, type InboundMessage, type WhatsAppProvider } from "../types";

/**
 * Meta WhatsApp Cloud API (oficial).
 * Docs: https://developers.facebook.com/docs/whatsapp/cloud-api
 */

const webhookSchema = z.object({
  entry: z
    .array(
      z.object({
        changes: z.array(
          z.object({
            value: z.object({
              contacts: z.array(z.object({ wa_id: z.string(), profile: z.object({ name: z.string() }).optional() })).optional(),
              messages: z
                .array(
                  z.looseObject({
                    from: z.string(),
                    id: z.string(),
                    timestamp: z.string(),
                    type: z.string(),
                    text: z.object({ body: z.string() }).optional(),
                    button: z.object({ text: z.string() }).optional(),
                    interactive: z.looseObject({}).optional(),
                  }),
                )
                .optional(),
            }),
          }),
        ),
      }),
    )
    .default([]),
});

function messageText(m: Record<string, unknown> & { type: string }): string {
  if (m.type === "text") return (m.text as { body: string }).body;
  if (m.type === "button") return (m.button as { text: string }).text;
  const caption = (m[m.type] as { caption?: string } | undefined)?.caption;
  const labels: Record<string, string> = {
    image: "📷 Imagem",
    audio: "🎤 Áudio",
    video: "🎬 Vídeo",
    document: "📄 Documento",
    sticker: "Figurinha",
    location: "📍 Localização",
    interactive: "Resposta interativa",
  };
  return [labels[m.type] ?? `[${m.type}]`, caption].filter(Boolean).join(": ");
}

export const cloudProvider: WhatsAppProvider = {
  name: "cloud",
  label: "WhatsApp Cloud API (Meta)",

  missingConfig() {
    const e = env();
    return (
      [
        ["WHATSAPP_CLOUD_TOKEN", e.WHATSAPP_CLOUD_TOKEN],
        ["WHATSAPP_CLOUD_PHONE_NUMBER_ID", e.WHATSAPP_CLOUD_PHONE_NUMBER_ID],
        ["WHATSAPP_CLOUD_VERIFY_TOKEN", e.WHATSAPP_CLOUD_VERIFY_TOKEN],
        ["WHATSAPP_CLOUD_APP_SECRET", e.WHATSAPP_CLOUD_APP_SECRET],
      ] as const
    )
      .filter(([, v]) => !v)
      .map(([k]) => k);
  },

  async sendText(to, body) {
    const e = env();
    const res = await fetch(
      `https://graph.facebook.com/${e.WHATSAPP_CLOUD_API_VERSION}/${e.WHATSAPP_CLOUD_PHONE_NUMBER_ID}/messages`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${e.WHATSAPP_CLOUD_TOKEN}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to,
          type: "text",
          text: { preview_url: true, body },
        }),
        signal: AbortSignal.timeout(15_000),
      },
    );
    const json = (await res.json().catch(() => ({}))) as {
      messages?: { id: string }[];
      error?: { message?: string; code?: number };
    };
    if (!res.ok) {
      const code = json.error?.code;
      // 131047: fora da janela de 24h — a Meta só aceita template aprovado.
      if (code === 131047) {
        throw new WhatsAppSendError(
          "O lead não fala com você há mais de 24h.",
          "Pela regra da Meta, fora da janela de 24h só é possível enviar templates aprovados. Use 'Abrir conversa' no celular.",
        );
      }
      throw new WhatsAppSendError(json.error?.message ?? `Falha ao enviar (HTTP ${res.status}).`);
    }
    return { providerMessageId: json.messages?.[0]?.id };
  },

  async parseWebhook(request, rawBody) {
    const secret = env().WHATSAPP_CLOUD_APP_SECRET;
    if (!secret) throw new WebhookAuthError("WHATSAPP_CLOUD_APP_SECRET não configurado.");
    const signature = request.headers.get("x-hub-signature-256") ?? "";
    const expected = `sha256=${createHmac("sha256", secret).update(rawBody).digest("hex")}`;
    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) throw new WebhookAuthError("Assinatura inválida.");

    const payload = webhookSchema.safeParse(JSON.parse(rawBody));
    if (!payload.success) return [];

    const out: InboundMessage[] = [];
    for (const entry of payload.data.entry) {
      for (const change of entry.changes) {
        const names = new Map(change.value.contacts?.map((c) => [c.wa_id, c.profile?.name]) ?? []);
        for (const m of change.value.messages ?? []) {
          out.push({
            from: normalizePhone(`+${m.from}`),
            name: names.get(m.from) ?? undefined,
            text: messageText(m),
            providerMessageId: m.id,
            at: new Date(Number(m.timestamp) * 1000),
          });
        }
      }
    }
    return out;
  },
};
