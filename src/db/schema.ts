import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/** Timestamps em ms (integer) — ordenáveis e sem ambiguidade de fuso. */
export const timestamp = (name: string) => integer(name, { mode: "timestamp_ms" });
export const createdAt = () =>
  timestamp("created_at")
    .notNull()
    .default(sql`(unixepoch() * 1000)`);

/** Configurações chave/valor (JSON) editáveis pela tela de configurações. */
export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value", { mode: "json" }).notNull(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});
