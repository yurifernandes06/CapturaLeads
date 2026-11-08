import "server-only";
import { timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";
import { WebhookAuthError } from "../types";

/** Para provedores que não assinam o payload: exige ?token= igual a WHATSAPP_WEBHOOK_TOKEN. */
export function assertWebhookToken(request: Request) {
  const expected = env().WHATSAPP_WEBHOOK_TOKEN;
  if (!expected) throw new WebhookAuthError("WHATSAPP_WEBHOOK_TOKEN não configurado.");
  const given = new URL(request.url).searchParams.get("token") ?? "";
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) throw new WebhookAuthError("Token inválido.");
}
