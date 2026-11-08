import { describe, expect, it } from "vitest";
import { addBusinessMinutes, businessMinutesBetween, isBusinessTime } from "./business-time";
import { DEFAULT_SLA_CONFIG, type SlaConfig } from "./config";
import { evaluateSla, firstResponseMetric, type SlaInput } from "./engine";

// São Paulo é UTC-3 (sem horário de verão). 2026-11-09 é segunda, 2026-11-13 sexta.
const sp = (iso: string) => new Date(`${iso}-03:00`);
const cfg: SlaConfig = DEFAULT_SLA_CONFIG; // seg-sex 08:00-18:00

describe("tempo útil", () => {
  it("soma minutos dentro do expediente", () => {
    expect(addBusinessMinutes(sp("2026-11-09T10:00"), 15, cfg)).toEqual(sp("2026-11-09T10:15"));
  });

  it("empurra para o próximo dia útil quando passa do fim do expediente", () => {
    // sexta 17:55 + 15 min úteis → segunda 08:10
    expect(addBusinessMinutes(sp("2026-11-13T17:55"), 15, cfg)).toEqual(sp("2026-11-16T08:10"));
  });

  it("lead que chega de madrugada começa a contar às 08:00", () => {
    expect(addBusinessMinutes(sp("2026-11-10T03:00"), 5, cfg)).toEqual(sp("2026-11-10T08:05"));
  });

  it("lead que chega no sábado vence na segunda", () => {
    expect(addBusinessMinutes(sp("2026-11-14T11:00"), 60, cfg)).toEqual(sp("2026-11-16T09:00"));
  });

  it("conta só minutos úteis entre duas datas", () => {
    // sexta 17:00 → segunda 09:00 = 60 (sexta) + 60 (segunda)
    expect(businessMinutesBetween(sp("2026-11-13T17:00"), sp("2026-11-16T09:00"), cfg)).toBe(120);
  });

  it("devolve zero para intervalo invertido", () => {
    expect(businessMinutesBetween(sp("2026-11-10T10:00"), sp("2026-11-10T09:00"), cfg)).toBe(0);
  });

  it("ignora horário comercial quando desligado", () => {
    const off = { ...cfg, businessHours: { ...cfg.businessHours, enabled: false } };
    expect(addBusinessMinutes(sp("2026-11-13T17:55"), 15, off)).toEqual(sp("2026-11-13T18:10"));
    expect(isBusinessTime(sp("2026-11-14T03:00"), off)).toBe(true);
  });

  it("detecta expediente", () => {
    expect(isBusinessTime(sp("2026-11-09T09:00"), cfg)).toBe(true);
    expect(isBusinessTime(sp("2026-11-09T18:00"), cfg)).toBe(false);
    expect(isBusinessTime(sp("2026-11-14T10:00"), cfg)).toBe(false);
  });
});

const base: SlaInput = {
  stage: "new",
  priority: "medium",
  createdAt: sp("2026-11-09T10:00"),
  firstResponseAt: null,
  lastInboundAt: null,
  lastOutboundAt: null,
  lastActivityAt: null,
};

describe("evaluateSla", () => {
  it("lead novo usa o prazo de 1ª resposta da prioridade", () => {
    const r = evaluateSla(base, cfg, sp("2026-11-09T10:05"));
    expect(r).toMatchObject({ kind: "first_response", status: "ok", targetMinutes: 15 });
    if (r.kind) expect(r.dueAt).toEqual(sp("2026-11-09T10:15"));
  });

  it("fica em risco ao passar do percentual configurado", () => {
    expect(evaluateSla(base, cfg, sp("2026-11-09T10:11")).status).toBe("at_risk"); // 73%
  });

  it("estoura ao passar do prazo", () => {
    expect(evaluateSla(base, cfg, sp("2026-11-09T10:15")).status).toBe("breached");
  });

  it("lead quente tem prazo menor", () => {
    expect(evaluateSla({ ...base, priority: "high" }, cfg, sp("2026-11-09T10:06")).status).toBe("breached");
  });

  it("mensagem nova do lead depois do contato abre prazo de resposta", () => {
    const lead = {
      ...base,
      stage: "contacted" as const,
      firstResponseAt: sp("2026-11-09T10:05"),
      lastOutboundAt: sp("2026-11-09T10:05"),
      lastInboundAt: sp("2026-11-09T11:00"),
    };
    const r = evaluateSla(lead, cfg, sp("2026-11-09T11:10"));
    expect(r).toMatchObject({ kind: "reply", status: "ok", targetMinutes: 30 });
    expect(evaluateSla(lead, cfg, sp("2026-11-09T11:31")).status).toBe("breached");
  });

  it("depois de respondido vira follow-up", () => {
    const lead = {
      ...base,
      stage: "qualified" as const,
      firstResponseAt: sp("2026-11-09T10:05"),
      lastOutboundAt: sp("2026-11-09T10:05"),
      lastInboundAt: sp("2026-11-09T10:00"),
    };
    const r = evaluateSla(lead, cfg, sp("2026-11-10T10:00"));
    expect(r).toMatchObject({ kind: "follow_up", status: "ok", targetMinutes: 20 * 60 });
    // 20h úteis a partir de seg 10:05 → ter 10h + qua 08:00-10:05 = quarta 10:05
    if (r.kind) expect(r.dueAt).toEqual(sp("2026-11-11T10:05"));
  });

  it("leads fechados não têm SLA", () => {
    expect(evaluateSla({ ...base, stage: "won" }, cfg, sp("2026-11-20T10:00"))).toEqual({ kind: null, status: "none" });
  });

  it("marca como pausado fora do expediente", () => {
    const r = evaluateSla(base, cfg, sp("2026-11-09T20:00"));
    expect(r.kind && r.paused).toBe(true);
  });

  it("mede a 1ª resposta em minutos úteis", () => {
    const m = firstResponseMetric({ ...base, firstResponseAt: sp("2026-11-09T10:12") }, cfg);
    expect(m).toEqual({ minutes: 12, met: true });
    expect(firstResponseMetric(base, cfg)).toBeNull();
  });
});
