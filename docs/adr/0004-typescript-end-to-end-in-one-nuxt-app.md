# TypeScript end to end, in one Nuxt app

The sister project `mrb-platform` is a .NET 10 API behind a Nuxt 4 frontend. career-forge could have
copied that and been productive on day one. It does not. The whole stack is TypeScript, and the
frontend and the HTTP API are the same Nuxt 4 application, served by its built-in Nitro server.

Three reasons, in order of weight.

The provider-layer research recommended the Vercel AI SDK v7 for a Node backend and left
`Microsoft.Extensions.AI` as an open second pass for a .NET one. Picking TypeScript closes that
question at no cost. Picking .NET would have bought another round of research before a line of code
could be written.

One person maintains this. One language means no context switching between a C# service and a Vue
frontend, and no second toolchain in the same repo.

The repo is public from the first commit. TypeScript is the widest door for anyone who might ever
send a patch. C# is a narrower one for an application of this kind.

A separate API server was considered, so a future browser extension would have something to call.
Nitro server routes already are an HTTP API, so that would have been a second server built today for
a client the map puts out of scope.

The honest cost: the first few weeks are slower than they would have been in C#. The Vue and Nuxt
half of what `mrb-platform` taught carries over. The C# half does not.

## Consequences

- The AI provider abstraction is the Vercel AI SDK v7. The open question on the provider layer is
  answered.
- `server/` holds the HTTP API and `worker/` holds the pg-boss consumer. Both import `core/`, and
  `core/` imports neither. The domain rules live in one place with two doors into them.
- One package, no workspace. The directories above are the seams; if any of them ever needs to be a
  package, it becomes one without moving.
- The worker runs from the same image as the web app with a different start command.
- A browser extension, if it is ever built, calls the same Nitro routes the browser does.
