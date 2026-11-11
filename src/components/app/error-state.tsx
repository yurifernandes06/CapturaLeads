"use client";

import { RotateCw } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ErrorStateProps = {
  error: unknown;
  retry: () => void;
  title?: string;
  description?: string;
  className?: string;
  children?: React.ReactNode;
};

/** Estado de erro com a marca, usado pelos `error.tsx`. Mostra o código (digest) para cruzar com os logs. */
export function ErrorState({
  error,
  retry,
  title = "Algo deu errado",
  description = "Não foi possível carregar esta página. Tente de novo em instantes.",
  className,
  children,
}: ErrorStateProps) {
  const digest = error instanceof Error && "digest" in error ? String(error.digest) : undefined;

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div role="alert" className={cn("flex flex-col items-center justify-center gap-6 px-4 py-16 text-center", className)}>
      <div>
        <p className="font-heading text-5xl leading-none font-bold tracking-tighter text-primary tabular">Erro</p>
        <h1 className="mt-3 font-heading text-xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">{description}</p>
        {digest ? <p className="mt-3 font-mono text-xs text-muted-foreground">Código: {digest}</p> : null}
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button onClick={() => retry()} size="lg" className="h-10 px-4">
          <RotateCw aria-hidden />
          Tentar de novo
        </Button>
        {children}
      </div>
    </div>
  );
}
