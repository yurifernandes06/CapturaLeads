import type { Priority, Stage } from "@/lib/leads";
import { addBusinessMinutes, businessMinutesBetween, isBusinessTime } from "./business-time";
import type { SlaConfig, SlaKind, SlaStatus } from "./config";

/**
 * Motor de SLA: função pura que decide qual prazo vale para o lead agora.
 *
 * Ordem de precedência:
 * 1. Sem nenhum contato do time → prazo de 1ª resposta (por prioridade)
 * 2. Lead mandou mensagem depois do último contato → prazo de resposta
 * 3. Caso contrário → follow-up: tempo máximo sem contato
 * Leads ganhos/perdidos não têm SLA.
 */

export type SlaInput = {
  stage: Stage;
  priority: Priority;
  createdAt: Date;
  firstResponseAt: Date | null;
  lastInboundAt: Date | null;
  lastOutboundAt: Date | null;
  lastActivityAt: Date | null;
};

export type SlaResult =
  | { kind: null; status: "none" }
  | {
      kind: SlaKind;
      status: Exclude<SlaStatus, "none">;
      startedAt: Date;
      dueAt: Date;
      targetMinutes: number;
      elapsedMinutes: number;
      /** Fora do expediente o relógio do SLA fica parado. */
      paused: boolean;
    };

const latest = (...dates: (Date | null)[]) =>
  dates.reduce<Date | null>((acc, d) => (d && (!acc || d > acc) ? d : acc), null);

export function evaluateSla(lead: SlaInput, config: SlaConfig, now: Date): SlaResult {
  if (lead.stage === "won" || lead.stage === "lost") return { kind: null, status: "none" };

  let kind: SlaKind;
  let startedAt: Date;
  let targetMinutes: number;

  const lastTouch = latest(lead.lastOutboundAt, lead.firstResponseAt);

  if (!lead.firstResponseAt) {
    kind = "first_response";
    startedAt = lead.createdAt;
    targetMinutes = config.firstResponseMinutes[lead.priority];
  } else if (lead.lastInboundAt && (!lastTouch || lead.lastInboundAt > lastTouch)) {
    kind = "reply";
    startedAt = lead.lastInboundAt;
    targetMinutes = config.replyMinutes;
  } else {
    kind = "follow_up";
    startedAt = latest(lead.lastActivityAt, lastTouch, lead.createdAt)!;
    targetMinutes = config.followUpHours * 60;
  }

  const dueAt = addBusinessMinutes(startedAt, targetMinutes, config);
  const elapsedMinutes = businessMinutesBetween(startedAt, now, config);
  const ratio = elapsedMinutes / targetMinutes;
  const status = now >= dueAt ? "breached" : ratio * 100 >= config.atRiskPercent ? "at_risk" : "ok";

  return {
    kind,
    status,
    startedAt,
    dueAt,
    targetMinutes,
    elapsedMinutes,
    paused: !isBusinessTime(now, config),
  };
}

/** Tempo da 1ª resposta em minutos úteis e se cumpriu o prazo (para relatórios). */
export function firstResponseMetric(lead: SlaInput, config: SlaConfig) {
  if (!lead.firstResponseAt) return null;
  const minutes = businessMinutesBetween(lead.createdAt, lead.firstResponseAt, config);
  return { minutes, met: minutes <= config.firstResponseMinutes[lead.priority] };
}
