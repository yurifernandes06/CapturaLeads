/**
 * Tick interno do SLA: em servidores de longa duração (dev, VPS, Docker)
 * o próprio Next recalcula o SLA a cada minuto. Em serverless, desligue
 * com SLA_INTERNAL_TICK=false e use a rota /api/cron/sla.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  if (process.env.SLA_INTERNAL_TICK === "false") return;

  const { sweepSla } = await import("./server/sla/service");
  const tick = () =>
    sweepSla()
      .then((r) => r.updated && console.log(`[sla] ${r.updated} leads atualizados, ${r.breached} estourados`))
      .catch((err) => console.error("[sla] falha no sweep", err));

  setTimeout(tick, 5_000).unref();
  setInterval(tick, 60_000).unref();
}
