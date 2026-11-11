import type { Instrumentation } from "next";

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

/**
 * Erros de servidor (render, route handlers, actions) em JSON de uma linha — fácil de
 * filtrar nos logs da Vercel. Com ERROR_WEBHOOK_URL, só um aviso mínimo sai do servidor
 * (código, rota e método): mensagem e stack podem conter dados pessoais e ficam no log.
 */
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  const error = err instanceof Error ? err : new Error(String(err));
  const payload = {
    level: "error",
    message: error.message,
    digest: typeof err === "object" && err !== null && "digest" in err ? String(err.digest) : undefined,
    stack: error.stack?.split("\n").slice(0, 6).join("\n"),
    method: request.method,
    path: request.path,
    route: context.routePath,
    type: context.routeType,
    at: new Date().toISOString(),
  };
  console.error(JSON.stringify(payload));

  const url = process.env.ERROR_WEBHOOK_URL;
  if (url) {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: `🚨 Erro no servidor (${payload.method} ${payload.route}) — código ${payload.digest ?? "sem digest"}`,
        digest: payload.digest,
        method: payload.method,
        route: payload.route,
        type: payload.type,
        at: payload.at,
      }),
      signal: AbortSignal.timeout(3000),
    }).catch(() => {});
  }
};
