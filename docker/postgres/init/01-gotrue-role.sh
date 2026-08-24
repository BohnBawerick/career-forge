#!/bin/bash
# Runs once, the first time the postgres volume is created.
#
# GoTrue creates and owns an `auth` schema inside a database career-forge owns (ADR 0005), so the
# role and the schema have to exist before it starts. The Supabase images do this in their own
# entrypoint; on a plain postgres image it is ours to do.
#
# The heredoc below is quoted, so bash puts nothing into the SQL text. Every value arrives as a
# psql variable and psql does the quoting, which is what keeps a password containing a quote from
# ending the string literal it sits in.
set -euo pipefail

psql -v ON_ERROR_STOP=1 \
  -v db_user="$POSTGRES_USER" \
  -v gotrue_user="$GOTRUE_DB_USER" \
  -v gotrue_password="$GOTRUE_DB_PASSWORD" \
  --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<'SQL'
create extension if not exists pgcrypto;
create extension if not exists "uuid-ossp";

-- The role GoTrue owns its schema as. `create role` takes no `if not exists`, so the guard is the
-- where clause: it returns no row when the role is already there, and \gexec then runs nothing.
-- format() writes the name as an identifier and the password as a literal, quoting both.
select format(
  'create role %I noinherit createrole login noreplication password %L',
  :'gotrue_user',
  :'gotrue_password'
)
where not exists (select 1 from pg_roles where rolname = :'gotrue_user')
\gexec

do $$
begin
  -- The three roles GoTrue names in the tokens it issues. They never log in; they exist so that
  -- the grants inside GoTrue's own migrations resolve.
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin noinherit bypassrls;
  end if;

  -- GoTrue's migrations grant select on the auth tables to a role named `postgres`, whatever the
  -- database's own owner is called. On a Supabase image that role always exists. Here it may not,
  -- so it is created with no login and left empty-handed apart from those grants.
  if not exists (select 1 from pg_roles where rolname = 'postgres') then
    create role postgres nologin noinherit;
  end if;
end
$$;

create schema if not exists auth authorization :"gotrue_user";
grant all privileges on schema auth to :"gotrue_user";
grant usage on schema auth to :"db_user";
grant :"gotrue_user" to :"db_user";
alter role :"gotrue_user" set search_path = auth;
SQL
