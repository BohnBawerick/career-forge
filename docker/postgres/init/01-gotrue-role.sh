#!/bin/bash
# Runs once, the first time the postgres volume is created.
#
# GoTrue creates and owns an `auth` schema inside a database career-forge owns (ADR 0005), so the
# role and the schema have to exist before it starts. The Supabase images do this in their own
# entrypoint; on a plain postgres image it is ours to do.
set -euo pipefail

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<SQL
create extension if not exists pgcrypto;
create extension if not exists "uuid-ossp";

do \$\$
begin
  -- The role GoTrue owns its schema as.
  if not exists (select 1 from pg_roles where rolname = '${GOTRUE_DB_USER}') then
    create role ${GOTRUE_DB_USER} noinherit createrole login noreplication
      password '${GOTRUE_DB_PASSWORD}';
  end if;

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
\$\$;

create schema if not exists auth authorization ${GOTRUE_DB_USER};
grant all privileges on schema auth to ${GOTRUE_DB_USER};
grant usage on schema auth to "$POSTGRES_USER";
grant ${GOTRUE_DB_USER} to "$POSTGRES_USER";
alter role ${GOTRUE_DB_USER} set search_path = auth;
SQL
