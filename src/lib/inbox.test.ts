import { describe, expect, it } from "vitest";
import { isAwaitingReply, parseInboxFilter } from "./inbox";

const d = (m: number) => new Date(Date.UTC(2026, 10, 10, 12, m));

describe("isAwaitingReply", () => {
  it("lead falou por último → aguardando", () => {
    expect(isAwaitingReply({ stage: "contacted", lastInboundAt: d(5), lastOutboundAt: d(1) })).toBe(true);
    expect(isAwaitingReply({ stage: "new", lastInboundAt: d(5), lastOutboundAt: null })).toBe(true);
  });

  it("time respondeu depois, sem mensagem do lead ou lead fechado → não aguarda", () => {
    expect(isAwaitingReply({ stage: "contacted", lastInboundAt: d(1), lastOutboundAt: d(5) })).toBe(false);
    expect(isAwaitingReply({ stage: "new", lastInboundAt: null, lastOutboundAt: null })).toBe(false);
    expect(isAwaitingReply({ stage: "lost", lastInboundAt: d(5), lastOutboundAt: d(1) })).toBe(false);
  });
});

describe("parseInboxFilter", () => {
  it("aceita só filtros conhecidos", () => {
    expect(parseInboxFilter("mine")).toBe("mine");
    expect(parseInboxFilter("x")).toBe("all");
    expect(parseInboxFilter(undefined)).toBe("all");
  });
});
