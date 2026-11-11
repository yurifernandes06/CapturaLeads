import { sql } from "drizzle-orm";
import { db } from "@/db";
import { env } from "@/lib/env";
import { getSetting } from "@/server/settings";

/** Sweep sem rodar há mais que isso = agendador parado (o cron roda a cada ~5 min). */
const SWEEP_STALE_MS = 15 * 60 * 1000;

/**
 * Health-check público para monitores de uptime (ex.: UptimeRobot, Better Stack).
 * Responde 503 se o banco cair ou se o SLA parou de ser recalculado. Não expõe segredos.
 */
export async function GET() {
  const checks: Record<string, unknown> = {};
  let healthy = true;

  try {
    await db.run(sql`select 1`);
    checks.database = "ok";
  } catch {
    checks.database = "erro";
    healthy = false;
  }

  try {
    const ops = await getSetting("ops");
    const age = ops.lastSweepAt ? Date.now() - ops.lastSweepAt : null;
    const stale = age !== null && age > SWEEP_STALE_MS;
    checks.slaSweep = {
      status: age === null ? "pendente" : stale ? "atrasado" : "ok",
      lastAt: ops.lastSweepAt ? new Date(ops.lastSweepAt).toISOString() : null,
      minutesAgo: age === null ? null : Math.round(age / 60000),
    };
    if (stale) healthy = false;
  } catch {
    checks.slaSweep = { status: "desconhecido" };
  }

  checks.whatsapp = env().WHATSAPP_PROVIDER;

  return Response.json(
    { ok: healthy, checks, at: new Date().toISOString() },
    { status: healthy ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
