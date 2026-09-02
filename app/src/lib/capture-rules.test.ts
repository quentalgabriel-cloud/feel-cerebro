import { describe, expect, it } from "vitest";
import { TITULO_MAX, tituloSugerido } from "@/lib/capture-rules";

describe("título sugerido da captura", () => {
  it("usa a primeira linha não vazia", () => {
    expect(tituloSugerido("Primeira\nSegunda")).toBe("Primeira");
    expect(tituloSugerido("\n\n  \nAchei aqui\noutra coisa")).toBe("Achei aqui");
  });

  it("devolve null quando não há nada aproveitável", () => {
    expect(tituloSugerido("")).toBeNull();
    expect(tituloSugerido("   \n\t\n  ")).toBeNull();
  });

  it("corta no limite em vez de estourar a coluna", () => {
    const longo = "x".repeat(TITULO_MAX + 50);
    expect(tituloSugerido(longo)).toHaveLength(TITULO_MAX);
  });

  it("é só sugestão — não classifica, não decide", () => {
    // A captura é barata de propósito: nada aqui pode transformar o texto em
    // conhecimento canônico. O título é um rótulo provisório para a fila de
    // revisão da Fase 03, e mais nada.
    expect(tituloSugerido("DECISÃO: vamos migrar tudo")).toBe(
      "DECISÃO: vamos migrar tudo",
    );
  });
});
