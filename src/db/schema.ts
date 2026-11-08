import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { ACTIVITY_TYPES, PRIORITIES, SOURCES, STAGES } from "@/lib/leads";

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

export const leads = sqliteTable(
  "leads",
  {
    id: id(),
    name: text("name").notNull(),
    phone: text("phone"),
    email: text("email"),
    company: text("company"),
    stage: text("stage", { enum: STAGES }).notNull().default("new"),
    priority: text("priority", { enum: PRIORITIES }).notNull().default("medium"),
    source: text("source", { enum: SOURCES }).notNull().default("manual"),
    ownerId: text("owner_id").references(() => users.id, { onDelete: "set null" }),
    /** Valor estimado do negócio em centavos. */
    value: integer("value").notNull().default(0),
    tags: text("tags", { mode: "json" }).$type<string[]>().notNull().default(sql`'[]'`),
    message: text("message"),
    lostReason: text("lost_reason"),
    utmSource: text("utm_source"),
    utmMedium: text("utm_medium"),
    utmCampaign: text("utm_campaign"),
    /** Marcos de contato usados pelo motor de SLA. */
    firstResponseAt: timestamp("first_response_at"),
    lastInboundAt: timestamp("last_inbound_at"),
    lastOutboundAt: timestamp("last_outbound_at"),
    lastActivityAt: timestamp("last_activity_at"),
    closedAt: timestamp("closed_at"),
    createdAt: createdAt(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .default(sql`(unixepoch() * 1000)`)
      .$onUpdateFn(() => new Date()),
  },
  (t) => [
    index("leads_phone_idx").on(t.phone),
    index("leads_stage_idx").on(t.stage),
    index("leads_owner_idx").on(t.ownerId),
    index("leads_created_idx").on(t.createdAt),
  ],
);

export const activities = sqliteTable(
  "activities",
  {
    id: id(),
    leadId: text("lead_id")
      .notNull()
      .references(() => leads.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    type: text("type", { enum: ACTIVITY_TYPES }).notNull(),
    body: text("body"),
    meta: text("meta", { mode: "json" }).$type<Record<string, unknown>>(),
    createdAt: createdAt(),
  },
  (t) => [index("activities_lead_idx").on(t.leadId, t.createdAt)],
);

export type Lead = typeof leads.$inferSelect;
export type Activity = typeof activities.$inferSelect;
