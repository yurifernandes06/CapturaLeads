"use server";

import { and, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db, schema } from "@/db";
import { errorMessage, type ActionResult } from "@/lib/action-result";
import { PRIORITIES, parseTags } from "@/lib/leads";
import { isValidPhone, normalizePhone } from "@/lib/phone";
import { assertUser } from "@/server/auth/dal";
import { slugify } from "@/lib/slug";

const PATH = "/settings/forms";

const formSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2, "Dê um nome interno ao formulário.").max(60),
  slug: z.string().trim().optional(),
  title: z.string().trim().min(2, "Informe o título que o lead vai ver.").max(120),
  description: z.string().trim().max(400).optional(),
  buttonText: z.string().trim().min(1).max(40),
  successMessage: z.string().trim().min(1).max(300),
  priority: z.enum(PRIORITIES),
  tags: z.string().optional(),
  welcomeMessage: z.string().trim().max(1000).optional(),
  askEmail: z.string().optional(),
  askCompany: z.string().optional(),
  whatsappNumber: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? normalizePhone(v) : ""))
    .refine((v) => !v || isValidPhone(v), "WhatsApp da empresa inválido. Use DDD + número."),
});

export async function saveFormAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    await assertUser("admin");
    const d = formSchema.parse(Object.fromEntries(formData));
    const slug = slugify(d.slug || d.name);
    if (!slug) return { ok: false, error: "Endereço inválido." };

    const clash = await db
      .select({ id: schema.forms.id })
      .from(schema.forms)
      .where(d.id ? and(eq(schema.forms.slug, slug), ne(schema.forms.id, d.id)) : eq(schema.forms.slug, slug))
      .get();
    if (clash) return { ok: false, error: `O endereço /f/${slug} já está em uso.` };

    const values = {
      name: d.name,
      slug,
      title: d.title,
      description: d.description || null,
      buttonText: d.buttonText,
      successMessage: d.successMessage,
      priority: d.priority,
      tags: parseTags(d.tags ?? ""),
      welcomeMessage: d.welcomeMessage || null,
      askEmail: d.askEmail === "on",
      askCompany: d.askCompany === "on",
      whatsappNumber: d.whatsappNumber || null,
    };
    if (d.id) await db.update(schema.forms).set(values).where(eq(schema.forms.id, d.id));
    else await db.insert(schema.forms).values(values);

    revalidatePath(PATH);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

export async function setFormActiveAction(id: string, active: boolean): Promise<ActionResult> {
  try {
    await assertUser("admin");
    await db.update(schema.forms).set({ active }).where(eq(schema.forms.id, id));
    revalidatePath(PATH);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}
