/**
 * Popula o banco com dados de demonstração. Idempotente: pode rodar várias vezes.
 */
import bcrypt from "bcryptjs";
import { db, schema } from "@/db";

const DEMO_PASSWORD = "capturaleads";

const USERS = [
  { name: "Admin", email: "admin@capturaleads.dev", role: "admin" as const, phone: null },
  { name: "João Vendas", email: "joao@capturaleads.dev", role: "sales" as const, phone: "5511990000001" },
  { name: "Marina Costa", email: "marina@capturaleads.dev", role: "sales" as const, phone: "5511990000002" },
];

async function seedUsers() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
  for (const u of USERS) {
    await db
      .insert(schema.users)
      .values({ ...u, passwordHash })
      .onConflictDoNothing({ target: schema.users.email });
  }
  return db.select().from(schema.users);
}

async function main() {
  const users = await seedUsers();
  console.log(`✓ ${users.length} usuários (senha: ${DEMO_PASSWORD})`);
  for (const u of USERS) console.log(`  - ${u.email} (${u.role})`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
