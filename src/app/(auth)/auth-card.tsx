import Link from "next/link";
import { Logo } from "@/components/logo";

/** Casca das telas públicas de conta (esqueci/redefinir senha), no mesmo visual do login. */
export function AuthCard({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <main className="relative flex min-h-svh items-center justify-center overflow-hidden px-4 py-12">
      <div aria-hidden className="pointer-events-none absolute -top-40 right-0 size-[28rem] rounded-full bg-primary/10 blur-[100px]" />
      <div className="relative w-full max-w-sm">
        <Logo className="mb-12" />
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="mt-2 font-heading text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 mb-9 text-sm text-muted-foreground">{description}</p>
        <div className="rounded-2xl border border-border bg-card/60 p-6 shadow-[0_30px_80px_-40px_black] backdrop-blur">
          {children}
        </div>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          <Link href="/login" className="underline-offset-2 hover:text-foreground hover:underline">
            Voltar para o login
          </Link>
        </p>
      </div>
    </main>
  );
}
