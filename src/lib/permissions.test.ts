import { describe, expect, it } from "vitest";
import { canReassign, exportOwnerFilter } from "./permissions";

const admin = { id: "a", role: "admin" as const };
const seller = { id: "s", role: "sales" as const };

describe("exportOwnerFilter", () => {
  it("admin mantém o filtro pedido", () => {
    expect(exportOwnerFilter(admin, undefined)).toBeUndefined();
    expect(exportOwnerFilter(admin, "outro")).toBe("outro");
  });

  it("vendedor sempre exporta só a própria carteira", () => {
    expect(exportOwnerFilter(seller, undefined)).toBe("me");
    expect(exportOwnerFilter(seller, "outro")).toBe("me");
    expect(exportOwnerFilter(seller, "none")).toBe("me");
  });
});

describe("canReassign", () => {
  it("admin pode tudo", () => {
    expect(canReassign(admin, "x", "y")).toBe(true);
    expect(canReassign(admin, "x", null)).toBe(true);
  });

  it("vendedor repassa os próprios leads e pega leads sem dono", () => {
    expect(canReassign(seller, "s", "outro")).toBe(true);
    expect(canReassign(seller, null, "s")).toBe(true);
  });

  it("vendedor não mexe em lead de outro nem deixa lead sem dono", () => {
    expect(canReassign(seller, "outro", "s")).toBe(false);
    expect(canReassign(seller, "s", null)).toBe(false);
  });
});
