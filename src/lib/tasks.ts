import { TZDate } from "@date-fns/tz";

/**
 * Regras puras de tarefas: em que grupo uma tarefa cai ("atrasada", "hoje",
 * "próximas") e como ler/sugerir o prazo. Tudo no fuso do negócio (config de SLA),
 * para que "hoje" seja o mesmo dia para o servidor e para o vendedor.
 */
export const TASK_BUCKETS = ["overdue", "today", "upcoming"] as const;
export type TaskBucket = (typeof TASK_BUCKETS)[number];

export const TASK_BUCKET_LABEL: Record<TaskBucket, string> = {
  overdue: "Atrasadas",
  today: "Hoje",
  upcoming: "Próximas",
};

/** Fim do dia (00:00 do dia seguinte) em `timezone`, em ms. */
export function endOfDay(now: number, timezone: string): number {
  const d = new TZDate(now, timezone);
  return new TZDate(d.getFullYear(), d.getMonth(), d.getDate() + 1, 0, 0, timezone).getTime();
}

export function taskBucket(dueAt: number, now: number, timezone: string): TaskBucket {
  if (dueAt < now) return "overdue";
  return dueAt < endOfDay(now, timezone) ? "today" : "upcoming";
}

const LOCAL_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

/** Valor de `<input type="datetime-local">` ("AAAA-MM-DDTHH:mm") interpretado no fuso → ms. */
export function parseLocalDateTime(value: string, timezone: string): number | null {
  const m = LOCAL_RE.exec(value.trim());
  if (!m) return null;
  const [y, mo, d, h, mi] = m.slice(1).map(Number) as [number, number, number, number, number];
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || h > 23 || mi > 59) return null;
  const date = new TZDate(y, mo - 1, d, h, mi, timezone);
  // Rejeita datas que "transbordam" (31/02 → 03/03).
  if (date.getMonth() !== mo - 1 || date.getDate() !== d) return null;
  return date.getTime();
}

const pad = (n: number) => String(n).padStart(2, "0");

/** ms → "AAAA-MM-DDTHH:mm" no fuso, para preencher o input. */
export function toLocalDateTime(ms: number, timezone: string): string {
  const d = new TZDate(ms, timezone);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Prazo sugerido: amanhã no início do expediente. */
export function suggestedDueAt(now: number, timezone: string, startTime = "09:00"): number {
  const d = new TZDate(now, timezone);
  const [h, m] = startTime.split(":").map(Number) as [number, number];
  return new TZDate(d.getFullYear(), d.getMonth(), d.getDate() + 1, h, m, timezone).getTime();
}
