import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { setupTestDb } from "@/test/db";

let t: Awaited<ReturnType<typeof setupTestDb>>;
let route: typeof import("./route");
let settings: typeof import("@/server/settings");

beforeAll(async () => {
  t = await setupTestDb();
  route = await import("./route");
  settings = await import("@/server/settings");
});

afterAll(() => t.cleanup());

describe("GET /api/health", () => {
  it("fica ok antes do primeiro sweep (pendente)", async () => {
    const res = await route.GET();
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.checks).toMatchObject({ database: "ok", slaSweep: { status: "pendente" } });
  });

  it("responde 503 quando o SLA não roda há mais de 15 minutos", async () => {
    await settings.setSetting("ops", { lastSweepAt: Date.now() - 20 * 60 * 1000, lastSweepMs: 100 });
    const res = await route.GET();
    expect(res.status).toBe(503);
    expect((await res.json()).checks.slaSweep).toMatchObject({ status: "atrasado", minutesAgo: 20 });
  });

  it("volta a ok depois de um sweep recente", async () => {
    await settings.setSetting("ops", { lastSweepAt: Date.now(), lastSweepMs: 100 });
    const res = await route.GET();
    expect(res.status).toBe(200);
  });
});
