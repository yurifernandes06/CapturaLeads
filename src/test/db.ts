import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { migrate } from "drizzle-orm/libsql/migrator";
import { vi } from "vitest";

/**
 * Banco SQLite real e temporário para testes de integração: aplica as migrations
 * de `drizzle/` e devolve o módulo `@/db` já apontando para ele.
 * Chame em `beforeAll` e use `cleanup` no `afterAll`.
 */
export async function setupTestDb() {
  const dir = mkdtempSync(path.join(tmpdir(), "capturaleads-"));
  process.env.DATABASE_URL = `file:${path.join(dir, "test.db").replace(/\\/g, "/")}`;
  process.env.WHATSAPP_PROVIDER = "mock";
  vi.resetModules();
  const dbm = await import("@/db");
  await migrate(dbm.db, { migrationsFolder: path.join(process.cwd(), "drizzle") });

  const cleanup = () => {
    dbm.db.$client.close();
    // No Windows o libsql pode segurar o arquivo por alguns instantes; a pasta é temporária de qualquer forma.
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch {}
  };
  return { ...dbm, cleanup };
}
