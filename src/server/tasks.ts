import "server-only";
import { and, asc, count, desc, eq, gte, isNotNull, isNull, lt, lte } from "drizzle-orm";
import { db, schema } from "@/db";
import type { TaskView } from "@/components/tasks/task-list";
import type { SlaConfig } from "@/lib/sla/config";
import { endOfDay, formatDue, isStaleReminder, shouldRemind, taskBucket } from "@/lib/tasks";
import type { CurrentUser } from "@/server/auth/dal";
import { sendTaskReminder } from "@/server/whatsapp/service";

const t = schema.tasks;

/** Concluir, reabrir ou excluir: o responsável, quem criou ou um admin. */
export const canEditTask = (task: Pick<schema.Task, "assigneeId" | "createdById">, user: CurrentUser) =>
  user.role === "admin" || task.assigneeId === user.id || task.createdById === user.id;

/** Linha do banco → props serializáveis da lista (prazo já formatado no fuso). */
export function toTaskView(
  task: schema.Task,
  ctx: { now: number; timezone: string; user: CurrentUser },
  extra: Pick<TaskView, "lead" | "assigneeName"> = {},
): TaskView {
  const due = task.dueAt.getTime();
  return {
    id: task.id,
    title: task.title,
    due: formatDue(due, ctx.now, ctx.timezone),
    bucket: taskBucket(due, ctx.now, ctx.timezone),
    done: Boolean(task.doneAt),
    canEdit: canEditTask(task, ctx.user),
    ...extra,
  };
}

/** Tarefas de um lead: abertas por prazo, depois as concluídas mais recentes. */
export async function listLeadTasks(leadId: string) {
  return db
    .select({ task: t, assigneeName: schema.users.name })
    .from(t)
    .leftJoin(schema.users, eq(t.assigneeId, schema.users.id))
    .where(eq(t.leadId, leadId))
    .orderBy(asc(t.doneAt), asc(t.dueAt))
    .limit(50);
}

/** Tarefas abertas do usuário (com o lead), mais as concluídas nos últimos 7 dias. */
export async function listMyTasks(userId: string, now: number) {
  // Builders do Drizzle são mutáveis: cada consulta monta o seu.
  const withLead = () =>
    db.select({ task: t, leadName: schema.leads.name }).from(t).innerJoin(schema.leads, eq(t.leadId, schema.leads.id));
  const [open, done] = await Promise.all([
    withLead().where(and(eq(t.assigneeId, userId), isNull(t.doneAt))).orderBy(asc(t.dueAt)).limit(200),
    withLead()
      .where(and(eq(t.assigneeId, userId), isNotNull(t.doneAt), gte(t.doneAt, new Date(now - 7 * 86_400_000))))
      .orderBy(desc(t.doneAt))
      .limit(20),
  ]);
  return { open, done };
}

/** Quantas tarefas abertas vencem até o fim de hoje (inclui atrasadas). Alimenta o contador do menu. */
export async function countDueTasks(userId: string, now: number, timezone: string) {
  const [row] = await db
    .select({ n: count() })
    .from(t)
    .where(and(eq(t.assigneeId, userId), isNull(t.doneAt), lt(t.dueAt, new Date(endOfDay(now, timezone)))));
  return row?.n ?? 0;
}

/** Tarefas abertas que vencem até o fim de hoje, mais urgentes primeiro (card do dashboard). */
export async function listDueTasks(userId: string, now: number, timezone: string, limit = 5) {
  return db
    .select({ task: t, leadName: schema.leads.name })
    .from(t)
    .innerJoin(schema.leads, eq(t.leadId, schema.leads.id))
    .where(and(eq(t.assigneeId, userId), isNull(t.doneAt), lt(t.dueAt, new Date(endOfDay(now, timezone)))))
    .orderBy(asc(t.dueAt))
    .limit(limit);
}

export async function createTask(input: {
  leadId: string;
  title: string;
  dueAt: number;
  assigneeId: string | null;
  createdById: string;
}) {
  const [row] = await db
    .insert(t)
    .values({ ...input, dueAt: new Date(input.dueAt) })
    .returning();
  return row!;
}

async function loadEditable(id: string, user: CurrentUser) {
  const task = await db.select().from(t).where(eq(t.id, id)).get();
  if (!task) throw new Error("Tarefa não encontrada.");
  if (!canEditTask(task, user)) throw new Error("Você não pode alterar esta tarefa.");
  return task;
}

export async function setTaskDone(id: string, done: boolean, user: CurrentUser) {
  const task = await loadEditable(id, user);
  await db
    .update(t)
    .set({ doneAt: done ? new Date() : null })
    .where(eq(t.id, id));
  return task;
}

export async function deleteTask(id: string, user: CurrentUser) {
  const task = await loadEditable(id, user);
  await db.delete(t).where(eq(t.id, id));
  return task;
}

/**
 * Lembretes de tarefas vencidas: roda no tick do SLA. Marca `remindedAt` antes de
 * avisar para nunca repetir, mesmo se o WhatsApp falhar. Devolve quantas lembrou.
 */
export async function remindDueTasks(config: SlaConfig, now = Date.now()) {
  const due = await db
    .select({
      task: t,
      leadName: schema.leads.name,
      phone: schema.users.phone,
      userName: schema.users.name,
      active: schema.users.active,
    })
    .from(t)
    .innerJoin(schema.leads, eq(t.leadId, schema.leads.id))
    .innerJoin(schema.users, eq(t.assigneeId, schema.users.id))
    .where(and(isNull(t.doneAt), isNull(t.remindedAt), lte(t.dueAt, new Date(now))))
    .limit(100);

  let reminded = 0;
  for (const row of due) {
    const { task } = row;
    if (isStaleReminder(task.dueAt.getTime(), now)) {
      // Backlog antigo: marca sem avisar, para não disparar uma enxurrada de lembretes.
      await db.update(t).set({ remindedAt: new Date(now) }).where(eq(t.id, task.id));
      continue;
    }
    const ok = shouldRemind(
      { dueAt: task.dueAt.getTime(), doneAt: null, remindedAt: null },
      now,
      config,
    );
    if (!ok) continue;
    await db.update(t).set({ remindedAt: new Date(now) }).where(eq(t.id, task.id));
    if (!row.active) continue;
    reminded++;
    await db.insert(schema.notifications).values({
      userId: task.assigneeId!,
      leadId: task.leadId,
      type: "task_due",
      title: `Tarefa vencida: ${task.title}`.slice(0, 140),
      body: row.leadName,
    });
    if (config.taskWhatsappReminders && row.phone) {
      await sendTaskReminder({
        phone: row.phone,
        userName: row.userName,
        taskTitle: task.title,
        leadId: task.leadId,
        leadName: row.leadName,
      }).catch((err) => console.error("[tasks] lembrete no WhatsApp falhou", err));
    }
  }
  return reminded;
}
