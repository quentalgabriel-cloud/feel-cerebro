import { describe, expect, it } from "vitest";
import { slugify } from "@/lib/slug";

describe("slugify", () => {
  it("tira acento em vez de deixar na URL", () => {
    // Este é o teste que importa. O intervalo de diacríticos do `replace`
    // já se corrompeu uma vez em trânsito entre ferramentas — escrito com os
    // caracteres combinantes crus, virou lixo e parou de remover acento, sem
    // erro nenhum. Aqui isso vira teste vermelho.
    expect(slugify("Cérebro da Feel")).toBe("cerebro-da-feel");
    expect(slugify("Espaço de Gabriel")).toBe("espaco-de-gabriel");
    expect(slugify("ação, visão e coração")).toBe("acao-visao-e-coracao");
    expect(slugify("Ünïcôdé")).toBe("unicode");
  });

  it("colapsa pontuação e espaços em um traço só", () => {
    expect(slugify("Feel   ///   Korun")).toBe("feel-korun");
    expect(slugify("v1.2 (beta)")).toBe("v1-2-beta");
  });

  it("não deixa traço sobrando nas pontas", () => {
    expect(slugify("  Feel!  ")).toBe("feel");
    expect(slugify("--Feel--")).toBe("feel");
  });

  it("nunca devolve string vazia — URL vazia não existe", () => {
    expect(slugify("")).toBe("projeto");
    expect(slugify("   ")).toBe("projeto");
    expect(slugify("!!!")).toBe("projeto");
    expect(slugify("日本語")).toBe("projeto");
  });

  it("corta em 48 para não gerar slug absurdo", () => {
    expect(slugify("a".repeat(200))).toHaveLength(48);
  });
});
