import { createClient } from "@/lib/supabase/server";

// Toda escrita carrega autoria explícita (MODELO-DE-DADOS.md princípio 2).
// Resolve o usuário do Supabase Auth para a linha correspondente em
// `pessoas` — se não existir, a pessoa não foi cadastrada ainda (passo
// manual de setup: inserir a linha em `pessoas` para cada um dos três
// fundadores, ligada ao auth_user_id deles).
export async function pessoaAtualOuErro() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { pessoa: null, erro: "Não autenticado." } as const;
  }

  const { data: pessoa, error } = await supabase
    .from("pessoas")
    .select("*")
    .eq("auth_user_id", user.id)
    .single();

  if (error || !pessoa) {
    return {
      pessoa: null,
      erro:
        "Usuário autenticado, mas sem registro em `pessoas`. Peça para alguém com acesso ao banco cadastrar seu auth_user_id.",
    } as const;
  }

  return { pessoa, erro: null } as const;
}
