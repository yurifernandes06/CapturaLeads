import "server-only";

/**
 * IP do visitante para rate limit. Na Vercel, `x-real-ip` e o primeiro item de
 * `x-forwarded-for` são definidos pela própria plataforma (o cliente não consegue forjá-los).
 * Fora dela, só confie nesses headers atrás de um proxy que os sobrescreva.
 */
export function clientIp(headers: Headers): string {
  return headers.get("x-real-ip")?.trim() || headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}
