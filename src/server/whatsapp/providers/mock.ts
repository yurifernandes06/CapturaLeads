import "server-only";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { normalizePhone } from "@/lib/phone";
import type { WhatsAppProvider } from "../types";
import { assertWebhookToken } from "./token";

/**
 * Provedor de desenvolvimento: não envia nada de verdade, só registra no log.
 * O webhook aceita {"from","name","text"} para simular mensagens recebidas.
 */
const mockSchema = z.object({ from: z.string(), name: z.string().optional(), text: z.string().min(1) });

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
    return [{ from: normalizePhone(data.from), name: data.name, text: data.text, at: new Date() }];
  },
};
