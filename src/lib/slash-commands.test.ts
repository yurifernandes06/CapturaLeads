import { describe, expect, it } from "vitest";
import { applySlashCommand, filterCommands, findSlashCommand } from "./slash-commands";

describe("findSlashCommand", () => {
  it("abre com / no início ou após espaço", () => {
    expect(findSlashCommand("/", 1)).toEqual({ start: 0, end: 1, query: "" });
    expect(findSlashCommand("Oi /fol", 7)).toEqual({ start: 3, end: 7, query: "fol" });
    expect(findSlashCommand("linha 1\n/pro", 12)).toEqual({ start: 8, end: 12, query: "pro" });
  });

  it("considera só o texto até o cursor", () => {
    expect(findSlashCommand("/fol depois", 4)).toEqual({ start: 0, end: 4, query: "fol" });
  });

  it("ignora URLs, frações e comandos já encerrados por espaço", () => {
    expect(findSlashCommand("veja http://site", 16)).toBeNull();
    expect(findSlashCommand("1/2", 3)).toBeNull();
    expect(findSlashCommand("/fol ", 5)).toBeNull();
    expect(findSlashCommand("sem barra", 9)).toBeNull();
  });
});

describe("filterCommands", () => {
  const items = [{ name: "Boas-vindas" }, { name: "Follow-up" }, { name: "Proposta enviada" }, { name: "Promoção" }];

  it("sem busca devolve tudo", () => {
    expect(filterCommands(items, "")).toHaveLength(4);
  });

  it("ignora acentos e caixa, prefixo antes de conteúdo", () => {
    expect(filterCommands(items, "PROMOCAO").map((i) => i.name)).toEqual(["Promoção"]);
    expect(filterCommands(items, "en").map((i) => i.name)).toEqual(["Proposta enviada"]);
    expect(filterCommands(items, "p").map((i) => i.name)).toEqual(["Proposta enviada", "Promoção", "Follow-up"]);
  });
});

describe("applySlashCommand", () => {
  it("substitui o comando e posiciona o cursor no fim do texto inserido", () => {
    const text = "Oi /fol";
    const r = applySlashCommand(text, findSlashCommand(text, 7)!, "Tudo bem?");
    expect(r).toEqual({ text: "Oi Tudo bem?", cursor: 12 });
  });

  it("preserva o que vem depois do cursor, com espaço se precisar", () => {
    const text = "/boTchau";
    const r = applySlashCommand(text, findSlashCommand(text, 3)!, "Olá!");
    expect(r.text).toBe("Olá! Tchau");
    expect(r.cursor).toBe(5);
  });
});
