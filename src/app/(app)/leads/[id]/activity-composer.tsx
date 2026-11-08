"use client";

import { PhoneIcon, StickyNoteIcon } from "lucide-react";
import { useActionState, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { ActionResult } from "@/lib/action-result";
import { cn } from "@/lib/utils";
import { addActivityAction } from "../actions";

type Tab = { id: string; label: string; icon: ReactNode };

const BASE_TABS: Tab[] = [
  { id: "note", label: "Nota", icon: <StickyNoteIcon /> },
  { id: "call", label: "Ligação", icon: <PhoneIcon /> },
];

/**
 * Caixa de registro rápido no topo da timeline. `extraTabs` permite que
 * outras features (ex.: WhatsApp) pluguem suas próprias abas.
 */
export function ActivityComposer({
  leadId,
  extraTabs = [],
}: {
  leadId: string;
  extraTabs?: (Tab & { content: ReactNode })[];
}) {
  const tabs = [...extraTabs, ...BASE_TABS];
  const [tab, setTab] = useState(tabs[0]!.id);
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState(async (prev: ActionResult, formData: FormData) => {
    const res = await addActivityAction(prev, formData);
    if (res.ok) {
      formRef.current?.reset();
      toast.success(formData.get("type") === "call" ? "Ligação registrada." : "Nota salva.");
    }
    return res;
  }, { ok: false });

  const extra = extraTabs.find((t) => t.id === tab);

  return (
    <div className="rounded-xl border bg-card">
      <div role="tablist" className="flex gap-1 border-b px-2 pt-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "-mb-px inline-flex items-center gap-1.5 border-b-2 border-transparent px-3 pb-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground [&_svg]:size-4",
              tab === t.id && "border-primary text-foreground",
            )}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>
      {extra ? (
        <div className="p-3">{extra.content}</div>
      ) : (
        <form ref={formRef} action={action} className="grid gap-2 p-3">
          <input type="hidden" name="leadId" value={leadId} />
          <input type="hidden" name="type" value={tab} />
          <Textarea
            name="body"
            rows={3}
            required
            placeholder={tab === "call" ? "Resumo da ligação: o que foi combinado?" : "Escreva uma nota interna…"}
            className="resize-none border-0 bg-transparent px-1 shadow-none focus-visible:ring-0 dark:bg-transparent"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) e.currentTarget.form?.requestSubmit();
            }}
          />
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">
              {state.error ? <span className="text-destructive">{state.error}</span> : "Ctrl + Enter para salvar"}
            </span>
            <Button type="submit" size="sm" disabled={pending}>
              {tab === "call" ? "Registrar ligação" : "Salvar nota"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
