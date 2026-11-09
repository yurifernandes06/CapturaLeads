"use client";

import { Trash2Icon } from "lucide-react";
import Link from "next/link";
import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";
import { deleteTaskAction, toggleTaskAction } from "@/app/(app)/tasks/actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import type { TaskBucket } from "@/lib/tasks";
import { cn } from "@/lib/utils";

/** Tarefa já serializada pelo servidor (prazo formatado no fuso do negócio). */
export type TaskView = {
  id: string;
  title: string;
  due: string;
  bucket: TaskBucket;
  done: boolean;
  canEdit: boolean;
  lead?: { id: string; name: string };
  assigneeName?: string | null;
};

export function TaskList({ items, empty }: { items: TaskView[]; empty?: string }) {
  const [, startTransition] = useTransition();
  const [optimistic, apply] = useOptimistic(
    items,
    (state, patch: { id: string; done?: boolean; removed?: boolean }) =>
      patch.removed
        ? state.filter((t) => t.id !== patch.id)
        : state.map((t) => (t.id === patch.id ? { ...t, done: patch.done ?? t.done } : t)),
  );

  const toggle = (task: TaskView, done: boolean) =>
    startTransition(async () => {
      apply({ id: task.id, done });
      const res = await toggleTaskAction(task.id, done);
      if (!res.ok) toast.error(res.error);
      else if (done) toast.success("Tarefa concluída.");
    });

  const remove = (task: TaskView) =>
    startTransition(async () => {
      apply({ id: task.id, removed: true });
      const res = await deleteTaskAction(task.id);
      if (!res.ok) toast.error(res.error);
    });

  if (!optimistic.length) {
    return empty ? <p className="py-4 text-center text-sm text-muted-foreground">{empty}</p> : null;
  }

  return (
    <ul className="-mx-2 grid">
      {optimistic.map((task) => (
        <li key={task.id} className="group flex items-start gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted/50">
          <Checkbox
            className="mt-0.5"
            checked={task.done}
            disabled={!task.canEdit}
            onCheckedChange={(checked) => toggle(task, checked === true)}
            aria-label={task.done ? `Reabrir: ${task.title}` : `Concluir: ${task.title}`}
          />
          <div className="min-w-0 flex-1">
            <p className={cn("text-sm break-words", task.done && "text-muted-foreground line-through")}>{task.title}</p>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
              <span
                className={cn(
                  "tabular",
                  !task.done && task.bucket === "overdue" && "font-medium text-danger",
                  !task.done && task.bucket === "today" && "font-medium text-warning",
                )}
              >
                {task.due}
              </span>
              {task.lead ? (
                <Link href={`/leads/${task.lead.id}`} className="truncate hover:text-foreground hover:underline">
                  {task.lead.name}
                </Link>
              ) : null}
              {task.assigneeName ? <span className="truncate">· {task.assigneeName}</span> : null}
            </p>
          </div>
          {task.canEdit ? (
            <Button
              variant="ghost"
              size="icon-xs"
              className="opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 max-sm:opacity-100"
              aria-label={`Excluir: ${task.title}`}
              onClick={() => remove(task)}
            >
              <Trash2Icon />
            </Button>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
