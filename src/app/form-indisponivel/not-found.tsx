import { Logo } from "@/components/logo";
import { FormUnavailable } from "../f/[slug]/unavailable";

/**
 * 404 do formulário público (o proxy reescreve slugs inexistentes/inativos para cá com status 404).
 * Sem links para o painel, que levariam o visitante ao login.
 */
export default function FormUnavailableNotFound() {
  return (
    <main className="relative flex min-h-svh flex-col items-center justify-center gap-8 overflow-hidden px-4 text-center glow-red">
      <div aria-hidden className="absolute inset-0 grid-lines [mask-image:radial-gradient(ellipse_at_center,black,transparent_65%)]" />
      <Logo className="relative" />
      <div className="relative">
        <FormUnavailable />
      </div>
    </main>
  );
}
