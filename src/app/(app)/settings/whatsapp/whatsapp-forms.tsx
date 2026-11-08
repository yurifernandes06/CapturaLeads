"use client";

import { PlusIcon, Trash2Icon } from "lucide-react";
import Link from "next/link";
import { useActionState, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ActionResult } from "@/lib/action-result";
import type { MessageTemplate } from "@/lib/templates";
import { saveTemplatesAction, simulateInboundAction } from "./actions";

export function TemplatesEditor({ initial, readOnly }: { initial: MessageTemplate[]; readOnly: boolean }) {
  const [items, setItems] = useState(initial);
  const [pending, startTransition] = useTransition();

  const update = (id: string, patch: Partial<MessageTemplate>) =>
    setItems((list) => list.map((t) => (t.id === id ? { ...t, ...patch } : t)));

  return (
    <fieldset disabled={readOnly || pending} className="grid gap-4">
      {items.map((t) => (
        <div key={t.id} className="grid gap-2 rounded-lg border p-3">
          <div className="flex items-center gap-2">
            <Input
              aria-label="Nome do template"
              value={t.name}
              maxLength={40}
              onChange={(e) => update(t.id, { name: e.target.value })}
              className="font-medium"
            />
            {!readOnly ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Remover ${t.name}`}
                onClick={() => setItems((list) => list.filter((x) => x.id !== t.id))}
              >
                <Trash2Icon />
              </Button>
            ) : null}
          </div>
          <Textarea
            aria-label="Mensagem"
            rows={3}
            value={t.body}
            maxLength={1000}
            onChange={(e) => update(t.id, { body: e.target.value })}
          />
        </div>
      ))}
      {!readOnly ? (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setItems((list) => [...list, { id: crypto.randomUUID(), name: "Novo template", body: "" }])}
          >
            <PlusIcon /> Adicionar template
          </Button>
          <Button
            type="button"
            onClick={() =>
              startTransition(async () => {
                const res = await saveTemplatesAction(items);
                if (res.ok) toast.success("Templates salvos.");
                else toast.error(res.error);
              })
            }
          >
            Salvar templates
          </Button>
        </div>
      ) : null}
    </fieldset>
  );
}

type SimResult = ActionResult<{ leadId: string; created: boolean }>;

export function SimulateInbound() {
  const [state, action, pending] = useActionState(async (prev: SimResult, formData: FormData) => {
    const res = await simulateInboundAction(prev, formData);
    if (res.ok) toast.success(res.data?.created ? "Lead novo criado pelo WhatsApp." : "Mensagem adicionada ao lead existente.");
    else toast.error(res.error);
    return res;
  }, { ok: false });

  return (
    <form action={action} className="grid gap-3">
      <div className="grid gap-2">
        <Label htmlFor="sim-phone">Telefone de quem enviou</Label>
        <Input id="sim-phone" name="phone" defaultValue="(11) 91234-5678" required />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="sim-name">Nome do perfil</Label>
        <Input id="sim-name" name="name" defaultValue="Cliente Teste" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="sim-text">Mensagem</Label>
        <Textarea id="sim-text" name="text" rows={3} defaultValue="Oi! Quero saber o preço do plano anual." required />
      </div>
      <Button type="submit" disabled={pending} className="bg-whatsapp text-white hover:bg-whatsapp/90">
        Simular recebimento
      </Button>
      {state.ok && state.data ? (
        <Link href={`/leads/${state.data.leadId}`} className="text-sm font-medium text-primary hover:underline">
          Abrir lead →
        </Link>
      ) : null}
    </form>
  );
}
