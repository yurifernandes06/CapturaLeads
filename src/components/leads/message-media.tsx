import { DownloadIcon, FileTextIcon } from "lucide-react";
import { MEDIA_KINDS, type StoredMedia } from "@/lib/media";
import { cn } from "@/lib/utils";

/** Lê `meta.media` de uma atividade com segurança (meta é JSON livre). */
export function mediaFromMeta(meta: Record<string, unknown> | null | undefined): StoredMedia | null {
  const m = meta?.media as Partial<StoredMedia> | undefined;
  if (!m || typeof m.key !== "string" || !MEDIA_KINDS.includes(m.kind as StoredMedia["kind"])) return null;
  return m as StoredMedia;
}

const src = (m: StoredMedia) => `/api/media/${m.key}${m.fileName ? `?name=${encodeURIComponent(m.fileName)}` : ""}`;

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;
}

/** Anexo de uma mensagem de WhatsApp: imagem, figurinha, áudio, vídeo ou documento. */
export function MessageMedia({ media, className }: { media: StoredMedia; className?: string }) {
  switch (media.kind) {
    case "image":
    case "sticker":
      return (
        <a href={src(media)} target="_blank" rel="noreferrer" className={cn("block", className)}>
          {/* eslint-disable-next-line @next/next/no-img-element -- mídia privada servida pela própria API */}
          <img
            src={src(media)}
            alt={media.caption ?? (media.kind === "sticker" ? "Figurinha" : "Imagem recebida")}
            loading="lazy"
            className={cn("rounded-lg object-cover", media.kind === "sticker" ? "size-28" : "max-h-72 w-auto max-w-full")}
          />
        </a>
      );
    case "audio":
      return <audio controls preload="none" src={src(media)} className={cn("h-10 w-64 max-w-full", className)} />;
    case "video":
      return <video controls preload="metadata" src={src(media)} className={cn("max-h-72 max-w-full rounded-lg", className)} />;
    default:
      return (
        <a
          href={src(media)}
          className={cn(
            "flex max-w-xs items-center gap-2.5 rounded-lg border bg-background/60 px-3 py-2 text-sm transition-colors hover:bg-background",
            className,
          )}
        >
          <FileTextIcon className="size-5 shrink-0 text-muted-foreground" />
          <span className="min-w-0 flex-1">
            <span className="block truncate font-medium">{media.fileName ?? "Documento"}</span>
            <span className="text-xs text-muted-foreground">{formatSize(media.size)}</span>
          </span>
          <DownloadIcon className="size-4 shrink-0 text-muted-foreground" />
        </a>
      );
  }
}
