import { cn } from "@/lib/utils";

/**
 * Gráficos leves em HTML/CSS (sem biblioteca). Série única no vermelho da marca:
 * o título nomeia a série, então não há legenda. Valores ficam em tokens de
 * texto. No BarList só o 1º item (o maior) fica vermelho. Tooltip no hover/foco.
 */

export function ColumnChart({
  data,
  label,
  formatTick,
  formatValue = (v) => String(v),
}: {
  data: { key: string; value: number }[];
  label: string;
  formatTick: (key: string, index: number) => string | null;
  formatValue?: (v: number) => string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const gridSteps = [1, 0.5];

  return (
    <figure className="grid gap-2" aria-label={label}>
      <div className="relative h-44">
        {gridSteps.map((g) => (
          <div key={g} className="absolute inset-x-0 border-t border-dashed border-border/70" style={{ bottom: `${g * 100}%` }}>
            <span className="absolute -top-2.5 right-0 bg-card pl-1 text-[10px] text-muted-foreground tabular">
              {formatValue(Math.round(max * g))}
            </span>
          </div>
        ))}
        <div className="absolute inset-x-0 bottom-0 border-t border-border" />
        <ol className="absolute inset-0 flex items-end gap-[2px] pr-8">
          {data.map((d) => (
            <li key={d.key} aria-hidden className="group relative flex h-full flex-1 items-end">
              <div
                className="w-full rounded-t-[3px] bg-gradient-to-t from-primary/35 to-primary/90 transition-colors group-hover:from-primary/60 group-hover:to-primary group-focus-visible:to-primary"
                style={{ height: `${(d.value / max) * 100}%`, minHeight: d.value ? 3 : 0 }}
              />
              <span
                role="tooltip"
                className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 rounded-md bg-popover px-2 py-1 text-xs whitespace-nowrap text-popover-foreground shadow-md ring-1 ring-foreground/10 group-hover:block group-focus-visible:block"
              >
                <span className="text-muted-foreground">{d.key.split("-").reverse().slice(0, 2).join("/")}</span>{" "}
                <span className="font-medium tabular">{formatValue(d.value)}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>
      <table className="sr-only">
        <caption>{label}</caption>
        <tbody>
          {data.map((d) => (
            <tr key={d.key}>
              <th scope="row">{d.key.split("-").reverse().join("/")}</th>
              <td>{formatValue(d.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex gap-[2px] pr-8 text-[10px] text-muted-foreground">
        {data.map((d, i) => (
          <span key={d.key} className="flex-1 text-center tabular">
            {formatTick(d.key, i)}
          </span>
        ))}
      </div>
    </figure>
  );
}

export function BarList({
  items,
  formatValue = (v) => String(v),
  className,
}: {
  items: { label: string; value: number; hint?: string; href?: string }[];
  formatValue?: (v: number) => string;
  className?: string;
}) {
  const max = Math.max(1, ...items.map((i) => i.value));
  if (!items.length) return <p className="py-6 text-center text-sm text-muted-foreground">Sem dados no período.</p>;
  return (
    <ul className={cn("grid gap-2.5", className)}>
      {items.map((item, index) => {
        const content = (
          <>
            <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
              <span className="truncate">{item.label}</span>
              <span className="shrink-0 font-medium tabular">
                {formatValue(item.value)}
                {item.hint ? <span className="ml-1.5 text-xs font-normal text-muted-foreground">{item.hint}</span> : null}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className={cn("h-full rounded-full", index === 0 ? "bg-primary" : "bg-foreground/45")}
                style={{ width: `${(item.value / max) * 100}%` }}
              />
            </div>
          </>
        );
        return (
          <li key={item.label} title={`${item.label}: ${formatValue(item.value)}`}>
            {item.href ? (
              <a href={item.href} className="block rounded-md transition-opacity hover:opacity-80">
                {content}
              </a>
            ) : (
              content
            )}
          </li>
        );
      })}
    </ul>
  );
}
