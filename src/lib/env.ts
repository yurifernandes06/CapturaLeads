import { z } from "zod";

/**
 * Variáveis de ambiente validadas. Lidas sob demanda (lazy) para não quebrar
 * o build quando uma integração opcional não estiver configurada.
 */
const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_URL: z.string().url().default("http://localhost:3000"),

  DATABASE_URL: z.string().default("file:./data/dev.db"),
  DATABASE_AUTH_TOKEN: z.string().optional(),

  /** Protege a rota de cron do SLA (Authorization: Bearer <CRON_SECRET>). */
  CRON_SECRET: z.string().optional(),
  /** Liga o tick interno do SLA no próprio servidor (útil em VPS/dev). Na Vercel o padrão é desligado. */
  SLA_INTERNAL_TICK: z.enum(["true", "false"]).optional(),

  /** Chave para a API pública de captura (header x-api-key). */
  PUBLIC_API_KEY: z.string().optional(),

  WHATSAPP_PROVIDER: z.enum(["mock", "cloud", "evolution"]).default("mock"),
  WHATSAPP_CLOUD_TOKEN: z.string().optional(),
  WHATSAPP_CLOUD_PHONE_NUMBER_ID: z.string().optional(),
  WHATSAPP_CLOUD_VERIFY_TOKEN: z.string().optional(),
  WHATSAPP_CLOUD_APP_SECRET: z.string().optional(),
  WHATSAPP_CLOUD_API_VERSION: z.string().default("v23.0"),
  EVOLUTION_API_URL: z.string().optional(),
  EVOLUTION_API_KEY: z.string().optional(),
  EVOLUTION_INSTANCE: z.string().optional(),
  /** Token exigido na query (?token=) do webhook quando o provedor não assina o payload. */
  WHATSAPP_WEBHOOK_TOKEN: z.string().optional(),

  /** Opcional: rate limit compartilhado entre instâncias (Upstash Redis REST). */
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

  /** Captcha do formulário público (Cloudflare Turnstile). Opcional: liga quando as duas existem. */
  TURNSTILE_SITE_KEY: z.string().optional(),
  TURNSTILE_SECRET_KEY: z.string().optional(),

  /** Mídia do WhatsApp no Vercel Blob (store privado). Sem nenhum dos dois, grava em data/media. */
  BLOB_READ_WRITE_TOKEN: z.string().optional(),
  BLOB_STORE_ID: z.string().optional(),
});

/** Valores de exemplo do `.env.example`: nunca podem chegar à produção. */
const PLACEHOLDER = /^troque-/i;
const SECRET_KEYS = ["CRON_SECRET", "PUBLIC_API_KEY", "WHATSAPP_WEBHOOK_TOKEN", "WHATSAPP_CLOUD_VERIFY_TOKEN"] as const;

type RawEnv = Record<string, string | undefined>;

export type Env = Omit<z.infer<typeof schema>, "SLA_INTERNAL_TICK"> & { SLA_INTERNAL_TICK: boolean; IS_VERCEL: boolean };

/** Erros de configuração que impedem o boot em produção (fora do build). */
export function productionProblems(e: z.infer<typeof schema>, raw: RawEnv): string[] {
  const problems: string[] = [];
  const onVercel = Boolean(raw.VERCEL);

  if (onVercel && e.DATABASE_URL.startsWith("file:")) {
    problems.push("DATABASE_URL aponta para SQLite local, mas o disco da Vercel é somente leitura. Conecte o Turso (TURSO_DATABASE_URL).");
  }
  if (!e.DATABASE_URL.startsWith("file:") && !e.DATABASE_AUTH_TOKEN) {
    problems.push("DATABASE_AUTH_TOKEN é obrigatório para banco remoto (Turso).");
  }
  if (!e.CRON_SECRET) problems.push("CRON_SECRET é obrigatório em produção (protege /api/cron/sla).");
  for (const key of SECRET_KEYS) {
    const value = e[key];
    if (value && PLACEHOLDER.test(value)) problems.push(`${key} ainda tem o valor de exemplo do .env.example.`);
  }
  if (e.APP_URL.startsWith("http://localhost")) problems.push("APP_URL precisa ser a URL pública (está em localhost).");
  return problems;
}

/** Valida e normaliza. Em produção (fora do build), configuração insegura derruba o boot com mensagem clara. */
export function parseEnv(raw: RawEnv): Env {
  const parsed = schema.safeParse({
    ...raw,
    // A integração Turso da Vercel cria TURSO_DATABASE_URL/TURSO_AUTH_TOKEN: aceitamos os dois nomes.
    DATABASE_URL: raw.DATABASE_URL || raw.TURSO_DATABASE_URL || undefined,
    DATABASE_AUTH_TOKEN: raw.DATABASE_AUTH_TOKEN || raw.TURSO_AUTH_TOKEN || undefined,
  });
  if (!parsed.success) {
    throw new Error(`Variáveis de ambiente inválidas: ${z.prettifyError(parsed.error)}`);
  }
  const e = parsed.data;
  const isVercel = Boolean(raw.VERCEL);

  if (e.NODE_ENV === "production" && raw.NEXT_PHASE !== "phase-production-build") {
    const problems = productionProblems(e, raw);
    if (problems.length) {
      throw new Error(`Configuração insegura para produção:\n- ${problems.join("\n- ")}`);
    }
    if (isVercel && !(e.UPSTASH_REDIS_REST_URL && e.UPSTASH_REDIS_REST_TOKEN)) {
      console.warn("[env] Sem Upstash Redis na Vercel: o rate limit fica por instância e protege pouco o login e o formulário.");
    }
    if (e.WHATSAPP_PROVIDER === "mock") {
      console.warn("[env] WHATSAPP_PROVIDER=mock em produção: nenhuma mensagem real será enviada ou recebida.");
    }
  }

  return {
    ...e,
    // Serverless não mantém processo vivo: o tick interno só liga por padrão fora da Vercel.
    SLA_INTERNAL_TICK: e.SLA_INTERNAL_TICK ? e.SLA_INTERNAL_TICK === "true" : !isVercel,
    IS_VERCEL: isVercel,
  };
}

let cached: Env | undefined;

export function env(): Env {
  cached ??= parseEnv(process.env);
  return cached;
}
