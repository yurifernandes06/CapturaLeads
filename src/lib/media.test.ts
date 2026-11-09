import { describe, expect, it } from "vitest";
import { extFromMime, isInlineSafe, isValidMediaKey, mediaKey, mimeFromKey } from "./media";

const ID = "3f2b8a1c-1d2e-4f5a-9b8c-7d6e5f4a3b2c";

describe("mediaKey", () => {
  it("agrupa por mês e usa a extensão do tipo", () => {
    expect(mediaKey(new Date("2026-11-09T12:00:00Z"), ID, "image/jpeg")).toBe(`whatsapp/2026-11/${ID}.jpg`);
    expect(mediaKey(new Date("2026-01-01T00:00:00Z"), ID, "audio/ogg; codecs=opus")).toBe(`whatsapp/2026-01/${ID}.ogg`);
  });

  it("tipo desconhecido vira .bin", () => {
    expect(extFromMime("application/x-foo")).toBe("bin");
  });
});

describe("isValidMediaKey", () => {
  it("aceita só chaves geradas pelo sistema", () => {
    expect(isValidMediaKey(`whatsapp/2026-11/${ID}.jpg`)).toBe(true);
    expect(isValidMediaKey(`whatsapp/2026-11/../../.env`)).toBe(false);
    expect(isValidMediaKey(`whatsapp/2026-11/${ID}.jpg/../x`)).toBe(false);
    expect(isValidMediaKey(`outra/2026-11/${ID}.jpg`)).toBe(false);
  });
});

describe("tipos", () => {
  it("deduz o tipo pela extensão e só exibe inline o que é seguro", () => {
    expect(mimeFromKey(`whatsapp/2026-11/${ID}.pdf`)).toBe("application/pdf");
    expect(mimeFromKey(`whatsapp/2026-11/${ID}.bin`)).toBe("application/octet-stream");
    expect(isInlineSafe("image/png")).toBe(true);
    expect(isInlineSafe("image/svg+xml")).toBe(false);
    expect(isInlineSafe("text/html")).toBe(false);
  });
});
