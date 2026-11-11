import "server-only";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { DEFAULT_SLA_CONFIG, slaConfigSchema } from "@/lib/sla/config";
import { DEFAULT_TEMPLATES, templatesSchema } from "@/lib/templates";

/**
 * Configurações tipadas guardadas na tabela `settings`. Cada chave tem um
 * schema e um default: valores inválidos ou ausentes caem no default.
 */
const opsSchema = z.object({
  lastSweepAt: z.number().nullable(),
  lastSweepMs: z.number().nullable(),
});

const REGISTRY = {
  sla: { schema: slaConfigSchema, fallback: DEFAULT_SLA_CONFIG },
  whatsappTemplates: { schema: templatesSchema, fallback: DEFAULT_TEMPLATES },
  /** Operação: quando o SLA foi recalculado pela última vez (health-check). */
  ops: { schema: opsSchema, fallback: { lastSweepAt: null, lastSweepMs: null } },
} satisfies Record<string, { schema: z.ZodType; fallback: unknown }>;

type Registry = typeof REGISTRY;
export type SettingKey = keyof Registry;
export type SettingValue<K extends SettingKey> = z.infer<Registry[K]["schema"]>;

function definition(key: string) {
  const def = (REGISTRY as Record<string, { schema: z.ZodType; fallback: unknown }>)[key];
  if (!def) throw new Error(`Configuração desconhecida: ${key}`);
  return def;
}

async function getRawSetting(key: string): Promise<unknown> {
  const def = definition(key);
  const row = await db.select().from(schema.settings).where(eq(schema.settings.key, key)).get();
  if (!row) return def.fallback;
  const parsed = def.schema.safeParse(row.value);
  return parsed.success ? parsed.data : def.fallback;
}

async function setRawSetting(key: string, value: unknown) {
  const parsed = definition(key).schema.parse(value);
  await db
    .insert(schema.settings)
    .values({ key, value: parsed, updatedAt: new Date() })
    .onConflictDoUpdate({ target: schema.settings.key, set: { value: parsed, updatedAt: new Date() } });
}

export const getSetting = <K extends SettingKey>(key: K) => getRawSetting(key) as Promise<SettingValue<K>>;
export const setSetting = <K extends SettingKey>(key: K, value: SettingValue<K>) => setRawSetting(key, value);
