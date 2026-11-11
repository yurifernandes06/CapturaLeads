import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { ACTIVITY_TYPES, PRIORITIES, SOURCES, STAGES } from "@/lib/leads";
import { SLA_STATUSES } from "@/lib/sla/config";
import { AUDIT_ACTIONS } from "@/lib/audit";

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

/** Links de redefinição de senha: uso único e curta duração. */
export const passwordResets = sqliteTable("password_resets", {
  /** sha256 do token do link — o token em si nunca é salvo. */
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
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
    utmTerm: text("utm_term"),
    utmContent: text("utm_content"),
    /** Clique de anúncio: `gclid:…` (Google) ou `fbclid:…` (Meta). */
    clickId: text("click_id"),
    /** Site de onde a pessoa veio e página em que preencheu o formulário. */
    referrer: text("referrer"),
    landingPage: text("landing_page"),
    formId: text("form_id"),
    /** Marcos de contato usados pelo motor de SLA. */
    firstResponseAt: timestamp("first_response_at"),
    lastInboundAt: timestamp("last_inbound_at"),
    lastOutboundAt: timestamp("last_outbound_at"),
    lastActivityAt: timestamp("last_activity_at"),
    closedAt: timestamp("closed_at"),
    /** Estado do SLA materializado pelo motor (recalculado a cada mudança e pelo sweep). */
    slaKind: text("sla_kind", { enum: ["first_response", "reply", "follow_up"] }),
    slaStatus: text("sla_status", { enum: SLA_STATUSES }).notNull().default("none"),
    slaStartedAt: timestamp("sla_started_at"),
    slaDueAt: timestamp("sla_due_at"),
    /** Último alerta de estouro enviado — evita alertar duas vezes o mesmo ciclo. */
    slaNotifiedAt: timestamp("sla_notified_at"),
    /** Quando o titular viu o aviso de privacidade (formulário público). */
    privacyNoticeAt: timestamp("privacy_notice_at"),
    /** Dados pessoais removidos a pedido do titular (LGPD). */
    anonymizedAt: timestamp("anonymized_at"),
    createdAt: createdAt(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .default(sql`(unixepoch() * 1000)`)
      .$onUpdateFn(() => new Date()),
  },
  (t) => [
    // Único: duas capturas simultâneas do mesmo número não viram dois leads (NULL não conflita).
    uniqueIndex("leads_phone_unique").on(t.phone),
    index("leads_stage_idx").on(t.stage),
    index("leads_owner_idx").on(t.ownerId),
    index("leads_created_idx").on(t.createdAt),
    index("leads_sla_idx").on(t.slaStatus, t.slaDueAt),
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
    /** Id da mensagem no provedor do WhatsApp: único para descartar webhooks reenviados. */
    providerMessageId: text("provider_message_id"),
    createdAt: createdAt(),
  },
  (t) => [
    index("activities_lead_idx").on(t.leadId, t.createdAt),
    uniqueIndex("activities_provider_message_unique").on(t.providerMessageId),
  ],
);

export type Lead = typeof leads.$inferSelect;
export type Activity = typeof activities.$inferSelect;

export const NOTIFICATION_TYPES = ["sla_breach", "sla_at_risk", "new_lead", "new_message", "task_due"] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const notifications = sqliteTable(
  "notifications",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    leadId: text("lead_id").references(() => leads.id, { onDelete: "cascade" }),
    type: text("type", { enum: NOTIFICATION_TYPES }).notNull(),
    title: text("title").notNull(),
    body: text("body"),
    readAt: timestamp("read_at"),
    createdAt: createdAt(),
  },
  (t) => [index("notifications_user_idx").on(t.userId, t.readAt)],
);

export type Notification = typeof notifications.$inferSelect;

export const forms = sqliteTable("forms", {
  id: id(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  buttonText: text("button_text").notNull().default("Quero ser atendido"),
  successMessage: text("success_message").notNull().default("Recebemos seu contato! Em instantes falamos com você no WhatsApp."),
  priority: text("priority", { enum: PRIORITIES }).notNull().default("medium"),
  tags: text("tags", { mode: "json" }).$type<string[]>().notNull().default(sql`'[]'`),
  /** Mensagem automática de boas-vindas no WhatsApp (vazio = não envia). */
  welcomeMessage: text("welcome_message"),
  askEmail: integer("ask_email", { mode: "boolean" }).notNull().default(true),
  askCompany: integer("ask_company", { mode: "boolean" }).notNull().default(false),
  /** WhatsApp da empresa: a tela de sucesso oferece "chamar agora" (vazio = sem botão). */
  whatsappNumber: text("whatsapp_number"),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  submissions: integer("submissions").notNull().default(0),
  createdAt: createdAt(),
});

export type Form = typeof forms.$inferSelect;

/** Tarefas/lembretes ligados a um lead ("ligar amanhã 10h", "enviar proposta"). */
export const tasks = sqliteTable(
  "tasks",
  {
    id: id(),
    leadId: text("lead_id")
      .notNull()
      .references(() => leads.id, { onDelete: "cascade" }),
    /** Quem executa. Vendedor removido → tarefa fica sem dono, não some. */
    assigneeId: text("assignee_id").references(() => users.id, { onDelete: "set null" }),
    createdById: text("created_by_id").references(() => users.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    dueAt: timestamp("due_at").notNull(),
    doneAt: timestamp("done_at"),
    /** Quando o lembrete de vencimento foi enviado (um por tarefa). */
    remindedAt: timestamp("reminded_at"),
    createdAt: createdAt(),
  },
  (t) => [index("tasks_assignee_idx").on(t.assigneeId, t.doneAt, t.dueAt), index("tasks_lead_idx").on(t.leadId)],
);

export type Task = typeof tasks.$inferSelect;

/** Trilha de ações sensíveis (export, reatribuição, exclusão, usuários). Só inserção. */
export const auditLogs = sqliteTable(
  "audit_logs",
  {
    id: id(),
    actorId: text("actor_id").references(() => users.id, { onDelete: "set null" }),
    /** Nome no momento da ação: o registro continua legível se o usuário for removido. */
    actorName: text("actor_name").notNull(),
    action: text("action", { enum: AUDIT_ACTIONS }).notNull(),
    summary: text("summary").notNull(),
    targetType: text("target_type", { enum: ["lead", "user"] }),
    targetId: text("target_id"),
    meta: text("meta", { mode: "json" }).$type<Record<string, unknown>>(),
    createdAt: createdAt(),
  },
  (t) => [index("audit_logs_created_idx").on(t.createdAt)],
);

export type AuditLog = typeof auditLogs.$inferSelect;
