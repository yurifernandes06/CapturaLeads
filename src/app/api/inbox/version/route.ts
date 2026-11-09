import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/server/auth/dal";
import { conversationVersion } from "@/server/inbox";

/**
 * Polling leve do inbox e do detalhe do lead: devolve só um carimbo de versão.
 * A tela recarrega os dados (router.refresh) apenas quando o carimbo muda.
 */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Não autorizado" }, { status: 401 });
  const lead = request.nextUrl.searchParams.get("lead") ?? undefined;
  const v = await conversationVersion(lead);
  return Response.json({ v }, { headers: { "Cache-Control": "no-store" } });
}
