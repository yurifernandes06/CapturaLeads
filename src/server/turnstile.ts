import "server-only";
import { env } from "@/lib/env";

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/** Captcha do formulário público ligado só quando as duas chaves do Cloudflare Turnstile existem. */
export function turnstileSiteKey(): string | undefined {
  const { TURNSTILE_SITE_KEY, TURNSTILE_SECRET_KEY } = env();
  return TURNSTILE_SITE_KEY && TURNSTILE_SECRET_KEY ? TURNSTILE_SITE_KEY : undefined;
}

/** Valida o token do widget. Sem Turnstile configurado, sempre passa. */
export async function verifyTurnstile(token: string, ip: string): Promise<boolean> {
  const secret = env().TURNSTILE_SECRET_KEY;
  if (!turnstileSiteKey() || !secret) return true;
  if (!token) return false;
  try {
    const res = await fetch(VERIFY_URL, {
      method: "POST",
      body: new URLSearchParams({ secret, response: token, remoteip: ip }),
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch (err) {
    // Cloudflare fora do ar não pode travar a captação: o rate limit continua valendo.
    console.warn("[turnstile] verificação indisponível, liberando envio:", (err as Error).message);
    return true;
  }
}
