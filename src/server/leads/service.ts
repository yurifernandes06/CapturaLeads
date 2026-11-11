import "server-only";
import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { OUTBOUND_ACTIVITIES, isClosedStage, type ActivityType, type Priority, type Source, type Stage } from "@/lib/leads";
import { normalizePhone, phoneVariants } from "@/lib/phone";
import { refreshLeadSla } from "@/server/sla/service";

/**
 * Regras de escrita de leads. Todo canal (tela, formulário, API, WhatsApp)
 * passa por aqui para manter marcos de contato e histórico consistentes.
 */

export type NewLeadInput = {
  name: string;
  phone?: string | null;
  email?: string | null;
  company?: string | null;
  source: Source;
  priority?: Priority;
  ownerId?: string | null;
  value?: number;
  tags?: string[];
  message?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmTerm?: string | null;
  utmContent?: string | null;
  clickId?: string | null;
  referrer?: string | null;
  landingPage?: string | null;
  formId?: string | null;
};

export async function findLeadByPhone(phone: string) {
  const normalized = normalizePhone(phone);
  if (!normalized) return undefined;
  return db
    .select()
    .from(schema.leads)
    .where(inArray(schema.leads.phone, phoneVariants(normalized)))
    .get();
}

/** Round-robin: vendedor ativo que recebeu lead há mais tempo. Sem vendedores, cai para admins. */
export async function pickNextOwner(): Promise<string | null> {
  // Compare-and-set: se outro lead simultâneo pegou o mesmo vendedor, tenta o próximo da fila.
  for (let attempt = 0; attempt < 3; attempt++) {
    const candidates = await db
      .select({ id: schema.users.id, role: schema.users.role, lastAssignedAt: schema.users.lastAssignedAt })
      .from(schema.users)
      .where(eq(schema.users.active, true))
      .orderBy(sql`${schema.users.lastAssignedAt} is not null`, asc(schema.users.lastAssignedAt));
    const next = candidates.find((u) => u.role === "sales") ?? candidates[0];
    if (!next) return null;
    const claimed = await db
      .update(schema.users)
      .set({ lastAssignedAt: new Date() })
      .where(
        and(
          eq(schema.users.id, next.id),
          next.lastAssignedAt ? eq(schema.users.lastAssignedAt, next.lastAssignedAt) : isNull(schema.users.lastAssignedAt),
        ),
      )
      .returning({ id: schema.users.id });
    if (claimed.length) return next.id;
  }
  return null;
}

export type CreateLeadResult = { lead: schema.Lead; created: boolean };

/**
 * Cria um lead. Se o telefone já existir, devolve o lead existente
 * (`created: false`) e registra o novo contato no histórico.
 */
export async function createLead(
  input: NewLeadInput,
  opts: { actorId?: string | null; autoAssign?: boolean; inbound?: boolean } = {},
): Promise<CreateLeadResult> {
  const phone = input.phone ? normalizePhone(input.phone) || null : null;
  const now = new Date();

  const repeatContact = async (existing: schema.Lead): Promise<CreateLeadResult> => {
    await recordActivity(existing.id, "system", {
      userId: opts.actorId,
      body: `Novo contato recebido via ${input.source}${input.message ? `: "${input.message}"` : ""}`,
      meta: { source: input.source, utmCampaign: input.utmCampaign ?? null },
      inbound: opts.inbound,
    });
    return { lead: existing, created: false };
  };

  if (phone) {
    const existing = await findLeadByPhone(phone);
    if (existing) return repeatContact(existing);
  }

  const ownerId = input.ownerId ?? (opts.autoAssign ? await pickNextOwner() : null);
  const [lead] = await db
    .insert(schema.leads)
    .values({
      name: input.name.trim() || phone || "Sem nome",
      phone,
      email: input.email?.trim().toLowerCase() || null,
      company: input.company?.trim() || null,
      source: input.source,
      priority: input.priority ?? "medium",
      ownerId,
      value: input.value ?? 0,
      tags: input.tags ?? [],
      message: input.message ?? null,
      utmSource: input.utmSource ?? null,
      utmMedium: input.utmMedium ?? null,
      utmCampaign: input.utmCampaign ?? null,
      utmTerm: input.utmTerm ?? null,
      utmContent: input.utmContent ?? null,
      clickId: input.clickId ?? null,
      referrer: input.referrer ?? null,
      landingPage: input.landingPage ?? null,
      formId: input.formId ?? null,
      lastInboundAt: opts.inbound ? now : null,
      createdAt: now,
    })
    // Corrida: outro request criou o mesmo telefone entre a busca e o insert.
    .onConflictDoNothing({ target: schema.leads.phone })
    .returning();

  if (!lead) {
    const existing = phone ? await findLeadByPhone(phone) : undefined;
    if (!existing) throw new Error("Não foi possível criar o lead.");
    return repeatContact(existing);
  }

  await db.insert(schema.activities).values({
    leadId: lead.id,
    userId: opts.actorId ?? null,
    type: "created",
    body: input.message ?? null,
    meta: { source: input.source, ownerId },
    createdAt: now,
  });

  await refreshLeadSla(lead.id);
  return { lead, created: true };
}

