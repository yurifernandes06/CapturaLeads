import type { Metadata } from "next";
import { Suspense } from "react";
import { Logo } from "@/components/logo";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Entrar" };

async function LoginFormWithNext({ searchParams }: { searchParams: PageProps<"/login">["searchParams"] }) {
  const { next } = await searchParams;
  return <LoginForm next={typeof next === "string" ? next : undefined} />;
}

export default function LoginPage(props: PageProps<"/login">) {
  return (
    <main className="grid min-h-svh lg:grid-cols-[1.1fr_1fr]">
      <section className="relative hidden overflow-hidden bg-sidebar text-sidebar-foreground lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-40 -left-32 size-[34rem] rounded-full bg-sidebar-primary/20 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -bottom-48 size-[28rem] rounded-full bg-info/15 blur-3xl"
        />
        <Logo className="relative text-sidebar-accent-foreground" />
        <div className="relative max-w-md">
          <p className="text-3xl leading-tight font-semibold tracking-tight text-sidebar-accent-foreground">
            Nenhum lead esperando.
            <br />
            <span className="text-sidebar-primary">Nenhuma venda perdida.</span>
          </p>
          <ul className="mt-8 grid gap-3 text-sm">
            <li>• Leads do WhatsApp, formulários e API num só lugar</li>
            <li>• Motor de SLA com horário comercial e alertas</li>
            <li>• Pipeline visual e fila do que atender agora</li>
          </ul>
        </div>
        <p className="relative text-xs text-sidebar-foreground/60">© CapturaLeads</p>
      </section>

      <section className="flex items-center justify-center px-4 py-12 sm:px-8">
        <div className="w-full max-w-sm">
          <Logo className="mb-10 lg:hidden" />
          <h1 className="text-2xl font-semibold tracking-tight">Entrar</h1>
          <p className="mt-1 mb-8 text-sm text-muted-foreground">Acesse sua fila de leads.</p>
          <Suspense fallback={<LoginForm />}>
            <LoginFormWithNext searchParams={props.searchParams} />
          </Suspense>
        </div>
      </section>
    </main>
  );
}
