import "server-only";
import { z } from "zod";
import { env } from "@/lib/env";
import { normalizePhone } from "@/lib/phone";
import { WhatsAppSendError, decodeInlineMedia, type InboundMedia, type InboundMessage, type WhatsAppProvider } from "../types";
import { assertWebhookToken } from "./token";

/**
 * Evolution API (self-hosted, conecta via QR code — popular no Brasil).
 * Docs: https://doc.evolution-api.com
 */

const upsertSchema = z.object({
  event: z.string(),
  data: z.looseObject({
    key: z.object({ remoteJid: z.string(), fromMe: z.boolean().optional(), id: z.string().optional() }),
    pushName: z.string().optional(),
    messageTimestamp: z.union([z.number(), z.string()]).optional(),
    message: z
      .looseObject({
        conversation: z.string().optional(),
        extendedTextMessage: z.object({ text: z.string() }).optional(),
        imageMessage: z.looseObject({ caption: z.string().optional(), mimetype: z.string().optional() }).optional(),
        videoMessage: z.looseObject({ caption: z.string().optional(), mimetype: z.string().optional() }).optional(),
        audioMessage: z.looseObject({ mimetype: z.string().optional() }).optional(),
        documentMessage: z
          .looseObject({ fileName: z.string().optional(), mimetype: z.string().optional(), caption: z.string().optional() })
          .optional(),
        stickerMessage: z.looseObject({ mimetype: z.string().optional() }).optional(),
        /** Presente quando a instância tem "Webhook Base64" ligado. */
        base64: z.string().optional(),
      })
      .optional(),
  }),
});

function textOf(message: z.infer<typeof upsertSchema>["data"]["message"]): string | null {
  if (!message) return null;
  if (message.conversation) return message.conversation;
  if (message.extendedTextMessage) return message.extendedTextMessage.text;
  if (message.imageMessage) return ["📷 Imagem", message.imageMessage.caption].filter(Boolean).join(": ");
  if (message.videoMessage) return ["🎬 Vídeo", message.videoMessage.caption].filter(Boolean).join(": ");
  if (message.audioMessage) return "🎤 Áudio";
  if (message.documentMessage) return `📄 ${message.documentMessage.fileName ?? "Documento"}`;
  if (message.stickerMessage) return "Figurinha";
  return null;
}

type EvolutionMessage = NonNullable<z.infer<typeof upsertSchema>["data"]["message"]>;

function mediaOf(message: EvolutionMessage | undefined, ref: string | undefined): InboundMedia | undefined {
  if (!message || !ref) return undefined;
  const base = { ref, base64: message.base64 };
  if (message.imageMessage) return { ...base, kind: "image", mimeType: message.imageMessage.mimetype, caption: message.imageMessage.caption };
  if (message.videoMessage) return { ...base, kind: "video", mimeType: message.videoMessage.mimetype, caption: message.videoMessage.caption };
  if (message.audioMessage) return { ...base, kind: "audio", mimeType: message.audioMessage.mimetype };
  if (message.stickerMessage) return { ...base, kind: "sticker", mimeType: message.stickerMessage.mimetype };
  if (message.documentMessage) {
    const d = message.documentMessage;
    return { ...base, kind: "document", mimeType: d.mimetype, fileName: d.fileName, caption: d.caption };
  }
  return undefined;
}

export const evolutionProvider: WhatsAppProvider = {
  name: "evolution",
  label: "Evolution API",

  missingConfig() {
    const e = env();
    return (
      [
        ["EVOLUTION_API_URL", e.EVOLUTION_API_URL],
        ["EVOLUTION_API_KEY", e.EVOLUTION_API_KEY],
        ["EVOLUTION_INSTANCE", e.EVOLUTION_INSTANCE],
        ["WHATSAPP_WEBHOOK_TOKEN", e.WHATSAPP_WEBHOOK_TOKEN],
      ] as const
    )
      .filter(([, v]) => !v)
      .map(([k]) => k);
  },

  async sendText(to, body) {
    const e = env();
    const base = e.EVOLUTION_API_URL?.replace(/\/$/, "");
    const res = await fetch(`${base}/message/sendText/${encodeURIComponent(e.EVOLUTION_INSTANCE ?? "")}`, {
      method: "POST",
      headers: { apikey: e.EVOLUTION_API_KEY ?? "", "Content-Type": "application/json" },
      body: JSON.stringify({ number: to, text: body }),
      signal: AbortSignal.timeout(15_000),
    });
    const json = (await res.json().catch(() => ({}))) as { key?: { id?: string }; message?: unknown; response?: unknown };
    if (!res.ok) {
      const detail = JSON.stringify(json.response ?? json.message ?? "").slice(0, 200);
      throw new WhatsAppSendError(
        `Falha ao enviar pela Evolution API (HTTP ${res.status}).`,
        detail.includes("exists") ? "Este número não tem WhatsApp." : detail || undefined,
      );
    }
    return { providerMessageId: json.key?.id };
  },

  async parseWebhook(request, rawBody) {
    assertWebhookToken(request);
    const parsed = upsertSchema.safeParse(JSON.parse(rawBody));
    if (!parsed.success) return [];
    const { event, data } = parsed.data;
    if (event !== "messages.upsert" && event !== "MESSAGES_UPSERT") return [];

    const jid = data.key.remoteJid;
    // Ignora grupos, status e broadcasts.
    if (!jid.endsWith("@s.whatsapp.net")) return [];
    const text = textOf(data.message);
    if (!text) return [];

    const ts = Number(data.messageTimestamp ?? 0);
    const out: InboundMessage = {
      from: normalizePhone(`+${jid.split("@")[0]}`),
      name: data.key.fromMe ? undefined : data.pushName,
      text,
      providerMessageId: data.key.id,
      at: ts ? new Date(ts * 1000) : new Date(),
      fromMe: Boolean(data.key.fromMe),
      media: mediaOf(data.message, data.key.id),
    };
    return [out];
  },

  async downloadMedia(media) {
    const inline = decodeInlineMedia(media);
    if (inline) return inline;
    const e = env();
    const base = e.EVOLUTION_API_URL?.replace(/\/$/, "");
    const res = await fetch(`${base}/chat/getBase64FromMediaMessage/${encodeURIComponent(e.EVOLUTION_INSTANCE ?? "")}`, {
      method: "POST",
      headers: { apikey: e.EVOLUTION_API_KEY ?? "", "Content-Type": "application/json" },
      body: JSON.stringify({ message: { key: { id: media.ref } }, convertToMp4: false }),
      signal: AbortSignal.timeout(60_000),
    });
    if (!res.ok) throw new Error(`Evolution: falha ao baixar mídia (HTTP ${res.status}).`);
    const json = (await res.json()) as { base64?: string; mimetype?: string };
    if (!json.base64) throw new Error("Evolution: resposta sem base64.");
    return decodeInlineMedia({ ...media, base64: json.base64, mimeType: json.mimetype ?? media.mimeType })!;
  },
};
