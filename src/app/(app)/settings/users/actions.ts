"use server";

import { and, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db, schema } from "@/db";
import { errorMessage, type ActionResult } from "@/lib/action-result";
import { normalizePhone } from "@/lib/phone";
import { assertUser } from "@/server/auth/dal";
import { hashPassword } from "@/server/auth/password";
import { destroyUserSessions } from "@/server/auth/session";

const PATH = "/settings/users";

const userSchema = z.object({
  name: z.string().trim().min(2, "Nome muito curto."),
  email: z.email("E-mail inválido.").trim().toLowerCase(),
  phone: z.string().trim().optional(),
  role: z.enum(schema.USER_ROLES),
  password: z.string().min(8, "A senha precisa de pelo menos 8 caracteres."),
});

export async function createUser(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    await assertUser("admin");
    const data = userSchema.parse(Object.fromEntries(formData));
    const exists = await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.email, data.email)).get();
    if (exists) return { ok: false, error: "Já existe um usuário com este e-mail." };

    await db.insert(schema.users).values({
      name: data.name,
      email: data.email,
      role: data.role,
      phone: data.phone ? normalizePhone(data.phone) : null,
      passwordHash: await hashPassword(data.password),
    });
    revalidatePath(PATH);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

export async function setUserActive(userId: string, active: boolean): Promise<ActionResult> {
  try {
    const me = await assertUser("admin");
    if (me.id === userId) return { ok: false, error: "Você não pode desativar a si mesmo." };
    await db.update(schema.users).set({ active }).where(eq(schema.users.id, userId));
    if (!active) await destroyUserSessions(userId);
    revalidatePath(PATH);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

export async function setUserRole(userId: string, role: schema.UserRole): Promise<ActionResult> {
  try {
    const me = await assertUser("admin");
    if (me.id === userId) return { ok: false, error: "Você não pode alterar o próprio papel." };
    await db.update(schema.users).set({ role }).where(and(eq(schema.users.id, userId), ne(schema.users.role, role)));
    revalidatePath(PATH);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

const resetSchema = z.object({
  userId: z.string().min(1),
  password: z.string().min(8, "A senha precisa de pelo menos 8 caracteres."),
});

export async function resetPassword(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    await assertUser("admin");
    const { userId, password } = resetSchema.parse(Object.fromEntries(formData));
    await db.update(schema.users).set({ passwordHash: await hashPassword(password) }).where(eq(schema.users.id, userId));
    await destroyUserSessions(userId);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}
