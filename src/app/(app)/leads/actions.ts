"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db, schema } from "@/db";
import { errorMessage, type ActionResult } from "@/lib/action-result";
import { PRIORITIES, SOURCES, STAGES, parseTags, type Stage } from "@/lib/leads";
import { isValidPhone, normalizePhone } from "@/lib/phone";
import { assertUser } from "@/server/auth/dal";
import { assignOwner, changeStage, createLead, findLeadByPhone, recordActivity } from "@/server/leads/service";

function revalidateLead(id?: string) {
  revalidatePath("/leads");
  revalidatePath("/pipeline");
  revalidatePath("/dashboard");
  if (id) revalidatePath(`/leads/${id}`);
}

/** "1.500,00" / "1500" / "1500.5" → centavos */
function parseMoney(v: string | undefined) {
  if (!v) return 0;
  const clean = v.replace(/[^\d,.-]/g, "");
  const normalized = clean.includes(",") ? clean.replace(/\./g, "").replace(",", ".") : clean;
  const n = Number(normalized);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : 0;
}

const phoneField = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? normalizePhone(v) : ""))
  .refine((v) => !v || isValidPhone(v), "Telefone inválido.");

const leadFormSchema = z
  .object({
    name: z.string().trim().max(120).default(""),
    phone: phoneField,
    email: z.union([z.literal(""), z.email("E-mail inválido.")]).optional(),
    company: z.string().trim().max(120).optional(),
    priority: z.enum(PRIORITIES).default("medium"),
    source: z.enum(SOURCES).default("manual"),
    value: z.string().optional(),
    tags: z.string().optional(),
    message: z.string().trim().max(2000).optional(),
    ownerId: z.string().optional(),
  })
  .refine((d) => d.name || d.phone || d.email, { message: "Informe ao menos nome, telefone ou e-mail." });

export async function createLeadAction(
  _prev: ActionResult<{ id: string; created: boolean }>,
  formData: FormData,
): Promise<ActionResult<{ id: string; created: boolean }>> {
  try {
    const user = await assertUser();
    const data = leadFormSchema.parse(Object.fromEntries(formData));
    const { lead, created } = await createLead(
      {
        name: data.name,
        phone: data.phone || null,
        email: data.email || null,
        company: data.company,
        priority: data.priority,
        source: data.source,
        value: parseMoney(data.value),
        tags: parseTags(data.tags ?? ""),
        message: data.message,
        ownerId: data.ownerId === "auto" ? undefined : data.ownerId || user.id,
      },
      { actorId: user.id, autoAssign: data.ownerId === "auto" },
    );
    revalidateLead(lead.id);
    return { ok: true, data: { id: lead.id, created } };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

export async function updateLeadAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const user = await assertUser();
    const id = z.string().min(1).parse(formData.get("id"));
    const data = leadFormSchema.parse(Object.fromEntries(formData));

    if (data.phone) {
      const other = await findLeadByPhone(data.phone);
      if (other && other.id !== id) return { ok: false, error: `Este telefone já pertence ao lead "${other.name}".` };
    }

    await db
      .update(schema.leads)
      .set({
        name: data.name || data.phone || "Sem nome",
        phone: data.phone || null,
        email: data.email || null,
        company: data.company || null,
        priority: data.priority,
        source: data.source,
        value: parseMoney(data.value),
        tags: parseTags(data.tags ?? ""),
        lastActivityAt: new Date(),
      })
      .where(eq(schema.leads.id, id));
    await recordActivity(id, "system", { userId: user.id, body: "Dados do lead atualizados" });
    revalidateLead(id);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

const activitySchema = z.object({
  leadId: z.string().min(1),
  type: z.enum(["note", "call"]),
  body: z.string().trim().min(1, "Escreva algo.").max(5000),
});

export async function addActivityAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const user = await assertUser();
    const { leadId, type, body } = activitySchema.parse(Object.fromEntries(formData));
    await recordActivity(leadId, type, { userId: user.id, body });
    revalidateLead(leadId);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

export async function moveStageAction(leadId: string, stage: Stage, lostReason?: string): Promise<ActionResult> {
  try {
    const user = await assertUser();
    z.enum(STAGES).parse(stage);
    await changeStage(leadId, stage, user.id, lostReason);
    revalidateLead(leadId);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

export async function assignOwnerAction(leadId: string, ownerId: string | null): Promise<ActionResult> {
  try {
    const user = await assertUser();
    await assignOwner(leadId, ownerId, user.id);
    revalidateLead(leadId);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

export async function deleteLeadAction(leadId: string): Promise<ActionResult> {
  try {
    await assertUser("admin");
    await db.delete(schema.leads).where(eq(schema.leads.id, leadId));
    revalidateLead();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}
