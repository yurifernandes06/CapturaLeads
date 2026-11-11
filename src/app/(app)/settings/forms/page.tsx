import { desc } from "drizzle-orm";
import { ExternalLinkIcon, FileTextIcon } from "lucide-react";
import type { Metadata } from "next";
import { CopyField } from "@/components/app/copy-field";
import { PriorityBadge } from "@/components/leads/badges";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { db, schema } from "@/db";
import { embedSnippet } from "@/lib/attribution";
import { env } from "@/lib/env";
import { requireAdmin } from "@/server/auth/dal";
import { FormActiveSwitch, FormDialog } from "./form-dialog";

export const metadata: Metadata = { title: "Formulários" };

export default async function FormsPage() {
  await requireAdmin();
  const forms = await db.select().from(schema.forms).orderBy(desc(schema.forms.createdAt));
  const appUrl = env().APP_URL.replace(/\/$/, "");
  const apiKey = env().PUBLIC_API_KEY;

  const curl = `curl -X POST ${appUrl}/api/public/leads \\
  -H "content-type: application/json" \\
  -H "x-api-key: ${apiKey ?? "<PUBLIC_API_KEY>"}" \\
  -d '{"name":"Ana Souza","phone":"11987654321","message":"Quero um orçamento","utm_source":"site"}'`;

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Páginas de captura prontas para anúncios, bio do Instagram e QR code. UTMs, clique do anúncio (gclid/fbclid),
          site de origem e página são gravados no lead.
        </p>
        <FormDialog />
      </div>

      {forms.length === 0 ? (
        <Card>
          <CardContent className="grid place-items-center gap-2 py-14 text-center">
            <FileTextIcon className="size-10 text-muted-foreground/50" />
            <p className="font-medium">Nenhum formulário ainda</p>
            <p className="text-sm text-muted-foreground">Crie o primeiro e compartilhe o link.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {forms.map((f) => {
            const url = `${appUrl}/f/${f.slug}`;
            return (
              <Card key={f.id} className={f.active ? undefined : "opacity-60"}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {f.name}
                    <PriorityBadge priority={f.priority} showLabel={false} />
                  </CardTitle>
                  <CardDescription>
                    {f.submissions} {f.submissions === 1 ? "envio" : "envios"}
                    {f.welcomeMessage ? " · boas-vindas automática no WhatsApp" : ""}
                    {f.whatsappNumber ? " · botão de WhatsApp no sucesso" : ""}
                    {f.tags.length ? ` · tags: ${f.tags.join(", ")}` : ""}
                  </CardDescription>
                  <div className="col-start-2 row-span-2 row-start-1 flex items-center gap-1 self-start justify-self-end">
                    <FormActiveSwitch id={f.id} active={f.active} />
                    <FormDialog form={f} />
                  </div>
                </CardHeader>
                <CardContent className="grid gap-3">
                  <CopyField label="Link" value={url} />
                  <CopyField
                    label="Link para anúncio (troque a campanha)"
                    value={`${url}?utm_source=instagram&utm_medium=cpc&utm_campaign=${f.slug}`}
                  />
                  <CopyField label="Incorporar no site (repassa UTMs e página)" value={embedSnippet(url, f.slug)} multiline />
                  <a
                    href={`/f/${f.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex w-fit items-center gap-1 text-sm font-medium text-primary-text hover:underline"
                  >
                    Abrir formulário <ExternalLinkIcon className="size-3.5" />
                  </a>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>API de captura</CardTitle>
          <CardDescription>
            Integre landing pages, Zapier/Make ou o CRM do site. Mesmo telefone não duplica lead. Responde 201 (novo) ou 200
            (existente). Envie <code>&quot;form&quot;: &quot;slug&quot;</code> para herdar tags e boas-vindas de um formulário.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          {!apiKey ? (
            <p className="text-sm text-warning">Defina PUBLIC_API_KEY no .env para habilitar a API.</p>
          ) : null}
          <CopyField label="Exemplo" value={curl} multiline />
        </CardContent>
      </Card>
    </div>
  );
}
