import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { setupTestDb } from "@/test/db";

let t: Awaited<ReturnType<typeof setupTestDb>>;
let privacy: typeof import("./privacy");
let service: typeof import("./service");
let storage: typeof import("@/server/media/storage");
let admin: { id: string; name: string };

beforeAll(async () => {
  t = await setupTestDb();
  privacy = await import("./privacy");
  service = await import("./service");
  storage = await import("@/server/media/storage");
  const [u] = await t.db
    .insert(t.schema.users)
    .values({ name: "Admin", email: "admin@t.dev", passwordHash: "x", role: "admin" })
    .returning();
  admin = { id: u!.id, name: u!.name };
});

afterAll(() => t.cleanup());

describe("anonymizeLead", () => {
  it("apaga dados pessoais, histórico e anexos, mantendo o lead nas métricas", async () => {
    const { lead } = await service.createLead({
      name: "Fernanda Lima",
      phone: "11955556666",
      email: "fe@ex.com",
      company: "ACME",
      source: "form",
      message: "Quero orçamento",
      value: 150000,
    });
    const media = await storage.saveMedia(new TextEncoder().encode("audio"), "audio/ogg");
    await service.recordActivity(lead.id, "whatsapp_in", { body: "meu CPF é ...", meta: { media } });
    expect(await storage.readMedia(media.key)).not.toBeNull();

    await privacy.anonymizeLead(lead.id, admin);

    const [after] = await t.db.select().from(t.schema.leads).where(eq(t.schema.leads.id, lead.id));
    expect(after).toMatchObject({
      name: privacy.ANONYMIZED_NAME,
      phone: null,
      email: null,
      company: null,
      message: null,
      value: 150000,
      source: "form",
    });
    expect(after!.anonymizedAt).toBeInstanceOf(Date);

    const history = await t.db.select().from(t.schema.activities).where(eq(t.schema.activities.leadId, lead.id));
    expect(history).toHaveLength(1);
    expect(history[0]!.body).toMatch(/anonimizados/);
    expect(await storage.readMedia(media.key)).toBeNull();

    const [log] = await t.db.select().from(t.schema.auditLogs).where(eq(t.schema.auditLogs.targetId, lead.id));
    expect(log).toMatchObject({ action: "lead.anonymize", actorName: "Admin" });
    expect(JSON.stringify(log)).not.toContain("Fernanda");
  });
});
