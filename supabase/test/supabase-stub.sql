-- A Supabase-ből annyit utánzunk, amennyi a séma futtatásához kell.
create role anon nologin;
create role authenticated nologin;
create role service_role nologin;

create schema if not exists auth;
create schema if not exists storage;
create schema if not exists realtime;

create table auth.users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  raw_user_meta_data jsonb default '{}'::jsonb
);

create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claims', true)::json ->> 'sub', '')::uuid
$$;

create or replace function auth.jwt() returns jsonb language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb, '{}'::jsonb)
$$;

create table storage.buckets (id text primary key, name text, public boolean default false);
create table storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text, name text, owner uuid
);
alter table storage.objects enable row level security;
create or replace function storage.foldername(p text) returns text[] language sql immutable as $$
  select string_to_array(p, '/')
$$;

create table realtime.messages (id bigserial primary key, topic text, payload jsonb);
alter table realtime.messages enable row level security;
create or replace function realtime.topic() returns text language sql stable as $$
  select current_setting('realtime.topic', true)
$$;

-- A valódi Supabase ezeket a jogokat adja alapból:
grant usage on schema auth to anon, authenticated, service_role;
grant usage on schema storage to anon, authenticated, service_role;
grant usage on schema realtime to anon, authenticated, service_role;

create publication supabase_realtime;
