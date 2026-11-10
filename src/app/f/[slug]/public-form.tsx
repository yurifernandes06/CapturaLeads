"use client";

import { CheckCircle2Icon, Loader2Icon } from "lucide-react";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ActionResult } from "@/lib/action-result";
import { submitPublicForm } from "./actions";

type FormView = {
  slug: string;
  title: string;
  description: string | null;
  buttonText: string;
  successMessage: string;
  askEmail: boolean;
  askCompany: boolean;
};

/** Máscara leve de telefone BR enquanto digita: (11) 98765-4321 */
function maskPhone(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function PublicLeadForm({ form, utm }: { form: FormView; utm: Record<string, string> }) {
  const [phone, setPhone] = useState("");
  const [state, action, pending] = useActionState<ActionResult, FormData>(submitPublicForm, { ok: false });

  if (state.ok) {
    return (
      <div className="rounded-2xl border bg-card p-8 text-center shadow-[0_30px_80px_-40px_black]">
        <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-[0_12px_36px_-12px_var(--primary)]">
          <CheckCircle2Icon className="size-8" />
        </span>
        <h1 className="mt-5 font-heading text-2xl font-semibold tracking-tight">Tudo certo!</h1>
        <p className="mt-2 text-muted-foreground">{form.successMessage}</p>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border bg-card p-6 shadow-[0_30px_80px_-40px_black] sm:p-8">
      <span aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent" />
      <h1 className="font-heading text-2xl font-semibold tracking-tight text-balance sm:text-[1.7rem]">{form.title}</h1>
      {form.description ? <p className="mt-2 text-muted-foreground text-pretty">{form.description}</p> : null}

      <form action={action} className="mt-6 grid gap-4">
        <input type="hidden" name="slug" value={form.slug} />
        {Object.entries(utm).map(([k, v]) => (v ? <input key={k} type="hidden" name={k} value={v} /> : null))}
        {/* Honeypot anti-spam: invisível para pessoas */}
        <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
          <label>
            Site <input type="text" name="website" tabIndex={-1} autoComplete="off" />
          </label>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="pf-name">Nome</Label>
          <Input id="pf-name" name="name" autoComplete="name" required minLength={2} className="h-11" />
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

        {state.error ? (
          <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {state.error}
          </p>
        ) : null}

        <Button type="submit" size="lg" className="mt-1 h-12 text-base" disabled={pending}>
          {pending ? <Loader2Icon className="animate-spin" /> : null}
          {form.buttonText}
        </Button>
      </form>
    </div>
  );
}
