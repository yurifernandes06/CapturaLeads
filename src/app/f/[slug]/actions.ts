"use server";

import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { db, schema } from "@/db";
import { errorMessage, type ActionResult } from "@/lib/action-result";
import { normalizePhone } from "@/lib/phone";
import { captureLead, captureSchema } from "@/server/capture/service";
import { clientIp } from "@/server/client-ip";
import { rateLimit } from "@/server/rate-limit";
import { verifyTurnstile } from "@/server/turnstile";

const DAY_MS = 24 * 60 * 60 * 1000;

export async function submitPublicForm(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    // Honeypot: campo invisível que só robôs preenchem. Fingimos sucesso.
    if (String(formData.get("website") ?? "")) return { ok: true };

    const ip = clientIp(await headers());
    if (!(await rateLimit(`form:${ip}`, 5, 60_000)).ok) {
      return { ok: false, error: "Recebemos muitas tentativas. Aguarde um minuto e tente de novo." };
    }
    if (!(await verifyTurnstile(String(formData.get("cf-turnstile-response") ?? ""), ip))) {
      return { ok: false, error: "Não conseguimos confirmar que você não é um robô. Tente de novo." };
    }
    // Mesmo número várias vezes no dia = abuso (ex.: disparar boas-vindas para terceiros).
    const phone = normalizePhone(String(formData.get("phone") ?? ""));
    if (phone && !(await rateLimit(`form-phone:${phone}`, 3, DAY_MS)).ok) {
      return { ok: false, error: "Já recebemos seu contato hoje. Em breve falaremos com você." };
    }

    const slug = String(formData.get("slug") ?? "");
    const form = await db
      .select()
      .from(schema.forms)
      .where(and(eq(schema.forms.slug, slug), eq(schema.forms.active, true)))
      .get();
    if (!form) return { ok: false, error: "Este formulário não está mais disponível." };

    const data = captureSchema.parse({ ...Object.fromEntries(formData), source: "form", tags: "" });
    await captureLead(data, { form, defaultSource: "form" });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}
