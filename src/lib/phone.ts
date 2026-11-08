/**
 * Telefones são guardados só com dígitos, em formato E.164 sem o "+"
 * (ex.: 5511987654321). Números brasileiros sem DDI recebem 55.
 */
export function normalizePhone(input: string): string {
  const hasCountryCode = /^\s*(\+|00)/.test(input);
  let digits = input.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (hasCountryCode) return digits;
  // 0 + DDD + número (formato de discagem interurbana antigo)
  if (digits.startsWith("0") && (digits.length === 11 || digits.length === 12)) digits = digits.slice(1);
  // DDD + número, sem DDI
  if (digits.length === 10 || digits.length === 11) digits = `55${digits}`;
  return digits;
}

export function isValidPhone(normalized: string) {
  return /^\d{10,15}$/.test(normalized);
}

/**
 * Variações do mesmo número para deduplicação. O WhatsApp entrega alguns
 * celulares brasileiros sem o nono dígito (55 + DDD + 8 dígitos), então
 * buscamos as duas formas.
 */
export function phoneVariants(normalized: string): string[] {
  const variants = new Set([normalized]);
  if (normalized.startsWith("55")) {
    const ddd = normalized.slice(2, 4);
    const local = normalized.slice(4);
    if (local.length === 9 && local.startsWith("9")) variants.add(`55${ddd}${local.slice(1)}`);
    if (local.length === 8 && /^[6-9]/.test(local)) variants.add(`55${ddd}9${local}`);
  }
  return [...variants];
}

/** +55 (11) 98765-4321 */
export function formatPhone(normalized: string): string {
  if (!normalized) return "";
  if (normalized.startsWith("55") && (normalized.length === 12 || normalized.length === 13)) {
    const ddd = normalized.slice(2, 4);
    const local = normalized.slice(4);
    const split = local.length - 4;
    return `+55 (${ddd}) ${local.slice(0, split)}-${local.slice(split)}`;
  }
  return `+${normalized}`;
}

/** Link click-to-chat do WhatsApp, com mensagem opcional. */
export function whatsappLink(normalized: string, text?: string) {
  const url = new URL(`https://wa.me/${normalized}`);
  if (text) url.searchParams.set("text", text);
  return url.toString();
}
