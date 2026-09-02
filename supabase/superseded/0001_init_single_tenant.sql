-- 0001_init.sql
-- Cérebro da Feel — migration inicial
--
-- Traduz para SQL executável o modelo especificado em MODELO-DE-DADOS.md,
-- revisado pelos três fundadores. Não inclui as tabelas do "esqueleto
-- reservado" (iniciativas, responsaveis_iniciativa, eventos) — essas ficam
-- para quando a Feel decidir construir gestão de projeto/calendário
-- (MODELO-DE-DADOS.md §2, "não implementar agora").
--
-- Convenções desta migration:
--   - todo id é uuid via gen_random_uuid(), exceto notas_promovidas.id (text,
--     humano-legível, gerado em código na hora da promoção — não no banco);
--   - todo timestamp é timestamptz;
--   - RLS é ligado em toda tabela que carrega dado (princípio 8); as
--     policies aqui são a primeira versão e assumem 3 fundadores com acesso
--     total ao escopo "feel" — ficam mais finas se/quando "cliente:<nome>"
--     virar realidade (pergunta em aberto #6 de MODELO-DE-DADOS.md não trata
--     disso, é uma extensão futura).

create extension if not exists "pgcrypto";
create extension if not exists "vector";

-- ---------------------------------------------------------------------
-- pessoas
-- ---------------------------------------------------------------------

create table pessoas (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid references auth.users(id) not null unique,
  nome text not null,
  email text not null,
  papel text not null default 'fundador',
  criado_em timestamptz not null default now()
);

comment on table pessoas is
  'Uma linha por pessoa com acesso ao sistema. auth_user_id liga ao Supabase '
  'Auth — é o que torna autoria (princípio 2) verificável, não convencionada.';

-- ---------------------------------------------------------------------
-- arquivos_raw
-- ---------------------------------------------------------------------

create table arquivos_raw (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null,
  nome_original text not null,
  mime_type text not null,
  tamanho_bytes bigint not null,
  enviado_por uuid not null references pessoas(id),
  enviado_em timestamptz not null default now()
);

comment on table arquivos_raw is
  'O RAW da tríade RAW → EXTRAÍDO → CONSOLIDADO. Nunca apagado enquanto a '
  'nota que originou existir (princípio 5) — sem cascade de delete por '
  'design; ver política de retenção em aberto (MODELO-DE-DADOS.md §5.6).';

-- ---------------------------------------------------------------------
-- itens_inbox
-- ---------------------------------------------------------------------

create table itens_inbox (
  id uuid primary key default gen_random_uuid(),
  autor_id uuid not null references pessoas(id),
  tipo_origem text not null check (
    tipo_origem in ('colado', 'upload_pdf', 'upload_docx', 'upload_markdown', 'upload_txt')
  ),
  arquivo_raw_id uuid references arquivos_raw(id),
  texto_bruto text,
  titulo_sugerido text,
  status text not null default 'novo' check (
    status in ('novo', 'em_extracao', 'pronto_para_revisao', 'promovido', 'descartado')
  ),
  -- nota_promovida_id referencia notas_promovidas.id, criada abaixo; FK
  -- adicionada depois de notas_promovidas existir (ver bloco de alteração
  -- ao final do arquivo) para evitar referência circular na ordem de criação.
  nota_promovida_id text,
  criado_em timestamptz not null default now(),
  promovido_em timestamptz,
  constraint chk_arquivo_raw_coerente check (
    (tipo_origem = 'colado' and arquivo_raw_id is null)
    or (tipo_origem <> 'colado' and arquivo_raw_id is not null)
  )
);

comment on table itens_inbox is
  'A porta de entrada do sistema. Visível aos três desde a captura, por '
  'desenho (MODELO-DE-DADOS.md §5.5) — não é caixa privada.';

create index idx_itens_inbox_status on itens_inbox(status);
create index idx_itens_inbox_autor on itens_inbox(autor_id);

-- ---------------------------------------------------------------------
-- eixos
-- ---------------------------------------------------------------------

