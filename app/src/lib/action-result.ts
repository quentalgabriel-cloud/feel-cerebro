// O que uma Server Action devolve.
//
// Existe por causa de um bug real: `createProject` fazia `return` mudo quando
// não achava organização, o formulário submetia, nada acontecia, e não havia
// como o usuário saber a diferença entre "salvou" e "falhou em silêncio".
// Formulário que não dá notícia é formulário que mente.
//
// Regra deste projeto a partir daqui: **toda Server Action alcançável por um
// formulário devolve `ActionResult`**. `return` sem valor só é aceitável em
// ação que não pode falhar de forma interessante — e nesse caso o tipo já
// obriga a dizer isso explicitamente.
export type ActionResult = { ok: true } | { ok: false; message: string };

// Estado inicial dos formulários: sucesso silencioso. Não renderiza nada.
export const ACTION_IDLE: ActionResult = { ok: true };

export const ok: ActionResult = { ok: true };

export function fail(message: string): ActionResult {
  return { ok: false, message };
}

// Mensagens compartilhadas. Ficam aqui, e não espalhadas pelas ações, porque
// a mesma falha precisa soar igual em qualquer tela.
export const MSG = {
  sessao:
    "Sua sessão expirou. Entre de novo — o que você digitou continua aqui.",
  semOrganizacao:
    "Sua conta ainda não tem uma organização. Recarregue a página: ela é criada sozinha no carregamento.",
  projetoNaoEncontrado:
    "Projeto não encontrado, ou você não tem acesso a ele.",
  escrita:
    "Não consegui salvar agora. Tente de novo; se persistir, o banco pode estar temporariamente indisponível.",
  leitura:
    "Não consegui ler os dados agora. Se persistir, o projeto Supabase pode estar pausado por inatividade.",
} as const;
