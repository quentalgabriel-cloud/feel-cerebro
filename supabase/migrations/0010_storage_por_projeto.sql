-- 0010_storage_por_projeto.sql — o bucket passa a respeitar tenancy
--
-- A 0002 liberou o bucket `raw-files` para qualquer pessoa autenticada, ler e
-- escrever, sem olhar projeto. Na época não havia upload nenhum, então nada
-- vazava — mas a policy estava errada desde o primeiro dia, e o teste de RLS
-- não pegava porque `storage.objects` ficou de fora da suíte.
--
-- Com o upload entrando agora, isso vira vazamento de verdade: o caminho é
-- `<project_id>/<profile_id>/<arquivo>`, então bastava saber um uuid de
-- projeto para baixar o PDF de estratégia de outra organização. O uuid não é
-- segredo — ele aparece em URL, em log, em payload de evento.
--
-- A correção usa o primeiro segmento do caminho como project_id e pergunta ao
-- mesmo `private.is_project_member` que protege todo o resto. Uma única
-- autoridade decidindo acesso, em vez de duas regras que divergem.

drop policy if exists "members upload raw files" on storage.objects;
drop policy if exists "members read raw files" on storage.objects;

-- Caminho malformado precisa ser NEGADO, não explodir: um cast de texto para
-- uuid que falha levanta exceção, e exceção em policy é erro 500 em vez de
-- "não pode". A checagem de formato vem antes do cast, de propósito.
create function private.projeto_do_caminho(nome text)
returns uuid language sql immutable as $$
  select case
    when (storage.foldername(nome))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then ((storage.foldername(nome))[1])::uuid
    else null
  end;
$$;

revoke execute on function private.projeto_do_caminho(text) from public;
grant execute on function private.projeto_do_caminho(text) to authenticated;

create policy "envia para o proprio projeto"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'raw-files'
    and private.projeto_do_caminho(name) is not null
    and private.can_write_project(private.projeto_do_caminho(name))
  );

create policy "le do proprio projeto"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'raw-files'
    and private.projeto_do_caminho(name) is not null
    and private.is_project_member(private.projeto_do_caminho(name))
  );

-- Continua sem update nem delete: nenhum fluxo altera ou remove arquivo já
-- enviado. "A fonte bruta nunca é descartada" (INS-005 do vault) é regra de
-- produto, e o banco a impõe pela ausência da policy.
