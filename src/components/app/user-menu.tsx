"use client";

import { LogOutIcon, UserCogIcon } from "lucide-react";
import Link from "next/link";
import { useTransition } from "react";
import { logout } from "@/app/(auth)/login/actions";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { initials } from "@/lib/format";

export function UserMenu({ user }: { user: { name: string; email: string; role: string } }) {
  const [pending, startTransition] = useTransition();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" className="h-9 gap-2 px-1.5" aria-label="Menu do usuário" />}
      >
        <Avatar className="size-7">
          <AvatarFallback className="bg-primary text-[0.7rem] font-semibold text-primary-foreground">
            {initials(user.name)}
          </AvatarFallback>
        </Avatar>
        <span className="hidden max-w-32 truncate text-sm font-medium sm:inline">{user.name}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="font-normal">
            <div className="truncate text-sm font-medium text-foreground">{user.name}</div>
            <div className="truncate text-xs text-muted-foreground">{user.email}</div>
            <div className="mt-1.5 eyebrow text-primary">{user.role === "admin" ? "Administrador" : "Vendedor"}</div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href="/conta" />}>
          <UserCogIcon /> Minha conta
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive" disabled={pending} onClick={() => startTransition(() => logout())}>
          <LogOutIcon /> Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
