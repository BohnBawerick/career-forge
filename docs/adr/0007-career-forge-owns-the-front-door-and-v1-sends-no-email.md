# career-forge owns the front door, and v1 sends no email

GoTrue's own public sign-up is off, permanently. GoTrue listens on its own port, so an open
sign-up there lets anyone reachable on the network mint a login without ever loading a career-forge
screen, which would make the rule about who may join meaningless. career-forge shows every screen
and calls GoTrue's admin API with a service key to create the login at the last moment. The rule
lives in code we control rather than in a container environment variable that cannot be changed at
runtime.

v1 has no mail server, and no way to reach a person except by handing them a link. That one
constraint decides most of the lifecycle.

- **The email address is a login name.** GoTrue has no username field and validates the format of
  the address, so asking for a username means storing `bob@localhost` and untangling every one of
  them when the managed tier arrives. The sign-up screen says the address is a login and that
  nothing is ever sent to it.
- **The first person to sign up claims the install and becomes the Owner.** Sign-up then closes.
  There is no single-account mode flag: a laptop is the family server where the Owner never sent an
  Invite.
- **Invites and password resets are the same one-time link,** minted by career-forge and copied out
  by hand. career-forge keeps its own `invite` table rather than using GoTrue's link generator,
  because an Invite also creates the Account, records who invited whom, and can be revoked and
  listed. GoTrue only learns about the person when they choose a password.
- **A member who forgets their password asks the Owner,** who generates a reset link and passes it
  on. The Owner never sees the password. Passwords are never stored anywhere in readable form, on a
  self-hosted install included, because one leaked backup would then hand over every login.
- **An Owner who is locked out runs a command on the machine.** No unauthenticated page can reset
  the Owner's password, because there is nothing to check the caller against and any such page is a
  server takeover. Being able to run a command on the box is the proof of ownership that replaces
  the email. The login page's "forgot password?" link shows the exact line to copy.

Sign-up writes to GoTrue over HTTP and to our tables over SQL, and those two writes cannot be one
transaction. There is no foreign key from `account` to `auth.users`: GoTrue owns that schema and
migrates it on its own schedule, and a constraint from our side could block an upgrade and lock
everyone out. There is no cleanup job either. A login with no `account` row means "not set up yet",
and the login path creates the row the first time it sees one missing. The half state repairs
itself on the next login and costs one branch in one function.

Federated identity (Google, Microsoft, GitHub) and real transactional email are the managed tier's
problem, not v1's.

## Consequences

- `GOTRUE_DISABLE_SIGNUP` is on and the service key never leaves the server. Every account-creating
  path goes through the admin API.
- GoTrue's port is not exposed outside the compose network.
- The `invite` table is career-forge's: token, invited email, who invited, expiry, used-at. Links
  are single use and expire in seven days.
- Two password screens exist. Signed in, an Account changes its own password from settings. Locked
  out, only the Owner has a route, and it is a command.
- A Member can export their whole Bank as a zip and delete their own Account, and the Owner cannot
  stop either. The Owner cannot delete themselves while other Accounts exist. Removing a Member
  locks them out and keeps their data; deleting is a separate, confirmed action.
- The session token is an httpOnly cookie set by Nitro, not `localStorage`, so page scripts cannot
  read it and server-side rendering works.
