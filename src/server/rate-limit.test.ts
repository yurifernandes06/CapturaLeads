import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

async function load(redis: boolean) {
  vi.resetModules();
  if (redis) {
    process.env.UPSTASH_REDIS_REST_URL = "https://redis.test/";
    process.env.UPSTASH_REDIS_REST_TOKEN = "tok";
  } else {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  }
  return import("./rate-limit");
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("rateLimit em memória", () => {
  it("bloqueia depois do limite e informa quanto falta", async () => {
    const { rateLimit } = await load(false);
    for (let i = 0; i < 3; i++) expect((await rateLimit("k", 3, 60_000)).ok).toBe(true);
    const blocked = await rateLimit("k", 3, 60_000);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterMs).toBeGreaterThan(0);
  });

  it("reset libera a chave", async () => {
    const { rateLimit, resetRateLimit } = await load(false);
    await rateLimit("r", 1, 60_000);
    expect((await rateLimit("r", 1, 60_000)).ok).toBe(false);
    await resetRateLimit("r");
    expect((await rateLimit("r", 1, 60_000)).ok).toBe(true);
  });
});

describe("rateLimit com Upstash", () => {
  let count = 0;
  const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
    const cmds = JSON.parse(String(init.body)) as unknown[][];
    if (cmds[0][0] === "INCR") count += 1;
    return Response.json([{ result: count }, { result: 1 }, { result: 42_000 }]);
  });

  beforeEach(() => {
    count = 0;
    fetchMock.mockClear();
  });

  it("usa o pipeline INCR/PEXPIRE/PTTL com o token", async () => {
    vi.stubGlobal("fetch", fetchMock);
    const { rateLimit } = await load(true);
    await rateLimit("login:ip", 2, 60_000);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://redis.test/pipeline");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer tok");
    expect(JSON.parse(String(init.body))).toEqual([
      ["INCR", "cl:rl:login:ip"],
      ["PEXPIRE", "cl:rl:login:ip", 60_000, "NX"],
      ["PTTL", "cl:rl:login:ip"],
    ]);
  });

  it("bloqueia pelo contador compartilhado e usa o TTL do Redis", async () => {
    vi.stubGlobal("fetch", fetchMock);
    const { rateLimit } = await load(true);
    await rateLimit("x", 2, 60_000);
    await rateLimit("x", 2, 60_000);
    expect(await rateLimit("x", 2, 60_000)).toEqual({ ok: false, retryAfterMs: 42_000 });
  });

  it("cai para memória se o Redis falhar", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("erro", { status: 500 })));
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const { rateLimit } = await load(true);
    expect((await rateLimit("y", 1, 60_000)).ok).toBe(true);
    expect((await rateLimit("y", 1, 60_000)).ok).toBe(false);
  });
});
