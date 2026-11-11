import { describe, expect, it } from "vitest";
import { slugify } from "./slug";

describe("slugify", () => {
  it.each([
    ["Orçamento Rápido", "orcamento-rapido"],
    ["  Promoção de Março!! ", "promocao-de-marco"],
    ["já-existe--duplo", "ja-existe-duplo"],
    ["", ""],
  ])("%j → %j", (input, expected) => {
    expect(slugify(input)).toBe(expected);
  });
});
