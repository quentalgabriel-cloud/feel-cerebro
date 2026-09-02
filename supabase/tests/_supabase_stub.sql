-- _supabase_stub.sql — reproduz localmente o mínimo do ambiente Supabase
--
-- NÃO é migration e NUNCA roda em produção. Existe só para que
-- `0001_foundation.sql`, `0002_storage.sql` e `rls_test.sql` possam ser
-- verificados num Postgres local antes de tocarem o banco real — Kernel §13
-- e §16 (toda mudança estrutural testada; RLS testada em allow e deny).
--
-- Reproduz: os três roles do Supabase, o schema `auth` com `users` e `uid()`,
-- e o schema `storage` com `buckets`/`objects`. Nada além disso.

-- Roles são do cluster, não do banco: reexecutar o stub num banco novo
-- encontraria os roles já criados. Idempotente de propósito.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin noinherit bypassrls;
  end if;
end $$;

grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on functions to anon, authenticated, service_role;

create schema if not exists auth;
grant usage on schema auth to anon, authenticated, service_role;

create table auth.users (
  id uuid primary key,
  instance_id uuid,
  aud text,
  role text,
  email text,
  encrypted_password text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Mesma semântica da função real: lê o `sub` das claims do JWT injetadas na
-- sessão. Em produção o Supabase injeta via GUC `request.jwt.claims`.
create function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(
    current_setting('request.jwt.claims', true)::jsonb ->> 'sub',
    ''
  )::uuid;
$$;

grant execute on function auth.uid() to anon, authenticated, service_role;

create schema if not exists storage;
grant usage on schema storage to anon, authenticated, service_role;

create table storage.buckets (
  id text primary key,
  name text not null,
  public boolean not null default false,
  created_at timestamptz default now()
);

create table storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets(id),
  name text,
  owner uuid,
  created_at timestamptz default now()
);

alter table storage.objects enable row level security;
grant all on storage.buckets, storage.objects to anon, authenticated, service_role;
