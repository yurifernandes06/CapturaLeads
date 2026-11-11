import "server-only";
import { env } from "@/lib/env";

/**
 * Rate limit de janela fixa.
 * - Com Upstash Redis configurado, o contador é compartilhado entre instâncias
 *   (REST, sem dependência extra).
 * - Sem Redis, ou se ele falhar, cai para memória local: protege uma instância
 *   e nunca derruba o login por indisponibilidade do Redis.
 */
export type RateLimitResult = { ok: boolean; retryAfterMs: number };

const PREFIX = "cl:rl:";
const buckets = new Map<string, { count: number; resetAt: number }>();
const PRUNE_AT = 5_000;

/** Remove janelas vencidas para o Map não crescer sem limite em processos longos. */
function prune(now: number) {
  for (const [key, bucket] of buckets) if (bucket.resetAt <= now) buckets.delete(key);
}

function memoryHit(key: string, limit: number, windowMs: number, now = Date.now()): RateLimitResult {
  if (buckets.size >= PRUNE_AT) prune(now);
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterMs: 0 };
  }
  bucket.count += 1;
  if (bucket.count > limit) return { ok: false, retryAfterMs: bucket.resetAt - now };
  return { ok: true, retryAfterMs: 0 };
}

function redisConfig() {
  const { UPSTASH_REDIS_REST_URL: url, UPSTASH_REDIS_REST_TOKEN: token } = env();
  return url && token ? { url: url.replace(/\/$/, ""), token } : null;
}

async function redisPipeline(commands: (string | number)[][]): Promise<unknown[]> {
  const cfg = redisConfig();
  if (!cfg) throw new Error("Redis não configurado");
  const res = await fetch(`${cfg.url}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${cfg.token}`, "Content-Type": "application/json" },
    body: JSON.stringify(commands),
    cache: "no-store",
    signal: AbortSignal.timeout(1500),
  });
  if (!res.ok) throw new Error(`Upstash respondeu ${res.status}`);
  const data = (await res.json()) as { result?: unknown; error?: string }[];
  const failed = data.find((d) => d.error);
  if (failed) throw new Error(failed.error);
  return data.map((d) => d.result);
}

export async function rateLimit(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
  if (redisConfig()) {
    try {
      const k = PREFIX + key;
      const [count, , ttl] = await redisPipeline([
        ["INCR", k],
        ["PEXPIRE", k, windowMs, "NX"],
        ["PTTL", k],
      ]);
      const n = Number(count);
      const left = Number(ttl) > 0 ? Number(ttl) : windowMs;
      return n > limit ? { ok: false, retryAfterMs: left } : { ok: true, retryAfterMs: 0 };
    } catch (err) {
      console.warn("[rate-limit] Redis indisponível, usando memória:", (err as Error).message);
    }
  }
  return memoryHit(key, limit, windowMs);
}

export async function resetRateLimit(key: string): Promise<void> {
  buckets.delete(key);
  if (redisConfig()) {
    await redisPipeline([["DEL", PREFIX + key]]).catch(() => {});
  }
}
