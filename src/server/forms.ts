import "server-only";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";

/** Usado pelo proxy para devolver 404 real antes do streaming começar. */
export async function isActiveFormSlug(slug: string): Promise<boolean> {
  const row = await db
    .select({ id: schema.forms.id })
    .from(schema.forms)
    .where(and(eq(schema.forms.slug, slug), eq(schema.forms.active, true)))
    .get();
  return Boolean(row);
}

/** Título e descrição públicos do formulário (metadata e imagem de compartilhamento). */
export async function getPublicFormMeta(slug: string) {
  return db
    .select({ title: schema.forms.title, description: schema.forms.description })
    .from(schema.forms)
    .where(and(eq(schema.forms.slug, slug), eq(schema.forms.active, true)))
    .get();
}
