-- 0001_foundation.sql — Fase 01 (Live Foundation)
--
-- Substitui `superseded/0001_init_single_tenant.sql`, que nunca foi aplicado
-- em banco nenhum. O arquivo antigo fica preservado, não apagado, pelo mesmo
-- princípio que vale para o conhecimento: nada é sobrescrito em silêncio.
--
-- O que mudou em relação a ele, e por quê (MASTER-IMPLEMENTATION-PLAN.md §2):
--   D-01  multi-tenancy real (organizations / projects / members) desde o
--         primeiro registro, em vez de um único cérebro implícito.
--   D-06  `escopo` ('pessoal'|'feel'|'cliente:') aposentado — tenancy é
--         `project_id` + RLS, e duas verdades de escopo é o que o Kernel §8
--         proíbe.
--   D-16  identificadores de schema e código em inglês (os prompts de fase do
--         kit referenciam `events`, `candidates`, `project_state` por esses
--         nomes); documentação e interface seguem em português.
--
-- O que NÃO está aqui, de propósito: conhecimento canônico, relações,
-- pgvector. Isso é Fase 03, com as correções D-07 (índice reconstruível) e
-- D-08 (id sem corrida) que a versão antiga não tinha.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- Identidade e tenancy
-- ---------------------------------------------------------------------

create table profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  created_at timestamptz not null default now()
);

comment on table profiles is
  'Uma linha por pessoa. auth_user_id liga ao Supabase Auth — é o que torna '
  'autoria verificável em vez de convencionada.';

create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create table organization_members (
  organization_id uuid not null references organizations(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  role text not null check (role in ('owner', 'builder', 'viewer')),
  created_at timestamptz not null default now(),
  primary key (organization_id, profile_id)
);

create index idx_org_members_profile on organization_members(profile_id);

create table projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  slug text not null,
  -- as duas perguntas de criação de projeto (kit 01, "Project creation")
  what_building text,
  why_exists text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  archived_at timestamptz,
  unique (organization_id, slug)
);

create index idx_projects_org on projects(organization_id);

-- ---------------------------------------------------------------------
-- Helpers de autorização (SECURITY DEFINER para não recursar em RLS)
-- ---------------------------------------------------------------------

create function current_profile_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from profiles where auth_user_id = auth.uid();
$$;

create function is_org_member(org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from organization_members m
    where m.organization_id = org
      and m.profile_id = current_profile_id()
  );
$$;

create function is_project_member(proj uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from projects p
    join organization_members m on m.organization_id = p.organization_id
    where p.id = proj
      and m.profile_id = current_profile_id()
  );
$$;

create function can_write_project(proj uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from projects p
    join organization_members m on m.organization_id = p.organization_id
    where p.id = proj
      and m.profile_id = current_profile_id()
      and m.role in ('owner', 'builder')
  );
$$;

-- ---------------------------------------------------------------------
-- Project State — objetivo + NOW / NEXT / NOT NOW
-- ---------------------------------------------------------------------

create table project_state (
  project_id uuid primary key references projects(id) on delete cascade,
  objective text,
  updated_by uuid references profiles(id),
  updated_at timestamptz not null default now()
);

-- NOW, NEXT e NOT NOW como linhas, não como array JSON: cada item precisa de
-- id estável (para reordenar, editar e promover NOT NOW → NEXT) e de evento
-- próprio.
--
-- As duas regras do kit — NOW = 1 e NEXT <= 3 — são impostas por constraint,
-- não por trigger nem por código de aplicação: `position` é limitada por
-- `kind` e o par (project, kind, position) é único. Não existe estado de
-- banco que viole a regra, mesmo com três pessoas escrevendo ao mesmo tempo.
create table state_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  kind text not null check (kind in ('now', 'next', 'not_now')),
  content text not null,
  position integer not null,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_position_by_kind check (
    (kind = 'now'     and position = 1)
    or (kind = 'next'    and position between 1 and 3)
    or (kind = 'not_now' and position >= 1)
  ),
  -- Deferrable para permitir reordenar dentro de uma transação (trocar as
  -- posições 1 e 2 colide transitoriamente antes do commit).
  unique (project_id, kind, position) deferrable initially deferred
);

-- NOW = 1 precisa falhar NO INSERT, não no commit.
--
-- A constraint deferrable acima sozinha não serve: verificada no fim da
-- transação, ela deixa o insert "passar", quebra num ponto distante do erro
-- e some dentro de um bloco de exceção. O teste `rls_test.sql` pegou
-- exatamente isso. Um índice único parcial é sempre imediato — o segundo NOW
-- morre na hora, onde o erro é tratável.
create unique index idx_one_now_per_project
  on state_items (project_id)
  where kind = 'now';

comment on constraint chk_position_by_kind on state_items is
  'NEXT <= 3 imposto pelo banco (kit 01), junto com a unicidade de posição. '
  'NOW = 1 é imposto por idx_one_now_per_project, imediato.';

create index idx_state_items_project on state_items(project_id, kind, position);

-- ---------------------------------------------------------------------
-- Event log — append-only, não event sourcing
-- ---------------------------------------------------------------------

create table events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  type text not null,
  actor_id uuid references profiles(id),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

comment on table events is
  'Append-only. Base de Recent Changes (Fase 01) e de What Changed / Resume '
  '(Fase 02). Sem policy de update ou delete: o passado não se reescreve.';

create index idx_events_project_time on events(project_id, created_at desc);

-- ---------------------------------------------------------------------
-- Captura — raw files + candidates
-- ---------------------------------------------------------------------

