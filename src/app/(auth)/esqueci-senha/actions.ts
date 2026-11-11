"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { requestPasswordReset, resetPasswordWithToken } from "@/server/auth/password-reset";
import { clientIp } from "@/server/client-ip";
import { rateLimit } from "@/server/rate-limit";

export type PasswordFormState = { ok?: boolean; error?: string; message?: string };

const HOUR_MS = 60 * 60 * 1000;
const GENERIC =
  "Se o e-mail estiver cadastrado e tiver WhatsApp, enviamos um link para criar uma nova senha. Ele vale por 30 minutos.";

export async function forgotPassword(_prev: PasswordFormState, formData: FormData): Promise<PasswordFormState> {
  const email = z.string().trim().toLowerCase().email().safeParse(formData.get("email"));
  if (!email.success) return { error: "Informe um e-mail válido." };

  const ip = clientIp(await headers());
  const [perIp, perEmail] = await Promise.all([
    rateLimit(`forgot-ip:${ip}`, 10, HOUR_MS),
    rateLimit(`forgot:${email.data}`, 3, HOUR_MS),
  ]);
  // Mesmo limitado, responde igual: não revela quais e-mails existem.
  if (perIp.ok && perEmail.ok) await requestPasswordReset(email.data);
  return { ok: true, message: GENERIC };
}

const resetSchema = z
  .object({
    token: z.string().min(20, "Link inválido."),
    password: z.string().min(8, "A senha precisa de pelo menos 8 caracteres."),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, { message: "As senhas não conferem.", path: ["confirm"] });

export async function resetPassword(_prev: PasswordFormState, formData: FormData): Promise<PasswordFormState> {
  const parsed = resetSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  try {
    await resetPasswordWithToken(parsed.data.token, parsed.data.password);
    return { ok: true, message: "Senha alterada. Entre com a nova senha." };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Não foi possível alterar a senha." };
  }
}
