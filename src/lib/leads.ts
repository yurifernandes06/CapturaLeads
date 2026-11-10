/**
 * Domínio de leads compartilhado entre client e server (sem dependências de servidor).
 */

export const STAGES = ["new", "contacted", "qualified", "proposal", "won", "lost"] as const;
export type Stage = (typeof STAGES)[number];

/** Etapas vão do branco ao vermelho conforme o lead esquenta; ganho/perdido mantêm a semântica. */
export const STAGE_META: Record<Stage, { label: string; dot: string; badge: string }> = {
  new: { label: "Novo", dot: "bg-foreground", badge: "bg-white/[0.09] text-foreground ring-1 ring-white/10" },
  contacted: { label: "Em contato", dot: "bg-foreground/55", badge: "bg-white/[0.05] text-foreground/80 ring-1 ring-white/[0.07]" },
  qualified: { label: "Qualificado", dot: "bg-primary/60", badge: "bg-primary/10 text-[color-mix(in_oklch,var(--primary),white_40%)] ring-1 ring-primary/20" },
  proposal: { label: "Proposta", dot: "bg-primary", badge: "bg-primary/20 text-[color-mix(in_oklch,var(--primary),white_30%)] ring-1 ring-primary/40" },
  won: { label: "Ganho", dot: "bg-success", badge: "bg-success/12 text-success ring-1 ring-success/25" },
  lost: { label: "Perdido", dot: "bg-muted-foreground/60", badge: "bg-muted text-muted-foreground ring-1 ring-white/[0.05]" },
};

export const OPEN_STAGES: Stage[] = ["new", "contacted", "qualified", "proposal"];
export const isClosedStage = (s: Stage) => s === "won" || s === "lost";

export const PRIORITIES = ["high", "medium", "low"] as const;
export type Priority = (typeof PRIORITIES)[number];

export const PRIORITY_META: Record<Priority, { label: string; className: string }> = {
  high: { label: "Quente", className: "text-primary" },
  medium: { label: "Morno", className: "text-warning" },
  low: { label: "Frio", className: "text-info" },
};

export const SOURCES = ["whatsapp", "form", "api", "manual", "instagram", "facebook", "google", "referral"] as const;
export type Source = (typeof SOURCES)[number];

export const SOURCE_LABEL: Record<Source, string> = {
  whatsapp: "WhatsApp",
  form: "Formulário",
  api: "API",
  manual: "Manual",
  instagram: "Instagram",
  facebook: "Facebook",
  google: "Google",
  referral: "Indicação",
};

export const ACTIVITY_TYPES = [
  "created",
  "note",
  "call",
  "whatsapp_in",
  "whatsapp_out",
  "stage_change",
  "assignment",
  "sla_breach",
  "system",
] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

/** Atividades que contam como contato do vendedor com o lead (encerram a 1ª resposta). */
export const OUTBOUND_ACTIVITIES: ActivityType[] = ["call", "whatsapp_out"];

export const LOST_REASONS = [
  "Sem resposta",
  "Preço",
  "Comprou do concorrente",
  "Sem orçamento",
  "Não era o momento",
  "Contato inválido",
  "Outro",
] as const;

export function parseTags(input: string): string[] {
  return [
    ...new Set(
      input
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean),
    ),
  ].slice(0, 12);
}
