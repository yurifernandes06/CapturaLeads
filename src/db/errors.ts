/** SQLite/libsql: violação de UNIQUE (ex.: dois webhooks iguais gravando ao mesmo tempo). */
export function isUniqueViolation(err: unknown): boolean {
  for (let e: unknown = err; e; e = (e as { cause?: unknown }).cause) {
    const { code, message } = e as { code?: string; message?: string };
    if (code === "SQLITE_CONSTRAINT_UNIQUE" || /UNIQUE constraint failed/i.test(message ?? "")) return true;
  }
  return false;
}
