"use client";

import { PencilIcon, PlusIcon } from "lucide-react";
import { useActionState, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { formatPhone } from "@/lib/phone";
import type { Form } from "@/db/schema";
import type { ActionResult } from "@/lib/action-result";
import { PRIORITIES, PRIORITY_META } from "@/lib/leads";
import { saveFormAction, setFormActiveAction } from "./actions";
import { SubmitButton, submitKeepingValues } from "@/components/app/submit-button";

export function FormDialog({ form }: { form?: Form }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(async (prev: ActionResult, formData: FormData) => {
    const res = await saveFormAction(prev, formData);
    if (res.ok) {
      setOpen(false);
      toast.success(form ? "Formulário atualizado." : "Formulário criado.");
    }
    return res;
  }, { ok: false });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {form ? (
        <DialogTrigger render={<Button variant="ghost" size="icon" aria-label={`Editar ${form.name}`} />}>
          <PencilIcon />
        </DialogTrigger>
      ) : (
        <DialogTrigger render={<Button />}>
          <PlusIcon /> Novo formulário
        </DialogTrigger>
      )}
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{form ? "Editar formulário" : "Novo formulário"}</DialogTitle>
          <DialogDescription>Nome, telefone e mensagem são sempre pedidos. E-mail e empresa são opcionais.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submitKeepingValues(action)} className="grid gap-4">
          {form ? <input type="hidden" name="id" value={form.id} /> : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Nome interno" htmlFor="ff-name">
              <Input id="ff-name" name="name" defaultValue={form?.name} placeholder="Anúncio Black Friday" required />
            </Field>
            <Field label="Endereço (/f/…)" htmlFor="ff-slug">
              <Input id="ff-slug" name="slug" defaultValue={form?.slug} placeholder="gerado do nome" />
            </Field>
          </div>
          <Field label="Título para o lead" htmlFor="ff-title">
            <Input
              id="ff-title"
              name="title"
              defaultValue={form?.title}
              placeholder="Fale com um especialista em 5 minutos"
              required
            />
          </Field>
          <Field label="Descrição" htmlFor="ff-desc">
            <Textarea id="ff-desc" name="description" rows={2} defaultValue={form?.description ?? ""} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Texto do botão" htmlFor="ff-btn">
              <Input id="ff-btn" name="buttonText" defaultValue={form?.buttonText ?? "Quero ser atendido"} required />
            </Field>
            <Field label="Prioridade dos leads" htmlFor="ff-priority">
              <NativeSelect id="ff-priority" name="priority" defaultValue={form?.priority ?? "high"}>
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {PRIORITY_META[p].label}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          </div>
          <Field label="Mensagem de sucesso" htmlFor="ff-success">
            <Input
              id="ff-success"
              name="successMessage"
              defaultValue={form?.successMessage ?? "Recebemos seu contato! Em instantes falamos com você no WhatsApp."}
              required
            />
          </Field>
          <Field label="Tags aplicadas" htmlFor="ff-tags">
            <Input id="ff-tags" name="tags" defaultValue={form?.tags.join(", ")} placeholder="black-friday, anuncio-meta" />
          </Field>
          <Field label="Boas-vindas automática no WhatsApp (opcional)" htmlFor="ff-welcome">
            <Textarea
              id="ff-welcome"
              name="welcomeMessage"
              rows={3}
              defaultValue={form?.welcomeMessage ?? ""}
              placeholder="Oi, {{primeiro_nome}}! Recebemos seu cadastro. Sou {{vendedor}} e já vou te atender 🙂"
            />
            <span className="text-xs text-muted-foreground">
              Não conta como 1ª resposta: o SLA continua esperando o contato humano.
            </span>
          </Field>
          <Field label="WhatsApp da empresa (opcional)" htmlFor="ff-wa">
            <Input
              id="ff-wa"
              name="whatsappNumber"
              type="tel"
              inputMode="tel"
              defaultValue={form?.whatsappNumber ? formatPhone(form.whatsappNumber) : ""}
              placeholder="(11) 98765-4321"
            />
            <span className="text-xs text-muted-foreground">
              Depois de enviar, o lead vê o botão &quot;Falar agora no WhatsApp&quot; — conversa começa na hora, enquanto
              o interesse está quente.
            </span>
          </Field>
          <div className="flex flex-wrap gap-5 text-sm">
            <label className="flex items-center gap-2">
              <Checkbox name="askEmail" value="on" defaultChecked={form?.askEmail ?? true} /> Pedir e-mail
            </label>
            <label className="flex items-center gap-2">
              <Checkbox name="askCompany" value="on" defaultChecked={form?.askCompany ?? false} /> Pedir empresa
            </label>
          </div>
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
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}

export function FormActiveSwitch({ id, active }: { id: string; active: boolean }) {
  const [pending, startTransition] = useTransition();
  return (
    <Switch
      aria-label={active ? "Desativar formulário" : "Ativar formulário"}
      checked={active}
      disabled={pending}
      onCheckedChange={(v) =>
        startTransition(async () => {
          const res = await setFormActiveAction(id, v);
          if (!res.ok) toast.error(res.error);
        })
      }
    />
  );
}
