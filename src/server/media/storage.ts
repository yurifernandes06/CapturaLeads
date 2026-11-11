import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { del, get, put } from "@vercel/blob";
import { env } from "@/lib/env";
import { MAX_MEDIA_BYTES, baseMime, isValidMediaKey, mediaKey, mimeFromKey } from "@/lib/media";

/**
 * Armazenamento de mídia do WhatsApp.
 * - Vercel Blob (store privado) quando há credencial — produção na Vercel.
 * - Disco local em data/media como fallback — dev e VPS.
 * Nada é público: a leitura passa sempre por /api/media com sessão.
 */
const LOCAL_ROOT = path.join(process.cwd(), "data", "media");

const blobEnabled = () => {
  const e = env();
  return Boolean(e.BLOB_READ_WRITE_TOKEN || e.BLOB_STORE_ID);
};

export async function saveMedia(data: Uint8Array, mimeType: string) {
  if (data.byteLength > MAX_MEDIA_BYTES) throw new Error(`Mídia acima de ${MAX_MEDIA_BYTES / 1024 / 1024} MB.`);
  const mime = baseMime(mimeType) || "application/octet-stream";
  const key = mediaKey(new Date(), randomUUID(), mime);

  if (blobEnabled()) {
    await put(key, Buffer.from(data), { access: "private", contentType: mime, addRandomSuffix: false });
  } else {
    const file = path.join(LOCAL_ROOT, key);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, data);
  }
  return { key, mimeType: mime, size: data.byteLength };
}

export async function readMedia(key: string): Promise<{ body: BodyInit; contentType: string; size?: number } | null> {
  if (!isValidMediaKey(key)) return null;

  if (blobEnabled()) {
    const res = await get(key, { access: "private" });
    if (!res || res.statusCode !== 200) return null;
    return { body: res.stream, contentType: res.blob.contentType, size: res.blob.size };
  }

  try {
    const data = await readFile(path.join(LOCAL_ROOT, key));
    return { body: new Uint8Array(data), contentType: mimeFromKey(key), size: data.byteLength };
  } catch {
    return null;
  }
}

/** Apaga anexos (LGPD/retenção). Chaves inválidas são ignoradas; arquivo ausente não é erro. */
export async function deleteMedia(keys: string[]) {
  const valid = keys.filter(isValidMediaKey);
  if (!valid.length) return;
  if (blobEnabled()) {
    await del(valid);
    return;
  }
  await Promise.all(valid.map((key) => rm(path.join(LOCAL_ROOT, key), { force: true })));
}
