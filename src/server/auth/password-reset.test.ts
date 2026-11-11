import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { setupTestDb } from "@/test/db";

let t: Awaited<ReturnType<typeof setupTestDb>>;
let reset: typeof import("./password-reset");
let password: typeof import("./password");
let userId: string;

beforeAll(async () => {
  t = await setupTestDb();
  reset = await import("./password-reset");
  password = await import("./password");
  const [u] = await t.db
    .insert(t.schema.users)
    .values({
      name: "Bia Souza",
      email: "bia@t.dev",
      passwordHash: await password.hashPassword("senha-antiga"),
      role: "sales",
      phone: "5511977778888",
    })
    .returning();
  userId = u!.id;
  await t.db.insert(t.schema.users).values({ name: "Sem Fone", email: "semfone@t.dev", passwordHash: "x", role: "sales" });
});

afterAll(() => t.cleanup());

const sessionsOf = (id: string) => t.db.select().from(t.schema.sessions).where(eq(t.schema.sessions.userId, id));
const addSession = (id: string) =>
  t.db.insert(t.schema.sessions).values({ id: crypto.randomUUID(), userId: id, expiresAt: new Date(Date.now() + 1e7) });

describe("redefinição de senha por link", () => {
  it("não envia nada para e-mail inexistente ou sem WhatsApp", async () => {
    expect(await reset.requestPasswordReset("ninguem@t.dev")).toEqual({ sent: false });
    expect(await reset.requestPasswordReset("semfone@t.dev")).toEqual({ sent: false });
  });

  it("troca a senha uma única vez e derruba as sessões", async () => {
    const { sent, token } = await reset.requestPasswordReset("BIA@t.dev");
    expect(sent).toBe(true);
    await addSession(userId);

    await reset.resetPasswordWithToken(token!, "senha-nova-123");
    const [u] = await t.db.select().from(t.schema.users).where(eq(t.schema.users.id, userId));
    expect(await password.verifyPassword("senha-nova-123", u!.passwordHash)).toBe(true);
    expect(await sessionsOf(userId)).toHaveLength(0);

    await expect(reset.resetPasswordWithToken(token!, "outra-senha-123")).rejects.toThrow(/inválido ou expirado/);
  });

  it("recusa link expirado", async () => {
    const { token } = await reset.requestPasswordReset("bia@t.dev");
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(Date.now() + reset.RESET_TTL_MS + 1000);
    await expect(reset.resetPasswordWithToken(token!, "senha-nova-456")).rejects.toThrow(/inválido ou expirado/);
    vi.useRealTimers();
  });
});

describe("troca da própria senha", () => {
  it("exige a senha atual e encerra as sessões", async () => {
    await expect(reset.changeOwnPassword(userId, "errada", "qualquer-123")).rejects.toThrow(/Senha atual incorreta/);
    await addSession(userId);
    await reset.changeOwnPassword(userId, "senha-nova-123", "trocada-789");
    const [u] = await t.db.select().from(t.schema.users).where(eq(t.schema.users.id, userId));
    expect(await password.verifyPassword("trocada-789", u!.passwordHash)).toBe(true);
    expect(await sessionsOf(userId)).toHaveLength(0);
  });
});
