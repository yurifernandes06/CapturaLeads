"use client";

import { CheckCircle2Icon } from "lucide-react";
import Script from "next/script";
import { useActionState, useEffect, useState } from "react";
import { WhatsAppIcon } from "@/components/leads/badges";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ActionResult } from "@/lib/action-result";
import { whatsappLink } from "@/lib/phone";
import { submitPublicForm } from "./actions";
import { SubmitButton, submitKeepingValues } from "@/components/app/submit-button";

type FormView = {
  slug: string;
  title: string;
  description: string | null;
  buttonText: string;
  successMessage: string;
  askEmail: boolean;
  askCompany: boolean;
  /** WhatsApp da empresa (E.164 sem +) para o botão "chamar agora" no sucesso. */
  whatsappNumber: string | null;
};

declare global {
  interface Window {
    turnstile?: { reset: (widget?: string | HTMLElement) => void };
  }
}

/** Máscara leve de telefone BR enquanto digita: (11) 98765-4321 */
function maskPhone(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function PublicLeadForm({
  form,
  attribution,
  turnstileSiteKey,
}: {
  form: FormView;
  attribution: Record<string, string>;
  /** Captcha Cloudflare Turnstile; ausente = desligado. */
  turnstileSiteKey?: string;
}) {
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [page, setPage] = useState<{ referrer?: string; landing_page?: string }>({});
  const [state, action, pending] = useActionState<ActionResult, FormData>(submitPublicForm, { ok: false });

  // Fora do embed, a própria página é a landing e o referrer vem do navegador.
  useEffect(() => {
    const next = {
      landing_page: attribution.landing_page ? undefined : window.location.href,
      referrer: attribution.referrer || !document.referrer ? undefined : document.referrer,
    };
    const id = setTimeout(() => setPage(next), 0);
    return () => clearTimeout(id);
  }, [attribution.landing_page, attribution.referrer]);

  // O token do captcha é de uso único: depois de um erro, o widget precisa gerar outro.
  useEffect(() => {
    if (state.error && turnstileSiteKey) window.turnstile?.reset();
  }, [state, turnstileSiteKey]);

  const hidden = { ...attribution, ...Object.fromEntries(Object.entries(page).filter(([, v]) => v)) };

  if (state.ok) {
    return (
      <div className="rounded-2xl border bg-card p-8 text-center shadow-[0_30px_80px_-40px_black]">
        <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-[0_12px_36px_-12px_var(--primary)]">
          <CheckCircle2Icon className="size-8" />
        </span>
        <h1 className="mt-5 font-heading text-2xl font-semibold tracking-tight">Tudo certo!</h1>
        <p className="mt-2 text-muted-foreground">{form.successMessage}</p>
        {form.whatsappNumber ? (
          <a
            href={whatsappLink(
              form.whatsappNumber,
              `Olá! Sou ${name.trim().split(" ")[0] || "eu"} e acabei de preencher o formulário "${form.title}".`,
            )}
            target="_blank"
            rel="noreferrer"
            className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-whatsapp px-4 font-medium text-black transition-opacity hover:opacity-90"
          >
            <WhatsAppIcon className="size-5" /> Falar agora no WhatsApp
          </a>
        ) : null}
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border bg-card p-6 shadow-[0_30px_80px_-40px_black] sm:p-8">
      <span aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent" />
      <h1 className="font-heading text-2xl font-semibold tracking-tight text-balance sm:text-[1.7rem]">{form.title}</h1>
      {form.description ? <p className="mt-2 text-muted-foreground text-pretty">{form.description}</p> : null}

      <form onSubmit={submitKeepingValues(action)} className="mt-6 grid gap-4">
        <input type="hidden" name="slug" value={form.slug} />
        {Object.entries(hidden).map(([k, v]) => (v ? <input key={k} type="hidden" name={k} value={v} /> : null))}
        {/* Honeypot anti-spam: invisível para pessoas */}
        <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
          <label>
            Site <input type="text" name="website" tabIndex={-1} autoComplete="off" />
          </label>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="pf-name">Nome</Label>
          <Input
            id="pf-name"
            name="name"
            autoComplete="name"
            required
            minLength={2}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-11"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="pf-phone">WhatsApp</Label>
          <Input
            id="pf-phone"
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            placeholder="(11) 98765-4321"
            required
            value={phone}
            onChange={(e) => setPhone(maskPhone(e.target.value))}
            className="h-11"
          />
        </div>
        {form.askEmail ? (
          <div className="grid gap-2">
            <Label htmlFor="pf-email">
              E-mail <span className="font-normal text-muted-foreground">(opcional)</span>
            </Label>
            <Input id="pf-email" name="email" type="email" autoComplete="email" className="h-11" />
          </div>
        ) : null}
        {form.askCompany ? (
          <div className="grid gap-2">
            <Label htmlFor="pf-company">
              Empresa <span className="font-normal text-muted-foreground">(opcional)</span>
            </Label>
            <Input id="pf-company" name="company" autoComplete="organization" className="h-11" />
          </div>
        ) : null}
        <div className="grid gap-2">
          <Label htmlFor="pf-message">
            Como podemos ajudar? <span className="font-normal text-muted-foreground">(opcional)</span>
          </Label>
          <Textarea id="pf-message" name="message" rows={3} />
        </div>

        {turnstileSiteKey ? (
          <>
            <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer />
            <div className="cf-turnstile min-h-[65px]" data-sitekey={turnstileSiteKey} data-theme="dark" data-language="pt-br" />
          </>
        ) : null}

        {state.error ? (
          <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {state.error}
          </p>
        ) : null}

        <p className="text-xs leading-relaxed text-muted-foreground">
          Ao enviar, seus dados serão usados apenas para retornarmos o contato, conforme a{" "}
          <a href="/privacidade" target="_blank" rel="noopener" className="underline underline-offset-2 hover:text-foreground">
            Política de Privacidade
          </a>
          .
        </p>

        <SubmitButton pending={pending} size="lg" className="mt-1 h-12 text-base">
          {form.buttonText}
        </SubmitButton>
      </form>
    </div>
  );
}