/**
 * Registra uma atividade e atualiza os marcos de contato do lead:
 * - saída (ligação/WhatsApp enviado): lastOutboundAt e, se for a primeira, firstResponseAt
 * - entrada (WhatsApp recebido ou `inbound`): lastInboundAt
 * - qualquer ação de usuário: lastActivityAt
 */
export async function recordActivity(
  leadId: string,
  type: ActivityType,
  opts: {
    userId?: string | null;
    body?: string | null;
    meta?: Record<string, unknown>;
    inbound?: boolean;
    at?: Date;
    /** Mensagem automática: entra no histórico mas não conta como contato humano no SLA. */
    automated?: boolean;
  } = {},
) {
  const at = opts.at ?? new Date();
  const [activity] = await db
    .insert(schema.activities)
    .values({
      leadId,
      userId: opts.userId ?? null,
      type,
      body: opts.body ?? null,
      meta: opts.meta,
      providerMessageId: typeof opts.meta?.providerMessageId === "string" ? opts.meta.providerMessageId : null,
      createdAt: at,
    })
    .returning();

  const patch: Partial<schema.Lead> = {};
  const humanOutbound = OUTBOUND_ACTIVITIES.includes(type) && !opts.automated;
  if (humanOutbound) {
    patch.lastOutboundAt = at;
    patch.lastActivityAt = at;
  }
  if (type === "whatsapp_in" || opts.inbound) patch.lastInboundAt = at;
  if (opts.userId && type !== "system") patch.lastActivityAt = at;

  if (Object.keys(patch).length) {
    await db.update(schema.leads).set(patch).where(eq(schema.leads.id, leadId));
  }
  if (humanOutbound) {
    await db
      .update(schema.leads)
      .set({ firstResponseAt: at })
      .where(and(eq(schema.leads.id, leadId), sql`${schema.leads.firstResponseAt} is null`));
    await autoAdvanceFromNew(leadId, opts.userId ?? null, at);
  }
  await refreshLeadSla(leadId);
  return activity!;
}

/**
 * Primeiro contato humano (WhatsApp enviado ou ligação) tira o lead de "Novo".
 * O UPDATE condicional garante que só acontece uma vez, mesmo com envios simultâneos.
 */
async function autoAdvanceFromNew(leadId: string, userId: string | null, at: Date) {
  const moved = await db
    .update(schema.leads)
    .set({ stage: "contacted" })
    .where(and(eq(schema.leads.id, leadId), eq(schema.leads.stage, "new")))
    .returning({ id: schema.leads.id });
  if (!moved.length) return;
  await db.insert(schema.activities).values({
    leadId,
    userId,
    type: "stage_change",
    meta: { from: "new", to: "contacted", auto: true },
    createdAt: at,
  });
}

export async function changeStage(leadId: string, stage: Stage, actorId: string, lostReason?: string | null) {
  const lead = await db.select().from(schema.leads).where(eq(schema.leads.id, leadId)).get();
  if (!lead) throw new Error("Lead não encontrado.");
  if (lead.stage === stage) return lead;

  const now = new Date();
  const closing = isClosedStage(stage);
  await db
    .update(schema.leads)
    .set({
      stage,
      lostReason: stage === "lost" ? (lostReason ?? "Outro") : null,
      closedAt: closing ? now : null,
      // Avançar o lead de "Novo" significa que alguém já fez contato.
      firstResponseAt: lead.firstResponseAt ?? (lead.stage === "new" && stage !== "lost" ? now : null),
    })
    .where(eq(schema.leads.id, leadId));

  await recordActivity(leadId, "stage_change", {
    userId: actorId,
    meta: { from: lead.stage, to: stage, lostReason: stage === "lost" ? (lostReason ?? "Outro") : undefined },
    at: now,
  });
  return { ...lead, stage };
}

export async function assignOwner(leadId: string, ownerId: string | null, actorId: string) {
  await db.update(schema.leads).set({ ownerId }).where(eq(schema.leads.id, leadId));
  await recordActivity(leadId, "assignment", { userId: actorId, meta: { ownerId } });
}
