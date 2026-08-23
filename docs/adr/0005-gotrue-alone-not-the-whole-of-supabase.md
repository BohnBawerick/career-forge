# GoTrue alone, not the whole of Supabase

career-forge runs its own Postgres and puts GoTrue, the Supabase authentication service, next to it.
The other nine services in the Supabase compose file are deleted. Accounts exist from day one, so
authentication is not optional, but the price paid for it is.

The number that decided this: GoTrue idles at 8.859 MiB, measured. The full Supabase stack idles
around 1 to 1.5 GB and its vendor minimum is 4 GB. In its own compose file `auth` depends only on
`db`, and nothing depends on `auth`, so two containers is the floor. Supabase has already dropped
Kong and made Logflare and Vector opt-in, for the same memory reason.

A person running this at home is the point of the project. A 4 GB floor before the application
starts would end that, and it would buy Storage, Realtime, Studio and analytics that career-forge
does not use.

The alternatives all cost more or cost freedom. Standalone identity servers run from roughly 380 MB
for Ory Kratos to 1250 MB for Keycloak. In-process libraries are free in RAM, but Better Auth exists
only for Node and ASP.NET Core Identity only for .NET, so either would have decided the language by
adoption rather than on merit. GoTrue speaks plain HTTP to anything, so it left the stack question
open until it could be answered properly.

What this gives up: Supabase's hosted login pages and its admin console. Sign-up, password reset and
invites are career-forge's own screens over GoTrue's API.

## Consequences

- The database is a plain Postgres that career-forge owns. GoTrue creates and owns an `auth` schema
  inside it.
- Application code has to read tables it did not create. This is why the query layer is Drizzle and
  not Prisma: Prisma expects to own the whole database and will try to drop what it did not make.
- The compose floor is two services, `postgres` and `gotrue`. That is also the entire development
  environment, with Nuxt and the worker run directly on the developer's machine.
- Supabase Storage is gone with the rest, so Sources and generated Documents go to a filesystem
  volume behind a storage module with a switch for S3, the same shape as `SERVER_KEY_MODE` in the
  provider layer.
- Backups are two things, a database dump and a folder. The README has to say so.
- The upgrade path for the managed tier is Supabase Cloud on the same schema.
