"use client";

import "./globals.css";
import { ErrorState } from "@/components/app/error-state";

/** Substitui o layout raiz quando ele próprio falha: precisa do próprio <html>/<body> e do tema escuro. */
export default function GlobalError({ error, retry }: { error: unknown; retry: () => void }) {
  return (
    <html lang="pt-BR" className="dark h-full antialiased">
      <body className="flex min-h-full items-center justify-center bg-background text-foreground">
        <title>Erro</title>
        <ErrorState error={error} retry={retry} />
      </body>
    </html>
  );
}
