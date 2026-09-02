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

select 'RLS TEST: PASS' as resultado;

rollback;
