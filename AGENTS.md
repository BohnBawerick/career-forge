# AGENTS.md

## What this is

An open-source job application platform. Read `README.md` first, then `CONTEXT.md` for the
vocabulary and `docs/adr/` for what is already settled. `docs/OPEN_QUESTIONS.md` is the original
list and is now mostly answered by the ADRs.

The repo holds a skeleton and no features: a development environment, an empty app that can sign
an Account up, a queue and a worker. `README.md` has the commands. Work happens one decision at a
time through the map issue on the tracker. Do not start building outside a ticket that says to.

## Working in this repo

- `pnpm lint` enforces that `core/` imports neither `server/` nor `worker/` (ADR 0004). It is a
  rule in `eslint.config.mjs`, not a convention, so a violation fails CI.
- `docker/postgres/init/` creates the roles GoTrue's own migrations expect, including one named
  `postgres` whatever the database owner is called. Docker runs it only when the volume is
  created, so a change there needs `docker compose -f docker-compose.dev.yml down -v`.
- Every command is in the table in `README.md`. Do not add a script without adding a row.

## Hard rules for this project

- This repo is public. Never write anything into it that points at private repos, private paths on
  the author's machine, or real personal data. Seed with fabricated data only.
- Every generated resume line must trace back to a stored Evidence record. No invented skills.

## Local notes

If `LOCAL.md` exists at the repo root, read it. It is gitignored and holds pointers that must not
be published.

## Agent skills

### Issue tracker

GitHub Issues via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

The five default labels, unchanged. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `CONTEXT.md` + `docs/adr/` at the root. See `docs/agents/domain.md`.

## Maintaining this file

Keep this file for knowledge useful to almost every future agent session in this project.
Do not repeat what the codebase already shows; point to the authoritative file or command instead.
Prefer rewriting or pruning existing entries over appending new ones.
When updating this file, preserve this bar for all agents and keep entries concise.
