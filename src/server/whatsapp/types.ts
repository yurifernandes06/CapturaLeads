import type { MediaKind } from "@/lib/media";

/** Anexo de uma mensagem recebida. O download é feito depois, pelo provedor. */
export type InboundMedia = {
  kind: MediaKind;
  /** Id do anexo no provedor (Cloud API: media id; Evolution: id da mensagem). */
  ref: string;
  mimeType?: string;
  fileName?: string;
  caption?: string;
  /** Conteúdo já embutido no webhook (Evolution com base64 ligado, mock). */
  base64?: string;
};

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
  media?: InboundMedia;
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
  /** Baixa o conteúdo de um anexo recebido. */
  downloadMedia(media: InboundMedia): Promise<{ data: Uint8Array; mimeType: string }>;
}

/** Decodifica anexo que já veio em base64 no próprio webhook. */
export function decodeInlineMedia(media: InboundMedia) {
  if (!media.base64) return null;
  return { data: new Uint8Array(Buffer.from(media.base64, "base64")), mimeType: media.mimeType ?? "application/octet-stream" };
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
