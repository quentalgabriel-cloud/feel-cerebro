import { describe, expect, it } from "vitest";
import { MAX_NEXT } from "@/lib/types";
import {
  LIMITE,
  cabeMaisUm,
  conteudoValido,
  mensagemDeLimite,
  posicaoValida,
  proximaPosicao,
  reordenacaoNecessaria,
} from "@/lib/state-rules";

// Item 24 do plano mestre: "unit: NEXT <= 3, validação de state".
//
// O que este arquivo NÃO faz: provar que as regras são impostas. Quem impõe é
// o banco (índice único parcial + `chk_position_by_kind`), e a prova está em
// `supabase/tests/verify.sh`, caso 5. Aqui se testa a cópia que roda antes,
// para dar mensagem legível — e o valor real destes testes é pegar o dia em
// que alguém mudar uma das duas pontas sem a outra.

describe("limites por tipo", () => {
  it("NOW aceita exatamente um", () => {
    expect(cabeMaisUm("now", 0)).toBe(true);
    expect(cabeMaisUm("now", 1)).toBe(false);
  });

  it("NEXT aceita até três e recusa o quarto", () => {
    expect(cabeMaisUm("next", 0)).toBe(true);
    expect(cabeMaisUm("next", 2)).toBe(true);
    expect(cabeMaisUm("next", MAX_NEXT - 1)).toBe(true);
    expect(cabeMaisUm("next", MAX_NEXT)).toBe(false);
  });

  it("NOT NOW não tem teto — é onde a ideia espera sem pressionar o escopo", () => {
    expect(LIMITE.not_now).toBeNull();
    expect(cabeMaisUm("not_now", 0)).toBe(true);
    expect(cabeMaisUm("not_now", 40)).toBe(true);
  });

  it("a mensagem de limite diz o que fazer, não só que deu errado", () => {
    expect(mensagemDeLimite("now")).toContain("Conclua");
    expect(mensagemDeLimite("next")).toContain(String(MAX_NEXT));
    expect(mensagemDeLimite("not_now")).toBe("");
  });
});

describe("posições", () => {
  it("a próxima posição é sempre maior existente + 1", () => {
    expect(proximaPosicao([])).toBe(1);
    expect(proximaPosicao([1])).toBe(2);
    expect(proximaPosicao([1, 2, 3])).toBe(4);
  });

  it("não depende da ordem em que as linhas chegam do banco", () => {
    expect(proximaPosicao([3, 1, 2])).toBe(4);
    expect(proximaPosicao([2, 5, 1])).toBe(6);
  });

  // Espelha `chk_position_by_kind` da 0001_foundation.sql. Se esta linha e a
  // migration divergirem, uma das duas está errada — e é este teste que
  // transforma isso em falha de CI em vez de erro cru em produção.
  it("valida posição do mesmo jeito que a check constraint do banco", () => {
    expect(posicaoValida("now", 1)).toBe(true);
    expect(posicaoValida("now", 2)).toBe(false);

    expect(posicaoValida("next", 1)).toBe(true);
    expect(posicaoValida("next", 3)).toBe(true);
    expect(posicaoValida("next", 4)).toBe(false);

    expect(posicaoValida("not_now", 1)).toBe(true);
    expect(posicaoValida("not_now", 99)).toBe(true);

    expect(posicaoValida("now", 0)).toBe(false);
    expect(posicaoValida("next", 0)).toBe(false);
    expect(posicaoValida("not_now", 0)).toBe(false);
  });
});

describe("reaperto de posições depois de remover", () => {
  it("não mexe em nada quando a sequência já está justa", () => {
    const itens = [
      { id: "a", position: 1 },
      { id: "b", position: 2 },
    ];
    expect(reordenacaoNecessaria(itens)).toEqual([]);
  });

  it("fecha o buraco deixado pela remoção do meio", () => {
    // era 1,2,3 e o 2 saiu
    const itens = [
      { id: "a", position: 1 },
      { id: "c", position: 3 },
    ];
    expect(reordenacaoNecessaria(itens)).toEqual([{ id: "c", position: 2 }]);
  });

  it("devolve só as linhas que mudam, não a lista inteira", () => {
    const itens = [
      { id: "a", position: 1 },
      { id: "b", position: 2 },
      { id: "d", position: 5 },
    ];
    expect(reordenacaoNecessaria(itens)).toEqual([{ id: "d", position: 3 }]);
  });

  it("deixa a sequência válida para a próxima inserção", () => {
    const itens = [
      { id: "b", position: 2 },
      { id: "c", position: 4 },
      { id: "d", position: 7 },
    ];
    const mudancas = reordenacaoNecessaria(itens);
    const finais = itens.map(
      (i) => mudancas.find((m) => m.id === i.id)?.position ?? i.position,
    );
    expect(finais).toEqual([1, 2, 3]);
    expect(proximaPosicao(finais)).toBe(4);
  });
});

describe("conteúdo", () => {
  it("recusa vazio e espaço em branco", () => {
    expect(conteudoValido("")).toBe(false);
    expect(conteudoValido("   ")).toBe(false);
    expect(conteudoValido("\n\t ")).toBe(false);
  });

  it("aceita texto de verdade", () => {
    expect(conteudoValido("Fechar o gate da Fase 01")).toBe(true);
    expect(conteudoValido("  com espaço nas pontas  ")).toBe(true);
  });
});
