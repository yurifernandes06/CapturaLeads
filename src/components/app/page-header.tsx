import type { ReactNode } from "react";
import { BRAND } from "@/lib/brand";

export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  /** Rótulo pequeno acima do título (ex.: seção do sistema). */
  eyebrow?: string;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-border/70 pb-6 [.grid>&]:mb-0">
      <div className="min-w-0">
        <p className="mb-2 flex items-center gap-2 eyebrow">
          <span aria-hidden className="h-px w-5 bg-primary" />
          {eyebrow ?? BRAND.name}
        </p>
        <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-[1.75rem]">{title}</h1>
        {description ? <p className="mt-1.5 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
