import "server-only";
import { eq } from "drizzle-orm";
import type { z } from "zod";
import { db, schema } from "@/db";
import { DEFAULT_SLA_CONFIG, slaConfigSchema } from "@/lib/sla/config";

/**
 * Configurações tipadas guardadas na tabela `settings`. Cada chave tem um
 * schema e um default: valores inválidos ou ausentes caem no default.
 */
const REGISTRY = {
  sla: { schema: slaConfigSchema, fallback: DEFAULT_SLA_CONFIG },
} satisfies Record<string, { schema: z.ZodType; fallback: unknown }>;

type Registry = typeof REGISTRY;
export type SettingKey = keyof Registry;
export type SettingValue<K extends SettingKey> = z.infer<Registry[K]["schema"]>;

/** Permite que outras features registrem suas chaves sem acoplar este módulo a elas. */
const extra = new Map<string, { schema: z.ZodType; fallback: unknown }>();
export function registerSetting<T>(key: string, def: { schema: z.ZodType<T>; fallback: T }) {
  extra.set(key, def);
  return {
    get: () => getRawSetting(key) as Promise<T>,
    set: (value: T) => setRawSetting(key, value),
  };
}

function definition(key: string) {
  const def = (REGISTRY as Record<string, { schema: z.ZodType; fallback: unknown }>)[key] ?? extra.get(key);
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
