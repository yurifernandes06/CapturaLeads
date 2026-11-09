/**
 * Feriados que param o relógio do SLA.
 * - Nacionais (Lei 662/49, 6.802/80, 14.759/23) + Sexta-feira Santa.
 * - Pontos facultativos comuns no comércio (Carnaval, Corpus Christi), opcionais.
 * - Lista própria: "MM-DD Nome" (todo ano) ou "AAAA-MM-DD Nome" (só naquele ano).
 */
export type HolidayConfig = { national: boolean; optional: boolean; custom: string[] };

export const CUSTOM_HOLIDAY_RE = /^(\d{4}-)?(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])(\s+.{1,60})?$/;

const FIXED: [string, string][] = [
  ["01-01", "Confraternização Universal"],
  ["04-21", "Tiradentes"],
  ["05-01", "Dia do Trabalho"],
  ["09-07", "Independência"],
  ["10-12", "Nossa Senhora Aparecida"],
  ["11-02", "Finados"],
  ["11-15", "Proclamação da República"],
  ["11-20", "Consciência Negra"],
  ["12-25", "Natal"],
];

const pad = (n: number) => String(n).padStart(2, "0");

/** Domingo de Páscoa (algoritmo de Meeus/Jones/Butcher). Retorna [mês 1-12, dia]. */
export function easter(year: number): [number, number] {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return [month, day];
}

function shifted(year: number, days: number) {
  const [m, d] = easter(year);
  const dt = new Date(Date.UTC(year, m - 1, d + days));
  return `${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

const cache = new Map<string, Map<string, string>>();

/** Mapa "AAAA-MM-DD" → nome, para um ano. */
export function holidaysForYear(year: number, cfg: HolidayConfig): Map<string, string> {
  const key = `${year}|${cfg.national}|${cfg.optional}|${cfg.custom.join(";")}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const list: [string, string][] = [];
  if (cfg.national) list.push(...FIXED, [shifted(year, -2), "Sexta-feira Santa"]);
  if (cfg.optional) {
    list.push([shifted(year, -48), "Carnaval"], [shifted(year, -47), "Carnaval"], [shifted(year, 60), "Corpus Christi"]);
  }
  for (const raw of cfg.custom) {
    const m = CUSTOM_HOLIDAY_RE.exec(raw.trim());
    if (!m) continue;
    const y = m[1] ? Number(m[1].slice(0, 4)) : year;
    if (y !== year) continue;
    list.push([`${m[2]}-${m[3]}`, m[4]?.trim() || "Feriado"]);
  }

  const map = new Map(list.map(([md, name]) => [`${year}-${md}`, name]));
  if (cache.size > 50) cache.clear();
  cache.set(key, map);
  return map;
}

/** Nome do feriado na data (ano, mês 0-11, dia) ou null. */
export function holidayOn(y: number, m: number, d: number, cfg: HolidayConfig | undefined): string | null {
  if (!cfg) return null;
  const dt = new Date(Date.UTC(y, m, d)); // normaliza overflow (dia 32 → próximo mês)
  const year = dt.getUTCFullYear();
  const ymd = `${year}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
  return holidaysForYear(year, cfg).get(ymd) ?? null;
}

/** Próximos feriados a partir de uma data "AAAA-MM-DD" (para exibir na tela). */
export function upcomingHolidays(fromYmd: string, cfg: HolidayConfig, limit = 5) {
  const year = Number(fromYmd.slice(0, 4));
  return [...holidaysForYear(year, cfg), ...holidaysForYear(year + 1, cfg)]
    .filter(([ymd]) => ymd >= fromYmd)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(0, limit)
    .map(([date, name]) => ({ date, name }));
}
