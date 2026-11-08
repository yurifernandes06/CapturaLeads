import { describe, expect, it } from "vitest";
import { renderTemplate } from "./templates";

describe("renderTemplate", () => {
  it("substitui variáveis", () => {
    expect(
      renderTemplate("Olá, {{primeiro_nome}}! Aqui é {{ vendedor }} da {{empresa}}.", {
        nome: "Ana Souza",
        empresa: "ACME",
        vendedor: "João Vendas",
      }),
    ).toBe("Olá, Ana! Aqui é João da ACME.");
  });

  it("mantém variáveis desconhecidas e trata ausentes como vazio", () => {
    expect(renderTemplate("{{nome}} {{xyz}} {{empresa}}", { nome: "Bruno" })).toBe("Bruno {{xyz}}");
  });
});
