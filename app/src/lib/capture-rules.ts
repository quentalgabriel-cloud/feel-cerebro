// Regras puras da captura. Ficam fora do arquivo `"use server"` porque lá
// todo export precisa ser função async — e porque uma heurística de título
// merece teste próprio, sem banco e sem sessão no caminho.

export const TITULO_MAX = 120;

// Heurística de título: primeira linha não vazia. Nunca decide sozinha, só
// sugere — quem promove (Fase 03) confirma ou troca. Deliberadamente burra:
// captura é barata e automática, classificação é cara e humana, e essa
// fronteira é o que o sistema inteiro existe para preservar.
export function tituloSugerido(texto: string): string | null {
  const linha = texto
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l.length > 0);
  return linha ? linha.slice(0, TITULO_MAX) : null;
}