create table raw_files (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  storage_path text not null,
  original_name text not null,
  mime_type text not null,
  size_bytes bigint not null,
  uploaded_by uuid not null references profiles(id),
  uploaded_at timestamptz not null default now()
);

comment on table raw_files is
  'O RAW da tríade RAW → EXTRAÍDO → CONSOLIDADO. Sem cascade de delete a '
  'partir do candidate: a fonte sobrevive à nota que originou.';

create index idx_raw_files_project on raw_files(project_id);

create table candidates (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  author_id uuid not null references profiles(id),
  origin_type text not null check (
    origin_type in ('pasted', 'upload_pdf', 'upload_docx', 'upload_markdown', 'upload_txt')
  ),
  raw_file_id uuid references raw_files(id),
  raw_text text,
  suggested_title text,
  status text not null default 'pending' check (
    status in ('pending', 'extracting', 'ready_for_review', 'promoted', 'rejected')
  ),
  -- preenchido na Fase 03, quando existir conhecimento canônico para apontar
  promoted_knowledge_id text,
  created_at timestamptz not null default now(),
  promoted_at timestamptz,
  constraint chk_raw_file_coherent check (
    (origin_type = 'pasted' and raw_file_id is null)
    or (origin_type <> 'pasted' and raw_file_id is not null)
  )
);

comment on table candidates is
  'A porta de entrada. Visível a todos os membros do projeto desde a captura, '
  'por desenho — cruzar os inputs de várias pessoas é o objetivo. Nenhum '
  'campo de classificação é obrigatório aqui: classificar é trabalho de '
  'promoção (Fase 03), não de entrada.';

create index idx_candidates_project_status on candidates(project_id, status);

-- ---------------------------------------------------------------------
-- Axes — dimensão opcional por projeto (extensão nossa, sem par no kit)
-- ---------------------------------------------------------------------

create table axes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  name text,
  description text,
  color text,
  position integer,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

comment on table axes is
  'Existe vazia até os eixos reais serem definidos. A tabela nasce agora '
  'porque o conhecimento canônico (Fase 03) vai apontar para ela desde o '
  'primeiro registro — criar depois exigiria migrar tudo que já existir.';

create index idx_axes_project on axes(project_id);

-- ---------------------------------------------------------------------
-- updated_at automático
-- ---------------------------------------------------------------------

create function touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_project_state_touch
  before update on project_state
  for each row execute function touch_updated_at();

create trigger trg_state_items_touch
  before update on state_items
  for each row execute function touch_updated_at();

-- ---------------------------------------------------------------------
-- RLS — escopo imposto pelo banco, nunca por convenção de código
-- ---------------------------------------------------------------------

alter table profiles             enable row level security;
alter table organizations        enable row level security;
alter table organization_members enable row level security;
alter table projects             enable row level security;
alter table project_state        enable row level security;
alter table state_items          enable row level security;
alter table events               enable row level security;
alter table raw_files            enable row level security;
alter table candidates           enable row level security;
alter table axes                 enable row level security;

-- profiles: cada um lê/edita o próprio; membros de uma mesma org se enxergam
create policy "read own profile" on profiles for select to authenticated
  using (auth_user_id = auth.uid());
create policy "read profiles of shared orgs" on profiles for select to authenticated
  using (exists (
    select 1
    from organization_members mine
    join organization_members theirs on theirs.organization_id = mine.organization_id
    where mine.profile_id = current_profile_id()
      and theirs.profile_id = profiles.id
  ));
create policy "insert own profile" on profiles for insert to authenticated
  with check (auth_user_id = auth.uid());
create policy "update own profile" on profiles for update to authenticated
  using (auth_user_id = auth.uid()) with check (auth_user_id = auth.uid());

-- organizations / members
create policy "read own orgs" on organizations for select to authenticated
  using (is_org_member(id));
create policy "read own memberships" on organization_members for select to authenticated
  using (is_org_member(organization_id));

-- projects
create policy "read projects of my orgs" on projects for select to authenticated
  using (is_org_member(organization_id));
create policy "write projects of my orgs" on projects for all to authenticated
  using (is_org_member(organization_id))
  with check (is_org_member(organization_id));

-- project_state / state_items: leitura para membros, escrita para owner/builder
create policy "read project state" on project_state for select to authenticated
  using (is_project_member(project_id));
create policy "write project state" on project_state for all to authenticated
  using (can_write_project(project_id)) with check (can_write_project(project_id));

create policy "read state items" on state_items for select to authenticated
  using (is_project_member(project_id));
create policy "write state items" on state_items for all to authenticated
  using (can_write_project(project_id)) with check (can_write_project(project_id));

-- events: leitura para membros; inserção para quem pode escrever; nunca
-- update, nunca delete — a ausência de policy é a garantia
create policy "read events" on events for select to authenticated
  using (is_project_member(project_id));
create policy "append events" on events for insert to authenticated
  with check (can_write_project(project_id));

-- captura
create policy "read raw files" on raw_files for select to authenticated
  using (is_project_member(project_id));
create policy "upload raw files" on raw_files for insert to authenticated
  with check (can_write_project(project_id));

create policy "read candidates" on candidates for select to authenticated
  using (is_project_member(project_id));
create policy "write candidates" on candidates for all to authenticated
  using (can_write_project(project_id)) with check (can_write_project(project_id));

-- axes
create policy "read axes" on axes for select to authenticated
  using (is_project_member(project_id));
create policy "write axes" on axes for all to authenticated
  using (can_write_project(project_id)) with check (can_write_project(project_id));

-- Nenhuma policy para o role anon: sem login, nenhum acesso a nenhuma tabela.
