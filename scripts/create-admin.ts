/**
 * Cria (ou promove/redefine a senha de) um administrador, sem dados de demonstração.
 * Uso: npm run admin:create -- email@empresa.com "Nome" "senha-forte"
 */
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";

async function main() {
  const [email, name, password] = process.argv.slice(2);
  if (!email?.includes("@") || !name || !password) {
    console.error('Uso: npm run admin:create -- email@empresa.com "Nome" "senha-forte"');
    process.exit(1);
  }
  if (password.length < 8) {
    console.error("A senha precisa de pelo menos 8 caracteres.");
    process.exit(1);
  }

  const normalized = email.trim().toLowerCase();
  const passwordHash = await bcrypt.hash(password, 12);
  const existing = await db.select().from(schema.users).where(eq(schema.users.email, normalized)).get();

  if (existing) {
    await db
      .update(schema.users)
      .set({ role: "admin", active: true, passwordHash })
      .where(eq(schema.users.id, existing.id));
    console.log(`✓ ${normalized} atualizado como admin (senha redefinida)`);
  } else {
    await db.insert(schema.users).values({ email: normalized, name, role: "admin", passwordHash });
    console.log(`✓ admin ${normalized} criado`);
  }
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error(err);
    process.exit(1);
  },
);
