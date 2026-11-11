"use client";

import { PlusIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";
import { toast } from "sonner";
import { LeadFormFields } from "@/components/leads/lead-form-fields";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import type { ActionResult } from "@/lib/action-result";
import { createLeadAction } from "./actions";
import { SubmitButton, submitKeepingValues } from "@/components/app/submit-button";

type Result = ActionResult<{ id: string; created: boolean }>;

export function NewLeadDialog({
  owners,
  currentUserId,
}: {
  owners: { id: string; name: string }[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(async (prev: Result, formData: FormData) => {
    const res = await createLeadAction(prev, formData);
    if (res.ok && res.data) {
      setOpen(false);
      if (res.data.created) toast.success("Lead cadastrado.");
      else toast.info("Já existia um lead com este telefone. Abrimos o cadastro dele.");
      router.push(`/leads/${res.data.id}`);
    }
    return res;
  }, { ok: false });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <PlusIcon /> Novo lead
      </DialogTrigger>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Novo lead</DialogTitle>
          <DialogDescription>Telefones repetidos não duplicam: o lead existente é reaproveitado.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submitKeepingValues(action)} className="grid gap-4">
          <LeadFormFields />
          <div className="grid gap-2">
            <Label htmlFor="lead-owner">Responsável</Label>
            <NativeSelect id="lead-owner" name="ownerId" defaultValue={currentUserId}>
              <option value="auto">Distribuir automaticamente</option>
              {owners.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.id === currentUserId ? `${o.name} (eu)` : o.name}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="lead-message">Observação inicial</Label>
            <Textarea id="lead-message" name="message" rows={3} placeholder="O que o lead procura?" />
          </div>
          {state.error ? (
            <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {state.error}
            </p>
          ) : null}
          <DialogFooter showCloseButton>
            <SubmitButton pending={pending}>
              Cadastrar lead
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
