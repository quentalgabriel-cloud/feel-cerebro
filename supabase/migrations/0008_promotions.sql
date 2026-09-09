-- 0008_promotions.sql — promoção de candidate para conhecimento canônico
--
-- O RISCO QUE ESTA TABELA EXISTE PARA ELIMINAR é a promoção parcial: commit
-- feito no Git e linha não gravada, ou linha gravada e commit que nunca
-- aconteceu. O plano mestre lista isso como risco alto da Fase 03, e a
-- mitigação exigida é falha segura — Git indisponível ⇒ candidate **não**
-- promovido.
--
-- A solução aqui é separar INTENÇÃO de EFEITO. O app web registra a intenção
-- (esta tabela, status `pendente`) com o Markdown já renderizado e o
-- display_id já reservado. Um worker, rodando onde as credenciais de Git
-- legitimamente vivem, aplica: escreve o arquivo, commita, empurra, e só
-- então marca `aplicada` e o candidate como promovido.
--
-- Consequência boa e deliberada: **nenhum token do GitHub precisa existir na
-- Vercel.** O app nunca escreve no Git; ele pede. Se o worker nunca rodar, o
-- pior estado possível é uma fila parada — nunca um acervo mentindo sobre o
-- que foi promovido.

create table promotions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  candidate_id uuid not null references candidates(id) on delete cascade,

  -- Reservado no momento do pedido, pela sequência transacional. Se o worker
  -- demorar, o id continua sendo aquele — dois pedidos nunca disputam o
  -- mesmo número, que é o risco R-04 do plano.
  display_id text not null,

  repo text not null,
  path text not null,

  -- O arquivo inteiro, exatamente como vai para o disco. Guardar o texto
  -- renderizado, e não os campos soltos, significa que o que foi revisado é
  -- literalmente o que será commitado.
  markdown text not null,

  status text not null default 'pendente'
    check (status in ('pendente', 'aplicada', 'falhou')),
  erro text,
  commit_sha text,

  requested_by uuid references profiles(id),
  requested_at timestamptz not null default now(),
  applied_at timestamptz,

  -- Um candidate não pode ter dois pedidos vivos ao mesmo tempo.
  unique (candidate_id)
);

create index idx_promotions_pendentes on promotions(status, requested_at)
  where status = 'pendente';

alter table promotions enable row level security;

create policy "membros leem promocoes" on promotions for select to authenticated
  using (private.is_project_member(project_id));

create policy "quem escreve promove" on promotions for all to authenticated
  using (private.can_write_project(project_id))
  with check (private.can_write_project(project_id));
