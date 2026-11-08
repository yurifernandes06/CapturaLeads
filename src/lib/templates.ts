import { z } from "zod";

/** Templates de mensagem com variáveis {{nome}}, {{primeiro_nome}}, {{empresa}}, {{vendedor}}. */
export const templateSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1, "Dê um nome ao template.").max(40),
  body: z.string().trim().min(1, "O template está vazio.").max(1000),
});
export const templatesSchema = z.array(templateSchema).max(30);
export type MessageTemplate = z.infer<typeof templateSchema>;

export const TEMPLATE_VARIABLES = ["nome", "primeiro_nome", "empresa", "vendedor"] as const;

export const DEFAULT_TEMPLATES: MessageTemplate[] = [
  {
    id: "boas-vindas",
    name: "Boas-vindas",
    body: "Olá, {{primeiro_nome}}! Aqui é {{vendedor}}. Recebi seu contato e já vou te ajudar. Pode me contar um pouco do que você procura?",
  },
  {
    id: "follow-up",
    name: "Follow-up",
    body: "Oi, {{primeiro_nome}}, tudo bem? Passando para saber se ficou alguma dúvida sobre a nossa conversa. Posso te ajudar com algo?",
  },
  {
    id: "proposta",
    name: "Proposta enviada",
    body: "{{primeiro_nome}}, acabei de te enviar a proposta. Quando puder, dá uma olhada e me diz o que achou. Estou à disposição!",
  },
];

export function renderTemplate(
  body: string,
  vars: { nome: string; empresa?: string | null; vendedor?: string | null },
): string {
  const values: Record<string, string> = {
    nome: vars.nome,
    primeiro_nome: vars.nome.split(" ")[0] ?? vars.nome,
    empresa: vars.empresa ?? "",
    vendedor: vars.vendedor?.split(" ")[0] ?? "",
  };
  return body.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key: string) => values[key] ?? match).trim();
}
