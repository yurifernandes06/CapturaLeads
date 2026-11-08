import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { db, schema } from "@/db";

export const SESSION_COOKIE = "cl_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 dias
const RENEW_THRESHOLD_MS = 15 * 24 * 60 * 60 * 1000; // renova quando faltar < 15 dias

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

async function setCookie(token: string, expiresAt: Date) {
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  const userAgent = (await headers()).get("user-agent")?.slice(0, 255) ?? null;
  await db.insert(schema.sessions).values({ id: hashToken(token), userId, expiresAt, userAgent });
  await setCookie(token, expiresAt);
}

/** Valida o cookie e devolve o usuário ativo, renovando a sessão (sliding expiration). */
export async function validateSession() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const sessionId = hashToken(token);
  const row = await db
    .select({ session: schema.sessions, user: schema.users })
    .from(schema.sessions)
    .innerJoin(schema.users, eq(schema.sessions.userId, schema.users.id))
    .where(eq(schema.sessions.id, sessionId))
    .get();

  if (!row) return null;
  const now = Date.now();
  if (row.session.expiresAt.getTime() <= now || !row.user.active) {
    await db.delete(schema.sessions).where(eq(schema.sessions.id, sessionId));
    return null;
  }

  if (row.session.expiresAt.getTime() - now < RENEW_THRESHOLD_MS) {
    const expiresAt = new Date(now + SESSION_TTL_MS);
    await db.update(schema.sessions).set({ expiresAt }).where(eq(schema.sessions.id, sessionId));
    // Cookies só podem ser escritos em Server Actions/Route Handlers; em render ignoramos.
    await setCookie(token, expiresAt).catch(() => {});
  }

  return row.user;
}

export async function destroySession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) await db.delete(schema.sessions).where(eq(schema.sessions.id, hashToken(token)));
  store.delete(SESSION_COOKIE);
}

/** Encerra todas as sessões de um usuário (ex.: desativação ou troca de senha). */
export async function destroyUserSessions(userId: string) {
  await db.delete(schema.sessions).where(eq(schema.sessions.userId, userId));
}
