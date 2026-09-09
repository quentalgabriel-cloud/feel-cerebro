-- 0011_rpc_sem_definer.sql — o RPC público deixa de ser SECURITY DEFINER
--
-- O linter apontou três coisas depois da 0009/0010. Duas são a mesma função e
-- uma delas é um erro meu que já estava escrito em docs/SECURITY.md §3.
--
-- ── O erro ──────────────────────────────────────────────────────────────────
--
-- A 0009 escreveu, com toda a confiança:
--
--     revoke execute on function public.next_display_id(uuid, text) from public;
--
-- e eu tratei essa linha como "o acesso de fora está revogado". Não estava.
-- `from public` remove a concessão ao pseudo-papel PUBLIC. Mas quem tinha
-- EXECUTE aqui era o papel `anon`, *nominalmente*, porque o Supabase mantém
-- `alter default privileges in schema public grant execute on functions to anon`.
-- Concessão nominal não é atingida por revoke ao PUBLIC. O `proacl` dizia
-- `{postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,...}` o tempo
-- todo — eu é que nunca olhei.
--
-- A lição já estava escrita: "'revoguei o acesso' só é verdade quando
-- pg_proc.proacl concorda". Escrevê-la não impediu de repeti-la. Por isso a
-- correção não é revogar esta função e seguir: é a seção 9 do rls_test, que
-- varre TODAS as funções de `public` e falha se qualquer uma for executável
-- por `anon`. Regra que depende de eu lembrar não é regra.
--
-- ── A correção de fundo ─────────────────────────────────────────────────────
--
-- A função não precisa de SECURITY DEFINER. `knowledge_counters` já tem RLS
-- com exatamente a mesma regra que o corpo checava à mão (`can_write_project`).
-- Com DEFINER, essa RLS era ignorada e a checagem manual virava a *única*
-- autoridade — uma linha de código guardando o que uma policy já guardava
-- melhor. Como INVOKER, a policy volta a decidir; a checagem manual fica só
-- para dar mensagem legível em vez de erro de RLS.
--
-- Duas autoridades concordando é redundância. Uma autoridade tendo desligado
-- a outra é o furo.

-- ── 1. search_path preso em projeto_do_caminho ──────────────────────────────
--
-- Vazio, não `public`: esta função não toca em nada de `public`. Só chama
-- `storage.foldername`, que já vem qualificada, e operadores de pg_catalog,
-- que são achados de qualquer jeito. Prender no menor escopo possível é de
-- graça aqui.
create or replace function private.projeto_do_caminho(nome text)
returns uuid language sql immutable
set search_path = ''
as $$
  select case
    when (storage.foldername(nome))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then ((storage.foldername(nome))[1])::uuid
    else null
  end;
$$;

-- ── 2. A porta pública passa a rodar como quem chama ────────────────────────
--
-- `private.next_display_id` sai de cena. Manter o corpo lá dentro, com
-- DEFINER, e chamá-lo de um invólucro INVOKER seria trocar seis por meia
-- dúzia: o bypass de RLS continuaria existindo, um salto mais longe, onde o
-- linter não olha. O contador é escrito num lugar só, sob a RLS do contador.
drop function public.next_display_id(uuid, text);
drop function private.next_display_id(uuid, text);

create function public.next_display_id(p_project uuid, p_type text)
returns text
language plpgsql
security invoker
set search_path = public
as $$
declare
  n integer;
  prefixo text;
begin
  -- Esta checagem NÃO é o que protege o contador — a policy
  -- "quem escreve usa contadores" é. Ela existe para o erro dizer o que houve
  -- em vez de sair uma violação de RLS crua. Se as duas discordarem algum dia,
  -- quem ganha é a policy, e é assim que tem que ser.
  if not private.can_write_project(p_project) then
    raise exception 'sem permissao de escrita neste projeto'
      using errcode = '42501';
  end if;

  if p_type not in ('decision','reasoning','insight','open-loop','project-state','source') then
    raise exception 'tipo invalido: %', p_type using errcode = '22023';
  end if;

  -- Transacional por construção: `on conflict do update ... returning` é uma
  -- única operação atômica. `max()+1` seria corrida de verdade com três
  -- pessoas promovendo ao mesmo tempo (R-04 do plano).
  insert into knowledge_counters (project_id, type, last_number)
  values (p_project, p_type, 1)
  on conflict (project_id, type)
    do update set last_number = knowledge_counters.last_number + 1
  returning last_number into n;

  prefixo := case p_type
    when 'decision'      then 'DEC'
    when 'reasoning'     then 'RT'
    when 'insight'       then 'INS'
    when 'open-loop'     then 'OL'
    when 'project-state' then 'PS'
    when 'source'        then 'SRC'
    else 'ITEM'
  end;

  return prefixo || '-' || lpad(n::text, 3, '0');
end;
$$;

-- Agora nominal, que é a forma que o proacl entende. `from public` fica junto
-- porque não custa nada e cobre o caso de alguém conceder ao PUBLIC depois.
revoke execute on function public.next_display_id(uuid, text) from public;
revoke execute on function public.next_display_id(uuid, text) from anon;
grant  execute on function public.next_display_id(uuid, text) to authenticated;

-- ── 3. O default que criou o problema — e por que ele NÃO é consertado aqui ─
--
-- Revogar só nesta função conserta hoje e deixa a armadilha armada para a
-- próxima função criada em `public`. O conserto óbvio seria mudar o default:
--
--     alter default privileges in schema public
--       revoke execute on functions from public, anon;
--
-- Essa linha esteve escrita aqui. Ela NÃO funciona, e foi bom ter testado
-- antes de acreditar. Medido num Postgres descartável, nas duas ordens
-- possíveis, com e sem grant nominal antes: a função nova sai sempre com
-- `{=X/postgres,...}` no proacl — o `=X` é o PUBLIC. O `revoke` ao PUBLIC via
-- ALTER DEFAULT PRIVILEGES não materializa nada em `pg_default_acl`, e o
-- default embutido do PostgreSQL (EXECUTE ao PUBLIC em toda função) volta a
-- valer na criação. `anon` herda por ser membro implícito de PUBLIC.
--
-- Deixar aquela linha no arquivo seria pior que não ter nada: um comando com
-- cara de proteção, sem efeito, exatamente a falsa confiança que esta
-- migration existe para desfazer. Duas vezes o mesmo erro num arquivo só já
-- é uma a mais do que o aceitável.
--
-- Então o que protege de fato é, e continua sendo, duas coisas explícitas:
--   1. o `revoke ... from anon` nominal em cada função de `public` (acima);
--   2. a seção 9 do rls_test, que varre o catálogo e derruba a suíte se
--      qualquer função de `public` ficar executável por `anon`.
--
-- Prevenção que não funciona vale menos que detecção que funciona.
