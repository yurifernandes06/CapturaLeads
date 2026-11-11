import type { Metadata } from "next";
import { Logo } from "@/components/logo";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Política de Privacidade",
  description: `Como ${BRAND.name} trata os dados enviados pelos formulários de contato.`,
};

/**
 * Aviso de privacidade (LGPD) exibido pelos formulários públicos.
 * Texto-base: revise com o jurídico e ajuste o contato do encarregado (DPO).
 */
export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-12">
      <Logo className="mb-10" />
      <article className="grid gap-6 text-sm leading-relaxed text-muted-foreground [&_h2]:font-heading [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-foreground">
        <header>
          <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground">Política de Privacidade</h1>
          <p className="mt-2">Como {BRAND.name} trata os dados que você envia pelos nossos formulários de contato.</p>
        </header>

        <section>
          <h2>Quais dados coletamos</h2>
          <p>
            Nome, telefone/WhatsApp e, quando pedidos no formulário, e-mail, empresa e a mensagem que você escrever.
            Também registramos de onde veio o contato (campanha, anúncio ou página de origem).
          </p>
        </section>

        <section>
          <h2>Para que usamos</h2>
          <p>
            Exclusivamente para retornar o seu contato e conduzir o atendimento que você pediu, inclusive por WhatsApp.
            A base legal é a execução de procedimentos preliminares a pedido do titular (LGPD, art. 7º, V). Não vendemos
            nem compartilhamos seus dados para marketing de terceiros.
          </p>
        </section>

        <section>
          <h2>Por quanto tempo guardamos</h2>
          <p>Enquanto o atendimento estiver ativo e pelo prazo necessário para obrigações legais. Depois, os dados são excluídos ou anonimizados.</p>
        </section>

        <section>
          <h2>Seus direitos</h2>
          <p>
            Você pode pedir a qualquer momento acesso, correção ou exclusão dos seus dados. Basta responder à nossa
            mensagem no WhatsApp ou falar com o nosso atendimento pedindo a exclusão — os dados pessoais são apagados
            do nosso sistema.
          </p>
        </section>
      </article>
    </main>
  );
}
