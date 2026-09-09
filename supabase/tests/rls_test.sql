-- rls_test.sql — verificação de isolamento entre projetos
--
-- Mitiga R-02 do MASTER-IMPLEMENTATION-PLAN.md §12: "RLS multi-tenant mal
-- escrita vaza projeto". O Kernel §13 exige testar allow **e** deny — testar
-- só o caminho feliz prova que o dono entra, não prova que o estranho fica
-- fora, que é a única coisa que importa aqui.
--
-- Roda inteiro dentro de uma transação com ROLLBACK no fim: cria dois usuários,
-- duas organizações e dois projetos, faz as asserções e não deixa nada para
-- trás. Pode ser executado quantas vezes quiser, inclusive em produção.
--
-- Uso: aplicar com a service role (via `apply_migration` não — isto não é
-- migration; executar como SQL avulso no editor do Supabase ou via psql).
--
-- Resultado esperado: a última linha imprime "RLS TEST: PASS".
-- Qualquer falha aborta com exceção nomeando exatamente qual regra quebrou.

begin;

-- ---------------------------------------------------------------------
-- Cenário: Ana (owner na Acme) · Bruno (owner na Beta) · Carla (viewer na Acme)
-- ---------------------------------------------------------------------

set local role postgres;

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at)
values
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'ana@test.local',   '', now(), now()),
  ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'bruno@test.local', '', now(), now()),
  ('33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'carla@test.local', '', now(), now());

insert into profiles (id, auth_user_id, name, email) values
  ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Ana',   'ana@test.local'),
  ('bbbbbbbb-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'Bruno', 'bruno@test.local'),
  ('cccccccc-0000-0000-0000-000000000003', '33333333-3333-3333-3333-333333333333', 'Carla', 'carla@test.local');

insert into organizations (id, name, slug) values
  ('a0000000-0000-0000-0000-0000000000a1', 'Acme', 'acme'),
  ('b0000000-0000-0000-0000-0000000000b1', 'Beta', 'beta');

insert into organization_members (organization_id, profile_id, role) values
  ('a0000000-0000-0000-0000-0000000000a1', 'aaaaaaaa-0000-0000-0000-000000000001', 'owner'),
  ('a0000000-0000-0000-0000-0000000000a1', 'cccccccc-0000-0000-0000-000000000003', 'viewer'),
  ('b0000000-0000-0000-0000-0000000000b1', 'bbbbbbbb-0000-0000-0000-000000000002', 'owner');

insert into projects (id, organization_id, name, slug, created_by) values
  ('a0000000-0000-0000-0000-0000000000f1', 'a0000000-0000-0000-0000-0000000000a1', 'Projeto Acme', 'acme-proj', 'aaaaaaaa-0000-0000-0000-000000000001'),
  ('b0000000-0000-0000-0000-0000000000f2', 'b0000000-0000-0000-0000-0000000000b1', 'Projeto Beta', 'beta-proj', 'bbbbbbbb-0000-0000-0000-000000000002');

insert into project_state (project_id, objective) values
  ('a0000000-0000-0000-0000-0000000000f1', 'objetivo secreto da Acme'),
  ('b0000000-0000-0000-0000-0000000000f2', 'objetivo secreto da Beta');

insert into candidates (project_id, author_id, origin_type, raw_text, status) values
  ('a0000000-0000-0000-0000-0000000000f1', 'aaaaaaaa-0000-0000-0000-000000000001', 'pasted', 'captura da Acme', 'ready_for_review');

-- ---------------------------------------------------------------------
-- Helper de asserção
-- ---------------------------------------------------------------------

create or replace function assert_eq(actual bigint, expected bigint, label text)
returns void language plpgsql as $$
begin
  if actual is distinct from expected then
    raise exception 'RLS TEST FALHOU — %: esperado %, obtido %', label, expected, actual;
  end if;
end;
$$;

-- ---------------------------------------------------------------------
-- 1. ANÔNIMO — não enxerga absolutamente nada
-- ---------------------------------------------------------------------

set local role anon;

do $$
begin
  perform assert_eq((select count(*) from projects),      0, 'anon nao pode ler projects');
  perform assert_eq((select count(*) from project_state), 0, 'anon nao pode ler project_state');
  perform assert_eq((select count(*) from candidates),    0, 'anon nao pode ler candidates');
  perform assert_eq((select count(*) from profiles),      0, 'anon nao pode ler profiles');
end $$;

-- ---------------------------------------------------------------------
-- 2. ANA (owner na Acme) — enxerga a Acme, NÃO enxerga a Beta
-- ---------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

do $$
begin
  perform assert_eq((select count(*) from projects), 1, 'Ana ve exatamente 1 projeto');
  perform assert_eq(
    (select count(*) from projects where slug = 'beta-proj'), 0,
    'Ana NAO pode ver o projeto da Beta');
  perform assert_eq(
    (select count(*) from project_state where objective like '%Beta%'), 0,
    'Ana NAO pode ver o objetivo da Beta');
  perform assert_eq((select count(*) from candidates), 1, 'Ana ve a captura da Acme');
end $$;

-- Ana é owner: pode escrever
insert into state_items (project_id, kind, content, position, created_by)
values ('a0000000-0000-0000-0000-0000000000f1', 'now', 'NOW da Acme', 1, 'aaaaaaaa-0000-0000-0000-000000000001');

-- ---------------------------------------------------------------------
-- 3. BRUNO (outra org) — o teste que realmente importa
-- ---------------------------------------------------------------------

set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';

do $$
begin
  perform assert_eq((select count(*) from projects), 1, 'Bruno ve exatamente 1 projeto (o dele)');
  perform assert_eq(
    (select count(*) from projects where slug = 'acme-proj'), 0,
    'VAZAMENTO: Bruno viu o projeto da Acme');
  perform assert_eq(
    (select count(*) from candidates), 0,
    'VAZAMENTO: Bruno viu captura de outra organizacao');
  perform assert_eq(
    (select count(*) from state_items), 0,
    'VAZAMENTO: Bruno viu o NOW de outra organizacao');
  perform assert_eq(
    (select count(*) from project_state where objective like '%Acme%'), 0,
    'VAZAMENTO: Bruno viu o objetivo da Acme');
end $$;

-- Bruno tentando escrever no projeto da Acme precisa falhar
do $$
declare escreveu boolean := false;
begin
  begin
    insert into state_items (project_id, kind, content, position)
    values ('a0000000-0000-0000-0000-0000000000f1', 'next', 'invasao', 1);
    escreveu := true;
  exception when insufficient_privilege or check_violation then
    escreveu := false;
  end;

  if escreveu then
    raise exception 'VAZAMENTO GRAVE: Bruno escreveu no projeto da Acme';
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 4. CARLA (viewer na Acme) — lê, não escreve
-- ---------------------------------------------------------------------

set local request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}';

do $$
begin
  perform assert_eq((select count(*) from projects), 1, 'Carla ve o projeto da Acme');
  perform assert_eq((select count(*) from state_items), 1, 'Carla le o NOW da Acme');
end $$;

do $$
declare escreveu boolean := false;
begin
  begin
    insert into state_items (project_id, kind, content, position)
    values ('a0000000-0000-0000-0000-0000000000f1', 'next', 'viewer escrevendo', 1);
    escreveu := true;
  exception when insufficient_privilege or check_violation then
    escreveu := false;
  end;

  if escreveu then
    raise exception 'FALHA DE PAPEL: viewer conseguiu escrever';
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 4b. Bootstrap de organização (0005) — o caso legítimo e o abuso
-- ---------------------------------------------------------------------

set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';

-- Legítimo: Bruno cria uma org nova e entra como primeiro membro.
insert into organizations (id, name, slug)
values ('c0000000-0000-0000-0000-0000000000c1', 'Nova do Bruno', 'nova-bruno');

insert into organization_members (organization_id, profile_id, role)
values ('c0000000-0000-0000-0000-0000000000c1', 'bbbbbbbb-0000-0000-0000-000000000002', 'owner');

-- Abuso: Bruno tentando se enfiar na organização da Acme, que já tem membros.
-- É o buraco que a policy de INSERT precisa fechar — sem ele, bastaria
-- conhecer o uuid de uma org para entrar nela.
do $$
declare entrou boolean := false;
begin
  begin
    insert into organization_members (organization_id, profile_id, role)
    values ('a0000000-0000-0000-0000-0000000000a1', 'bbbbbbbb-0000-0000-0000-000000000002', 'owner');
    entrou := true;
  exception when insufficient_privilege or check_violation then
    entrou := false;
  end;

  if entrou then
    raise exception 'VAZAMENTO GRAVE: Bruno se adicionou a organizacao alheia';
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 5. Constraints de estado — NOW = 1 e NEXT <= 3 impostos pelo banco
-- ---------------------------------------------------------------------

set local role postgres;

do $$
declare violou boolean := false;
begin
  begin
    insert into state_items (project_id, kind, content, position)
    values ('a0000000-0000-0000-0000-0000000000f1', 'next', 'quarto item', 4);
    violou := true;
  exception when check_violation then
    violou := false;
  end;

  if violou then
    raise exception 'FALHA: o banco aceitou um quarto NEXT (regra NEXT <= 3)';
  end if;
end $$;

do $$
declare violou boolean := false;
begin
  begin
    insert into state_items (project_id, kind, content, position)
    values ('a0000000-0000-0000-0000-0000000000f1', 'now', 'segundo NOW', 1);
    violou := true;
  exception when unique_violation then
    violou := false;
  end;

  if violou then
    raise exception 'FALHA: o banco aceitou um segundo NOW (regra NOW = 1)';
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 6. A PONTE DE CONHECIMENTO (0006) — sources e knowledge_index
--
-- Tabela nova é superfície nova de vazamento. Estas são as tabelas que vão
-- guardar a estratégia dos três sócios indexada; um furo aqui é pior que
-- um furo no NOW, porque o NOW é uma frase e o índice é o acervo inteiro.
-- ---------------------------------------------------------------------

-- Ana (owner na Acme) cria uma source e um item de conhecimento.
--
-- `set local role authenticated` é obrigatório aqui, e não é detalhe: a seção
-- anterior roda como `postgres`, que **ignora RLS**. Sem esta linha, o bloco
-- inteiro testaria superusuário chamando-o de "Bruno" — e passaria verde
-- provando nada. Foi o que aconteceu na primeira versão deste teste.
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

insert into sources (id, project_id, kind, title, raw_text, scope, captured_by)
values ('50000000-0000-0000-0000-000000000001',
        'a0000000-0000-0000-0000-0000000000f1',
        'paste', 'Fonte secreta da Acme', 'texto bruto confidencial',
        'cliente:acme', 'aaaaaaaa-0000-0000-0000-000000000001');

insert into knowledge_index
  (project_id, display_id, type, scope, title, repo, path, body)
values ('a0000000-0000-0000-0000-0000000000f1', 'DEC-001', 'decision',
        'cliente:acme', 'Decisao canonica da Acme',
        'acme/knowledge', '04-memoria/decisoes/dec-001.md',
        'corpo da decisao que nao pode vazar');

do $$
begin
  perform assert_eq((select count(*) from sources), 1, 'Ana ve a source que criou');
  perform assert_eq((select count(*) from knowledge_index), 1, 'Ana ve o conhecimento da Acme');
end $$;

-- O display_id não pode sair por max()+1: com três pessoas promovendo isso
-- é corrida de verdade (R-04). A sequência é transacional e por tipo.
do $$
declare a text; b text; c text;
begin
  a := public.next_display_id('a0000000-0000-0000-0000-0000000000f1', 'decision');
  b := public.next_display_id('a0000000-0000-0000-0000-0000000000f1', 'decision');
  c := public.next_display_id('a0000000-0000-0000-0000-0000000000f1', 'insight');

  perform assert_eq((a = b)::int, 0, 'FALHA: display_id repetiu dentro do mesmo tipo');
  perform assert_eq((a = 'DEC-001')::int, 1, 'display_id de decision comeca em DEC-001');
  perform assert_eq((b = 'DEC-002')::int, 1, 'display_id de decision incrementa');
  perform assert_eq((c = 'INS-001')::int, 1, 'cada tipo tem sequencia propria');
end $$;

-- Bruno, o forasteiro: não pode ver nem escrever nada disso.
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';

do $$
begin
  perform assert_eq((select count(*) from sources), 0,
    'VAZAMENTO GRAVE: Bruno viu a source bruta de outra organizacao');
  perform assert_eq((select count(*) from knowledge_index), 0,
    'VAZAMENTO GRAVE: Bruno viu o conhecimento canonico de outra organizacao');
  perform assert_eq((select count(*) from knowledge_counters), 0,
    'VAZAMENTO: Bruno viu os contadores de outra organizacao');
end $$;

do $$
declare escreveu boolean := false;
begin
  begin
    insert into knowledge_index (project_id, display_id, type, title, repo, path)
    values ('a0000000-0000-0000-0000-0000000000f1', 'DEC-999', 'decision',
            'injetado pelo Bruno', 'acme/knowledge', 'fake.md');
    escreveu := true;
  exception when others then
    escreveu := false;
  end;

  if escreveu then
    raise exception 'VAZAMENTO GRAVE: Bruno indexou conhecimento na organizacao alheia';
  end if;
end $$;

do $$
declare escreveu boolean := false;
begin
  begin
    insert into sources (project_id, kind, title, raw_text)
    values ('a0000000-0000-0000-0000-0000000000f1', 'paste', 'fonte do Bruno', 'x');
    escreveu := true;
  exception when others then
    escreveu := false;
  end;

  if escreveu then
    raise exception 'VAZAMENTO GRAVE: Bruno criou source na organizacao alheia';
  end if;
end $$;

-- Carla é viewer: lê o conhecimento da própria organização, mas não escreve.
set local request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}';

