import { createHmac } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";

beforeAll(() => {
  process.env.WHATSAPP_CLOUD_APP_SECRET = "app-secret";
  process.env.WHATSAPP_WEBHOOK_TOKEN = "hook-token";
});

const cloudPayload = JSON.stringify({
  object: "whatsapp_business_account",
  entry: [
    {
      id: "1",
      changes: [
        {
          field: "messages",
          value: {
            contacts: [{ wa_id: "5511987654321", profile: { name: "Ana Souza" } }],
            messages: [
              { from: "5511987654321", id: "wamid.1", timestamp: "1762600000", type: "text", text: { body: "Oi!" } },
              { from: "5511987654321", id: "wamid.2", timestamp: "1762600001", type: "image", image: { id: "media-9", mime_type: "image/jpeg", caption: "orçamento" } },
            ],
          },
        },
      ],
    },
  ],
});

const sign = (body: string, secret = "app-secret") => `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;

describe("Cloud API webhook", async () => {
  const { cloudProvider } = await import("./cloud");

  it("aceita payload assinado e normaliza mensagens", async () => {
    const req = new Request("http://x/api/webhooks/whatsapp", { method: "POST", headers: { "x-hub-signature-256": sign(cloudPayload) } });
    const msgs = await cloudProvider.parseWebhook(req, cloudPayload);
    expect(msgs).toHaveLength(2);
    expect(msgs[0]).toMatchObject({ from: "5511987654321", name: "Ana Souza", text: "Oi!", providerMessageId: "wamid.1" });
    expect(msgs[1]!.text).toBe("📷 Imagem: orçamento");
    expect(msgs[1]!.media).toEqual({ kind: "image", ref: "media-9", mimeType: "image/jpeg", caption: "orçamento", fileName: undefined });
    expect(msgs[0]!.media).toBeUndefined();
  });

  it("rejeita assinatura inválida", async () => {
    const req = new Request("http://x", { method: "POST", headers: { "x-hub-signature-256": sign(cloudPayload, "outro") } });
    await expect(cloudProvider.parseWebhook(req, cloudPayload)).rejects.toThrow("Assinatura inválida");
  });
});

describe("Evolution API webhook", async () => {
  const { evolutionProvider } = await import("./evolution");
  const body = (over: Record<string, unknown> = {}) =>
    JSON.stringify({
      event: "messages.upsert",
      data: {
        key: { remoteJid: "551187654321@s.whatsapp.net", fromMe: false, id: "ABC" },
        pushName: "Bruno",
        messageTimestamp: 1762600000,
        message: { conversation: "Tem desconto?" },
        ...over,
      },
    });

  it("extrai texto e mantém o número como veio (sem o 9º dígito)", async () => {
    const msgs = await evolutionProvider.parseWebhook(new Request("http://x?token=hook-token"), body());
    expect(msgs).toEqual([
      expect.objectContaining({ from: "551187654321", name: "Bruno", text: "Tem desconto?", fromMe: false }),
    ]);
  });

  it("extrai anexo com base64 embutido e o decodifica sem chamar a API", async () => {
    const message = { audioMessage: { mimetype: "audio/ogg; codecs=opus" }, base64: Buffer.from("OggS").toString("base64") };
    const [msg] = await evolutionProvider.parseWebhook(new Request("http://x?token=hook-token"), body({ message }));
    expect(msg).toMatchObject({ text: "🎤 Áudio", media: { kind: "audio", ref: "ABC", mimeType: "audio/ogg; codecs=opus" } });
    const file = await evolutionProvider.downloadMedia(msg!.media!);
    expect(Buffer.from(file.data).toString()).toBe("OggS");
    expect(file.mimeType).toBe("audio/ogg; codecs=opus");
  });

  it("ignora grupos", async () => {
    const msgs = await evolutionProvider.parseWebhook(
      new Request("http://x?token=hook-token"),
      body({ key: { remoteJid: "123@g.us", id: "G" } }),
    );
    expect(msgs).toEqual([]);
  });

  it("exige o token do webhook", async () => {
    await expect(evolutionProvider.parseWebhook(new Request("http://x?token=errado"), body())).rejects.toThrow("Token inválido");
  });
});
