import { FlameIcon, SnowflakeIcon, ThermometerIcon } from "lucide-react";
import { PRIORITY_META, SOURCE_LABEL, STAGE_META, type Priority, type Source, type Stage } from "@/lib/leads";
import { cn } from "@/lib/utils";

export function StageBadge({ stage, className }: { stage: Stage; className?: string }) {
  const meta = STAGE_META[stage];
  return (
    <span
      className={cn(
        "inline-flex h-5.5 items-center gap-1.5 rounded-full px-2 text-xs font-medium whitespace-nowrap",
        meta.badge,
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", meta.dot)} />
      {meta.label}
    </span>
  );
}

const PRIORITY_ICON = { high: FlameIcon, medium: ThermometerIcon, low: SnowflakeIcon };

export function PriorityBadge({ priority, showLabel = true }: { priority: Priority; showLabel?: boolean }) {
  const meta = PRIORITY_META[priority];
  const Icon = PRIORITY_ICON[priority];
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs font-medium", meta.className)} title={meta.label}>
      <Icon className="size-3.5" />
      {showLabel ? meta.label : <span className="sr-only">{meta.label}</span>}
    </span>
  );
}

export function SourceLabel({ source }: { source: Source }) {
  return <span className="text-sm text-muted-foreground">{SOURCE_LABEL[source]}</span>;
}

export function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn("size-4", className)} fill="currentColor" aria-hidden>
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.21h.01c5.46 0 9.9-4.45 9.9-9.91A9.85 9.85 0 0 0 12.04 2Zm5.8 14.13c-.25.69-1.44 1.32-2 1.4-.51.08-1.15.11-1.86-.12a17 17 0 0 1-1.68-.62c-2.96-1.28-4.89-4.26-5.04-4.46-.15-.2-1.2-1.6-1.2-3.05 0-1.45.76-2.16 1.03-2.46.27-.3.59-.37.79-.37h.57c.18 0 .43-.07.67.51.25.59.84 2.04.91 2.19.08.15.12.32.03.52-.1.2-.15.32-.3.49-.15.17-.31.38-.44.52-.15.15-.3.31-.13.6.17.3.76 1.25 1.63 2.03 1.12 1 2.07 1.31 2.36 1.46.3.15.47.12.64-.07.17-.2.74-.86.94-1.16.2-.3.4-.25.67-.15.27.1 1.73.82 2.03.97.3.15.49.22.57.35.08.12.08.71-.17 1.4Z" />
    </svg>
  );
}
