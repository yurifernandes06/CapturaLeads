/**
 * Marca a migration inicial como aplicada em bancos criados antes das migrations
 * (com `db:push`). Assim `npm run db:migrate` não tenta recriar tabelas existentes.
 *
 * Uso: npm run db:baseline   (uma vez por banco; idempotente)
 * Antes, garanta que o schema do banco está igual ao do código (ex.: `npm run db:push` em dev).
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@libsql/client";
import { env } from "@/lib/env";

const MIGRATIONS_TABLE = "__drizzle_migrations";
const folder = path.join(process.cwd(), "drizzle");
const journal = JSON.parse(readFileSync(path.join(folder, "meta/_journal.json"), "utf8")) as {
  entries: { tag: string; when: number }[];
};
const first = journal.entries[0];
if (!first) throw new Error("Nenhuma migration em drizzle/. Rode `npm run db:generate` antes.");

async function main() {
  const { DATABASE_URL, DATABASE_AUTH_TOKEN } = env();
  const client = createClient({ url: DATABASE_URL, authToken: DATABASE_AUTH_TOKEN });

  const tables = await client.execute("SELECT name FROM sqlite_master WHERE type = 'table'");
  const names = new Set(tables.rows.map((r) => String(r.name)));

  if (names.has(MIGRATIONS_TABLE)) {
    const applied = await client.execute(`SELECT count(*) AS n FROM ${MIGRATIONS_TABLE}`);
    if (Number(applied.rows[0]?.n) > 0) {
      console.log("• Banco já controlado por migrations. Nada a fazer.");
      return;
    }
  }
  if (!names.has("leads")) {
    console.log("• Banco vazio: rode `npm run db:migrate` (não precisa de baseline).");
    return;
  }

  const sqlText = readFileSync(path.join(folder, `${first.tag}.sql`), "utf8");
  const hash = createHash("sha256").update(sqlText).digest("hex");
  await client.batch(
    [
      `CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (id SERIAL PRIMARY KEY, hash text NOT NULL, created_at numeric)`,
      { sql: `INSERT INTO ${MIGRATIONS_TABLE} (hash, created_at) VALUES (?, ?)`, args: [hash, first.when] },
    ],
    "write",
  );
  console.log(`✓ Baseline gravado: ${first.tag} marcada como aplicada.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
