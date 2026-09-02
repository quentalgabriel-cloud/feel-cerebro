-- 0004_private_schema.sql — move os helpers de autorização para fora da API
--
-- Histórico honesto desta correção, porque o caminho errado foi tentado duas
-- vezes e as duas foram pegas por teste, não por intuição:
--
--   0003  revogou EXECUTE de `anon`/`authenticated` nominalmente.
--         → advisor continuou acusando. Inspecionando `pg_proc.proacl`:
--           `=X/postgres` — o grant estava em PUBLIC, herdado por ambos.
--
--   tentativa: revogar de PUBLIC também.
--         → `ERROR: permission denied for function is_org_member` no teste
--           local. Ou seja: uma policy de RLS **exige** EXECUTE do role que
--           consulta sobre as funções que ela chama. A conclusão que eu tinha
--           escrito na 0003 ("não quebra") estava errada; ela só parecia
--           verdadeira porque o PUBLIC ainda concedia por baixo.
--
-- Sobra a terceira remediação sugerida pelo próprio linter: *move it out of
-- your exposed API schema*. O PostgREST só expõe os schemas configurados
-- (`public`, `graphql_public`). Uma função em `private` continua chamável
-- pelas policies, com EXECUTE concedido a `authenticated`, mas não existe
-- como endpoint `/rest/v1/rpc/...`.
--
-- Nada de `anon` aqui: sem login não há policy que se aplique, então o role
-- anônimo não precisa de acesso nenhum a estas funções.

create schema if not exists private;

grant usage on schema private to authenticated;

-- ---------------------------------------------------------------------
-- Helpers, agora fora da superfície da API
-- ---------------------------------------------------------------------

create function private.current_profile_id()
returns uuid language sql stable security definer set search_path = public as $$
  select id from profiles where auth_user_id = auth.uid();
$$;

create function private.is_org_member(org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from organization_members m
    where m.organization_id = org
      and m.profile_id = private.current_profile_id()
  );
$$;

create function private.is_project_member(proj uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from projects p
    join organization_members m on m.organization_id = p.organization_id
    where p.id = proj and m.profile_id = private.current_profile_id()
  );
$$;

create function private.can_write_project(proj uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from projects p
    join organization_members m on m.organization_id = p.organization_id
    where p.id = proj
      and m.profile_id = private.current_profile_id()
      and m.role in ('owner', 'builder')
  );
$$;

revoke execute on all functions in schema private from public;
grant execute on all functions in schema private to authenticated;

-- ---------------------------------------------------------------------
-- Policies reapontadas para `private`
-- ---------------------------------------------------------------------

drop policy "read profiles of shared orgs" on profiles;
create policy "read profiles of shared orgs" on profiles for select to authenticated
  using (exists (
    select 1
    from organization_members mine
    join organization_members theirs on theirs.organization_id = mine.organization_id
    where mine.profile_id = private.current_profile_id()
      and theirs.profile_id = profiles.id
  ));

drop policy "read own orgs" on organizations;
create policy "read own orgs" on organizations for select to authenticated
  using (private.is_org_member(id));

drop policy "read own memberships" on organization_members;
create policy "read own memberships" on organization_members for select to authenticated
  using (private.is_org_member(organization_id));

drop policy "read projects of my orgs" on projects;
create policy "read projects of my orgs" on projects for select to authenticated
  using (private.is_org_member(organization_id));

drop policy "write projects of my orgs" on projects;
create policy "write projects of my orgs" on projects for all to authenticated
  using (private.is_org_member(organization_id))
  with check (private.is_org_member(organization_id));

drop policy "read project state" on project_state;
create policy "read project state" on project_state for select to authenticated
  using (private.is_project_member(project_id));

drop policy "write project state" on project_state;
create policy "write project state" on project_state for all to authenticated
  using (private.can_write_project(project_id))
  with check (private.can_write_project(project_id));

drop policy "read state items" on state_items;
create policy "read state items" on state_items for select to authenticated
  using (private.is_project_member(project_id));

drop policy "write state items" on state_items;
create policy "write state items" on state_items for all to authenticated
  using (private.can_write_project(project_id))
  with check (private.can_write_project(project_id));

drop policy "read events" on events;
create policy "read events" on events for select to authenticated
  using (private.is_project_member(project_id));

drop policy "append events" on events;
create policy "append events" on events for insert to authenticated
  with check (private.can_write_project(project_id));

drop policy "read raw files" on raw_files;
create policy "read raw files" on raw_files for select to authenticated
  using (private.is_project_member(project_id));

drop policy "upload raw files" on raw_files;
create policy "upload raw files" on raw_files for insert to authenticated
  with check (private.can_write_project(project_id));

drop policy "read candidates" on candidates;
create policy "read candidates" on candidates for select to authenticated
  using (private.is_project_member(project_id));

drop policy "write candidates" on candidates;
create policy "write candidates" on candidates for all to authenticated
  using (private.can_write_project(project_id))
  with check (private.can_write_project(project_id));

drop policy "read axes" on axes;
create policy "read axes" on axes for select to authenticated
  using (private.is_project_member(project_id));

drop policy "write axes" on axes;
create policy "write axes" on axes for all to authenticated
  using (private.can_write_project(project_id))
  with check (private.can_write_project(project_id));

-- ---------------------------------------------------------------------
-- Remove as versões expostas
-- ---------------------------------------------------------------------

drop function public.current_profile_id();
drop function public.is_org_member(uuid);
drop function public.is_project_member(uuid);
drop function public.can_write_project(uuid);

-- `touch_updated_at` fica em `public`: é função de TRIGGER, e trigger não
-- exige EXECUTE do role que dispara a operação — o teste local confirma
-- (o `rls_test.sql` faz UPDATE em state_items). Sem grant a ninguém, então
-- não é chamável por RPC.
revoke execute on function public.touch_updated_at() from public, anon, authenticated;
