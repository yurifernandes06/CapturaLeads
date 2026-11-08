"use client";

import { LogOutIcon, MonitorIcon, MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";
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
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { initials } from "@/lib/format";

export function UserMenu({ user }: { user: { name: string; email: string; role: string } }) {
  const { theme, setTheme } = useTheme();
  const [pending, startTransition] = useTransition();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" className="h-9 gap-2 px-1.5" aria-label="Menu do usuário" />}
      >
        <Avatar className="size-7">
          <AvatarFallback className="bg-primary/15 text-xs font-semibold text-primary">
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
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel>Tema</DropdownMenuLabel>
          <DropdownMenuRadioGroup value={theme ?? "system"} onValueChange={(v) => setTheme(String(v))}>
            <DropdownMenuRadioItem value="light">
              <SunIcon /> Claro
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="dark">
              <MoonIcon /> Escuro
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="system">
              <MonitorIcon /> Sistema
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" disabled={pending} onClick={() => startTransition(() => logout())}>
          <LogOutIcon /> Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
