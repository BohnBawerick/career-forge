# CLAUDE.md

## What this is

Idea sketch for an open-source job application platform. Read `README.md` first, then
`docs/OPEN_QUESTIONS.md`.

Nothing is built. Nothing is decided. Do not start writing code until the open questions have
answers and a spec exists.

## Source material

| Where | What to take from it |
|---|---|
| `../Get_a_real_job/` | The working private prototype. Skills inventory, portfolio format, job intake pipeline, application SOP, tracker. Read its `CLAUDE.md`. |
| `github.com/BohnBawerick/mrb-platform` | How to build and ship it. Stack, docker packaging, public demo, seeded fake data, README that explains the problem first. |

## Hard rules for this project

- Never copy real personal data from `../Get_a_real_job/` into this repo. Seed with fabricated data.
- Every generated resume line must trace back to a stored evidence record. No invented skills.

## Agent skills

### Issue tracker

GitHub Issues via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

The five default labels, unchanged. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `CONTEXT.md` + `docs/adr/` at the root. See `docs/agents/domain.md`.
