"use client";

import Link from "next/link";
import { ErrorState } from "@/components/app/error-state";
import { buttonVariants } from "@/components/ui/button";

export default function AppError({ error, retry }: { error: unknown; retry: () => void }) {
  return (
    <ErrorState error={error} retry={retry} className="min-h-[60svh]">
      <Link href="/dashboard" className={buttonVariants({ variant: "outline", size: "lg", className: "h-10 px-4" })}>
        Ir para o início
      </Link>
    </ErrorState>
  );
}
