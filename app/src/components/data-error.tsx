import { MSG } from "@/lib/action-result";

// Falha de LEITURA tem que aparecer como falha.
//
// Requisito de FALHAS da Fase 01: "Supabase pausado → mensagem clara, não
// tela branca". O modo de errar aqui é pior que tela branca: se a query falha
// e o código só olha `data`, a página renderiza o empty state e afirma
// "nada ainda" — ou seja, mente com confiança sobre os dados da pessoa.
export function DataError({ contexto }: { contexto?: string }) {
  return (
    <div
      role="alert"
      className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900"
    >
      <p className="font-medium">
        {contexto ? `Não consegui carregar ${contexto}.` : MSG.leitura}
      </p>
      <p className="mt-1 text-xs leading-relaxed text-amber-800">
        Isto não é uma tela vazia — é uma falha de leitura. Se persistir, o
        projeto Supabase pode estar pausado por inatividade (o cron semanal de
        keepalive existe justamente para evitar isso).
      </p>
    </div>
  );
}
