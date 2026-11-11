import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { db, schema } from "@/db";
import { formatPhone } from "@/lib/phone";
import { requireUser } from "@/server/auth/dal";
import { ChangePasswordForm } from "./change-password-form";

export const metadata: Metadata = { title: "Minha conta" };

export default async function AccountPage() {
  const user = await requireUser();
  const profile = await db
    .select({ phone: schema.users.phone })
    .from(schema.users)
    .where(eq(schema.users.id, user.id))
    .get();

  return (
    <>
      <PageHeader eyebrow="Conta" title="Minha conta" description={`${user.name} · ${user.email}`} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Trocar senha</CardTitle>
            <CardDescription>Ao trocar, os outros aparelhos conectados são desconectados.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChangePasswordForm />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Recuperação de acesso</CardTitle>
            <CardDescription>O link de &quot;Esqueci a senha&quot; chega no WhatsApp cadastrado.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm">
            {profile?.phone ? (
              <p>
                WhatsApp cadastrado: <span className="font-medium tabular">{formatPhone(profile.phone)}</span>
              </p>
            ) : (
              <p className="text-warning">
                Nenhum WhatsApp cadastrado: peça ao administrador para incluir o seu número, senão só ele poderá redefinir sua
                senha.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
