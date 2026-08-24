# career-forge

Working name. Rename it when the idea is firm.

Status: a skeleton and nothing else. There is a development environment, an empty app that can
sign an Account up and log it back in, a queue and a worker, and no feature of any kind. See
[getting started](#getting-started) to run it. The design is being worked out one decision at a
time on the [issue tracker](https://github.com/BohnBawerick/career-forge/issues), and every
decision that survives is written down in [`docs/adr/`](docs/adr/). The words the project uses
are fixed in [`CONTEXT.md`](CONTEXT.md).

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

## Getting started

You need Docker, Node 22 or later, and pnpm. `corepack enable` gets you the right pnpm.

```
git clone https://github.com/BohnBawerick/career-forge.git
cd career-forge
cp .env.example .env
```

Open `.env` and replace the four placeholder values: `POSTGRES_PASSWORD`, `GOTRUE_DB_PASSWORD`,
`GOTRUE_JWT_SECRET` and `DATABASE_URL`. `DATABASE_URL` writes the Postgres password out a second
time, so put the same password in both or the migrations cannot connect.

Both passwords end up inside a connection URL, so keep them to letters, digits, `-` and `_`, or
percent-encode them. A character such as `@`, `/`, `#` or `?` splits the URL somewhere else and
GoTrue or the migrations then fail without naming the password. Generate each one with:

```
openssl rand -hex 24
```

The JWT secret does not go into a URL. It has to be at least 32 characters, and one secret is
shared between career-forge and GoTrue, so generate it once:

```
openssl rand -base64 48
```

Then start the two containers the development environment is made of, install, and migrate:

```
docker compose -f docker-compose.dev.yml up -d
pnpm install
pnpm db:migrate
pnpm dev
```

Open http://localhost:3000. Nobody has claimed the install yet, so the first address and password
you enter become the Owner, and sign-up then closes. The address is a login name: nothing is ever
sent to it. `pnpm seed` claims an unclaimed install from the command line instead, with a
fabricated Account, and refuses once someone has claimed it.

The queue consumer is its own command. In one shell:

```
pnpm worker
```

and in another:

```
pnpm queue:ping "anything you like"
```

If port 5432 or 3000 is already taken on your machine, set `POSTGRES_PORT` in `.env` and pass
`--port` to `pnpm dev`. `DATABASE_URL` carries the Postgres port too, so change it there as well.

Your data lives in two places: the Postgres volume and the storage folder named by
`STORAGE_FILESYSTEM_ROOT`. A backup is a database dump and a copy of that folder.

### The commands

| Command | What it does |
| --- | --- |
| `pnpm dev` | The app, on port 3000 |
| `pnpm worker` | The pg-boss consumer |
| `pnpm queue:ping` | Puts one test job on the queue |
| `pnpm db:generate` | Writes a migration from the schema |
| `pnpm db:migrate` | Applies migrations |
| `pnpm db:check-auth` | Proves career-forge can read the schema GoTrue owns |
| `pnpm seed` | Creates a fabricated Owner |
| `pnpm lint` | ESLint, including the rule below |
| `pnpm typecheck` | vue-tsc over every directory |
| `pnpm test` | Vitest |
| `pnpm test:e2e` | Playwright, starting its own dev server |
| `pnpm build` | A production build |

### Where the code goes

One package, no workspace. These directories are the seams; if one of them ever has to become a
package, it becomes one without moving ([ADR 0004](docs/adr/0004-typescript-end-to-end-in-one-nuxt-app.md)).

| Directory | Holds |
| --- | --- |
| `app/` | The Vue side of the Nuxt app |
| `server/` | Nitro server routes, which are the HTTP API |
| `core/` | The domain rules |
| `db/` | Drizzle schema, migrations, and GoTrue's `auth` schema declared read-only |
| `queue/` | The only module that talks to pg-boss |
| `worker/` | The pg-boss consumer |
| `storage/` | Sources and Documents on disk, behind a switch for S3 |
| `seed/` | Fabricated data |
| `tests/` | Vitest |
| `e2e/` | Playwright |

`server/` and `worker/` both import `core/`. `core/` imports neither, and `pnpm lint` fails if it
ever does.

## Licence

AGPL-3.0-or-later. Copyright (C) 2026 BohnBawerick.

Run it, fork it, change it, all free. If you run a **modified** copy as a service for other people,
publish your changes. Running it for yourself or your household triggers nothing.
[Why AGPL and not MIT](docs/adr/0008-agpl-3-0-because-the-money-is-in-hosting.md).

See [`CONTRIBUTING.md`](CONTRIBUTING.md).