do $$
begin
  perform assert_eq((select count(*) from knowledge_index), 1, 'Carla le o conhecimento da Acme');
end $$;

do $$
declare escreveu boolean := false;
begin
  begin
    insert into knowledge_index (project_id, display_id, type, title, repo, path)
    values ('a0000000-0000-0000-0000-0000000000f1', 'DEC-998', 'decision',
            'viewer escrevendo', 'acme/knowledge', 'fake2.md');
    escreveu := true;
  exception when others then
    escreveu := false;
  end;

  if escreveu then
    raise exception 'FALHA: viewer conseguiu indexar conhecimento';
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 7. A PORTA PÚBLICA DA SEQUÊNCIA (0009)
--
-- `public.next_display_id` é exposta pelo PostgREST de propósito — a promoção
-- precisa dela. O que a torna segura é a checagem DENTRO da função, não o
-- fato de estar escondida. Este é o teste dessa checagem.
-- ---------------------------------------------------------------------

-- Bruno, o forasteiro, chamando direto o RPC do projeto alheio.
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';

do $$
declare conseguiu boolean := false;
begin
  begin
    perform public.next_display_id('a0000000-0000-0000-0000-0000000000f1', 'decision');
    conseguiu := true;
  exception when others then
    conseguiu := false;
  end;

  if conseguiu then
    raise exception 'VAZAMENTO GRAVE: Bruno reservou display_id em projeto alheio';
  end if;
