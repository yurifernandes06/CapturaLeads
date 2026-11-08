/** Helpers de formatação (pt-BR) usados no client e no server. */

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts.at(-1)?.[0] ?? "") : "";
  return (first + last).toUpperCase() || "?";
}

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
export const formatCurrency = (cents: number) => currency.format(cents / 100);

const dateTime = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });
export const formatDateTime = (d: Date | number) => dateTime.format(d);

const dateOnly = new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" });
export const formatDate = (d: Date | number) => dateOnly.format(d);

const relative = new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" });

/** "há 5 min", "em 2 h" — relativo a `now` para ser determinístico em testes. */
export function formatRelative(date: Date | number, now: Date | number = Date.now()) {
  const diffMs = new Date(date).getTime() - new Date(now).getTime();
  const abs = Math.abs(diffMs);
  const min = 60_000;
  if (abs < min) return "agora";
  if (abs < 60 * min) return relative.format(Math.round(diffMs / min), "minute");
  if (abs < 24 * 60 * min) return relative.format(Math.round(diffMs / (60 * min)), "hour");
  return relative.format(Math.round(diffMs / (24 * 60 * min)), "day");
}

/** Duração compacta em minutos: 45 → "45 min", 135 → "2h 15min", 3000 → "2d 2h". */
export function formatDuration(minutes: number) {
  const m = Math.max(0, Math.round(minutes));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return m % 60 ? `${h}h ${m % 60}min` : `${h}h`;
  const d = Math.floor(h / 24);
  return h % 24 ? `${d}d ${h % 24}h` : `${d}d`;
}
