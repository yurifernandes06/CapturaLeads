import { defineConfig } from "drizzle-kit";

try {
  process.loadEnvFile();
} catch {
  // .env é opcional
}

// Aceita também os nomes criados pela integração Turso da Vercel.
const url = process.env.DATABASE_URL ?? process.env.TURSO_DATABASE_URL ?? "file:./data/dev.db";
const authToken = process.env.DATABASE_AUTH_TOKEN ?? process.env.TURSO_AUTH_TOKEN;

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: url.startsWith("file:") ? "sqlite" : "turso",
  dbCredentials: { url, authToken },
});
