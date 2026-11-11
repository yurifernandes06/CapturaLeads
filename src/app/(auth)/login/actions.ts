"use server";

import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db, schema } from "@/db";
import { verifyDummy, verifyPassword } from "@/server/auth/password";
import { createSession, destroySession } from "@/server/auth/session";
import { rateLimit, resetRateLimit } from "@/server/rate-limit";
import { safeRedirectPath } from "@/lib/safe-redirect";
import { clientIp } from "@/server/client-ip";

export type LoginState = { error?: string; email?: string };

const loginSchema = z.object({
  email: z.email("Informe um e-mail válido.").trim().toLowerCase(),
  password: z.string().min(1, "Informe a senha."),
  next: z.string().optional(),
});

/** Aceita só caminhos internos para evitar open redirect. */
const LOGIN_WINDOW_MS = 15 * 60 * 1000;

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  const email = String(formData.get("email") ?? "");
  if (!parsed.success) return { error: parsed.error.issues[0]?.message, email };

  const ip = clientIp(await headers());
  const key = `login:${ip}:${parsed.data.email}`;
  // Por IP+e-mail (força bruta numa conta) e só por IP (vários e-mails a partir da mesma origem).
  const [perAccount, perIp] = await Promise.all([
    rateLimit(key, 8, LOGIN_WINDOW_MS),
    rateLimit(`login-ip:${ip}`, 30, LOGIN_WINDOW_MS),
  ]);
  const limit = perAccount.ok ? perIp : perAccount;
  if (!limit.ok) {
    const min = Math.ceil(limit.retryAfterMs / 60000);
    return { error: `Muitas tentativas. Tente novamente em ${min} min.`, email };
  }

  const user = await db.select().from(schema.users).where(eq(schema.users.email, parsed.data.email)).get();
  const valid = user
    ? await verifyPassword(parsed.data.password, user.passwordHash)
    : await verifyDummy(parsed.data.password);

  if (!user || !valid) return { error: "E-mail ou senha incorretos.", email };
  if (!user.active) return { error: "Usuário desativado. Fale com o administrador.", email };

  await resetRateLimit(key);
  await createSession(user.id);
  redirect(safeRedirectPath(parsed.data.next));
}

export async function logout() {
  await destroySession();
  redirect("/login");
}
