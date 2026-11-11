/**
 * Regras de permissão por papel (puras, testadas). A autorização é aplicada nas
 * actions e rotas via DAL; aqui fica só a decisão.
 */
export type Role = "admin" | "sales";
export type Actor = { id: string; role: Role };

/** Vendedor exporta só a própria carteira; admin exporta o que filtrar. */
export function exportOwnerFilter(actor: Actor, requested: string | undefined): string | undefined {
  return actor.role === "admin" ? requested : "me";
}

/**
 * Quem pode trocar o responsável de um lead:
 * - admin: qualquer lead, para qualquer usuário ativo ou para ninguém;
 * - vendedor: só leads dele ou sem dono, e sempre para alguém (não pode deixar sem dono).
 */
export function canReassign(actor: Actor, currentOwnerId: string | null, nextOwnerId: string | null): boolean {
  if (actor.role === "admin") return true;
  if (currentOwnerId !== null && currentOwnerId !== actor.id) return false;
  return nextOwnerId !== null;
}
