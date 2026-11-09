import { TZDate } from "@date-fns/tz";
import type { SlaConfig } from "./config";
import { holidayOn } from "./holidays";

/**
 * Aritmética de tempo útil. Todo cálculo acontece no fuso configurado,
 * então um lead que chega às 17:55 de sexta com prazo de 15 min vence
 * às 08:10 de segunda, e não às 18:10.
 */

type Schedule = Pick<SlaConfig, "timezone" | "businessHours"> & Partial<Pick<SlaConfig, "holidays">>;

const MIN = 60_000;
const MAX_DAYS = 400; // trava de segurança contra loops

const parseHM = (hm: string) => hm.split(":").map(Number) as [number, number];

function dayWindow(y: number, m: number, d: number, s: Schedule) {
  const [sh, sm] = parseHM(s.businessHours.start);
  const [eh, em] = parseHM(s.businessHours.end);
  const start = new TZDate(y, m, d, sh, sm, s.timezone).getTime();
  const end = new TZDate(y, m, d, eh, em, s.timezone).getTime();
  const weekday = new TZDate(y, m, d, 12, 0, s.timezone).getDay();
  return { start, end, open: s.businessHours.days.includes(weekday) && !holidayOn(y, m, d, s.holidays) };
}

function* windowsFrom(from: number, s: Schedule) {
  const z = new TZDate(from, s.timezone);
  const [y, m, d] = [z.getFullYear(), z.getMonth(), z.getDate()];
  for (let i = 0; i < MAX_DAYS; i++) {
    const w = dayWindow(y, m, d + i, s);
    if (w.open && w.end > from) yield { start: Math.max(w.start, from), end: w.end };
  }
}

export function addBusinessMinutes(start: Date, minutes: number, s: Schedule): Date {
  if (!s.businessHours.enabled) return new Date(start.getTime() + minutes * MIN);
  let remaining = minutes * MIN;
  let last = start.getTime();
  for (const w of windowsFrom(start.getTime(), s)) {
    const available = w.end - w.start;
    if (remaining <= available) return new Date(w.start + remaining);
    remaining -= available;
    last = w.end;
  }
  return new Date(last + remaining);
}

export function businessMinutesBetween(from: Date, to: Date, s: Schedule): number {
  const a = from.getTime();
  const b = to.getTime();
  if (b <= a) return 0;
  if (!s.businessHours.enabled) return (b - a) / MIN;
  let total = 0;
  for (const w of windowsFrom(a, s)) {
    if (w.start >= b) break;
    total += Math.min(w.end, b) - w.start;
  }
  return total / MIN;
}

export function isBusinessTime(at: Date, s: Schedule): boolean {
  if (!s.businessHours.enabled) return true;
  const z = new TZDate(at.getTime(), s.timezone);
  const w = dayWindow(z.getFullYear(), z.getMonth(), z.getDate(), s);
  return w.open && at.getTime() >= w.start && at.getTime() < w.end;
}