end $$;

-- Carla é viewer: lê, mas não escreve — logo não reserva id.
set local request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}';

do $$
declare conseguiu boolean := false;
begin
  begin
    perform public.next_display_id('a0000000-0000-0000-0000-0000000000f1', 'decision');
    conseguiu := true;
  exception when others then
    conseguiu := false;
  end;

  if conseguiu then
    raise exception 'FALHA: viewer reservou display_id';
  end if;
end $$;

-- Ana pode. E tipo inválido é recusado mesmo para quem pode escrever.
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

do $$
declare id text; conseguiu boolean := false;
begin
  id := public.next_display_id('a0000000-0000-0000-0000-0000000000f1', 'insight');
  perform assert_eq((id like 'INS-%')::int, 1, 'Ana reserva id de insight');

  begin
    perform public.next_display_id('a0000000-0000-0000-0000-0000000000f1', 'inventado');
    conseguiu := true;
  exception when others then
    conseguiu := false;
  end;

  if conseguiu then
    raise exception 'FALHA: a funcao aceitou um tipo fora das seis classes';
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 8. O BUCKET DE ARQUIVOS BRUTOS (0010)
--
-- A policy original liberava o bucket inteiro para qualquer autenticado.
-- Ninguém notou porque `storage.objects` estava fora desta suíte — e o
-- caminho é `<project_id>/...`, então bastava conhecer um uuid de projeto,
-- que aparece em URL e em log, para baixar o PDF de estratégia alheio.
-- ---------------------------------------------------------------------

