import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db, schema } from "@/db";
import { env } from "@/lib/env";
import { audit } from "@/server/audit";
import { destroyUserSessions } from "@/server/auth/session";
import { hashPassword, verifyPassword } from "@/server/auth/password";
import { whatsapp } from "@/server/whatsapp";

export const RESET_TTL_MS = 30 * 60 * 1000;
const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

/**
 * Gera um link de redefinição de uso único (30 min) e envia pelo WhatsApp cadastrado.
 * Não revela se o e-mail existe: quem chama sempre mostra a mesma mensagem.
 * Devolve o token só para testes; nunca exponha ao cliente.
 */
export async function requestPasswordReset(email: string): Promise<{ sent: boolean; token?: string }> {
  const user = await db
    .select()
    .from(schema.users)
    .where(and(eq(schema.users.email, email.trim().toLowerCase()), eq(schema.users.active, true)))
    .get();
  if (!user?.phone) return { sent: false };

  const token = randomBytes(32).toString("base64url");
  await db.insert(schema.passwordResets).values({
    id: hashToken(token),
    userId: user.id,
    expiresAt: new Date(Date.now() + RESET_TTL_MS),
  });

  const link = `${env().APP_URL}/redefinir-senha?token=${token}`;
  try {
    await whatsapp().sendText(
      user.phone,
      `Olá, ${user.name.split(" ")[0]}! Para criar uma nova senha, acesse: ${link}\n\nO link vale por 30 minutos. Se não foi você, ignore esta mensagem.`,
    );
  } catch (err) {
    console.error("[auth] falha ao enviar link de redefinição", { userId: user.id }, err);
    return { sent: false };
  }
  return { sent: true, token };
}

/** Troca a senha com um token válido, invalida o token e encerra todas as sessões. */
export async function resetPasswordWithToken(token: string, newPassword: string) {
  const now = new Date();
  // Marca como usado de forma atômica: dois envios do mesmo link não trocam a senha duas vezes.
  const [reset] = await db
    .update(schema.passwordResets)
    .set({ usedAt: now })
    .where(
      and(
        eq(schema.passwordResets.id, hashToken(token)),
        isNull(schema.passwordResets.usedAt),
        gt(schema.passwordResets.expiresAt, now),
      ),
    )
    .returning({ userId: schema.passwordResets.userId });
  if (!reset) throw new Error("Link inválido ou expirado. Peça um novo.");

  const [user] = await db
    .update(schema.users)
    .set({ passwordHash: await hashPassword(newPassword) })
    .where(and(eq(schema.users.id, reset.userId), eq(schema.users.active, true)))
    .returning({ id: schema.users.id, name: schema.users.name });
  if (!user) throw new Error("Usuário desativado. Fale com o administrador.");

  await destroyUserSessions(user.id);
  await audit(user, "user.password_reset", `${user.name} redefiniu a própria senha pelo link`, { type: "user", id: user.id });
}

/** Troca a própria senha conferindo a atual. Encerra as outras sessões (quem chama cria uma nova). */
export async function changeOwnPassword(userId: string, currentPassword: string, newPassword: string) {
  const user = await db.select().from(schema.users).where(eq(schema.users.id, userId)).get();
  if (!user || !(await verifyPassword(currentPassword, user.passwordHash))) {
    throw new Error("Senha atual incorreta.");
  }
  await db.update(schema.users).set({ passwordHash: await hashPassword(newPassword) }).where(eq(schema.users.id, userId));
  await destroyUserSessions(userId);
  await audit(user, "user.password_reset", `${user.name} trocou a própria senha`, { type: "user", id: userId });
}
