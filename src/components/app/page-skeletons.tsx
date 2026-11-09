import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeletons dos `loading.tsx` por rota. Cada rota tem o seu para que a navegação
 * entre páginas do app seja instantânea: o boundary precisa ficar abaixo do layout
 * compartilhado (o `(app)/loading.tsx` só cobre o carregamento inicial).
 */

function HeaderSkeleton() {
  return (
    <div className="grid gap-2">
      <Skeleton className="h-7 w-48" />
      <Skeleton className="h-4 w-72" />
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div aria-busy className="grid gap-6">
      <HeaderSkeleton />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <Skeleton className="h-96 rounded-xl" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    </div>
  );
}

export function ListSkeleton() {
  return (
    <div aria-busy className="grid gap-6">
      <HeaderSkeleton />
      <Skeleton className="h-9 w-full max-w-2xl" />
      <div className="grid gap-px overflow-hidden rounded-xl border">
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className="h-14 rounded-none" />
        ))}
      </div>
    </div>
  );
}

export function BoardSkeleton() {
  return (
    <div aria-busy className="grid gap-6">
      <HeaderSkeleton />
      <div className="flex gap-3 overflow-hidden">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-[60svh] w-72 shrink-0 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

export function DetailSkeleton() {
  return (
    <div aria-busy className="grid gap-6">
      <div className="grid gap-2">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-56" />
      </div>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="grid gap-6">
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-96 rounded-xl" />
        </div>
        <div className="grid gap-6">
          <Skeleton className="h-44 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-56 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

export function ColumnsSkeleton() {
  return (
    <div aria-busy className="grid gap-6">
      <HeaderSkeleton />
      <div className="grid items-start gap-6 lg:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-64 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

/** Conteúdo de uma aba de configurações (cabeçalho e abas vêm do layout). */
export function SettingsSkeleton() {
  return (
    <div aria-busy className="grid gap-6">
      <Skeleton className="h-56 rounded-xl" />
      <Skeleton className="h-40 rounded-xl" />
    </div>
  );
}

export function InboxSkeleton() {
  return (
    <div aria-busy className="grid gap-6">
      <HeaderSkeleton />
      <div className="grid h-[calc(100svh-13rem)] min-h-[28rem] gap-px overflow-hidden rounded-xl border lg:grid-cols-[22rem_minmax(0,1fr)]">
        <div className="grid content-start gap-px">
          {Array.from({ length: 7 }, (_, i) => (
            <Skeleton key={i} className="h-16 rounded-none" />
          ))}
        </div>
        <Skeleton className="rounded-none max-lg:hidden" />
      </div>
    </div>
  );
}
