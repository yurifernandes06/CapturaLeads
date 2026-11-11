const FALLBACK = "/dashboard";
const BASE = "http://app.local";

/**
 * Aceita apenas caminhos internos para redirecionar após o login.
 * Rejeita URLs absolutas, protocol-relative (`//x`), barras invertidas (`/\x`,
 * que o navegador trata como `//x`) e caracteres de controle.
 */
export function safeRedirectPath(next: string | null | undefined, fallback = FALLBACK): string {
  if (!next || !next.startsWith("/") || next.includes("\\")) return fallback;
  if (/[\u0000-\u001f\u007f]/.test(next)) return fallback;
  try {
    const url = new URL(next, BASE);
    // `/a/..//x` normaliza para `//x`, que o navegador leria como outro domínio.
    if (url.origin !== BASE || url.pathname.startsWith("//")) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
