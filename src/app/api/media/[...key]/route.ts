import { isInlineSafe, parseRange } from "@/lib/media";
import { getCurrentUser } from "@/server/auth/dal";
import { readMedia } from "@/server/media/storage";

/**
 * Entrega a mídia do WhatsApp só para usuários logados (o store do Blob é privado).
 * Tipos que não são seguros para exibir inline (HTML, SVG…) vão como download.
 * Aceita `Range` (206): sem isso o Safari/iOS não toca áudio nem vídeo.
 */
export async function GET(request: Request, ctx: RouteContext<"/api/media/[...key]">) {
  const user = await getCurrentUser();
  if (!user) return new Response("Não autorizado", { status: 401 });

  const { key } = await ctx.params;
  const file = await readMedia(key.join("/"));
  if (!file) return new Response("Não encontrado", { status: 404 });

  const name = new URL(request.url).searchParams.get("name")?.replace(/[^\p{L}\p{N} ._-]/gu, "").slice(0, 120);
  const inline = isInlineSafe(file.contentType);
  const headers = new Headers({
    "Content-Type": inline ? file.contentType : "application/octet-stream",
    // Privado: só o navegador do usuário guarda; a chave é imutável, então pode ser longa.
    "Cache-Control": "private, max-age=31536000, immutable",
    "X-Content-Type-Options": "nosniff",
    "Content-Disposition": `${inline ? "inline" : "attachment"}${name ? `; filename*=UTF-8''${encodeURIComponent(name)}` : ""}`,
  });

  const range = file.size ? parseRange(request.headers.get("range"), file.size) : null;
  if (file.size) headers.set("Accept-Ranges", "bytes");

  if (range === "unsatisfiable") {
    headers.set("Content-Range", `bytes */${file.size}`);
    return new Response(null, { status: 416, headers });
  }
  if (range) {
    // Mídia tem no máximo MAX_MEDIA_BYTES: dá para fatiar em memória.
    const all = new Uint8Array(await new Response(file.body).arrayBuffer());
    const part = all.subarray(range.start, range.end + 1);
    headers.set("Content-Range", `bytes ${range.start}-${range.end}/${file.size}`);
    headers.set("Content-Length", String(part.byteLength));
    return new Response(part, { status: 206, headers });
  }

  if (file.size) headers.set("Content-Length", String(file.size));
  return new Response(file.body, { headers });
}
