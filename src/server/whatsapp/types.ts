/** Mensagem recebida, já normalizada, independente do provedor. */
export type InboundMessage = {
  /** Telefone E.164 sem "+" */
  from: string;
  name?: string;
  text: string;
  providerMessageId?: string;
  at: Date;
  /** Mensagem enviada pelo próprio número da empresa (ex.: pelo celular), não pelo lead. */
  fromMe?: boolean;
};

export type SendResult = { providerMessageId?: string };

export interface WhatsAppProvider {
  readonly name: "mock" | "cloud" | "evolution";
  readonly label: string;
  /** Faltam variáveis de ambiente? Devolve a lista para exibir na tela. */
  missingConfig(): string[];
  sendText(to: string, body: string): Promise<SendResult>;
  /** Valida a autenticidade e extrai as mensagens do webhook. Lança WebhookAuthError se inválido. */
  parseWebhook(request: Request, rawBody: string): Promise<InboundMessage[]>;
}

export class WebhookAuthError extends Error {}

export class WhatsAppSendError extends Error {
  constructor(
    message: string,
    readonly hint?: string,
  ) {
    super(message);
  }
}
