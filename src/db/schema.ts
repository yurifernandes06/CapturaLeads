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

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());

export const USER_ROLES = ["admin", "sales"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const users = sqliteTable("users", {
  id: id(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role", { enum: USER_ROLES }).notNull().default("sales"),
  /** Telefone do vendedor (E.164 sem +) para alertas no WhatsApp. */
  phone: text("phone"),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  /** Usado na distribuição round-robin de leads. */
  lastAssignedAt: timestamp("last_assigned_at"),
  createdAt: createdAt(),
});

export const sessions = sqliteTable("sessions", {
  /** sha256 do token do cookie — o token em si nunca é salvo. */
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at").notNull(),
  userAgent: text("user_agent"),
  createdAt: createdAt(),
});

export type User = typeof users.$inferSelect;
