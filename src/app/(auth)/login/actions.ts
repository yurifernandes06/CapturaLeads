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

export type LoginState = { error?: string; email?: string };

const loginSchema = z.object({
  email: z.email("Informe um e-mail válido.").trim().toLowerCase(),
  password: z.string().min(1, "Informe a senha."),
  next: z.string().optional(),
});

/** Aceita só caminhos internos para evitar open redirect. */
export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  const email = String(formData.get("email") ?? "");
  if (!parsed.success) return { error: parsed.error.issues[0]?.message, email };

  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const key = `login:${ip}:${parsed.data.email}`;
  const limit = await rateLimit(key, 8, 15 * 60 * 1000);
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
