import { AlarmClockIcon, CalendarClockIcon, CalendarDaysIcon, CircleCheckIcon, type LucideIcon } from "lucide-react";
import type { Metadata } from "next";
import { PageHeader } from "@/components/app/page-header";
import { TaskList, type TaskView } from "@/components/tasks/task-list";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TASK_BUCKETS, TASK_BUCKET_LABEL, type TaskBucket } from "@/lib/tasks";
import { cn } from "@/lib/utils";
import { requireUser } from "@/server/auth/dal";
import { requestNow } from "@/server/clock";
import { getSetting } from "@/server/settings";
import { listMyTasks, toTaskView } from "@/server/tasks";

export const metadata: Metadata = { title: "Minhas tarefas" };

const BUCKET_META: Record<TaskBucket, { icon: LucideIcon; tone: string; empty: string }> = {
  overdue: { icon: AlarmClockIcon, tone: "text-primary-text", empty: "Nada atrasado." },
  today: { icon: CalendarClockIcon, tone: "text-warning", empty: "Nada para hoje." },
  upcoming: { icon: CalendarDaysIcon, tone: "text-muted-foreground", empty: "Nenhuma tarefa agendada." },
};

export default async function TasksPage() {
  const user = await requireUser();
  const now = requestNow();
  const { timezone } = await getSetting("sla");
  const { open, done } = await listMyTasks(user.id, now);

  const view = (rows: typeof open) =>
    rows.map(({ task, leadName }) =>
      toTaskView(task, { now, timezone, user }, { lead: { id: task.leadId, name: leadName } }),
    );
  const groups = Object.groupBy(view(open), (t) => t.bucket) as Partial<Record<TaskBucket, TaskView[]>>;
  const overdue = groups.overdue?.length ?? 0;
  const today = groups.today?.length ?? 0;

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Rotina"
        title="Minhas tarefas"
        description={
          open.length
            ? `${open.length} em aberto${overdue ? ` · ${overdue} atrasada${overdue > 1 ? "s" : ""}` : ""}${today ? ` · ${today} para hoje` : ""}`
            : "Tudo em dia. Crie tarefas a partir do detalhe de cada lead."
        }
      />

      <div className="grid items-start gap-6 lg:grid-cols-3">
        {TASK_BUCKETS.map((bucket) => {
          const { icon: Icon, tone, empty } = BUCKET_META[bucket];
          const items = groups[bucket] ?? [];
          return (
            <Card
              key={bucket}
              className={cn(bucket === "overdue" && items.length && "bg-gradient-to-b from-primary/12 to-card ring-primary/35")}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Icon className={cn("size-4", tone)} />
                  {TASK_BUCKET_LABEL[bucket]}
                  <span className="ml-auto rounded-md bg-white/[0.06] px-1.5 font-mono text-xs font-normal text-muted-foreground tabular">
                    {items.length}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <TaskList items={items} empty={empty} />
              </CardContent>
            </Card>
          );
        })}
      </div>

      {done.length ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CircleCheckIcon className="size-4 text-success" /> Concluídas
            </CardTitle>
            <CardDescription>Últimos 7 dias. Desmarque para reabrir.</CardDescription>
          </CardHeader>
          <CardContent>
            <TaskList items={view(done)} />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
