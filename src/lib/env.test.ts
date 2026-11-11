import { afterEach, describe, expect, it, vi } from "vitest";
import { parseEnv } from "./env";

const prodOk = {
  NODE_ENV: "production",
  APP_URL: "https://crm.exemplo.com.br",
  DATABASE_URL: "libsql://db.turso.io",
  DATABASE_AUTH_TOKEN: "tok",
  CRON_SECRET: "s3cr3t-forte",
};

afterEach(() => vi.restoreAllMocks());

describe("parseEnv", () => {
  it("usa SQLite local e tick ligado por padrão em dev", () => {
    const e = parseEnv({});
    expect(e.DATABASE_URL).toBe("file:./data/dev.db");
    expect(e.SLA_INTERNAL_TICK).toBe(true);
    expect(e.IS_VERCEL).toBe(false);
  });

  it("aceita os nomes da integração Turso da Vercel", () => {
    const e = parseEnv({ TURSO_DATABASE_URL: "libsql://x.turso.io", TURSO_AUTH_TOKEN: "t" });
    expect(e.DATABASE_URL).toBe("libsql://x.turso.io");
    expect(e.DATABASE_AUTH_TOKEN).toBe("t");
  });

  it("desliga o tick por padrão na Vercel, mas respeita o valor explícito", () => {
    expect(parseEnv({ ...prodOk, VERCEL: "1" }).SLA_INTERNAL_TICK).toBe(false);
    expect(parseEnv({ ...prodOk, VERCEL: "1", SLA_INTERNAL_TICK: "true" }).SLA_INTERNAL_TICK).toBe(true);
    expect(parseEnv({ SLA_INTERNAL_TICK: "false" }).SLA_INTERNAL_TICK).toBe(false);
  });

  it("aceita configuração de produção completa", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(() => parseEnv(prodOk)).not.toThrow();
  });

  it.each([
    ["SQLite na Vercel", { VERCEL: "1", DATABASE_URL: "file:./data/dev.db" }, /somente leitura/],
    ["banco remoto sem token", { DATABASE_AUTH_TOKEN: "" }, /DATABASE_AUTH_TOKEN/],
    ["sem CRON_SECRET", { CRON_SECRET: "" }, /CRON_SECRET é obrigatório/],
    ["CRON_SECRET de exemplo", { CRON_SECRET: "troque-este-segredo" }, /CRON_SECRET ainda tem/],
    ["PUBLIC_API_KEY de exemplo", { PUBLIC_API_KEY: "troque-esta-chave" }, /PUBLIC_API_KEY/],
    ["token do webhook de exemplo", { WHATSAPP_WEBHOOK_TOKEN: "troque-este-token" }, /WHATSAPP_WEBHOOK_TOKEN/],
    ["APP_URL em localhost", { APP_URL: "http://localhost:3000" }, /APP_URL/],
  ])("recusa produção com %s", (_name, override, message) => {
    expect(() => parseEnv({ ...prodOk, ...override })).toThrow(message);
  });

  it("não valida regras de produção durante o build", () => {
    expect(() => parseEnv({ ...prodOk, CRON_SECRET: "", NEXT_PHASE: "phase-production-build" })).not.toThrow();
  });

  it("avisa (sem derrubar) quando o WhatsApp está em mock na produção", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    parseEnv({ ...prodOk, WHATSAPP_PROVIDER: "mock" });
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("mock"));
  });
});