set local role postgres;
insert into storage.buckets (id, name, public) values ('raw-files', 'raw-files', false)
  on conflict (id) do nothing;
insert into storage.objects (bucket_id, name)
values ('raw-files', 'a0000000-0000-0000-0000-0000000000f1/aaaaaaaa-0000-0000-0000-000000000001/estrategia-acme.pdf');

set local role authenticated;

-- Ana é da Acme: enxerga o arquivo da Acme.
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
do $$
begin
  perform assert_eq((select count(*) from storage.objects), 1, 'Ana ve o arquivo do proprio projeto');
end $$;

-- Bruno não. Este é o teste que a 0002 nunca teve.
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';
do $$
begin
  perform assert_eq((select count(*) from storage.objects), 0,
    'VAZAMENTO GRAVE: Bruno listou arquivo bruto de outra organizacao');
end $$;

do $$
declare escreveu boolean := false;
begin
  begin
    insert into storage.objects (bucket_id, name)
    values ('raw-files', 'a0000000-0000-0000-0000-0000000000f1/bbbbbbbb-0000-0000-0000-000000000002/invadido.pdf');
    escreveu := true;
  exception when others then
    escreveu := false;
  end;

  if escreveu then
    raise exception 'VAZAMENTO GRAVE: Bruno enviou arquivo para projeto alheio';
  end if;
