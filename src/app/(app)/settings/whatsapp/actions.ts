"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { errorMessage, type ActionResult } from "@/lib/action-result";
import { isValidPhone, normalizePhone } from "@/lib/phone";
import { templatesSchema, type MessageTemplate } from "@/lib/templates";
import { assertUser } from "@/server/auth/dal";
import { setSetting } from "@/server/settings";
import { handleInbound } from "@/server/whatsapp/service";

export async function saveTemplatesAction(templates: MessageTemplate[]): Promise<ActionResult> {
  try {
    await assertUser("admin");
    await setSetting("whatsappTemplates", templatesSchema.parse(templates));
    revalidatePath("/settings/whatsapp");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

const simulateSchema = z.object({
  phone: z
    .string()
    .transform((v) => normalizePhone(v))
    .refine(isValidPhone, "Telefone inválido."),
  name: z.string().trim().max(80).optional(),
  text: z.string().trim().min(1, "Escreva a mensagem.").max(1000),
});

/** Simula uma mensagem recebida — testa o fluxo completo sem depender do provedor. */
export async function simulateInboundAction(
  _prev: ActionResult<{ leadId: string; created: boolean }>,
  formData: FormData,
): Promise<ActionResult<{ leadId: string; created: boolean }>> {
  try {
    await assertUser("admin");
    const data = simulateSchema.parse(Object.fromEntries(formData));
    const res = await handleInbound({ from: data.phone, name: data.name, text: data.text, at: new Date() });
    if ("skipped" in res) return { ok: false, error: "Mensagem ignorada." };
    revalidatePath("/", "layout");
    return { ok: true, data: res };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}
