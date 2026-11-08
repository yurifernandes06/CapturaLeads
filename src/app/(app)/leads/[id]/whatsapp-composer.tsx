"use client";

import { SendIcon } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { renderTemplate, type MessageTemplate } from "@/lib/templates";
import { sendWhatsAppAction } from "./whatsapp-actions";

export function WhatsAppComposer({
  leadId,
  hasPhone,
  templates,
  vars,
  providerLabel,
}: {
  leadId: string;
  hasPhone: boolean;
  templates: MessageTemplate[];
  vars: { nome: string; empresa: string | null; vendedor: string };
  providerLabel: string;
}) {
  const [text, setText] = useState("");
  const [pending, startTransition] = useTransition();

  if (!hasPhone) {
    return <p className="px-1 py-4 text-sm text-muted-foreground">Cadastre um telefone para conversar pelo WhatsApp.</p>;
  }

  const send = () =>
    startTransition(async () => {
      const res = await sendWhatsAppAction(leadId, text);
      if (res.ok) {
        setText("");
        toast.success("Mensagem enviada.");
      } else {
        toast.error(res.error, { description: res.data?.hint, duration: 8000 });
      }
    });

  return (
    <div className="grid gap-2">
      {templates.length ? (
        <div className="flex flex-wrap gap-1.5">
          {templates.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setText(renderTemplate(t.body, vars))}
              className="h-7 rounded-full border px-3 text-xs font-medium transition-colors hover:border-whatsapp/40 hover:bg-whatsapp/10"
            >
              {t.name}
            </button>
          ))}
        </div>
      ) : null}
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        placeholder="Escreva uma mensagem ou escolha um template…"
        className="resize-none border-0 bg-transparent px-1 shadow-none focus-visible:ring-0 dark:bg-transparent"
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && text.trim()) send();
        }}
      />
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">Via {providerLabel} · Ctrl + Enter envia</span>
        <Button
          size="sm"
          className="bg-whatsapp text-white hover:bg-whatsapp/90"
          disabled={pending || !text.trim()}
          onClick={send}
        >
          <SendIcon /> Enviar
        </Button>
      </div>
    </div>
  );
}
