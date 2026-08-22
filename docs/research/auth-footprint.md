# Self-hosted auth, measured in RAM

Research for issue #12. Facts checked 2026-08-22 against vendor docs, official compose files and
project issue trackers. No container was started for this document. Every RAM number below carries
a source and a tag: **measured** (someone ran it and said how), **vendor-declared** (the project
says so in its own docs) or **estimated** (inferred here, from stated evidence).

## Recommendation

Run **GoTrue against the Postgres the app already needs**, and delete the other nine services from
the Supabase compose file. GoTrue idles at 8.859 MiB, measured. That is the whole marginal cost of
authentication, because Postgres is on the bill either way and every other option in this
comparison pays for a second runtime that career-forge has no other use for.

The number that ends the argument is not Supabase's. It is Keycloak's own sizing guide: 1250 MB per
pod, vendor-declared, before the database. Zitadel declares 512 MB for its own process and 2 GB for
the compose host. Authentik declares 2 GB for the host and its worker memory has been climbing
release to release. Those are 50x to 140x the measured cost of GoTrue, and they buy career-forge
features it has ruled out for v1: an OAuth provider zoo, SAML, SCIM, a realm model. A 2 GB VPS runs
GoTrue plus Postgres plus the app. It does not run Keycloak.

If issue #7 settles the backend on Node or TypeScript, **Better Auth is the honest alternative** and
close to free in RAM, because it loads into a process that is already running. It costs 8.859 MiB
less than GoTrue and one whole container less. What it costs instead is the option on .NET. GoTrue
speaks HTTP to anything, so it keeps #7 open; Better Auth decides #7 by adoption. That is the real
trade, and it is not a memory trade. Given that mrb-platform is .NET and the stack question is still
open, taking the 9 MiB and keeping the language decision free is the better buy today.

Two things to carry into the accounts and auth patch. GoTrue ships no login pages, so sign-up,
password reset and invite screens are career-forge's to build against its API. And GoTrue's
`user` is career-forge's `Account` one-to-one, which is exactly the model `CONTEXT.md` describes:
one person's space, one row, no organization or tenant layer needed. Neither of those is a memory
cost, but both are work that the standalone identity servers would have handed over for free, and
that is what their gigabyte buys.

## Comparison

Read the RSS column as *marginal cost of authentication*, not total stack size. Every option here
needs a database and career-forge needs one anyway, so a shared Postgres is counted once and
excluded from each row unless the row says otherwise.

