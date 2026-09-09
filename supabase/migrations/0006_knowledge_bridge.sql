-- 0006_knowledge_bridge.sql — a ponte entre captura e conhecimento canônico
--
-- Implementa a DEC-013 (reconciliação dos três sistemas) do vault `cerebro`.
-- Três travessias ganham tabela aqui; a quarta (local → GitHub) é `git push` e
-- não precisa de código.
--
-- REGRA QUE GOVERNA ESTE ARQUIVO: o Postgres NÃO é dono de conhecimento.
-- `knowledge_index` é DERIVADO e 100% reconstruível a partir do Markdown no
-- Git. Se um reindex do zero não reproduz o índice, o defeito é do índice.
-- Por isso nenhuma coluna aqui guarda algo que não exista no Markdown — a
-- tentação de "só mais um campinho que só o app sabe" é exatamente o que
-- condenou `notas_promovidas` (D-07 do plano da Feel).

-- ── sources ─────────────────────────────────────────────────────────────────
-- De onde o material veio, preservado. INS-005 do vault: "raw nunca é
-- substituído por resumo". A source sobrevive à promoção e ao descarte.
create table sources (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  kind text not null check (kind in (
    'upload',        -- arquivo enviado pelo app web
    'paste',         -- texto colado (Quick Capture)
    'git',           -- arquivo já versionado num repo de conhecimento
    'conversation',  -- transcrição de conversa
    'external'       -- link/documento fora do sistema
  )),
  title text not null,
  -- Onde o bruto vive de verdade. Storage path, URL, ou caminho no repo.
  locator text,
  raw_file_id uuid references raw_files(id) on delete set null,
  raw_text text,
  -- Escopo viaja junto do conteúdo (DEC-007): recuperação de um cliente nunca
  -- pode devolver material de outro.
  scope text not null default 'pessoal',
  captured_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create index idx_sources_project on sources(project_id);

-- ── candidates: expandido ───────────────────────────────────────────────────
-- Candidate é o que foi capturado e ainda não foi decidido. Ganha os campos
-- que a promoção precisa preencher — e que o schema do vault (DEC-002) exige
-- no frontmatter do Markdown.
alter table candidates add column source_id uuid references sources(id) on delete set null;

-- As seis classes da DEC-002. Nulo enquanto ninguém classificou.
alter table candidates add column proposed_type text
  check (proposed_type in ('decision','reasoning','insight','open-loop','project-state','source'));

-- O eixo epistêmico absorve Hypothesis/Evidence da D-02 da Feel sem criar
-- classe nova — ver DEC-013 §2.
alter table candidates add column epistemic text
  check (epistemic in ('fato','decisao','hipotese','evidencia','opiniao','inferencia'));

alter table candidates add column confidence text
  check (confidence in ('alta','media','baixa'));

alter table candidates add column scope text not null default 'pessoal';
alter table candidates add column proposed_title text;
alter table candidates add column proposed_body text;

-- A distinção que a DEC-012 preserva ao suspender a trava de aprovação: dá
-- para saber, depois, o que o Gabriel afirmou e o que um modelo inferiu.
alter table candidates add column origem text not null default 'gabriel-afirmou'
  check (origem in ('gabriel-afirmou','ai-inferido'));

-- ── knowledge_index ─────────────────────────────────────────────────────────
-- DERIVADO. Projeção consultável do Markdown que vive no Git. Existe para
-- listar, filtrar e buscar sem clonar o repositório a cada consulta.
create table knowledge_index (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,

  -- Identidade dupla (D-08 do plano da Feel): uuid interno + id legível.
  display_id text not null,

  -- Os dez campos obrigatórios da DEC-002, espelhados do frontmatter.
  type text not null
    check (type in ('decision','reasoning','insight','open-loop','project-state','source')),
  scope text not null default 'pessoal',
  status text not null default 'ativa',
  epistemic text,
  confidence text,
  title text not null,
  created_at_md date,
  updated_at_md date,
  source_ref text,

  -- Onde o canônico mora de verdade. O índice aponta, não guarda.
  repo text not null,
  path text not null,
  commit_sha text,

  -- Só para busca. Reconstruível: é cópia do corpo do Markdown.
  body text,

  origem text not null default 'gabriel-afirmou'
    check (origem in ('gabriel-afirmou','ai-inferido')),

  indexed_at timestamptz not null default now(),

  unique (project_id, repo, path)
);

create index idx_knowledge_project on knowledge_index(project_id);
create index idx_knowledge_type on knowledge_index(project_id, type);
create unique index idx_knowledge_display_id on knowledge_index(project_id, display_id);

-- Busca textual em português — o baseline da DEC-003 (`rg`) não existe na
-- máquina do Gabriel, e o Postgres já tem FTS de graça. Semântico só entra
-- quando o FTS provar o próprio teto.
create index idx_knowledge_fts on knowledge_index
  using gin (to_tsvector('portuguese', coalesce(title,'') || ' ' || coalesce(body,'')));

-- ── display_id sem corrida ──────────────────────────────────────────────────
-- R-04 do plano da Feel: com três pessoas promovendo, `max()+1` é corrida de
-- verdade. Sequência por projeto e por tipo, numa transação.
create table knowledge_counters (
  project_id uuid not null references projects(id) on delete cascade,
  type text not null,
  last_number integer not null default 0,
  primary key (project_id, type)
);

create function private.next_display_id(p_project uuid, p_type text)
returns text language plpgsql security definer set search_path = public as $$
declare
  n integer;
  prefixo text;
begin
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

revoke execute on function private.next_display_id(uuid, text) from public;
grant execute on function private.next_display_id(uuid, text) to authenticated;

-- ── RLS ─────────────────────────────────────────────────────────────────────
-- Mesmo padrão das outras tabelas: quem é membro da organização do projeto vê
-- e escreve; o resto não existe. As funções vivem em `private` porque o
-- PostREST expõe tudo que está em `public` como RPC (aprendizado 2 do handoff).
alter table sources enable row level security;
alter table knowledge_index enable row level security;
alter table knowledge_counters enable row level security;

create policy "membros leem sources" on sources for select to authenticated
  using (private.is_project_member(project_id));
create policy "quem escreve cria sources" on sources for insert to authenticated
  with check (private.can_write_project(project_id));

create policy "membros leem knowledge" on knowledge_index for select to authenticated
  using (private.is_project_member(project_id));
create policy "quem escreve indexa" on knowledge_index for all to authenticated
  using (private.can_write_project(project_id))
  with check (private.can_write_project(project_id));

create policy "membros leem contadores" on knowledge_counters for select to authenticated
  using (private.is_project_member(project_id));
create policy "quem escreve usa contadores" on knowledge_counters for all to authenticated
  using (private.can_write_project(project_id))
  with check (private.can_write_project(project_id));
