"use client";

import { CheckIcon, ChevronDownIcon, PencilIcon, ShieldOffIcon, Trash2Icon, TrophyIcon, XCircleIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useState, useTransition } from "react";
import { toast } from "sonner";
import { StageBadge } from "@/components/leads/badges";
import { LostReasonDialog } from "@/components/leads/lost-reason-dialog";
import { LeadFormFields, type LeadFormDefaults } from "@/components/leads/lead-form-fields";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NativeSelect } from "@/components/ui/native-select";
import type { ActionResult } from "@/lib/action-result";
import { OPEN_STAGES, STAGES, type Stage } from "@/lib/leads";
import { anonymizeLeadAction, assignOwnerAction, deleteLeadAction, moveStageAction, updateLeadAction } from "../actions";
import { SubmitButton, submitKeepingValues } from "@/components/app/submit-button";

function useAction() {
  const [pending, startTransition] = useTransition();
  const run = (fn: () => Promise<ActionResult>, success: string) =>
    startTransition(async () => {
      const res = await fn();
      if (res.ok) toast.success(success);
      else toast.error(res.error);
    });
  return { pending, run };
}

export function StageControl({ leadId, stage }: { leadId: string; stage: Stage }) {
  const { pending, run } = useAction();
  const [lostOpen, setLostOpen] = useState(false);
  const closed = stage === "won" || stage === "lost";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="outline" disabled={pending} />}>
          <StageBadge stage={stage} className="h-5" />
          <ChevronDownIcon className="text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-48">
          {STAGES.map((s) => (
            <DropdownMenuItem
              key={s}
              onClick={() => (s === "lost" ? setLostOpen(true) : run(() => moveStageAction(leadId, s), "Etapa atualizada."))}
            >
              <StageBadge stage={s} />
              {s === stage ? <CheckIcon className="ml-auto" /> : null}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      {!closed ? (
        <>
          <Button
            variant="outline"
            className="text-success hover:text-success"
            disabled={pending}
            onClick={() => run(() => moveStageAction(leadId, "won"), "Venda ganha! 🎉")}
          >
            <TrophyIcon /> Ganho
          </Button>
          <Button variant="outline" disabled={pending} onClick={() => setLostOpen(true)}>
            <XCircleIcon /> Perdido
          </Button>
        </>
      ) : (
        <Button
          variant="ghost"
          disabled={pending}
          onClick={() => run(() => moveStageAction(leadId, OPEN_STAGES[1]!), "Lead reaberto.")}
        >
          Reabrir
        </Button>
      )}

      <LostReasonDialog
        open={lostOpen}
        onOpenChange={setLostOpen}
        pending={pending}
        onConfirm={(reason) => run(() => moveStageAction(leadId, "lost", reason), "Lead marcado como perdido.")}
      />
    </div>
  );
}

export function OwnerSelect({
  leadId,
  ownerId,
  owners,
  readOnly = false,
  allowUnassign = true,
}: {
  leadId: string;
  ownerId: string | null;
  owners: { id: string; name: string }[];
  /** Vendedor olhando lead de outro: só leitura (o servidor também recusa). */
  readOnly?: boolean;
  /** Só admin pode deixar o lead sem responsável. */
  allowUnassign?: boolean;
}) {
  const { pending, run } = useAction();
  return (
    <NativeSelect
      aria-label="Responsável"
      value={ownerId ?? ""}
      disabled={pending || readOnly}
      onChange={(e) => run(() => assignOwnerAction(leadId, e.target.value || null), "Responsável atualizado.")}
    >
      <option value="" disabled={!allowUnassign && ownerId !== null}>
        Sem responsável
      </option>
      {owners.map((o) => (
        <option key={o.id} value={o.id}>
          {o.name}
        </option>
      ))}
    </NativeSelect>
  );
}

export function EditLeadButton({ leadId, defaults }: { leadId: string; defaults: LeadFormDefaults }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(async (prev: ActionResult, formData: FormData) => {
    const res = await updateLeadAction(prev, formData);
    if (res.ok) {
      setOpen(false);
      toast.success("Lead atualizado.");
    }
    return res;
  }, { ok: false });

  return (
    <>
      <Button variant="ghost" size="icon" aria-label="Editar lead" onClick={() => setOpen(true)}>
        <PencilIcon />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar lead</DialogTitle>
          </DialogHeader>
          <form onSubmit={submitKeepingValues(action)} className="grid gap-4">
            <input type="hidden" name="id" value={leadId} />
            <LeadFormFields defaults={defaults} />
            {state.error ? (
              <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {state.error}
              </p>
            ) : null}
            <DialogFooter showCloseButton>
              <SubmitButton pending={pending}>
                Salvar
              </SubmitButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function DeleteLeadButton({ leadId, name }: { leadId: string; name: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  return (
    <>
      <Button variant="ghost" size="icon" aria-label="Excluir lead" onClick={() => setOpen(true)}>
        <Trash2Icon />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Excluir lead?</DialogTitle>
            <DialogDescription>
              &quot;{name}&quot; e todo o histórico serão apagados. Isso não pode ser desfeito.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter showCloseButton>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const res = await deleteLeadAction(leadId);
                  if (!res.ok) return void toast.error(res.error);
                  toast.success("Lead excluído.");
                  router.push("/leads");
                })
              }
            >
              Excluir definitivamente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** LGPD: remove dados pessoais a pedido do titular, mantendo o lead nas métricas. */
export function AnonymizeLeadButton({ leadId, name }: { leadId: string; name: string }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  return (
    <>
      <Button variant="ghost" size="icon" aria-label="Anonimizar lead (LGPD)" title="Anonimizar (LGPD)" onClick={() => setOpen(true)}>
        <ShieldOffIcon />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Anonimizar lead?</DialogTitle>
            <DialogDescription>
              Use quando &quot;{name}&quot; pedir a exclusão dos dados (LGPD). Nome, telefone, e-mail, mensagens e anexos
              serão apagados; etapa, origem e valor ficam para as métricas. Isso não pode ser desfeito.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter showCloseButton>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const res = await anonymizeLeadAction(leadId);
                  if (!res.ok) return void toast.error(res.error);
                  toast.success("Dados do lead anonimizados.");
                  setOpen(false);
                })
              }
            >
              Anonimizar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
