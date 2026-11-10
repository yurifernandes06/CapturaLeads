"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { SETTINGS_TABS } from "./tabs";

export function SettingsTabs() {
  const pathname = usePathname();
  return (
    <nav className="mb-8 flex w-fit max-w-full gap-1 overflow-x-auto rounded-xl border bg-black/40 p-1">
      {SETTINGS_TABS.map((tab) => {
        const active = pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "rounded-lg px-3.5 py-1.5 text-sm font-medium whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground",
              active && "bg-primary text-primary-foreground shadow-[0_6px_20px_-10px_var(--primary)] hover:text-primary-foreground",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
