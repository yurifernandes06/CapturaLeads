import "server-only";
import { env } from "@/lib/env";
import { cloudProvider } from "./providers/cloud";
import { evolutionProvider } from "./providers/evolution";
import { mockProvider } from "./providers/mock";
import type { WhatsAppProvider } from "./types";

const PROVIDERS: Record<WhatsAppProvider["name"], WhatsAppProvider> = {
  mock: mockProvider,
  cloud: cloudProvider,
  evolution: evolutionProvider,
};

/** Provedor ativo, escolhido por WHATSAPP_PROVIDER. */
export function whatsapp(): WhatsAppProvider {
  return PROVIDERS[env().WHATSAPP_PROVIDER];
}

export * from "./types";
