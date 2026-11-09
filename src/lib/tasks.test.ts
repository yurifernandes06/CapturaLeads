import { describe, expect, it } from "vitest";
import { endOfDay, formatDue, parseLocalDateTime, suggestedDueAt, taskBucket, toLocalDateTime } from "./tasks";

const TZ = "America/Sao_Paulo"; // UTC-3, sem horário de verão
const at = (iso: string) => new Date(iso).getTime();

describe("taskBucket", () => {
  const now = at("2026-11-10T13:00:00-03:00");

  it("prazo no passado é atrasada", () => {
    expect(taskBucket(at("2026-11-10T12:59:00-03:00"), now, TZ)).toBe("overdue");
  });

  it("até 23:59 do dia local é hoje", () => {
    expect(taskBucket(at("2026-11-10T23:59:00-03:00"), now, TZ)).toBe("today");
  });

  it("meia-noite local já é próxima, mesmo sendo o mesmo dia em UTC", () => {
    expect(taskBucket(at("2026-11-11T00:00:00-03:00"), now, TZ)).toBe("upcoming");
  });

  it("usa o dia do fuso, não o do UTC", () => {
    // 22:00 em SP = 01:00 UTC do dia seguinte; ainda é "hoje" em SP.
    const late = at("2026-11-10T22:00:00-03:00");
    expect(endOfDay(now, TZ)).toBe(at("2026-11-11T00:00:00-03:00"));
    expect(taskBucket(late, now, TZ)).toBe("today");
  });
});

describe("parseLocalDateTime", () => {
  it("interpreta o input no fuso do negócio", () => {
    expect(parseLocalDateTime("2026-11-10T09:30", TZ)).toBe(at("2026-11-10T09:30:00-03:00"));
  });

  it("rejeita formatos e datas inválidas", () => {
    expect(parseLocalDateTime("10/11/2026 09:30", TZ)).toBeNull();
    expect(parseLocalDateTime("2026-02-31T10:00", TZ)).toBeNull();
    expect(parseLocalDateTime("2026-11-10T24:00", TZ)).toBeNull();
  });

  it("faz ida e volta com toLocalDateTime", () => {
    const ms = parseLocalDateTime("2026-12-31T23:45", TZ)!;
    expect(toLocalDateTime(ms, TZ)).toBe("2026-12-31T23:45");
  });
});

describe("suggestedDueAt", () => {
  it("sugere amanhã no início do expediente", () => {
    expect(suggestedDueAt(at("2026-11-10T22:30:00-03:00"), TZ, "08:00")).toBe(at("2026-11-11T08:00:00-03:00"));
  });
});

describe("formatDue", () => {
  const now = at("2026-11-10T13:00:00-03:00");
  it("usa hoje/amanhã/ontem perto da data atual", () => {
    expect(formatDue(at("2026-11-10T22:30:00-03:00"), now, TZ)).toBe("hoje 22:30");
    expect(formatDue(at("2026-11-11T09:00:00-03:00"), now, TZ)).toBe("amanhã 09:00");
    expect(formatDue(at("2026-11-09T18:00:00-03:00"), now, TZ)).toBe("ontem 18:00");
  });
  it("mostra a data, com ano só quando muda", () => {
    expect(formatDue(at("2026-11-20T09:00:00-03:00"), now, TZ)).toBe("20/11 09:00");
    expect(formatDue(at("2027-01-05T09:00:00-03:00"), now, TZ)).toBe("05/01/2027 09:00");
  });
});
