import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { buttonVariants } from "@/components/ui/button";
import { AuthCard } from "../auth-card";
import { ResetPasswordForm } from "../esqueci-senha/password-forms";

export const metadata: Metadata = { title: "Nova senha", robots: { index: false } };

async function ResetWithToken({ searchParams }: { searchParams: PageProps<"/redefinir-senha">["searchParams"] }) {
  const { token } = await searchParams;
  if (typeof token !== "string" || !token) {
    return (
      <div className="grid gap-4 text-center">
        <p className="text-sm text-muted-foreground">Link incompleto. Peça um novo link de redefinição.</p>
        <Link href="/esqueci-senha" className={buttonVariants({ size: "lg", className: "h-11" })}>
          Pedir novo link
        </Link>
      </div>
    );
  }
  return <ResetPasswordForm token={token} />;
}

export default function ResetPasswordPage(props: PageProps<"/redefinir-senha">) {
  return (
    <AuthCard eyebrow="Recuperar acesso" title="Crie uma nova senha" description="Use pelo menos 8 caracteres.">
      <Suspense fallback={null}>
        <ResetWithToken searchParams={props.searchParams} />
      </Suspense>
    </AuthCard>
  );
}
