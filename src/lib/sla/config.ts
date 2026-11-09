import { z } from "zod";
import { CUSTOM_HOLIDAY_RE } from "./holidays";

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use o formato HH:MM.");

export const slaConfigSchema = z
  .object({
    timezone: z.string().min(1),
    businessHours: z.object({
      enabled: z.boolean(),
      /** 0 = domingo … 6 = sábado */
      days: z.array(z.number().int().min(0).max(6)).min(1, "Escolha ao menos um dia."),
      start: time,
      end: time,
    }),
    /** Feriados param o relógio como fim de semana. Configs antigas ganham o default. */
    holidays: z
      .object({
        national: z.boolean(),
        optional: z.boolean(),
        custom: z.array(z.string().trim().regex(CUSTOM_HOLIDAY_RE, "Use MM-DD ou AAAA-MM-DD, seguido do nome.")).max(100),
      })
      .default({ national: true, optional: true, custom: [] }),
    /** Prazo da 1ª resposta por prioridade, em minutos úteis. */
    firstResponseMinutes: z.object({
      high: z.number().int().min(1).max(10_080),
      medium: z.number().int().min(1).max(10_080),
      low: z.number().int().min(1).max(10_080),
    }),
    /** Prazo para responder uma mensagem nova do lead, em minutos úteis. */
    replyMinutes: z.number().int().min(1).max(10_080),
    /** Horas úteis sem nenhum contato até o lead ser considerado parado. */
    followUpHours: z.number().int().min(1).max(720),
    /** A partir de quantos % do prazo consumido o lead fica "em risco". */
    atRiskPercent: z.number().int().min(10).max(95),
    /** Avisar o responsável no WhatsApp quando o SLA estourar. */
    whatsappAlerts: z.boolean(),
  })
  .refine((c) => c.businessHours.start < c.businessHours.end, {
    message: "O fim do expediente precisa ser depois do início.",
    path: ["businessHours", "end"],
  });

export type SlaConfig = z.infer<typeof slaConfigSchema>;

export const DEFAULT_SLA_CONFIG: SlaConfig = {
  timezone: "America/Sao_Paulo",
  businessHours: { enabled: true, days: [1, 2, 3, 4, 5], start: "08:00", end: "18:00" },
  holidays: { national: true, optional: true, custom: [] },
  firstResponseMinutes: { high: 5, medium: 15, low: 60 },
  replyMinutes: 30,
  followUpHours: 20,
  atRiskPercent: 70,
  whatsappAlerts: true,
};

export const SLA_KIND_LABEL = {
  first_response: "1ª resposta",
  reply: "Responder mensagem",
  follow_up: "Follow-up",
} as const;

export const SLA_STATUS_META = {
  ok: { label: "No prazo", className: "bg-success/12 text-success", dot: "bg-success" },
  at_risk: { label: "Em risco", className: "bg-warning/15 text-warning", dot: "bg-warning" },
  breached: { label: "Estourado", className: "bg-danger/12 text-danger", dot: "bg-danger" },
  none: { label: "Sem SLA", className: "bg-muted text-muted-foreground", dot: "bg-muted-foreground" },
} as const;

export const SLA_STATUSES = ["ok", "at_risk", "breached", "none"] as const;
export type SlaStatus = (typeof SLA_STATUSES)[number];
export type SlaKind = keyof typeof SLA_KIND_LABEL;
