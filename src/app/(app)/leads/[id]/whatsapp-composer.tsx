"use client";

import { SendIcon } from "lucide-react";
import { useId, useRef, useState, useTransition, type KeyboardEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { applySlashCommand, filterCommands, findSlashCommand, type SlashMatch } from "@/lib/slash-commands";
import { renderTemplate, type MessageTemplate } from "@/lib/templates";
import { cn } from "@/lib/utils";
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const listId = useId();
  // Menu do "/": comando sob o cursor, opção destacada e comando dispensado com Esc.
  const [slash, setSlash] = useState<SlashMatch | null>(null);
  const [active, setActive] = useState(0);
  const [dismissedAt, setDismissedAt] = useState<number | null>(null);

  const options = slash ? filterCommands(templates, slash.query) : [];
  const menuOpen = Boolean(slash) && templates.length > 0 && slash?.start !== dismissedAt;

  /** Recalcula o comando a partir do texto e da posição real do cursor. */
  const syncSlash = (value: string, cursor: number) => {
    const match = findSlashCommand(value, cursor);
    if (match?.start !== slash?.start || match?.query !== slash?.query) setActive(0);
    if (!match || match.start !== dismissedAt) setDismissedAt(null);
    setSlash(match);
  };

  const choose = (template: MessageTemplate) => {
    if (!slash) return;
    const next = applySlashCommand(text, slash, renderTemplate(template.body, vars));
    setText(next.text);
    setSlash(null);
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      el?.focus();
      el?.setSelectionRange(next.cursor, next.cursor);
    });
  };

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

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (menuOpen && slash) {
      if (e.key === "Escape") {
        e.preventDefault();
        setDismissedAt(slash.start);
        return;
      }
      if (options.length) {
        if (e.key === "ArrowDown" || e.key === "ArrowUp") {
          e.preventDefault();
          const step = e.key === "ArrowDown" ? 1 : -1;
          setActive((i) => (i + step + options.length) % options.length);
          return;
        }
        if ((e.key === "Enter" && !e.metaKey && !e.ctrlKey) || e.key === "Tab") {
          e.preventDefault();
          choose(options[Math.min(active, options.length - 1)]!);
          return;
        }
      }
    }
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && text.trim()) send();
  };

  if (!hasPhone) {
    return <p className="px-1 py-4 text-sm text-muted-foreground">Cadastre um telefone para conversar pelo WhatsApp.</p>;
  }

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
      <div className="relative">
        <Textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            syncSlash(e.target.value, e.target.selectionStart);
          }}
          onSelect={(e) => syncSlash(e.currentTarget.value, e.currentTarget.selectionStart)}
          onBlur={() => setSlash(null)}
          rows={3}
          placeholder={templates.length ? "Escreva uma mensagem ou digite / para usar um template…" : "Escreva uma mensagem…"}
          className="resize-none border-0 bg-transparent px-1 shadow-none focus-visible:ring-0 dark:bg-transparent"
          onKeyDown={onKeyDown}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={menuOpen}
          aria-controls={menuOpen ? listId : undefined}
          aria-activedescendant={menuOpen && options.length ? `${listId}-${active}` : undefined}
        />
        {menuOpen ? (
          <div
            id={listId}
            role="listbox"
            aria-label="Templates"
            className="absolute top-full right-0 left-0 z-20 mt-1 max-h-72 overflow-y-auto rounded-lg border bg-popover p-1 text-popover-foreground shadow-lg"
          >
            {options.length ? (
              options.map((t, i) => (
                <div
                  key={t.id}
                  id={`${listId}-${i}`}
                  role="option"
                  aria-selected={i === active}
                  // mouseDown + preventDefault: escolhe sem tirar o foco do campo.
                  onMouseDown={(e) => {
                    e.preventDefault();
                    choose(t);
                  }}
                  onMouseEnter={() => setActive(i)}
                  className={cn("cursor-pointer rounded-md px-2.5 py-2", i === active && "bg-accent text-accent-foreground")}
                >
                  <p className="text-sm font-medium">{t.name}</p>
                  <p className="line-clamp-2 text-xs text-muted-foreground">{renderTemplate(t.body, vars)}</p>
                </div>
              ))
            ) : (
              <p className="px-2.5 py-2 text-sm text-muted-foreground">Nenhum template com “{slash?.query}”.</p>
            )}
          </div>
        ) : null}
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">
          Via {providerLabel} · {templates.length ? "/ templates · " : ""}Ctrl + Enter envia
        </span>
        <Button
          size="sm"
          className="bg-whatsapp text-black hover:bg-whatsapp/90"
          disabled={pending || !text.trim()}
          onClick={send}
        >
          <SendIcon /> Enviar
        </Button>
      </div>
    </div>
  );
}
