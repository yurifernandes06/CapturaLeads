import { describe, expect, it } from "vitest";
import { addBusinessMinutes, businessMinutesBetween, isBusinessTime } from "./business-time";
import { DEFAULT_SLA_CONFIG, slaConfigSchema, type SlaConfig } from "./config";
import { easter, holidayOn, holidaysForYear, upcomingHolidays } from "./holidays";

const sp = (iso: string) => new Date(`${iso}-03:00`);
const cfg: SlaConfig = DEFAULT_SLA_CONFIG;
const none: SlaConfig = { ...cfg, holidays: { national: false, optional: false, custom: [] } };

describe("calendário", () => {
  it("calcula a Páscoa", () => {
    expect(easter(2026)).toEqual([4, 5]);
    expect(easter(2027)).toEqual([3, 28]);
  });

  it("inclui nacionais, Sexta-feira Santa e facultativos de 2026", () => {
    const h = holidaysForYear(2026, cfg.holidays);
    expect(h.get("2026-11-20")).toBe("Consciência Negra");
    expect(h.get("2026-04-03")).toBe("Sexta-feira Santa");
    expect(h.get("2026-02-16")).toBe("Carnaval");
    expect(h.get("2026-02-17")).toBe("Carnaval");
    expect(h.get("2026-06-04")).toBe("Corpus Christi");
  });

  it("respeita os interruptores e a lista própria", () => {
    const only = { national: false, optional: false, custom: ["01-25 Aniversário de SP", "2026-12-24 Véspera", "lixo"] };
    expect(holidayOn(2026, 0, 25, only)).toBe("Aniversário de SP");
    expect(holidayOn(2027, 0, 25, only)).toBe("Aniversário de SP");
    expect(holidayOn(2026, 11, 24, only)).toBe("Véspera");
    expect(holidayOn(2027, 11, 24, only)).toBeNull();
    expect(holidayOn(2026, 10, 20, only)).toBeNull();
  });

  it("normaliza dias que passam do fim do mês", () => {
    expect(holidayOn(2026, 11, 32, cfg.holidays)).toBe("Confraternização Universal");
  });

  it("lista os próximos feriados virando o ano", () => {
    const next = upcomingHolidays("2026-12-20", { national: true, optional: false, custom: [] }, 2);
    expect(next).toEqual([
      { date: "2026-12-25", name: "Natal" },
      { date: "2027-01-01", name: "Confraternização Universal" },
    ]);
  });
});

describe("SLA com feriados", () => {
  it("feriado não é horário comercial", () => {
    expect(isBusinessTime(sp("2026-11-20T10:00"), cfg)).toBe(false);
    expect(isBusinessTime(sp("2026-11-20T10:00"), none)).toBe(true);
  });

  it("lead de quinta no fim do dia vence na segunda, pulando o feriado de sexta", () => {
    // quinta 19/11 17:55 + 15 min → sexta 20/11 é Consciência Negra → segunda 23/11 08:10
    expect(addBusinessMinutes(sp("2026-11-19T17:55"), 15, cfg)).toEqual(sp("2026-11-23T08:10"));
    expect(addBusinessMinutes(sp("2026-11-19T17:55"), 15, none)).toEqual(sp("2026-11-20T08:10"));
  });

  it("não conta minutos no feriado", () => {
    expect(businessMinutesBetween(sp("2026-11-19T17:00"), sp("2026-11-23T09:00"), cfg)).toBe(120);
  });

  it("config salva antes dos feriados ganha o padrão", () => {
    const { holidays, ...legacy } = cfg;
    expect(holidays).toBeDefined();
    expect(slaConfigSchema.parse(legacy).holidays).toEqual({ national: true, optional: true, custom: [] });
  });
});
