import { createClient, type Client } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { env } from "@/lib/env";
import * as schema from "./schema";

/**
 * Cliente único do banco. Em dev o HMR recria módulos, então guardamos o
 * client no globalThis para não abrir conexões a cada reload.
 */
const globalForDb = globalThis as unknown as { __libsql?: Client };

function getClient(): Client {
  if (!globalForDb.__libsql) {
    const { DATABASE_URL, DATABASE_AUTH_TOKEN } = env();
    globalForDb.__libsql = createClient({ url: DATABASE_URL, authToken: DATABASE_AUTH_TOKEN });
  }
  return globalForDb.__libsql;
}

export const db = drizzle(getClient(), { schema });
export type DB = typeof db;
export { schema };
