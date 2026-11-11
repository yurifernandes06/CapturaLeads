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
  /** Liga o tick interno do SLA no próprio servidor (útil em VPS/dev). */
  SLA_INTERNAL_TICK: z
    .enum(["true", "false"])
    .default("true")
    .transform((v) => v === "true"),

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

  /** Mídia do WhatsApp no Vercel Blob (store privado). Sem nenhum dos dois, grava em data/media. */
  BLOB_READ_WRITE_TOKEN: z.string().optional(),
  BLOB_STORE_ID: z.string().optional(),
});

export type Env = z.infer<typeof schema>;

let cached: Env | undefined;

export function env(): Env {
  if (!cached) {
    // A integração Turso da Vercel cria TURSO_DATABASE_URL/TURSO_AUTH_TOKEN: aceitamos os dois nomes.
    const parsed = schema.safeParse({
      ...process.env,
      DATABASE_URL: process.env.DATABASE_URL ?? process.env.TURSO_DATABASE_URL,
      DATABASE_AUTH_TOKEN: process.env.DATABASE_AUTH_TOKEN ?? process.env.TURSO_AUTH_TOKEN,
    });
    if (!parsed.success) {
      throw new Error(`Variáveis de ambiente inválidas: ${z.prettifyError(parsed.error)}`);
    }
    cached = parsed.data;
  }
  return cached;
}
