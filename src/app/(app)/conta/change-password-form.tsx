"use client";

import { Loader2Icon } from "lucide-react";
import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ActionResult } from "@/lib/action-result";
import { changePasswordAction } from "./actions";

export function ChangePasswordForm() {
  const [state, action, pending] = useActionState<ActionResult, FormData>(changePasswordAction, { ok: false });

  useEffect(() => {
    if (state.ok) toast.success("Senha alterada. Outros aparelhos foram desconectados.");
  }, [state]);

  return (
    <form action={action} className="grid max-w-sm gap-4">
      <div className="grid gap-2">
        <Label htmlFor="current">Senha atual</Label>
        <Input id="current" name="current" type="password" autoComplete="current-password" required />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="password">Nova senha</Label>
        <Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="confirm">Repita a nova senha</Label>
        <Input id="confirm" name="confirm" type="password" autoComplete="new-password" minLength={8} required />
      </div>
      {state.error ? (
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" disabled={pending} className="w-fit">
        {pending ? <Loader2Icon className="animate-spin" /> : null}
        Trocar senha
      </Button>
    </form>
  );
}
