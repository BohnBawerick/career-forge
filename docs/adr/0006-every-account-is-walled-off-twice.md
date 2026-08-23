# Every Account is walled off twice

One Account's Bank leaking into another's is the worst bug career-forge could ship, so two
independent mechanisms stop it. Postgres row-level security is the wall: the application connects
as an ordinary role, every table carrying an `account_id` has a policy on it, and each request opens
a transaction that declares which Account is asking. `core/` filters by `account_id` as well. The
wall is what makes a leak impossible; the fence in `core/` is what makes the bug show up in a test
as an empty result instead of in production as someone else's resume.

Row-level security alone was rejected because a forgotten filter reads as "no rows" with no clue
why, which costs hours. Filtering in `core/` alone was rejected because the leak is then always one
missing `where` away, and this project generates queries across nine tables that all hang off
Account.

The bridge from a login to an Account is a lookup, not a token claim. GoTrue's token carries its
own `auth.users` id. Each request reads the `account` row for that id and then tells Postgres. The
alternative, writing `account_id` into the token at login, was rejected because a signed token keeps
saying the old thing until it expires, and a stale claim is exactly the leak this ADR exists to
prevent. The lookup is one indexed read and can be cached if it ever shows up in a profile.

## Consequences

- The application's database role is not the owner of the tables, so row-level security applies to
  it. Migrations run as a different role.
- Nothing may reach the connection pool directly. A repository layer opens the transaction, sets
  the Account, and hands out the connection.
- The Owner is a caretaker, not a super-user. Owning the install grants the right to invite and to
  remove people, and no right at all to read their data. The person running the server has root on
  the box and can read the database by hand; the application must never offer it as a feature,
  because a hole cut in this rule for a good reason gets widened for a worse one.
- Every table that hangs off Account needs a policy. A new table without one is a bug, so the
  migration checklist has to say so.
