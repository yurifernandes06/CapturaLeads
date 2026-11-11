import { MessageCircleIcon, TimerIcon, TrendingUpIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Logo } from "@/components/logo";
import { BRAND } from "@/lib/brand";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Entrar" };

async function LoginFormWithNext({ searchParams }: { searchParams: PageProps<"/login">["searchParams"] }) {
  const { next } = await searchParams;
  return <LoginForm next={typeof next === "string" ? next : undefined} />;
}

const HIGHLIGHTS = [
  { icon: MessageCircleIcon, title: "Tudo num lugar só", text: "WhatsApp, formulários e API caindo na mesma fila." },
  { icon: TimerIcon, title: "SLA no relógio", text: "Horário comercial, feriados e alerta antes de estourar." },
  { icon: TrendingUpIcon, title: "Funil que vende", text: "Pipeline visual e a fila do que atender agora." },
];

export default function LoginPage(props: PageProps<"/login">) {
  return (
    <main className="grid min-h-svh bg-background lg:grid-cols-[1.15fr_1fr]">
      {/* Painel de marca */}
      <section className="relative hidden overflow-hidden border-r border-border bg-black lg:flex lg:flex-col lg:justify-between lg:p-14">
        <div aria-hidden className="absolute inset-0 grid-lines [mask-image:radial-gradient(ellipse_at_top_left,black,transparent_70%)]" />
        <div
          aria-hidden
          className="pointer-events-none absolute -top-48 -left-40 size-[40rem] rounded-full bg-primary/25 blur-[120px]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-10 bottom-0 h-64 w-[36rem] rotate-[-12deg] bg-gradient-to-r from-transparent via-primary/20 to-transparent blur-3xl"
        />

        <Logo className="relative" />

        <div className="relative max-w-lg">
          <p className="mb-5 flex items-center gap-2 eyebrow text-primary-text">
            <span aria-hidden className="h-px w-8 bg-primary" /> Central de leads
          </p>
          <h2 className="font-heading text-[2.75rem] leading-[1.05] font-semibold tracking-tight text-balance text-white">
            Nenhum lead esperando.
            <br />
            <span className="bg-gradient-to-r from-primary to-[color-mix(in_oklch,var(--primary),white_30%)] bg-clip-text text-transparent">
              Nenhuma venda perdida.
            </span>
          </h2>
          <ul className="mt-10 grid gap-5">
            {HIGHLIGHTS.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex gap-4">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.03] text-primary-text">
                  <Icon className="size-[1.1rem]" />
                </span>
                <span>
                  <span className="block text-sm font-medium text-white">{title}</span>
                  <span className="block text-sm text-muted-foreground">{text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative font-mono text-xs tracking-wider text-muted-foreground/70">
          © {BRAND.name.toUpperCase()}
        </p>
      </section>

      {/* Formulário */}
      <section className="relative flex items-center justify-center overflow-hidden px-4 py-12 sm:px-8">
        <div aria-hidden className="pointer-events-none absolute -top-40 right-0 size-[28rem] rounded-full bg-primary/10 blur-[100px] lg:hidden" />
        <div className="relative w-full max-w-sm">
          <Logo className="mb-12 lg:hidden" />
          <p className="eyebrow">Acesso restrito</p>
          <h1 className="mt-2 font-heading text-3xl font-semibold tracking-tight">Bem-vindo de volta</h1>
          <p className="mt-2 mb-9 text-sm text-muted-foreground">Entre para ver sua fila de leads.</p>
          <div className="rounded-2xl border border-border bg-card/60 p-6 shadow-[0_30px_80px_-40px_black] backdrop-blur">
            <Suspense fallback={<LoginForm />}>
              <LoginFormWithNext searchParams={props.searchParams} />
            </Suspense>
          </div>
          <p className="mt-6 text-center text-xs text-muted-foreground">
            <Link href="/esqueci-senha" className="underline-offset-2 hover:text-foreground hover:underline">
              Esqueci a senha
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
