"use client";

import { CheckCircle2Icon, Loader2Icon } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { forgotPassword, resetPassword, type PasswordFormState } from "./actions";

function Feedback({ state }: { state: PasswordFormState }) {
  if (state.error) {
    return (
      <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
        {state.error}
      </p>
    );
  }
  return null;
}

function Success({ message }: { message?: string }) {
  return (
    <div role="status" className="grid gap-4 text-center">
      <CheckCircle2Icon className="mx-auto size-10 text-success" aria-hidden />
      <p className="text-sm text-muted-foreground">{message}</p>
      <Link href="/login" className={buttonVariants({ size: "lg", className: "h-11" })}>
        Ir para o login
      </Link>
    </div>
  );
}

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState<PasswordFormState, FormData>(forgotPassword, {});
  if (state.ok) return <Success message={state.message} />;
  return (
    <form action={action} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="email">E-mail</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required autoFocus className="h-11 bg-black/40" />
      </div>
      <Feedback state={state} />
      <Button type="submit" size="lg" className="h-11" disabled={pending}>
        {pending ? <Loader2Icon className="animate-spin" /> : null}
        Enviar link pelo WhatsApp
      </Button>
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState<PasswordFormState, FormData>(resetPassword, {});
  if (state.ok) return <Success message={state.message} />;
  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="token" value={token} />
      <div className="grid gap-2">
        <Label htmlFor="password">Nova senha</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          autoFocus
          className="h-11 bg-black/40"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="confirm">Repita a nova senha</Label>
        <Input id="confirm" name="confirm" type="password" autoComplete="new-password" minLength={8} required className="h-11 bg-black/40" />
      </div>
      <Feedback state={state} />
      <Button type="submit" size="lg" className="h-11" disabled={pending}>
        {pending ? <Loader2Icon className="animate-spin" /> : null}
        Salvar nova senha
      </Button>
    </form>
  );
}
