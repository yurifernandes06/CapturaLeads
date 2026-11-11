import { afterEach, describe, expect, it, vi } from "vitest";

async function load(keys: boolean) {
  vi.resetModules();
  if (keys) {
    process.env.TURNSTILE_SITE_KEY = "site";
    process.env.TURNSTILE_SECRET_KEY = "secret";
  } else {
    delete process.env.TURNSTILE_SITE_KEY;
    delete process.env.TURNSTILE_SECRET_KEY;
  }
  return import("./turnstile");
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("verifyTurnstile", () => {
  it("fica desligado sem as chaves", async () => {
    const t = await load(false);
    expect(t.turnstileSiteKey()).toBeUndefined();
    expect(await t.verifyTurnstile("", "1.1.1.1")).toBe(true);
  });

  it("recusa envio sem token quando ligado", async () => {
    const t = await load(true);
    expect(t.turnstileSiteKey()).toBe("site");
    expect(await t.verifyTurnstile("", "1.1.1.1")).toBe(false);
  });

  it("repassa a resposta do Cloudflare", async () => {
    const t = await load(true);
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: false })));
    vi.stubGlobal("fetch", fetchMock);
    expect(await t.verifyTurnstile("tok", "1.1.1.1")).toBe(false);
    const body = fetchMock.mock.calls[0]?.[1]?.body as URLSearchParams;
    expect(body.get("secret")).toBe("secret");
    expect(body.get("response")).toBe("tok");
  });

  it("não trava a captação se o Cloudflare estiver fora do ar", async () => {
    const t = await load(true);
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    expect(await t.verifyTurnstile("tok", "1.1.1.1")).toBe(true);
  });
});
