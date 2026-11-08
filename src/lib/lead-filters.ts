import { z } from "zod";
import { PRIORITIES, SOURCES, STAGES } from "./leads";

/** Filtros da lista de leads, sempre serializados na URL (compartilháveis e com voltar do navegador). */

const emptyToUndefined = (v: unknown) => (v === "" || v === "all" ? undefined : v);
const first = (v: unknown) => (Array.isArray(v) ? v[0] : v);
const opt = <T extends z.ZodType>(s: T) => z.preprocess((v) => emptyToUndefined(first(v)), s.optional());

export const SORTS = {
  recent: "Mais recentes",
  oldest: "Mais antigos",
  value: "Maior valor",
  name: "Nome (A-Z)",
  activity: "Sem contato há mais tempo",
} as const;

export const leadFiltersSchema = z.object({
  q: opt(z.string().trim().max(100)),
  stage: opt(z.enum([...STAGES, "open"])),
  source: opt(z.enum(SOURCES)),
  priority: opt(z.enum(PRIORITIES)),
  /** "me", "none" ou id do usuário */
  owner: opt(z.string()),
  tag: opt(z.string().trim().toLowerCase()),
  from: opt(z.iso.date()),
  to: opt(z.iso.date()),
  sort: opt(z.enum(Object.keys(SORTS) as [keyof typeof SORTS, ...(keyof typeof SORTS)[]])),
  page: z.preprocess((v) => emptyToUndefined(first(v)), z.coerce.number().int().min(1).optional()),
});

export type LeadFilters = z.infer<typeof leadFiltersSchema>;

export function parseLeadFilters(params: Record<string, string | string[] | undefined>): LeadFilters {
  const parsed = leadFiltersSchema.safeParse(params);
  return parsed.success ? parsed.data : {};
}

export function filtersToSearch(filters: LeadFilters): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(filters)) {
    if (v !== undefined && v !== null && v !== "") sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export function countActiveFilters(filters: LeadFilters) {
  return Object.entries(filters).filter(([k, v]) => !["q", "sort", "page"].includes(k) && v !== undefined).length;
}
