"use server";

import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { db, schema } from "@/db";
import { errorMessage, type ActionResult } from "@/lib/action-result";
import { captureLead, captureSchema } from "@/server/capture/service";
import { rateLimit } from "@/server/rate-limit";

export async function submitPublicForm(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    // Honeypot: campo invisível que só robôs preenchem. Fingimos sucesso.
    if (String(formData.get("website") ?? "")) return { ok: true };

    const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
    if (!rateLimit(`form:${ip}`, 5, 60_000).ok) {
      return { ok: false, error: "Recebemos muitas tentativas. Aguarde um minuto e tente de novo." };
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
