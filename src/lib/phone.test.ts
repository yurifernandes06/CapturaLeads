import { describe, expect, it } from "vitest";
import { formatPhone, isValidPhone, normalizePhone, phoneVariants, whatsappLink } from "./phone";

describe("normalizePhone", () => {
  it.each([
    ["(11) 98765-4321", "5511987654321"],
    ["11 3456-7890", "551134567890"],
    ["+55 11 98765-4321", "5511987654321"],
    ["0055 11 98765 4321", "5511987654321"],
    ["011 98765-4321", "5511987654321"],
    ["+1 (415) 555-0100", "14155550100"],
    ["", ""],
  ])("%s → %s", (input, expected) => {
    expect(normalizePhone(input)).toBe(expected);
  });
});

describe("phoneVariants", () => {
  it("inclui a forma sem o nono dígito para celulares BR", () => {
    expect(phoneVariants("5511987654321")).toEqual(["5511987654321", "551187654321"]);
  });

  it("inclui a forma com o nono dígito quando vem sem", () => {
    expect(phoneVariants("551187654321")).toEqual(["551187654321", "5511987654321"]);
  });

  it("não inventa variação para fixo", () => {
    expect(phoneVariants("551134567890")).toEqual(["551134567890"]);
  });

  it("não mexe em números estrangeiros", () => {
    expect(phoneVariants("14155550100")).toEqual(["14155550100"]);
  });
});

describe("formatação", () => {
  it("formata celular e fixo BR", () => {
    expect(formatPhone("5511987654321")).toBe("+55 (11) 98765-4321");
    expect(formatPhone("551134567890")).toBe("+55 (11) 3456-7890");
  });

  it("valida comprimento", () => {
    expect(isValidPhone("5511987654321")).toBe(true);
    expect(isValidPhone("123")).toBe(false);
  });

  it("gera link do WhatsApp com texto", () => {
    expect(whatsappLink("5511987654321", "Olá!")).toBe("https://wa.me/5511987654321?text=Ol%C3%A1%21");
  });
});
