"use server";

import { z } from "zod";
import { errorMessage, type ActionResult } from "@/lib/action-result";
import { assertUser } from "@/server/auth/dal";
import { changeOwnPassword } from "@/server/auth/password-reset";
import { createSession } from "@/server/auth/session";

const schema = z
  .object({
    current: z.string().min(1, "Informe a senha atual."),
    password: z.string().min(8, "A nova senha precisa de pelo menos 8 caracteres."),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, { message: "As senhas não conferem.", path: ["confirm"] })
  .refine((d) => d.password !== d.current, { message: "A nova senha precisa ser diferente da atual.", path: ["password"] });

export async function changePasswordAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const user = await assertUser();
    const data = schema.parse(Object.fromEntries(formData));
    await changeOwnPassword(user.id, data.current, data.password);
    // Todas as sessões foram encerradas (inclusive em outros aparelhos); mantém este navegador logado.
    await createSession(user.id);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}
