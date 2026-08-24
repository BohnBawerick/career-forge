# Contributing

There is a skeleton and no features. The design is being worked out one decision at a time on the
[issue tracker](https://github.com/BohnBawerick/career-forge/issues), and the map issue is the
place to see where it is up to. Opinions on an open ticket are welcome now.
[Getting started](README.md#getting-started) in the README gets you a running development
environment.

## Licence and sign-off

career-forge is AGPL-3.0-or-later. Anything you contribute is taken under the same licence.

Contributions use the [Developer Certificate of Origin](https://developercertificate.org/). There
is no contributor licence agreement and you are not asked to hand over any rights. You confirm that
you wrote the change, or have the right to submit it, by signing off each commit:

```
git commit -s
```

That adds one line to the commit message:

```
Signed-off-by: Your Name <you@example.com>
```

Your name and email go into the public git history. Use whatever name you are happy to publish.

## Before you open a pull request

- Run `pnpm lint`, `pnpm typecheck`, `pnpm test` and `pnpm build`. CI runs those four and
  `pnpm test:e2e` on every pull request, so anything that fails there fails here first.
- Read [`CONTEXT.md`](CONTEXT.md) and use the words it defines. The vocabulary is settled and
  drifting off it costs a review round.
- Read [`docs/adr/`](docs/adr/). If your change contradicts one, say so in the pull request and
  argue the case. Several of those decisions look wrong until you read why.
- Never put real personal data in this repo, yours or anyone else's. Fabricated data only.
