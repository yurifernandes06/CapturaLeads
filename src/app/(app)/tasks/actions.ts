"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db, schema } from "@/db";
import { errorMessage, type ActionResult } from "@/lib/action-result";
import { parseLocalDateTime } from "@/lib/tasks";
import { assertUser } from "@/server/auth/dal";
import { getSetting } from "@/server/settings";
import { createTask, deleteTask, setTaskDone } from "@/server/tasks";

/** O contador do menu vive no layout: revalidar a partir da raiz cobre lead, /tasks e dashboard. */
const revalidateTasks = () => revalidatePath("/", "layout");

const taskSchema = z.object({
  leadId: z.string().min(1),
  title: z.string().trim().min(1, "Descreva a tarefa.").max(200, "Use até 200 caracteres."),
  dueAt: z.string().min(1, "Informe o prazo."),
  assigneeId: z.string().optional(),
});

export async function createTaskAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const user = await assertUser();
    const data = taskSchema.parse(Object.fromEntries(formData));
    const { timezone } = await getSetting("sla");
    const dueAt = parseLocalDateTime(data.dueAt, timezone);
    if (dueAt === null) return { ok: false, error: "Prazo inválido." };

    const lead = await db.select({ id: schema.leads.id }).from(schema.leads).where(eq(schema.leads.id, data.leadId)).get();
    if (!lead) return { ok: false, error: "Lead não encontrado." };

    let assigneeId = data.assigneeId || user.id;
    if (assigneeId !== user.id) {
      const target = await db
        .select({ active: schema.users.active })
        .from(schema.users)
        .where(eq(schema.users.id, assigneeId))
        .get();
      if (!target?.active) assigneeId = user.id;
    }

    await createTask({ leadId: data.leadId, title: data.title, dueAt, assigneeId, createdById: user.id });
    revalidateTasks();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

export async function toggleTaskAction(id: string, done: boolean): Promise<ActionResult> {
  try {
    const user = await assertUser();
    await setTaskDone(id, done, user);
    revalidateTasks();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

export async function deleteTaskAction(id: string): Promise<ActionResult> {
  try {
    const user = await assertUser();
    await deleteTask(id, user);
    revalidateTasks();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}
