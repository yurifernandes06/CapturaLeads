"use client";

import { ErrorState } from "@/components/app/error-state";

export default function PublicFormError({ error, retry }: { error: unknown; retry: () => void }) {
  return (
    <main className="flex min-h-svh items-center justify-center">
      <ErrorState
        error={error}
        retry={retry}
        title="Não foi possível abrir o formulário"
        description="Tente de novo em instantes. Se continuar, fale com a gente por outro canal."
      />
    </main>
  );
}
