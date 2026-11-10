import { timingSafeEqual } from "node:crypto";
import { after, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { whatsapp, WebhookAuthError } from "@/server/whatsapp";
import { attachInboundMedia, handleInbound, type PendingMedia } from "@/server/whatsapp/service";

/**
 * Webhook único para o provedor ativo.
 * - Meta Cloud API: GET de verificação (hub.challenge) + POST assinado (X-Hub-Signature-256)
 * - Evolution / mock: POST com ?token=WHATSAPP_WEBHOOK_TOKEN
 */
export async function GET(request: NextRequest) {
  const p = request.nextUrl.searchParams;
  const expected = env().WHATSAPP_CLOUD_VERIFY_TOKEN ?? "";
  const given = p.get("hub.verify_token") ?? "";
  const valid =
    p.get("hub.mode") === "subscribe" &&
    expected.length > 0 &&
    given.length === expected.length &&
    timingSafeEqual(Buffer.from(given), Buffer.from(expected));
  if (!valid) return new Response("forbidden", { status: 403 });
  return new Response(p.get("hub.challenge") ?? "", { status: 200 });
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const provider = whatsapp();

  let messages;
  try {
    messages = await provider.parseWebhook(request, rawBody);
  } catch (err) {
    if (err instanceof WebhookAuthError) return Response.json({ error: err.message }, { status: 401 });
    // Payload que não entendemos: responde 200 para o provedor não ficar reenviando.
    console.error("[whatsapp] payload inválido", err);
    return Response.json({ ok: true, ignored: true });
  }

  const results = [];
  const pending: PendingMedia[] = [];
  for (const msg of messages) {
    try {
      const res = await handleInbound(msg, { deferMedia: true });
      results.push(res);
      if ("pendingMedia" in res && res.pendingMedia) pending.push(res.pendingMedia);
    } catch (err) {
      console.error("[whatsapp] falha ao processar mensagem", err);
    }
  }

  // Anexos baixam depois da resposta: o provedor recebe 200 rápido e não reenvia por timeout.
  if (pending.length) {
    after(async () => {
      for (const p of pending) {
        await attachInboundMedia(p).catch((err) => console.error("[whatsapp] falha ao anexar mídia", err));
      }
    });
  }
  return Response.json({ ok: true, processed: results.length });
}
