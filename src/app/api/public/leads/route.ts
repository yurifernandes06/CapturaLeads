import { timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { db, schema } from "@/db";
import { env } from "@/lib/env";
import { captureLead, captureSchema } from "@/server/capture/service";
import { rateLimit } from "@/server/rate-limit";

/**
 * API pública de captura.
 *   POST /api/public/leads
 *   Header: x-api-key: <PUBLIC_API_KEY>
 *   Body:   { name, phone, email?, company?, message?, source?, priority?, tags?, utm_*?, form? }
 */
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type, x-api-key",
};

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: CORS });

function validKey(request: NextRequest) {
  const expected = env().PUBLIC_API_KEY;
  if (!expected) return false;
  const given = Buffer.from(request.headers.get("x-api-key") ?? "");
  const exp = Buffer.from(expected);
  return given.length === exp.length && timingSafeEqual(given, exp);
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function POST(request: NextRequest) {
  if (!validKey(request)) return json({ error: "API key inválida." }, 401);

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (!rateLimit(`api:${ip}`, 60, 60_000).ok) return json({ error: "Muitas requisições." }, 429);

  const body = await request.json().catch(() => null);
  const parsed = captureSchema.safeParse(body);
  if (!parsed.success) {
    return json({ error: "Dados inválidos.", issues: z.flattenError(parsed.error).fieldErrors }, 422);
  }

  const formSlug = typeof body?.form === "string" ? body.form : undefined;
  const form = formSlug
    ? await db.select().from(schema.forms).where(eq(schema.forms.slug, formSlug)).get()
    : undefined;

  const { lead, created } = await captureLead(parsed.data, { form, defaultSource: "api" });
  return json({ id: lead.id, created }, created ? 201 : 200);
}
