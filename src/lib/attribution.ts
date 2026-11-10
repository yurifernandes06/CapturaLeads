/**
 * Atribuição de marketing: de onde o lead veio (UTMs, clique de anúncio, página).
 * Puro e compartilhado entre o formulário público, a API e o painel.
 */
export const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"] as const;
export const CLICK_ID_KEYS = ["gclid", "fbclid"] as const;
/** Chaves que o formulário público repassa da URL para o envio. */
export const ATTRIBUTION_KEYS = [...UTM_KEYS, ...CLICK_ID_KEYS] as const;
export type AttributionKey = (typeof ATTRIBUTION_KEYS)[number];

const MAX = 200;

/** Lê as chaves de atribuição de um objeto de parâmetros (searchParams, body). */
export function pickAttribution(params: Record<string, unknown>): Partial<Record<AttributionKey, string>> {
  const out: Partial<Record<AttributionKey, string>> = {};
  for (const key of ATTRIBUTION_KEYS) {
    const raw = params[key];
    const value = typeof raw === "string" ? raw.trim().slice(0, MAX) : "";
    if (value) out[key] = value;
  }
  return out;
}

/** Identificador do clique de anúncio, prefixado pela rede (`gclid:…`, `fbclid:…`). */
export function clickIdOf(params: { gclid?: string; fbclid?: string }): string | null {
  if (params.gclid) return `gclid:${params.gclid}`.slice(0, MAX);
  if (params.fbclid) return `fbclid:${params.fbclid}`.slice(0, MAX);
  return null;
}

/** Rede do anúncio a partir do clickId salvo. */
export function adNetworkOf(clickId: string | null | undefined): "Google Ads" | "Meta Ads" | null {
  if (!clickId) return null;
  if (clickId.startsWith("gclid:")) return "Google Ads";
  if (clickId.startsWith("fbclid:")) return "Meta Ads";
  return null;
}

/** URL só se for http(s), sem fragmento e com tamanho limitado — nada de `javascript:`. */
export function safeUrl(value: unknown, max = 500): string | null {
  if (typeof value !== "string" || !value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    url.hash = "";
    return url.toString().slice(0, max);
  } catch {
    return null;
  }
}

/** Domínio legível do referrer ("instagram.com"). */
export function hostOf(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

/** Agrupa leads por campanha (utm_campaign), maiores primeiro. */
export function topCampaigns(leads: { utmCampaign: string | null }[], limit = 6) {
  const counts = new Map<string, number>();
  for (const { utmCampaign } of leads) {
    if (utmCampaign) counts.set(utmCampaign, (counts.get(utmCampaign) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([campaign, count]) => ({ campaign, count }))
    .sort((a, b) => b.count - a.count || a.campaign.localeCompare(b.campaign))
    .slice(0, limit);
}

/**
 * Snippet de incorporação que repassa as UTMs, o clique do anúncio e a página
 * do site-pai para o iframe (um iframe simples não enxerga a URL de quem o hospeda).
 */
export function embedSnippet(formUrl: string, slug: string): string {
  const id = `jv-form-${slug}`;
  const keys = JSON.stringify(ATTRIBUTION_KEYS);
  return [
    `<div id="${id}"></div>`,
    `<script>(function(){var u=new URL(${JSON.stringify(formUrl)}),p=new URLSearchParams(location.search);` +
      `${keys}.forEach(function(k){var v=p.get(k);if(v)u.searchParams.set(k,v)});` +
      `u.searchParams.set("embed","1");u.searchParams.set("lp",location.href);` +
      `if(document.referrer)u.searchParams.set("ref",document.referrer);` +
      `var f=document.createElement("iframe");f.src=u.toString();f.loading="lazy";f.title="Formulário";` +
      `f.style.cssText="width:100%;min-height:640px;border:0";document.getElementById(${JSON.stringify(id)}).appendChild(f)})();</script>`,
  ].join("\n");
}
