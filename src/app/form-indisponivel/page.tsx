import type { Metadata } from "next";
import { notFound } from "next/navigation";

export const metadata: Metadata = {
  title: "Formulário indisponível",
  robots: { index: false },
};

/** Alvo do rewrite do proxy: responde 404 e renderiza o `not-found.tsx` deste segmento. */
export default function FormUnavailablePage() {
  notFound();
}
