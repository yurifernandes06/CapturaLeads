import { timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import { env } from "@/lib/env";
import { sweepSla } from "@/server/sla/service";

/**
 * Recalcula o SLA e dispara alertas. Chame a cada 1-5 min por um agendador
 * (Vercel Cron, GitHub Actions, cron-job.org) com
 * `Authorization: Bearer <CRON_SECRET>`.
 */
/** Com muitos leads o sweep passa do padrão; o plano Hobby permite até 60s. */
export const maxDuration = 60;

function authorized(request: NextRequest) {
  const secret = env().CRON_SECRET;
  if (!secret) return false;
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) return Response.json({ error: "unauthorized" }, { status: 401 });
  const startedAt = Date.now();
  const result = await sweepSla();
  return Response.json({ ok: true, ...result, ms: Date.now() - startedAt });
}
