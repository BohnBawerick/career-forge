# CLAUDE.md

## What this is

An open-source job application platform, being designed before it is built. Read `README.md`
first, then `CONTEXT.md` for the vocabulary and `docs/adr/` for what is already settled.
`docs/OPEN_QUESTIONS.md` is the original list and is now mostly answered by the ADRs.

No code exists yet. Work happens one decision at a time through the map issue on the tracker. Do
not start building outside a ticket that says to.

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
