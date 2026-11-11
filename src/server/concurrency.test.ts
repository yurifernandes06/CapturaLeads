import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { and, eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/libsql/migrator";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

/**
 * Integração com SQLite real: chamadas simultâneas não podem gerar duplicados
 * (leads pelo mesmo telefone, webhooks reenviados, alertas e round-robin).
 */
const dir = mkdtempSync(path.join(tmpdir(), "capturaleads-"));
const file = path.join(dir, "concurrency.db");

type Db = typeof import("@/db");
type Leads = typeof import("@/server/leads/service");
type Wa = typeof import("@/server/whatsapp/service");
let dbm: Db;
let leads: Leads;
let wa: Wa;

beforeAll(async () => {
  process.env.DATABASE_URL = `file:${file.replace(/\\/g, "/")}`;
  process.env.WHATSAPP_PROVIDER = "mock";
  vi.resetModules();
  dbm = await import("@/db");
  await migrate(dbm.db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  leads = await import("@/server/leads/service");
  wa = await import("@/server/whatsapp/service");

  const { users } = dbm.schema;
  await dbm.db.insert(users).values([
    { name: "Ana", email: "ana@t.dev", passwordHash: "x", role: "sales" },
    { name: "Bia", email: "bia@t.dev", passwordHash: "x", role: "sales" },
  ]);
});

afterAll(() => {
  dbm.db.$client.close();
  // No Windows o libsql pode segurar o arquivo por alguns instantes; a pasta é temporária de qualquer forma.
  try {
    rmSync(dir, { recursive: true, force: true });
  } catch {}
});

describe("concorrência", () => {
  it("cria um único lead para o mesmo telefone em envios simultâneos", async () => {
    const input = { name: "Carlos", phone: "(11) 98765-4321", source: "form" as const };
    const results = await Promise.all(Array.from({ length: 5 }, () => leads.createLead(input)));

    const rows = await dbm.db.select().from(dbm.schema.leads).where(eq(dbm.schema.leads.phone, "5511987654321"));
    expect(rows).toHaveLength(1);
    expect(results.filter((r) => r.created)).toHaveLength(1);
    expect(new Set(results.map((r) => r.lead.id)).size).toBe(1);

    // Atômico: exatamente uma atividade "created", sem órfãs das tentativas que perderam a corrida.
    const created = await dbm.db
      .select()
      .from(dbm.schema.activities)
      .where(and(eq(dbm.schema.activities.leadId, rows[0]!.id), eq(dbm.schema.activities.type, "created")));
    expect(created).toHaveLength(1);
    expect(created[0]!.meta).toMatchObject({ source: "form" });
  });

  it("muda a etapa e grava o histórico juntos", async () => {
    const { lead } = await leads.createLead({ name: "Eva", phone: "11933334444", source: "manual" });
    const [admin] = await dbm.db.select().from(dbm.schema.users).limit(1);
    await leads.changeStage(lead.id, "lost", admin!.id, "Preço");

    const [after] = await dbm.db.select().from(dbm.schema.leads).where(eq(dbm.schema.leads.id, lead.id));
    expect(after).toMatchObject({ stage: "lost", lostReason: "Preço" });
    expect(after!.closedAt).toBeInstanceOf(Date);
    const history = await dbm.db
      .select()
      .from(dbm.schema.activities)
      .where(and(eq(dbm.schema.activities.leadId, lead.id), eq(dbm.schema.activities.type, "stage_change")));
    expect(history).toHaveLength(1);
    expect(history[0]!.meta).toMatchObject({ from: "new", to: "lost", lostReason: "Preço" });
  });

  it("processa uma vez só o mesmo webhook reenviado em paralelo", async () => {
    const msg = { from: "5511911112222", name: "Dani", text: "Oi", providerMessageId: "wamid.dup", at: new Date() };
    const results = await Promise.all(Array.from({ length: 4 }, () => wa.handleInbound(msg)));

    const acts = await dbm.db
      .select()
      .from(dbm.schema.activities)
      .where(eq(dbm.schema.activities.providerMessageId, "wamid.dup"));
    expect(acts).toHaveLength(1);
    expect(results.filter((r) => "skipped" in r)).toHaveLength(3);
  });

  it("distribui leads simultâneos entre vendedores diferentes", async () => {
    const owners = await Promise.all([leads.pickNextOwner(), leads.pickNextOwner()]);
    expect(owners[0]).toBeTruthy();
    expect(owners[1]).toBeTruthy();
    expect(owners[0]).not.toBe(owners[1]);
  });
});
