import Link from "next/link";
import { Logo } from "@/components/logo";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="relative flex min-h-svh flex-col items-center justify-center gap-8 overflow-hidden px-4 text-center glow-red">
      <div aria-hidden className="absolute inset-0 grid-lines [mask-image:radial-gradient(ellipse_at_center,black,transparent_65%)]" />
      <Logo className="relative" />
      <div className="relative">
        <p className="font-heading text-[7rem] leading-none font-bold tracking-tighter text-primary tabular">404</p>
        <h1 className="mt-2 font-heading text-2xl font-semibold tracking-tight">Página não encontrada</h1>
        <p className="mt-2 text-muted-foreground">O link pode estar errado ou o conteúdo foi removido.</p>
      </div>
      <Link href="/dashboard" className={buttonVariants({ size: "lg", className: "relative h-10 px-4" })}>
        Voltar ao início
      </Link>
    </main>
  );
}
