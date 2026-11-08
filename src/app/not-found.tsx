import Link from "next/link";
import { Logo } from "@/components/logo";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 px-4 text-center">
      <Logo />
      <div>
        <p className="text-sm font-medium text-primary">404</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Página não encontrada</h1>
        <p className="mt-2 text-muted-foreground">O link pode estar errado ou o conteúdo foi removido.</p>
      </div>
      <Link href="/dashboard" className={buttonVariants({ variant: "outline" })}>
        Voltar ao início
      </Link>
    </main>
  );
}
