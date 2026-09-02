// As regras de NOW / NEXT / NOT NOW, sem banco no caminho.
//
// Elas existem duas vezes de propósito, e essa duplicação é intencional e
// documentada: **o banco é quem impõe** (índice único parcial para NOW = 1,
// check constraint `chk_position_by_kind` para NEXT <= 3), e isto aqui é a
// cópia que roda antes só para dar mensagem decente em vez de erro cru de
// Postgres. Se as duas divergirem, quem está certo é o banco — e o teste
// `state-rules.test.ts` existe para que a divergência apareça no CI, não em
// produção.
//
// Ver supabase/migrations/0001_foundation.sql, `chk_position_by_kind`.

import { MAX_NEXT, type StateKind } from "@/lib/types";

// null = sem teto. NOT NOW é ilimitado por design: é onde a ideia espera sem
// pressionar o escopo. Um teto ali empurraria a pessoa a descartar em vez de
// guardar, que é exatamente o comportamento que o NOT NOW existe para evitar.
export const LIMITE: Record<StateKind, number | null> = {
  now: 1,
  next: MAX_NEXT,
  not_now: null,
};

export function cabeMaisUm(kind: StateKind, quantidadeAtual: number): boolean {
  const limite = LIMITE[kind];
  return limite === null || quantidadeAtual < limite;
}

export function mensagemDeLimite(kind: StateKind): string {
  if (kind === "now") {
    return "Já existe um NOW. Conclua o atual antes de definir outro — um de cada vez é o ponto.";
  }
  if (kind === "next") {
    return `NEXT chegou no teto de ${MAX_NEXT}. Conclua ou remova um antes de adicionar outro.`;
  }
  return "";
}

// A próxima posição é sempre "maior existente + 1". Recebe as posições em vez
// de ir ao banco para poder ser testada e para deixar explícito que a decisão
// não depende de ordem de chegada das linhas.
export function proximaPosicao(posicoesExistentes: readonly number[]): number {
  let maior = 0;
  for (const p of posicoesExistentes) if (p > maior) maior = p;
  return maior + 1;
}

// Buraco na sequência (1, 3, 4 depois de remover a 2) quebraria a próxima
// inserção contra o unique (project_id, kind, position). Esta função devolve
// **apenas** as linhas que precisam mudar — reescrever todas seria escrita
// desnecessária e ruído no histórico.
export function reordenacaoNecessaria<T extends { id: string; position: number }>(
  itensEmOrdem: readonly T[],
): { id: string; position: number }[] {
  const mudancas: { id: string; position: number }[] = [];
  let esperada = 1;
  for (const item of itensEmOrdem) {
    if (item.position !== esperada) {
      mudancas.push({ id: item.id, position: esperada });
    }
    esperada += 1;
  }
  return mudancas;
}

// Espelha `chk_position_by_kind`. Serve de rede: se alguém mudar uma das duas
// pontas sem a outra, o teste quebra.
export function posicaoValida(kind: StateKind, position: number): boolean {
  if (position < 1) return false;
  if (kind === "now") return position === 1;
  if (kind === "next") return position <= MAX_NEXT;
  return true;
}

// Conteúdo vazio não vira item. Espaço em branco também não — senão o NOW
// aceita " " e a tela mostra uma linha muda que ninguém consegue interpretar.
export function conteudoValido(texto: string): boolean {
  return texto.trim().length > 0;
}