end $$;

-- Caminho malformado precisa ser NEGADO, nao explodir: cast de texto para
-- uuid que falha viraria erro 500 em vez de "nao pode".
do $$
declare escreveu boolean := false;
begin
  begin
    insert into storage.objects (bucket_id, name) values ('raw-files', 'nao-e-uuid/arquivo.pdf');
    escreveu := true;
  exception when others then
    escreveu := false;
  end;

  if escreveu then
    raise exception 'FALHA: caminho sem project_id valido foi aceito';
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 9. INVARIANTES DE SUPERFICIE (0011)
--
-- As secoes acima testam regras. Esta testa a CLASSE de erro que produziu as
-- regras — e existe porque eu ja tinha escrito a licao e a repeti mesmo assim.
--
-- A 0009 dizia `revoke execute ... from public` e eu li isso como "ninguem de
-- fora executa". O `proacl` dizia `anon=X/postgres`. Revoke ao pseudo-papel
-- PUBLIC nao tira concessao nominal, e o Supabase concede a `anon` por default
-- privileges em tudo que nasce em `public`.
--
-- Um teste que checasse so `next_display_id` consertaria hoje. Estes tres
-- varrem o catalogo inteiro: qualquer funcao NOVA que caia na mesma armadilha
-- derruba a suite sem ninguem precisar lembrar de nada. E a diferenca entre
-- corrigir um bug e fechar a porta por onde ele entra.
--
-- O helper de teste sai de cena antes da varredura: ele mora em `public`
-- porque este arquivo o criou, e uma lista de excecoes seria exatamente o
-- tipo de coisa que apodrece. Sem excecao nenhuma, o teste nao tem como
-- mentir.
--
-- `reset role` porque a secao 8 terminou como `authenticated`, e quem inspeciona
-- catalogo e derruba funcao aqui e o dono. Continua sem privilegio nenhum em
-- jogo: `has_function_privilege` responde sobre o papel que a gente pergunta,
-- nao sobre quem pergunta.
reset role;
drop function assert_eq(bigint, bigint, text);

do $$
declare achadas text;
begin
  -- (a) Nada em `public` e executavel por `anon`.
  --     `public` e o schema que o PostgREST expoe: funcao executavel por
  --     `anon` aqui e endpoint aberto na internet, com ou sem intencao.
  select string_agg(
           format('%s(%s)', p.proname, pg_get_function_identity_arguments(p.oid)),
           ', ' order by p.proname)
    into achadas
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'
     and has_function_privilege('anon', p.oid, 'execute');

  if achadas is not null then
    raise exception 'VAZAMENTO: anon executa em public: %', achadas;
  end if;

  -- (b) Nada em `public` roda com SECURITY DEFINER.
  --     Quem precisa de poder emprestado mora em `private`, onde o PostgREST
  --     nao chega. Em `public`, a funcao roda como quem chama e a RLS da
  --     tabela continua sendo a autoridade — que foi o conserto da 0011.
  select string_agg(p.proname, ', ' order by p.proname)
    into achadas
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'
     and p.prosecdef;

  if achadas is not null then
    raise exception 'SECURITY DEFINER exposto pelo PostgREST: %', achadas;
  end if;

  -- (c) Toda funcao nossa tem search_path preso.
  --     Solto, quem chama escolhe de qual schema vem cada nome usado la
  --     dentro. Em funcao DEFINER isso e escalada de privilegio; nas outras e
  --     so um bug esperando schema novo aparecer.
  select string_agg(format('%s.%s', n.nspname, p.proname), ', ' order by p.proname)
    into achadas
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
   where n.nspname in ('public', 'private')
     and p.prokind = 'f'
     and not exists (
           select 1 from unnest(coalesce(p.proconfig, '{}')) c
            where c ~ '^search_path='
         );

  if achadas is not null then
    raise exception 'search_path solto em: %', achadas;
  end if;
end $$;

-- ---------------------------------------------------------------------

select 'RLS TEST: PASS' as resultado;

rollback;
