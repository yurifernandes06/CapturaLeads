import "server-only";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { normalizePhone } from "@/lib/phone";
import { MEDIA_KINDS } from "@/lib/media";
import { decodeInlineMedia, type WhatsAppProvider } from "../types";
import { assertWebhookToken } from "./token";

/**
 * Provedor de desenvolvimento: não envia nada de verdade, só registra no log.
 * O webhook aceita {"from","name","text"} para simular mensagens recebidas e,
 * opcionalmente, "media": {"kind","mimeType","base64","fileName","caption"}.
 */
const mockSchema = z.object({
  from: z.string(),
  name: z.string().optional(),
  text: z.string().min(1),
  media: z
    .object({
      kind: z.enum(MEDIA_KINDS),
      mimeType: z.string(),
      base64: z.string().min(1),
      fileName: z.string().optional(),
      caption: z.string().optional(),
    })
    .optional(),
});

export const mockProvider: WhatsAppProvider = {
  name: "mock",
  label: "Simulado (desenvolvimento)",

  missingConfig: () => [],

  async sendText(to, body) {
    console.log(`[whatsapp:mock] → ${to}: ${body.replace(/\n/g, " ⏎ ").slice(0, 120)}`);
    return { providerMessageId: `mock-${randomUUID()}` };
  },

  async parseWebhook(request, rawBody) {
    assertWebhookToken(request);
    const data = mockSchema.parse(JSON.parse(rawBody));
    const media = data.media ? { ...data.media, ref: `mock-${randomUUID()}` } : undefined;
    return [{ from: normalizePhone(data.from), name: data.name, text: data.text, at: new Date(), media }];
  },

  async downloadMedia(media) {
    const inline = decodeInlineMedia(media);
    if (!inline) throw new Error("Mídia simulada sem base64.");
    return inline;
  },
};
