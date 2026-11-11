/**
 * Boot do servidor: valida as variáveis de ambiente (falha rápido se a configuração
 * de produção for insegura) e liga o tick interno do SLA em servidores de longa duração
 * (dev, VPS, Docker). Na Vercel o tick fica desligado por padrão: use /api/cron/sla.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;

  const { env } = await import("./lib/env");
  if (!env().SLA_INTERNAL_TICK) return;

  const { sweepSla } = await import("./server/sla/service");
  const tick = () =>
    sweepSla()
      .then((r) => {
        if (r.updated) console.log(`[sla] ${r.updated} leads atualizados, ${r.breached} estourados`);
        if (r.reminded) console.log(`[tasks] ${r.reminded} lembretes de tarefa enviados`);
      })
      .catch((err) => console.error("[sla] falha no sweep", err));

  setTimeout(tick, 5_000).unref();
  setInterval(tick, 60_000).unref();
}
