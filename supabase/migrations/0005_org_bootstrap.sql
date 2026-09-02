-- 0005_org_bootstrap.sql — permitir criar organização e entrar nela
--
-- A 0001 deu policies de leitura para `organizations` e
-- `organization_members`, mas nenhuma de escrita. Consequência: ninguém
-- consegue criar uma organização, logo ninguém cria projeto, logo o app
-- nasce inutilizável no primeiro login. Faltou.
--
-- A alternativa seria fazer o bootstrap pelo lado servidor com a service
-- role key. Rejeitada: coloca uma credencial que ignora RLS no caminho do
-- fluxo mais comum do sistema (primeiro acesso), para resolver algo que o
-- próprio banco pode autorizar com precisão.
--
-- O ponto delicado é o INSERT em `organization_members`: liberar "posso me
-- inserir" sozinho deixaria qualquer pessoa autenticada entrar em qualquer
-- organização só sabendo o uuid dela. As duas situações legítimas são
-- distintas e estão separadas abaixo.

create function private.is_org_owner(org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from organization_members m
    where m.organization_id = org
      and m.profile_id = private.current_profile_id()
      and m.role = 'owner'
  );
$$;

revoke execute on function private.is_org_owner(uuid) from public;
grant execute on function private.is_org_owner(uuid) to authenticated;

-- Qualquer pessoa autenticada pode criar uma organização própria.
create policy "create organizations" on organizations for insert to authenticated
  with check (true);

-- Só owner altera a organização.
create policy "owners update organizations" on organizations for update to authenticated
  using (private.is_org_owner(id))
  with check (private.is_org_owner(id));

-- A pergunta "esta organização já tem membros?" PRECISA ser respondida fora
-- do RLS, e essa é a parte não óbvia.
--
-- A primeira versão desta migration fazia o `not exists (select 1 from
-- organization_members ...)` direto dentro da policy. O teste
-- `rls_test.sql` reprovou: subconsulta dentro de policy também é filtrada
-- por RLS, então Bruno — que não enxerga os membros da Acme — via a
-- organização como **vazia** e caía no ramo de bootstrap. Resultado: qualquer
-- pessoa autenticada entrava em qualquer organização sabendo só o uuid.
--
-- Uma policy pode parecer correta e vazar exatamente por isso. Aqui a
-- checagem é SECURITY DEFINER, então enxerga todas as linhas.
create function private.org_has_members(org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from organization_members m where m.organization_id = org
  );
$$;

revoke execute on function private.org_has_members(uuid) from public;
grant execute on function private.org_has_members(uuid) to authenticated;

create policy "join or invite" on organization_members for insert to authenticated
  with check (
    -- (a) bootstrap: entrar como primeiro membro de uma organização que
    --     ainda não tem ninguém, e apenas a si mesmo.
    (
      profile_id = private.current_profile_id()
      and not private.org_has_members(organization_id)
    )
    -- (b) convite: quem já é owner adiciona quem quiser.
    or private.is_org_owner(organization_id)
  );

create policy "owners manage members" on organization_members for delete to authenticated
  using (private.is_org_owner(organization_id));