| Option | Idle RSS (source) | Extra containers | Language-agnostic | What you give up | Upgrade path to a managed multi-account tier |
|---|---|---|---|---|---|
| **Full self-hosted Supabase** (current `master` compose, 11 services) | ~1.0 to 1.5 GB for the whole stack, **estimated** from the one full `docker stats` dump minus the services since removed ([#26159](https://github.com/orgs/supabase/discussions/26159)). Vendor minimum to run it at all is 4 GB RAM, 8 GB recommended, **vendor-declared** ([self-hosting docs](https://supabase.com/docs/guides/self-hosting/docker)). No measured dump exists for the current 11-service stack. | 10 beyond the database | Yes, HTTP | Roughly a gigabyte to Studio, PostgREST, Realtime, Storage, imgproxy, meta, edge functions, Envoy and Supavisor, none of which career-forge uses | Supabase Cloud takes the same schema and the same client libraries. The closest thing to a lift and shift in this table |
| **GoTrue + Postgres, stripped** | GoTrue **8.859 MiB measured** (user report, [#26159](https://github.com/orgs/supabase/discussions/26159)); 10 to 30 MiB working, **estimated** from the Dockerfile plus that datapoint. Stock `postgres:17-alpine` ~40 to 80 MiB at start, **estimated**, no primary measurement found. `db` + `auth` on the `supabase/postgres` image measured at ~360 MiB, but that image is not stock. | 1 beyond the database | Yes, HTTP on `:9999` | Login, reset and invite UI. An admin console. The Supabase client libraries assume the `/auth/v1/*` gateway path, so the app calls GoTrue directly | Supabase Cloud, same service, same `auth` schema. Or stay self-hosted and add services back |
| **Better Auth** (Node/TS) | **No published figure.** Nothing on the site, in the repo or on npm. Absence reported, not filled in. In-process, so the marginal cost is loaded module code plus per-request allocation. Proxy only, **not RSS**: 2.06 MB unpacked, 463 files, 17 direct dependencies ([registry metadata](https://registry.npmjs.org/better-auth/latest)) | 0 | **No.** Node/TypeScript only | The .NET option. A ready-made admin console. Blast-radius separation, since auth code runs in the app process | The only additive path here. Better Auth Infrastructure adds a dashboard, audit logs and Enterprise SSO as `dash()` / `sentinel()` plugins, no user migration ([docs](https://better-auth.com/docs/infrastructure/introduction)). See the caveat below |
| **Lucia** (Node/TS) | No figure and no package to measure. Effectively zero, **estimated** | 0 | No | Everything except sessions. **Deprecated in March 2025** ([lucia-auth.com](https://lucia-auth.com/), [maintainer post](https://pilcrowonpaper.com/blog/18)); the repo now ships one file to copy | None. Vendored code, no adapters, no exporters, no security patches |
| **ASP.NET Core Identity** (.NET) | **No published figure.** Microsoft Learn documents configuration and metrics, no memory counters. Proxy only, **not RSS**: `Identity.EntityFrameworkCore` is a ~96 KB nupkg, `Identity.UI` ~3.1 MB (NuGet flat container) | 0 | **No.** .NET only | Multi-tenancy, which it does not have ([dotnet/aspnetcore#27006](https://github.com/dotnet/aspnetcore/issues/27006) is still an open request). Invites. An operator console; `Identity.UI` ships end-user pages, not admin screens | Full re-platform, and you must build the tenancy model first because the data has no tenant dimension to migrate |
| **Zitadel** | ~512 MB for the Zitadel process, **vendor-declared** ([production docs](https://zitadel.com/docs/self-hosting/manage/production)); 2 GB for the compose host, **vendor-declared** ([compose guide](https://zitadel.com/docs/self-hosting/deploy/compose)). The 512 MB excludes the separate Next.js login service, for which no figure exists | 3 (Traefik, API, Next.js login UI) beyond the database | Yes, OIDC | ~500 MB minimum, and a Traefik plus Next.js stack you did not ask for | Zitadel Cloud. Organizations map onto career-forge Accounts |
| **Authentik** | 2 GB host minimum, **vendor-declared** ([install docs](https://docs.goauthentik.io/install-config/install/docker-compose/)). Independent idle measurement 375 Mi server + 360 Mi worker, **measured** by a user, corroboration only ([#17869](https://github.com/goauthentik/authentik/issues/17869)). Worker memory roughly doubled between 2025.12 and 2026.2 ([#20537](https://github.com/goauthentik/authentik/issues/20537)) | 2 (Django server, worker) beyond the database | Yes, OIDC | ~700 MB measured, on a floor that is moving upward. Brands give per-domain branding, not tenant isolation | Authentik has no first-party managed tier to upgrade into |
| **Ory Kratos** | **No vendor figure exists.** Ory's [deployment docs](https://www.ory.com/docs/self-hosted/deployment) declare no RAM requirement. ~380 MB for the whole quickstart, **measured** by a user and old, and that includes the Node UI and a mail catcher ([#945](https://github.com/ory/kratos/issues/945)) | 2 (Kratos, mandatory UI service) beyond the database | Yes, HTTP | No login UI at all, ever. No multi-tenancy; Ory's own guidance is one instance per tenant | Ory Network. The per-tenant instance model fits career-forge badly |
| **Keycloak** | 1250 MB request, 1360 MB limit per pod, **vendor-declared** ([sizing guide](https://www.keycloak.org/high-availability/multi-cluster/concepts-memory-and-cpu-sizing)), excluding the database and sized for 10,000 cached sessions. The JVM commits 70% of the container limit as heap by policy plus ~300 MB non-heap | 1 beyond the database, but no official compose file exists; every one in circulation is community-authored | Yes, OIDC | Over a gigabyte, and a JVM to tune | Keycloak has no first-party managed tier. Realms are the most mature tenancy model in this table |

## Which Supabase services can be deleted while keeping GoTrue working

The answer changed recently, and most write-ups on the web are describing a compose file that no
longer exists.

**Current `master`** ([docker-compose.yml](https://raw.githubusercontent.com/supabase/supabase/master/docker/docker-compose.yml),
pulled 2026-08-22, 587 lines) has 11 services: `studio`, `api-gw` (Envoy), `auth`, `rest`,
`realtime`, `storage`, `imgproxy`, `meta`, `functions`, `db`, `supavisor`. Kong is gone, replaced by
Envoy. Analytics (Logflare) and Vector are gone from the default file entirely, moved to an opt-in
`docker-compose.logs.yml` overlay. The self-hosting docs say plainly that logs and analytics sit
outside the default configuration to reduce the memory footprint.

That matters because of what the old file did. On tag
[`v1.24.09`](https://raw.githubusercontent.com/supabase/supabase/v1.24.09/docker/docker-compose.yml),
seven services including `auth` carried `analytics: condition: service_healthy`, and `db` waited on
`vector`. Logflare was undeletable without editing the file, and Logflare is the container users
report at 1.8 GB on a 4 GB VPS ([#32713](https://github.com/supabase/supabase/issues/32713),
[#30122](https://github.com/supabase/supabase/issues/30122)). On a 2 GB droplet the BEAM fails to
start at all ([#36523](https://github.com/orgs/supabase/discussions/36523)). None of that applies to
the current file.

**The resulting service list is `db` and `auth`. Two containers.**

The compose graph gives this directly. `auth`'s only `depends_on` edge is `db` with
`condition: service_healthy`, and the file's own comment says to disable even that if you use an
external Postgres. Nothing in the file lists `auth` in its own `depends_on`. So `studio`, `rest`,
`realtime`, `storage`, `imgproxy`, `meta`, `functions`, `supavisor` and `api-gw` all delete cleanly
with no edit to the `auth` service.

Two caveats. `api-gw` depends on `studio` being healthy, so keeping the Envoy gateway drags Studio
back in. GoTrue listens on `:9999` and healthchecks itself there, so skip the gateway and have the
app call GoTrue directly. And `supabase/postgres` is not stock Postgres: it carries the Supabase
extension set and the compose file mounts init scripts for realtime, webhooks, roles, JWT, logs and
the pooler. Dropping the SQL mounts you do not use is easy; the image stays heavy either way, which
is why the measured `db` + `auth` figure is ~360 MiB rather than the ~60 to 110 MiB estimated for
GoTrue on a stock `postgres:17-alpine`.

**RAM saved: roughly 700 MB to 1.1 GB**, estimated, against the full current stack. Against the
stack most documentation still describes, the one with Kong and Logflare, the saving is about 3.6 GB
measured, of which Kong alone was 2.544 GiB.

One structural point worth more than the number. No official Supabase compose file declares a memory
limit anywhere. `mem_limit` and `deploy.resources` return zero hits across every file checked. Every
container runs uncapped, which is why a Logflare that sizes the BEAM against host memory can eat a
whole VPS.

## What could not be sourced

Three gaps, stated rather than papered over.

**No primary measured idle RSS for a stock `postgres:alpine` container.** The 40 to 80 MiB figure in
the table is inferred from the documented 128 MB `shared_buffers` default
([runtime-config-resource](https://www.postgresql.org/docs/current/runtime-config-resource.html))
being allocated lazily and page-faulted in on use. This is the load-bearing number for the whole
recommendation, so if it matters, measure it locally. Five minutes with `docker stats` settles it.

**No memory figure from any maintainer, on any of the eight products.** Every measured number in
this document is a user report, and every user report is one host with one kernel. `docker stats`
counts page cache, so those figures are upper bounds on true RSS. Supabase's only primary signal is
structural: they moved analytics out of the default compose and said why.

**No measured dump for the current Supabase stack.** The single full `docker stats` dump available
is from September 2024 and includes Kong, analytics and vector. The ~1.0 to 1.5 GB estimate is that
dump with the removed services subtracted and Envoy added back by guess.

## The Better Auth caveat

If #7 lands on Node and Better Auth gets picked, carry this forward.
[Issue #8754](https://github.com/better-auth/better-auth/issues/8754) alleges that `@better-auth/dash`
is published under the official `@better-auth` npm scope while being closed source, and that it POSTs
signin, IP and geo events to an undocumented endpoint with no stated retention policy. That is a
user-filed allegation, not vendor-confirmed behaviour. It matters because the additive upgrade path
in the table above is the reason to prefer Better Auth over the alternatives, and it runs through
that plugin.
