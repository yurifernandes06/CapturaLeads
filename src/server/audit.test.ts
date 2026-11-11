import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { setupTestDb } from "@/test/db";

let t: Awaited<ReturnType<typeof setupTestDb>>;
let auditMod: typeof import("./audit");
let actor: { id: string; name: string };

beforeAll(async () => {
  t = await setupTestDb();
  auditMod = await import("./audit");
  const [u] = await t.db
    .insert(t.schema.users)
    .values({ name: "Admin", email: "admin@t.dev", passwordHash: "x", role: "admin" })
    .returning();
  actor = { id: u!.id, name: u!.name };
});

afterAll(() => t.cleanup());

describe("audit", () => {
  it("grava e lista do mais recente para o mais antigo", async () => {
    await auditMod.audit(actor, "lead.export", "10 leads exportados", undefined, { count: 10 });
    await new Promise((r) => setTimeout(r, 5));
    await auditMod.audit(actor, "user.role", "Bia agora é admin", { type: "user", id: "u1" });

    const logs = await auditMod.listAuditLogs();
    expect(logs.map((l) => l.action)).toEqual(["user.role", "lead.export"]);
    expect(logs[1]).toMatchObject({ actorName: "Admin", summary: "10 leads exportados", meta: { count: 10 } });
    expect(logs[0]).toMatchObject({ targetType: "user", targetId: "u1" });
  });

  it("não derruba a operação se a gravação falhar", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(
      auditMod.audit({ id: "inexistente", name: "X" }, "lead.delete", "falha de FK"),
    ).resolves.toBeUndefined();
    expect(error).toHaveBeenCalled();
  });
});
