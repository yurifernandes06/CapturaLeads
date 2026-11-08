import { z } from "zod";

/** Resultado padrão das Server Actions consumidas por formulários. */
export type ActionResult<T = undefined> = { ok: boolean; error?: string; data?: T };

export function errorMessage(err: unknown) {
  if (err instanceof z.ZodError) return err.issues[0]?.message ?? "Dados inválidos.";
  if (err instanceof Error) return err.message;
  return "Erro inesperado.";
}
