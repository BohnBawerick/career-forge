# career-forge

Working name. Rename it when the idea is firm.

Status: idea sketch only. No code, no decisions locked. This file exists so the idea stops living
in my head.

## The one-line version

Take the private job-hunting system in `PROJECTS/Get_a_real_job/` and turn it into an open-source
app that anyone can run, with their own AI key, to build a portfolio, keep a skills inventory, and
generate a resume and cover letter tailored to each job they apply for.

## Where it comes from

Two existing projects feed this.

**`PROJECTS/Get_a_real_job/`** is the working prototype. It already does, by hand and by Claude
Code skill:

- a master skills inventory (`SKILLS_INVENTORY.md`) that everything else is matched against
- 14 portfolio write-ups, one file per project, written for interview prep and cover letter reuse
- a job intake pipeline: `inbox/` raw ads to `pending/` clean files with frontmatter to `archive/`
- a scraper for job boards
- a documented SOP that turns a job ad into a skills-match analysis, a tailored resume and a cover
  letter
- an application tracker and a follow-up status flow
- a portfolio website folder

The insight worth keeping: **the skills inventory is the single source of truth.** Resume, cover
letter and match score are all derived from it, never invented. That is the part most resume tools
get wrong.

**`github.com/BohnBawerick/mrb-platform`** is the reference for how to build and ship it. It is a
real deployed app (.NET 10, Nuxt 4, self-hosted Supabase, Docker, CI, live demo, seeded fake data).
What to borrow from it:

- the shape: worker pipeline for document generation, database with an audit trail, one-click
  compile of a final document
- the packaging: docker compose, run-it-locally instructions, a read-only public demo
- the discipline: the README explains the problem before the features

## What the app does

Rough golden path:

1. **Sign up and import yourself.** Upload an existing resume or LinkedIn export. The app parses it
   into a structured profile.
2. **Build the skills inventory.** Structured records: skill, level, evidence, where it was used,
   certifications, standards. Editable by hand, extendable by AI suggestion.
3. **Build the portfolio.** One entry per project or job achievement, with a guided interview that
   pulls the detail out of the user instead of asking them to write from a blank page.
4. **Add a job.** Paste a URL or the ad text. The app extracts requirements.
5. **Match.** Score the job against the inventory. Show real gaps honestly. No invented skills.
6. **Generate.** Tailored resume and cover letter for that specific job, built only from documented
   evidence, in the user's own template.
7. **Track.** Status flow, follow-up dates, notes, outcomes.
8. **Publish.** Optional public portfolio site generated from the same data.

## The bring-your-own-AI idea

Users plug in their own model key (Anthropic, OpenAI, local Ollama, whatever) and let it run. That
keeps hosting cost near zero and keeps user data on their side. Needs a provider abstraction layer
from day one rather than bolted on later.

## Why it might be worth doing

- Existing resume builders are templates plus a paywall. None of them hold a real evidence base.
- The honest-gap-reporting angle is a genuine difference. Lying on a resume is the default failure
  mode of AI resume tools.
- It doubles as a portfolio piece in its own right, same as mrb-platform.

## What is deliberately not decided yet

See `docs/OPEN_QUESTIONS.md`. Do not start building until those are answered.

## Next session

Open this folder in Claude Code and work through `docs/OPEN_QUESTIONS.md` first, then write a real
spec. Consider a brainstorming pass before the spec.