create table eixos (
  id uuid primary key default gen_random_uuid(),
  nome text,
  descricao text,
  cor text,
  ordem integer,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

comment on table eixos is
  'Existe vazia até a sessão de convergência dos três definir os eixos '
  'reais da Feel (Fase 2 de CEREBRO-DA-FEEL.md §7). A tabela existe agora '
  'só para notas_promovidas.eixo_id ter algo para apontar desde o dia um.';

-- ---------------------------------------------------------------------
-- notas_promovidas
-- ---------------------------------------------------------------------

create table notas_promovidas (
  id text primary key,
  tipo text not null check (
    tipo in ('decision', 'reasoning', 'insight', 'open-loop', 'source', 'project-state')
  ),
  titulo text not null,
  eixo_id uuid references eixos(id),
  escopo text not null check (escopo = 'pessoal' or escopo = 'feel' or escopo like 'cliente:%'),
  status text not null default 'ativa' check (
    status in ('ativa', 'superseded', 'resolvida', 'dormente')
  ),
  epistemico text check (
    epistemico in ('fato', 'evidencia', 'decisao', 'hipotese', 'inferencia', 'opiniao')
  ),
  confianca text check (confianca in ('baixa', 'media', 'alta')),
  autor_id uuid not null references pessoas(id),
  item_inbox_origem_id uuid references itens_inbox(id),
  caminho_arquivo text not null,
  commit_sha text not null,
  vetor vector(1536),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

comment on table notas_promovidas is
  'Espelho no Postgres de cada nota que existe em Markdown no Git. Id '
  'humano-legível (DEC-001, RT-001, INS-001, OL-001), gerado em código na '
  'promoção — não é uuid, de propósito (MODELO-DE-DADOS.md §2). Coluna '
  '"vetor" reservada para pgvector; sem índice ivfflat/hnsw até haver '
  'volume que justifique (hoje: dezenas de itens).';

create index idx_notas_promovidas_eixo on notas_promovidas(eixo_id);
create index idx_notas_promovidas_status on notas_promovidas(status);
create index idx_notas_promovidas_escopo on notas_promovidas(escopo);

-- fecha a referência de itens_inbox → notas_promovidas, adiada até aqui
alter table itens_inbox
  add constraint fk_itens_inbox_nota_promovida
  foreign key (nota_promovida_id) references notas_promovidas(id);

-- ---------------------------------------------------------------------
-- relacoes
-- ---------------------------------------------------------------------

create table relacoes (
  id uuid primary key default gen_random_uuid(),
  origem_id text not null references notas_promovidas(id),
  destino_id text not null references notas_promovidas(id),
  tipo text not null check (
    tipo in ('supports', 'contradicts', 'derived_from', 'depends_on', 'supersedes', 'related')
  ),
  proposta_por uuid references pessoas(id),
  confirmada boolean not null default false,
  confirmada_por uuid references pessoas(id),
  criado_em timestamptz not null default now(),
  constraint chk_relacao_nao_reflexiva check (origem_id <> destino_id),
  constraint chk_confirmacao_coerente check (
    (confirmada = false) or (confirmada = true and confirmada_por is not null)
  )
);

comment on table relacoes is
  'proposta_por nulo = proposta automática do curador (princípio 6). '
  'confirmada só vira true por ação humana explícita — nunca setada pelo '
  'próprio processo que propôs a relação.';

create index idx_relacoes_origem on relacoes(origem_id);
create index idx_relacoes_destino on relacoes(destino_id);
create index idx_relacoes_nao_confirmadas on relacoes(confirmada) where confirmada = false;

-- ---------------------------------------------------------------------
-- gatilho: atualizado_em automático em notas_promovidas
-- ---------------------------------------------------------------------

create function set_atualizado_em()
returns trigger as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_notas_promovidas_atualizado_em
  before update on notas_promovidas
  for each row
  execute function set_atualizado_em();

-- ---------------------------------------------------------------------
-- RLS (princípio 8 — escopo imposto pelo banco, não por convenção)
-- ---------------------------------------------------------------------
--
-- Primeira versão: os três fundadores autenticados têm acesso total a
-- escopo = 'feel' e 'pessoal' (o "pessoal" aqui é o de cada um deles dentro
-- do contexto Feel, não o vault pessoal do Gabriel — são sistemas
-- diferentes). Não há hoje nenhum registro 'cliente:<nome>' nem regra para
-- ele — quando existir, esta policy precisa ser revisada antes do primeiro
-- registro desse escopo ser criado, não depois.

alter table pessoas enable row level security;
alter table arquivos_raw enable row level security;
alter table itens_inbox enable row level security;
alter table eixos enable row level security;
alter table notas_promovidas enable row level security;
alter table relacoes enable row level security;

create policy "fundadores leem pessoas"
  on pessoas for select
  to authenticated
  using (true);

create policy "fundadores leem e escrevem arquivos_raw"
  on arquivos_raw for all
  to authenticated
  using (true)
  with check (true);

create policy "fundadores leem e escrevem itens_inbox"
  on itens_inbox for all
  to authenticated
  using (true)
  with check (true);

create policy "fundadores leem e escrevem eixos"
  on eixos for all
  to authenticated
  using (true)
  with check (true);

create policy "fundadores leem e escrevem notas_promovidas do escopo feel ou pessoal"
  on notas_promovidas for all
  to authenticated
  using (escopo in ('feel', 'pessoal'))
  with check (escopo in ('feel', 'pessoal'));

create policy "fundadores leem e escrevem relacoes"
  on relacoes for all
  to authenticated
  using (true)
  with check (true);

-- Nenhuma policy para o role anon: sem login, sem acesso a nenhuma tabela.
