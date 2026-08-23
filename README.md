# career-forge

Working name. Rename it when the idea is firm.

Status: no code yet. The design is being worked out one decision at a time on the
[issue tracker](https://github.com/BohnBawerick/career-forge/issues), and every decision that
survives is written down in [`docs/adr/`](docs/adr/). The words the project uses are fixed in
[`CONTEXT.md`](CONTEXT.md).

## The problem

Every resume tool on the market is a template and a paywall. Point one at a job ad and it will
happily write that you led a team of twelve, because nothing in it knows whether you did. Lying is
the default failure mode.

The fix is boring and it is the whole product: keep an evidence base, and refuse to write a line
that does not come out of it.

## What it does

A person feeds the app old resumes, portfolio exports and past applications. Nothing happens. The
app sits on them.

Naming a job starts the work. A cheap first pass warns the person if the job is a long stretch,
then lets them decide. If they carry on, the app interviews them, digging into the projects it
already knows about to find evidence that answers what the job actually asked for. Their answers
are kept in their own words and never overwritten.

Out come a tailored resume and a cover letter, where every line about ability cites a stored
evidence record. Gaps are named honestly rather than papered over, because the alternative is
getting caught in the interview. The application is frozen and kept, so months later the person can
read back exactly what they sent. If they get called in, a third document is generated on demand.

## How it is meant to run

One command. `docker compose up`, on a laptop or a small server, no account with anybody.

Bring your own AI key: Anthropic, OpenAI or Google Gemini, with Ollama supported as best effort.
Roughly two cents to thirty-four cents per application, paid to the model provider, not to me.

Accounts exist from day one. The same code runs one person on a laptop and a family on a server,
and each Account's data is walled off from every other by the database itself.

The code is free and open. If a hosted version ever exists, that is what gets paid for.

## Where the design is up to

The stack, the domain model, the AI provider layer, job ad intake and the account lifecycle are all
settled and written up as ADRs. Everything still open is a ticket on the tracker, hanging off the
map issue.

Two rules that will not move:

- Every generated line about ability traces back to a stored evidence record, checked on the server
  after the model has spoken. An unbacked line is rejected and turned into an interview question.
- The repo is public and seeded with fabricated data only. No real personal data ever lands here.
