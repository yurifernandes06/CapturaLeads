"use client";

import { SearchIcon, SlidersHorizontalIcon, XIcon } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { SORTS, countActiveFilters, filtersToSearch, type LeadFilters } from "@/lib/lead-filters";
import { PRIORITIES, PRIORITY_META, SOURCES, SOURCE_LABEL, STAGES, STAGE_META } from "@/lib/leads";
import { SLA_STATUSES, SLA_STATUS_META } from "@/lib/sla/config";
import { cn } from "@/lib/utils";

type Option = { id: string; name: string };

const QUICK_VIEWS: { label: string; filters: LeadFilters }[] = [
  { label: "Todos", filters: {} },
  { label: "Em aberto", filters: { stage: "open" } },
  { label: "Meus leads", filters: { owner: "me", stage: "open" } },
  { label: "Sem responsável", filters: { owner: "none" } },
  { label: "SLA estourado", filters: { sla: "breached" } },
  { label: "Em risco", filters: { sla: "at_risk" } },
  { label: "Quentes", filters: { priority: "high", stage: "open" } },
];

export function LeadFiltersBar({ filters, owners, tags }: { filters: LeadFilters; owners: Option[]; tags: string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const [q, setQ] = useState(filters.q ?? "");
  const [expanded, setExpanded] = useState(countActiveFilters(filters) > 0);
  const debounce = useRef<ReturnType<typeof setTimeout>>(undefined);

  const apply = (next: LeadFilters) =>
    startTransition(() => router.replace(`${pathname}${filtersToSearch({ ...next, page: undefined })}`, { scroll: false }));

  const set = <K extends keyof LeadFilters>(key: K, value: LeadFilters[K] | "") =>
    apply({ ...filters, [key]: value === "" ? undefined : value });

  useEffect(() => () => clearTimeout(debounce.current), []);

  const onSearch = (value: string) => {
    setQ(value);
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => apply({ ...filters, q: value || undefined }), 300);
  };

  const active = countActiveFilters(filters);
  const isView = (v: LeadFilters) =>
    JSON.stringify(Object.entries(v).sort()) ===
    JSON.stringify(
      Object.entries(filters)
        .filter(([k, val]) => !["q", "sort", "page"].includes(k) && val !== undefined)
        .sort(),
    );

  return (
    <div className={cn("grid gap-3 transition-opacity", pending && "opacity-70")}>
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-56 flex-1 sm:max-w-sm">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Buscar nome, telefone, e-mail, empresa…"
            className="h-9 pl-8"
            aria-label="Buscar leads"
          />
        </div>
        <Button variant={expanded || active ? "secondary" : "outline"} className="h-9" onClick={() => setExpanded((v) => !v)}>
          <SlidersHorizontalIcon /> Filtros
          {active ? (
            <span className="ml-0.5 grid size-5 place-items-center rounded-full bg-primary text-[11px] text-primary-foreground">
              {active}
            </span>
          ) : null}
        </Button>
        <NativeSelect
          aria-label="Ordenar"
          className="w-52"
          value={filters.sort ?? "recent"}
          onChange={(e) => set("sort", e.target.value === "recent" ? "" : (e.target.value as LeadFilters["sort"]))}
        >
          {Object.entries(SORTS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </NativeSelect>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {QUICK_VIEWS.map((view) => (
          <button
            key={view.label}
            type="button"
            onClick={() => apply({ ...view.filters, q: filters.q, sort: filters.sort })}
            className={cn(
              "h-7 rounded-full border px-3 text-xs font-medium transition-colors hover:bg-muted",
              isView(view.filters) && "border-primary/40 bg-primary/10 text-primary hover:bg-primary/15",
            )}
          >
            {view.label}
          </button>
        ))}
      </div>

      {expanded ? (
        <div className="grid gap-3 rounded-xl border bg-card p-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
          <FilterField label="Etapa">
            <NativeSelect value={filters.stage ?? ""} onChange={(e) => set("stage", e.target.value as LeadFilters["stage"])}>
              <option value="">Todas</option>
              <option value="open">Em aberto</option>
              {STAGES.map((s) => (
                <option key={s} value={s}>
                  {STAGE_META[s].label}
                </option>
              ))}
            </NativeSelect>
          </FilterField>
          <FilterField label="Origem">
            <NativeSelect value={filters.source ?? ""} onChange={(e) => set("source", e.target.value as LeadFilters["source"])}>
              <option value="">Todas</option>
              {SOURCES.map((s) => (
                <option key={s} value={s}>
                  {SOURCE_LABEL[s]}
                </option>
              ))}
            </NativeSelect>
          </FilterField>
          <FilterField label="Prioridade">
            <NativeSelect
              value={filters.priority ?? ""}
              onChange={(e) => set("priority", e.target.value as LeadFilters["priority"])}
            >
              <option value="">Todas</option>
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {PRIORITY_META[p].label}
                </option>
              ))}
            </NativeSelect>
          </FilterField>
          <FilterField label="Responsável">
            <NativeSelect value={filters.owner ?? ""} onChange={(e) => set("owner", e.target.value)}>
              <option value="">Todos</option>
              <option value="me">Eu</option>
              <option value="none">Sem responsável</option>
              {owners.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </NativeSelect>
          </FilterField>
          <FilterField label="SLA">
            <NativeSelect value={filters.sla ?? ""} onChange={(e) => set("sla", e.target.value as LeadFilters["sla"])}>
              <option value="">Todos</option>
              {SLA_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {SLA_STATUS_META[s].label}
                </option>
              ))}
            </NativeSelect>
          </FilterField>
          <FilterField label="Tag">
            <NativeSelect value={filters.tag ?? ""} onChange={(e) => set("tag", e.target.value)}>
              <option value="">Todas</option>
              {tags.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </NativeSelect>
          </FilterField>
          <FilterField label="Criado de">
            <Input type="date" value={filters.from ?? ""} onChange={(e) => set("from", e.target.value)} />
          </FilterField>
          <FilterField label="Até">
            <Input type="date" value={filters.to ?? ""} onChange={(e) => set("to", e.target.value)} />
          </FilterField>
          {active ? (
            <div className="sm:col-span-2 lg:col-span-4 xl:col-span-8">
              <Button variant="ghost" size="sm" onClick={() => apply({ q: filters.q, sort: filters.sort })}>
                <XIcon /> Limpar filtros
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1.5 text-xs font-medium text-muted-foreground">
      {label}
      {children}
    </label>
  );
}
