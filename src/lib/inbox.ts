import { isClosedStage, type Stage } from "./leads";

export const INBOX_FILTERS = ["all", "awaiting", "mine"] as const;
export type InboxFilter = (typeof INBOX_FILTERS)[number];

export const INBOX_FILTER_LABEL: Record<InboxFilter, string> = {
  all: "Todas",
  awaiting: "Aguardando",
  mine: "Minhas",
};

export const parseInboxFilter = (v: unknown): InboxFilter =>
  INBOX_FILTERS.includes(v as InboxFilter) ? (v as InboxFilter) : "all";

/**
 * A conversa espera o time quando a última mensagem do lead é mais recente que o
 * último contato do time (WhatsApp ou ligação). Leads fechados não entram na fila.
 */
export function isAwaitingReply(lead: { stage: Stage; lastInboundAt: Date | null; lastOutboundAt: Date | null }) {
  if (isClosedStage(lead.stage) || !lead.lastInboundAt) return false;
  return !lead.lastOutboundAt || lead.lastInboundAt > lead.lastOutboundAt;
}
