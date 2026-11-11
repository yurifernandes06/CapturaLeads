import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { setupTestDb } from "@/test/db";

let t: Awaited<ReturnType<typeof setupTestDb>>;
let sla: typeof import("./service");

const OPEN = 5_000;

beforeAll(async () => {
  t = await setupTestDb();
  sla = await import("./service");
  const now = Date.now();
  // Leads recém-criados (dentro do prazo): todos com SLA de 1ª resposta a calcular, sem estouro.
  const rows = Array.from({ length: OPEN }, (_, i) => ({
    name: `Lead ${i}`,
    phone: `55119${String(10_000_000 + i).padStart(8, "0")}`,
    source: "form" as const,
    createdAt: new Date(now - 60 * 1000),
  }));
  for (let i = 0; i < rows.length; i += 500) await t.db.insert(t.schema.leads).values(rows.slice(i, i + 500));
}, 60_000);

afterAll(() => t.cleanup());

describe("sweepSla", () => {
  it(`recalcula ${OPEN} leads abertos em lote, abaixo de 10s`, async () => {
    const started = performance.now();
    const result = await sla.sweepSla();
    const ms = performance.now() - started;

    expect(result.updated).toBe(OPEN);
    expect(ms).toBeLessThan(10_000);

    // Segunda passada: nada mudou, nada é regravado.
    const again = await sla.sweepSla();
    expect(again.updated).toBe(0);
  }, 30_000);
});
