/**
 * Regras puras de mídia do WhatsApp: tipos, chave de armazenamento e validação.
 * A chave nunca vem do usuário sem passar por `isValidMediaKey` (evita path traversal).
 */
export const MEDIA_KINDS = ["image", "audio", "video", "document", "sticker"] as const;
export type MediaKind = (typeof MEDIA_KINDS)[number];

/** Teto por arquivo (WhatsApp aceita até 100 MB em documentos; acima disso fica só o rótulo). */
export const MAX_MEDIA_BYTES = 25 * 1024 * 1024;

/** O que fica salvo em `activities.meta.media`. */
export type StoredMedia = {
  key: string;
  kind: MediaKind;
  mimeType: string;
  size: number;
  fileName?: string;
  caption?: string;
};

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "audio/ogg": "ogg",
  "audio/mpeg": "mp3",
  "audio/mp4": "m4a",
  "audio/aac": "aac",
  "audio/amr": "amr",
  "video/mp4": "mp4",
  "video/3gpp": "3gp",
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "text/plain": "txt",
};

const MIME_BY_EXT = Object.fromEntries(Object.entries(EXT_BY_MIME).map(([m, e]) => [e, m]));

/** "audio/ogg; codecs=opus" → "audio/ogg" */
export const baseMime = (mime: string) => mime.split(";")[0]!.trim().toLowerCase();

export const extFromMime = (mime: string) => EXT_BY_MIME[baseMime(mime)] ?? "bin";

export const mimeFromKey = (key: string) => MIME_BY_EXT[key.split(".").pop() ?? ""] ?? "application/octet-stream";

/** "whatsapp/2026-11/<uuid>.jpg" — agrupada por mês para facilitar limpeza. */
export function mediaKey(at: Date, id: string, mime: string) {
  const month = `${at.getUTCFullYear()}-${String(at.getUTCMonth() + 1).padStart(2, "0")}`;
  return `whatsapp/${month}/${id}.${extFromMime(mime)}`;
}

const KEY_RE = /^whatsapp\/\d{4}-\d{2}\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.[a-z0-9]{2,4}$/;

export const isValidMediaKey = (key: string) => KEY_RE.test(key);

/** Tipos que o navegador pode exibir inline com segurança; o resto vai como download. */
export function isInlineSafe(mime: string) {
  const m = baseMime(mime);
  return (m.startsWith("image/") && m !== "image/svg+xml") || m.startsWith("audio/") || m.startsWith("video/") || m === "application/pdf";
}

export type ByteRange = { start: number; end: number };

/**
 * Lê o cabeçalho `Range: bytes=...` (um intervalo só — o que o Safari/iOS pede para áudio
 * e vídeo). `null` = sem Range válido (responde 200 inteiro); `"unsatisfiable"` = 416.
 */
export function parseRange(header: string | null, size: number): ByteRange | "unsatisfiable" | null {
  if (!header || size <= 0) return null;
  const m = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!m || (m[1] === "" && m[2] === "")) return null;
  let start: number;
  let end: number;
  if (m[1] === "") {
    // Sufixo: os últimos N bytes.
    const n = Number(m[2]);
    if (n === 0) return "unsatisfiable";
    start = Math.max(0, size - n);
    end = size - 1;
  } else {
    start = Number(m[1]);
    end = m[2] === "" ? size - 1 : Math.min(Number(m[2]), size - 1);
  }
  if (start >= size || start > end) return "unsatisfiable";
  return { start, end };
}
