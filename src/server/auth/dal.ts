import "server-only";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";
import { validateSession } from "./session";

/**
 * Data Access Layer de autenticação. Toda página, action e route handler
 * protegido passa por aqui — o proxy faz só checagem otimista.
 */
export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "sales";
};

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  // Marca a renderização como request-time: daqui em diante é seguro ler o relógio
  // (Date.now/new Date), exigência do Cache Components.
  await connection();
  const user = await validateSession();
  if (!user) return null;
  return { id: user.id, name: user.name, email: user.email, role: user.role };
});

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireAdmin(): Promise<CurrentUser> {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/dashboard");
  return user;
}

export class AuthError extends Error {}

/** Para actions/rotas que devolvem erro em vez de redirecionar. */
export async function assertUser(role?: "admin"): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new AuthError("Sessão expirada. Faça login novamente.");
  if (role === "admin" && user.role !== "admin") throw new AuthError("Acesso restrito a administradores.");
  return user;
}
