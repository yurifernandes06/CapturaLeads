/**
 * Backup lógico do banco (todas as tabelas em JSON, um arquivo por execução).
 * Uso: npm run db:backup -- [pasta]   (padrão: backups/)
 * Usa DATABASE_URL/DATABASE_AUTH_TOKEN (ou os nomes TURSO_*). Complementa o PITR do Turso.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@libsql/client";
import { env } from "@/lib/env";

async function main() {
  const outDir = process.argv[2] ?? "backups";
  const { DATABASE_URL, DATABASE_AUTH_TOKEN } = env();
  const client = createClient({ url: DATABASE_URL, authToken: DATABASE_AUTH_TOKEN });

  const tables = await client.execute(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
  );
  const dump: Record<string, unknown[]> = {};
  for (const { name } of tables.rows) {
    const rows = await client.execute(`SELECT * FROM "${String(name)}"`);
    dump[String(name)] = rows.rows.map((r) => ({ ...r }));
  }

  mkdirSync(outDir, { recursive: true });
  const file = path.join(outDir, `backup-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
  writeFileSync(file, JSON.stringify({ createdAt: new Date().toISOString(), tables: dump }));
  const total = Object.values(dump).reduce((n, rows) => n + rows.length, 0);
  console.log(`✓ ${Object.keys(dump).length} tabelas, ${total} linhas → ${file}`);
  client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
