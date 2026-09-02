-- 0002_storage.sql — bucket de arquivos brutos + policies
--
-- O fluxo de upload sobe o arquivo direto do navegador para o Storage via
-- signed URL, sem passar pela Function (evita o timeout e o limite de payload
-- de uma Function com um PDF grande). Isso exige o bucket e a permissão de
-- gerar a URL assinada — nada disso é criado pelo SQL das tabelas.
--
-- Bucket renomeado de 'arquivos-raw' para 'raw-files' por D-16 (identificadores
-- em inglês). O código do app é atualizado junto, na Fase 01.

insert into storage.buckets (id, name, public)
values ('raw-files', 'raw-files', false)
on conflict (id) do nothing;

-- Envio: qualquer membro autenticado. O signed upload URL já restringe a
-- operação a um único path por chamada, gerado server-side no formato
-- "<project_id>/<profile_id>/<timestamp>-<nome>".
create policy "members upload raw files"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'raw-files');

-- Leitura: é o que sustenta "a fonte bruta nunca é descartada" na prática —
-- sem isso, o `raw_files.storage_path` apontaria para algo inalcançável.
create policy "members read raw files"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'raw-files');

-- Sem policy de update ou delete: nenhum fluxo da Fase 01 altera ou remove um
-- arquivo já enviado. Se uma política de retenção for decidida um dia, a
-- policy de delete entra nessa hora — não antes.
