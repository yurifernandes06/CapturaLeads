"use client";

import { PlusIcon } from "lucide-react";
import { useActionState, useRef, useState } from "react";
import { toast } from "sonner";
import { TaskList, type TaskView } from "@/components/tasks/task-list";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import type { ActionResult } from "@/lib/action-result";
import { createTaskAction } from "../../tasks/actions";
import { SubmitButton, submitKeepingValues } from "@/components/app/submit-button";

/** Card "Tarefas" do detalhe do lead: lista + criação rápida. */
export function LeadTasks({
  leadId,
  tasks,
  defaultDue,
  currentUserId,
  owners,
}: {
  leadId: string;
  tasks: TaskView[];
  /** "AAAA-MM-DDTHH:mm" já no fuso do negócio. */
  defaultDue: string;
  currentUserId: string;
  owners: { id: string; name: string }[];
}) {
  const [adding, setAdding] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState(async (prev: ActionResult, formData: FormData) => {
    const res = await createTaskAction(prev, formData);
    if (res.ok) {
      formRef.current?.reset();
      setAdding(false);
      toast.success("Tarefa criada.");
    }
    return res;
  }, { ok: false });

  return (
    <div className="grid gap-3">
      <TaskList items={tasks} empty={adding ? undefined : "Nenhuma tarefa para este lead."} />

      {adding ? (
        <form ref={formRef} onSubmit={submitKeepingValues(action)} className="grid gap-2 rounded-lg border bg-muted/30 p-2.5">
          <input type="hidden" name="leadId" value={leadId} />
          <Input name="title" required maxLength={200} placeholder="Ex.: Ligar para apresentar a proposta" autoFocus />
          <div className="grid grid-cols-2 gap-2">
            <Input name="dueAt" type="datetime-local" required defaultValue={defaultDue} aria-label="Prazo" />
            <NativeSelect name="assigneeId" defaultValue={currentUserId} aria-label="Responsável">
              {owners.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.id === currentUserId ? "Eu" : o.name}
                </option>
              ))}
            </NativeSelect>
          </div>
          {state.error ? <p className="text-xs text-destructive">{state.error}</p> : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setAdding(false)}>
              Cancelar
            </Button>
            <SubmitButton pending={pending} size="sm">
              Criar tarefa
            </SubmitButton>
          </div>
        </form>
      ) : (
        <Button variant="outline" size="sm" className="justify-self-start" onClick={() => setAdding(true)}>
          <PlusIcon /> Nova tarefa
        </Button>
      )}
    </div>
  );
}
