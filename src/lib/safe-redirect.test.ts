import { describe, expect, it } from "vitest";
import { safeRedirectPath } from "./safe-redirect";

describe("safeRedirectPath", () => {
  it.each([
    ["/leads", "/leads"],
    ["/leads/abc?tab=tasks#x", "/leads/abc?tab=tasks#x"],
    ["/inbox?lead=1", "/inbox?lead=1"],
  ])("aceita caminho interno %s", (input, expected) => {
    expect(safeRedirectPath(input)).toBe(expected);
  });

  it.each([
    undefined,
    null,
    "",
    "leads",
    "https://evil.com",
    "//evil.com",
    String.raw`/\evil.com`,
    String.raw`/\/evil.com`,
    String.raw`\\evil.com`,
    "/a/..//evil.com",
    "/%2F%2Fevil.com/../..//evil.com",
    "/\tevil.com",
    "/\nevil.com",
    "javascript:alert(1)",
  ])("rejeita %j", (input) => {
    expect(safeRedirectPath(input)).toBe("/dashboard");
  });
});
