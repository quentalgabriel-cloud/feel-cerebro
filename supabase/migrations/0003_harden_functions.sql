-- 0003_harden_functions.sql — fecha os 9 avisos do security advisor
--
-- Origem: `get_advisors` (lint de segurança) logo após aplicar 0001 e 0002 no
-- projeto real. Dois problemas distintos, um deles falha minha.
--
-- 1. `touch_updated_at` ficou sem `set search_path` — as outras quatro funções
--    do 0001 têm, essa passou. Função com search_path mutável pode ser
--    induzida a resolver um nome para um objeto plantado por um schema
--    malicioso no caminho de busca.
--    (lint 0011_function_search_path_mutable)
--
-- 2. As quatro helpers de autorização são `SECURITY DEFINER` — de propósito,
--    é o que evita recursão infinita de RLS — mas o PostgREST expõe tudo que
--    está em `public` como RPC. Ou seja, `/rest/v1/rpc/is_project_member`
--    ficou chamável por `anon` e por `authenticated`, executando com os
--    privilégios do definer. Elas nunca foram feitas para o cliente chamar:
--    existem só para as policies avaliarem.
--    (lints 0028 e 0029)
--
-- Verificado localmente ANTES de aplicar: a dúvida real era se revogar o
-- EXECUTE quebraria as próprias policies que chamam essas funções. Não
-- quebra — o Postgres avalia a expressão da policy sem exigir privilégio de
-- execução do role que consulta. `rls_test.sql` continua PASS com as
-- revogações no lugar.

alter function public.touch_updated_at() set search_path = public;

revoke execute on function public.current_profile_id()        from anon, authenticated;
revoke execute on function public.is_org_member(uuid)         from anon, authenticated;
revoke execute on function public.is_project_member(uuid)     from anon, authenticated;
revoke execute on function public.can_write_project(uuid)     from anon, authenticated;

-- Impede que a permissão volte sozinha: sem isso, o `alter default
-- privileges` do Supabase concede EXECUTE de novo a cada função nova criada
-- em `public`. Aqui a revogação é explícita e permanente para estas quatro.
