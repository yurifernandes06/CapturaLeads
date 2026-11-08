import { CheckCircle2Icon, TriangleAlertIcon } from "lucide-react";
import type { Metadata } from "next";
import { CopyField } from "@/components/app/copy-field";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { env } from "@/lib/env";
import { requireUser } from "@/server/auth/dal";
import { getSetting } from "@/server/settings";
import { whatsapp } from "@/server/whatsapp";
import { SimulateInbound, TemplatesEditor } from "./whatsapp-forms";

export const metadata: Metadata = { title: "WhatsApp" };

const STEPS = {
  cloud: [
    "No Meta for Developers, crie um app do tipo Business e adicione o produto WhatsApp.",
    "Copie o token permanente (usuário do sistema) e o Phone Number ID para o .env.",
    "Em Webhooks, use a URL abaixo, o mesmo WHATSAPP_CLOUD_VERIFY_TOKEN do .env e assine o campo messages.",
  ],
  evolution: [
    "Suba a Evolution API (Docker) e crie uma instância conectada pelo QR code.",
    "Preencha EVOLUTION_API_URL, EVOLUTION_API_KEY e EVOLUTION_INSTANCE no .env.",
    "Configure o webhook da instância com a URL abaixo e o evento MESSAGES_UPSERT.",
  ],
  mock: [
    "Modo simulado: nada é enviado de verdade, as mensagens aparecem no log do servidor.",
    "Use o simulador ao lado para testar a entrada de leads pelo WhatsApp.",
    "Para produção, defina WHATSAPP_PROVIDER=cloud ou evolution no .env.",
  ],
};

export default async function WhatsAppSettingsPage() {
  const user = await requireUser();
  const isAdmin = user.role === "admin";
  const provider = whatsapp();
  const missing = provider.missingConfig();
  const templates = await getSetting("whatsappTemplates");
  const base = `${env().APP_URL.replace(/\/$/, "")}/api/webhooks/whatsapp`;
  const webhookUrl = provider.name === "cloud" ? base : `${base}?token=${isAdmin ? (env().WHATSAPP_WEBHOOK_TOKEN ?? "") : "••••"}`;

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Conexão</CardTitle>
            <CardDescription>Provedor definido por WHATSAPP_PROVIDER no ambiente.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">{provider.label}</span>
              {missing.length ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-2 py-0.5 text-xs font-medium text-warning">
                  <TriangleAlertIcon className="size-3.5" /> Configuração incompleta
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-xs font-medium text-success">
                  <CheckCircle2Icon className="size-3.5" /> Pronto
                </span>
              )}
            </div>
            {missing.length && isAdmin ? (
              <p className="text-muted-foreground">
                Faltam no .env: <code className="rounded bg-muted px-1 py-0.5 text-xs">{missing.join(", ")}</code>
              </p>
            ) : null}
            <ol className="grid list-decimal gap-1.5 pl-5 text-muted-foreground">
              {STEPS[provider.name].map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ol>
            <CopyField label="URL do webhook" value={webhookUrl} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Templates de mensagem</CardTitle>
            <CardDescription>
              Atalhos para o vendedor responder rápido. Variáveis: <code>{"{{primeiro_nome}}"}</code>,{" "}
              <code>{"{{nome}}"}</code>, <code>{"{{empresa}}"}</code>, <code>{"{{vendedor}}"}</code>.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TemplatesEditor initial={templates} readOnly={!isAdmin} />
          </CardContent>
        </Card>
      </div>

      {isAdmin ? (
        <Card className="xl:sticky xl:top-20">
          <CardHeader>
            <CardTitle>Simular mensagem recebida</CardTitle>
            <CardDescription>
              Testa o fluxo inteiro (lead novo ou existente, distribuição, SLA e notificação) sem depender do provedor.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SimulateInbound />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
