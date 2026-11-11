import "server-only";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { PRIORITIES, SOURCES, SOURCE_LABEL, parseTags } from "@/lib/leads";
import { clickIdOf, safeUrl } from "@/lib/attribution";
import { isValidPhone, normalizePhone } from "@/lib/phone";
import { renderTemplate } from "@/lib/templates";
import { createLead, recordActivity } from "@/server/leads/service";
import { whatsapp } from "@/server/whatsapp";
import { rateLimit } from "@/server/rate-limit";

/** Máximo de boas-vindas automáticas por hora (todas as origens). */
const WELCOME_PER_HOUR = 60;

/**
 * Entrada única para leads vindos de fora (formulário público e API).
 * Valida, deduplica, distribui, avisa o vendedor e manda boas-vindas.
 */

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => v || undefined);

export const captureSchema = z
  .object({
    name: z.string().trim().min(2, "Informe seu nome.").max(120),
    phone: z
      .string()
      .trim()
      .transform((v) => normalizePhone(v))
      .refine(isValidPhone, "Informe um WhatsApp válido com DDD."),
    email: z.union([z.literal(""), z.email("E-mail inválido.")]).optional(),
    company: optionalText(120),
    message: optionalText(2000),
    source: z.enum(SOURCES).optional(),
    priority: z.enum(PRIORITIES).optional(),
    tags: z.union([z.string(), z.array(z.string())]).optional(),
    utm_source: optionalText(100),
    utm_medium: optionalText(100),
    utm_campaign: optionalText(100),
    utm_term: optionalText(100),
    utm_content: optionalText(100),
    gclid: optionalText(200),
    fbclid: optionalText(200),
    /** Página de origem e página do formulário (só http/https são guardadas). */
    referrer: z
      .string()
      .optional()
      .transform((v) => safeUrl(v) ?? undefined),
    landing_page: z
      .string()
      .optional()
      .transform((v) => safeUrl(v) ?? undefined),
  })
  .transform((d) => ({
    ...d,
    email: d.email || undefined,
    tags: Array.isArray(d.tags) ? parseTags(d.tags.join(",")) : parseTags(d.tags ?? ""),
  }));

export type CaptureInput = z.infer<typeof captureSchema>;

export async function captureLead(
  input: CaptureInput,
  opts: { form?: schema.Form; defaultSource: "form" | "api" },
) {
  const form = opts.form;
  const source = input.source ?? opts.defaultSource;
  const { lead, created } = await createLead(
    {
      name: input.name,
      phone: input.phone,
      email: input.email,
      company: input.company,
      message: input.message,
      source,
      priority: input.priority ?? form?.priority ?? "medium",
      tags: parseTags([...(form?.tags ?? []), ...input.tags].join(",")),
      utmSource: input.utm_source,
      utmMedium: input.utm_medium,
      utmCampaign: input.utm_campaign,
      utmTerm: input.utm_term,
      utmContent: input.utm_content,
      clickId: clickIdOf(input),
      referrer: input.referrer,
      landingPage: input.landing_page,
      formId: form?.id,
      // O formulário público sempre mostra o aviso de privacidade antes do envio.
      privacyNoticeAt: source === "form" ? new Date() : null,
    },
    { autoAssign: true, inbound: true },
  );

  if (form) {
    await db
      .update(schema.forms)
      .set({ submissions: sql`${schema.forms.submissions} + 1` })
      .where(eq(schema.forms.id, form.id));
  }

  if (created && lead.ownerId) {
    await db.insert(schema.notifications).values({
      userId: lead.ownerId,
      leadId: lead.id,
      type: "new_lead",
      title: `Novo lead: ${lead.name}`,
      body: form ? `Formulário "${form.name}"` : `Via ${SOURCE_LABEL[source]}`,
    });
  }

  if (created && form?.welcomeMessage && lead.phone) {
    // Teto global: mesmo burlando captcha e limites por IP, o número da empresa não vira disparador de spam.
    if ((await rateLimit("welcome:global", WELCOME_PER_HOUR, 60 * 60 * 1000)).ok) {
      await sendWelcome(lead, form.welcomeMessage);
    } else {
      console.warn("[capture] teto de boas-vindas por hora atingido; mensagem não enviada");
      await recordActivity(lead.id, "system", {
        body: "Boas-vindas automática não enviada: limite de envios por hora atingido.",
      });
    }
  }

  return { lead, created };
}

async function sendWelcome(lead: schema.Lead, template: string) {
  const owner = lead.ownerId
    ? await db.select({ name: schema.users.name }).from(schema.users).where(eq(schema.users.id, lead.ownerId)).get()
    : undefined;
  const body = renderTemplate(template, { nome: lead.name, empresa: lead.company, vendedor: owner?.name ?? "" });
  try {
    const { providerMessageId } = await whatsapp().sendText(lead.phone!, body);
    await recordActivity(lead.id, "whatsapp_out", {
      body,
      meta: { providerMessageId, automated: true },
      automated: true,
    });
  } catch (err) {
    // Falha no envio automático não pode derrubar a captura do lead.
    console.error("[capture] boas-vindas falhou", err);
    await recordActivity(lead.id, "system", { body: "Não foi possível enviar a mensagem automática de boas-vindas." });
  }
}
