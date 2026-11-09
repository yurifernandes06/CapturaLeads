"use client";

import { KeyRoundIcon, MoreHorizontalIcon, PlusIcon, ShieldIcon, UserXIcon, UserCheckIcon } from "lucide-react";
import { useActionState, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import type { ActionResult } from "@/lib/action-result";
import { createUser, resetPassword, setUserActive, setUserRole } from "./actions";

function FormError({ state }: { state: ActionResult }) {
  if (!state.error) return null;
  return (
    <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
      {state.error}
    </p>
  );
}

export function CreateUserDialog() {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(async (prev: ActionResult, formData: FormData) => {
    const res = await createUser(prev, formData);
    if (res.ok) {
      setOpen(false);
      toast.success("Usuário criado.");
    }
    return res;
  }, { ok: false });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <PlusIcon /> Novo usuário
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Novo usuário</DialogTitle>
          <DialogDescription>O acesso é liberado na hora com a senha definida aqui.</DialogDescription>
        </DialogHeader>
        <form action={action} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Nome</Label>
            <Input id="name" name="name" required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" name="email" type="email" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="role">Papel</Label>
              <NativeSelect id="role" name="role" defaultValue="sales">
                <option value="sales">Vendedor</option>
                <option value="admin">Admin</option>
              </NativeSelect>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phone">WhatsApp</Label>
              <Input id="phone" name="phone" placeholder="(11) 98765-4321" />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Senha inicial</Label>
            <Input id="password" name="password" type="password" minLength={8} required />
          </div>
          <FormError state={state} />
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              Criar usuário
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

type RowUser = { id: string; name: string; role: "admin" | "sales"; active: boolean };

export function UserRowActions({ user }: { user: RowUser }) {
  const [pending, startTransition] = useTransition();
  const [resetOpen, setResetOpen] = useState(false);

  const run = (fn: () => Promise<ActionResult>, success: string) =>
    startTransition(async () => {
      const res = await fn();
      if (res.ok) toast.success(success);
      else toast.error(res.error);
    });

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="ghost" size="icon-sm" aria-label={`Ações para ${user.name}`} disabled={pending} />}
        >
          <MoreHorizontalIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem onClick={() => setResetOpen(true)}>
            <KeyRoundIcon /> Redefinir senha
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() =>
              run(
                () => setUserRole(user.id, user.role === "admin" ? "sales" : "admin"),
                "Papel atualizado.",
              )
            }
          >
            <ShieldIcon /> {user.role === "admin" ? "Tornar vendedor" : "Tornar admin"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {user.active ? (
            <DropdownMenuItem variant="destructive" onClick={() => run(() => setUserActive(user.id, false), "Usuário desativado.")}>
              <UserXIcon /> Desativar
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={() => run(() => setUserActive(user.id, true), "Usuário reativado.")}>
              <UserCheckIcon /> Reativar
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <ResetPasswordDialog user={user} open={resetOpen} onOpenChange={setResetOpen} />
    </>
  );
}

function ResetPasswordDialog({
  user,
  open,
  onOpenChange,
}: {
  user: RowUser;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [state, action, pending] = useActionState(async (prev: ActionResult, formData: FormData) => {
    const res = await resetPassword(prev, formData);
    if (res.ok) {
      onOpenChange(false);
      toast.success("Senha redefinida. As sessões do usuário foram encerradas.");
    }
    return res;
  }, { ok: false });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Redefinir senha</DialogTitle>
          <DialogDescription>{user.name} vai precisar entrar de novo.</DialogDescription>
        </DialogHeader>
        <form action={action} className="grid gap-4">
          <input type="hidden" name="userId" value={user.id} />
          <div className="grid gap-2">
            <Label htmlFor={`pw-${user.id}`}>Nova senha</Label>
            <Input id={`pw-${user.id}`} name="password" type="password" minLength={8} required />
          </div>
          <FormError state={state} />
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              Salvar senha
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
