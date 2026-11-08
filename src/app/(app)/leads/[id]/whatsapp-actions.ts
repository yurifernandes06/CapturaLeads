"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { errorMessage, type ActionResult } from "@/lib/action-result";
import { assertUser } from "@/server/auth/dal";
import { WhatsAppSendError } from "@/server/whatsapp";
import { sendToLead } from "@/server/whatsapp/service";

export async function sendWhatsAppAction(leadId: string, body: string): Promise<ActionResult<{ hint?: string }>> {
  try {
    const user = await assertUser();
    const text = z.string().trim().min(1, "Escreva a mensagem.").max(4096).parse(body);
    await sendToLead(leadId, text, user.id);
    revalidatePath(`/leads/${leadId}`);
    revalidatePath("/leads");
    return { ok: true };
  } catch (err) {
    if (err instanceof WhatsAppSendError) return { ok: false, error: err.message, data: { hint: err.hint } };
    return { ok: false, error: errorMessage(err) };
  }
}
