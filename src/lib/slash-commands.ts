/**
 * Atalho "/" do composer: descobre se o cursor está num comando (ex.: "Oi /fol|"),
 * filtra as opções pelo que foi digitado e insere o texto no lugar do comando.
 * Puro e sem DOM para ser testável.
 */

export type SlashMatch = { start: number; end: number; query: string };

/**
 * O comando começa com "/" no início do texto ou após espaço/quebra de linha e vai
 * até o cursor, sem espaços. "http://x" e "1/2" não abrem o menu.
 */
export function findSlashCommand(text: string, cursor: number): SlashMatch | null {
  const before = text.slice(0, cursor);
  const m = /(?:^|\s)\/([^\s/]*)$/.exec(before);
  if (!m) return null;
  const query = m[1] ?? "";
  if (query.length > 30) return null;
  return { start: cursor - query.length - 1, end: cursor, query };
}

/** Minúsculas e sem acentos: "/promo" acha "Promoção". */
export const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

/** Filtra por nome: quem começa com a busca vem antes de quem só contém. */
export function filterCommands<T extends { name: string }>(items: T[], query: string): T[] {
  const q = normalize(query.trim());
  if (!q) return items;
  const starts: T[] = [];
  const contains: T[] = [];
  for (const item of items) {
    const name = normalize(item.name);
    if (name.startsWith(q)) starts.push(item);
    else if (name.includes(q)) contains.push(item);
  }
  return [...starts, ...contains];
}

/** Troca o comando pelo texto e devolve onde o cursor deve ficar. */
export function applySlashCommand(text: string, match: SlashMatch, insert: string) {
  const after = text.slice(match.end);
  // Evita colar o texto inserido no que vem depois ("…obrigado!Tchau").
  const glue = after && !/^\s/.test(after) ? " " : "";
  const next = text.slice(0, match.start) + insert + glue + after;
  return { text: next, cursor: match.start + insert.length + glue.length };
}
