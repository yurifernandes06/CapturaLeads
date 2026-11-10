"use client";

import { MenuIcon } from "lucide-react";
import { useState } from "react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { NavLinks, type NavBadges } from "./nav";

export function MobileNav({ badges }: { badges?: NavBadges }) {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button variant="ghost" size="icon" className="lg:hidden" aria-label="Abrir menu" />}>
        <MenuIcon />
      </SheetTrigger>
      <SheetContent side="left" className="w-72 border-sidebar-border bg-sidebar p-4 pt-6 text-sidebar-foreground">
        <SheetTitle className="sr-only">Menu</SheetTitle>
        <Logo className="mb-8 px-2 text-sidebar-accent-foreground" />
        <NavLinks onNavigate={() => setOpen(false)} badges={badges} />
      </SheetContent>
    </Sheet>
  );
}
