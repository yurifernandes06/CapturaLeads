import { BRAND } from "@/lib/brand";
import { cn } from "@/lib/utils";

/** Monograma JV em bloco vermelho + assinatura "João Vitor / Bussines". */
export function Logo({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)} aria-label={BRAND.name}>
      <span
        aria-hidden
        className="relative grid size-9 shrink-0 place-items-center overflow-hidden rounded-[10px] bg-primary font-heading text-[0.95rem] font-bold tracking-tighter text-primary-foreground shadow-[0_0_0_1px_oklch(1_0_0/12%)_inset,0_8px_24px_-8px_var(--primary)]"
      >
        <span className="absolute inset-x-0 top-0 h-1/2 bg-white/10" />
        <span className="relative">{BRAND.monogram}</span>
      </span>
      {compact ? null : (
        <span className="grid leading-none" aria-hidden>
          <span className="font-heading text-[0.95rem] font-semibold tracking-tight">{BRAND.short}</span>
          <span className="mt-1 font-mono text-[0.6rem] tracking-[0.32em] text-primary-text uppercase">{BRAND.suffix}</span>
        </span>
      )}
    </span>
  );
}
