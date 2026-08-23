# AGPL-3.0, because the money is in hosting

career-forge ships under the GNU Affero General Public License, version 3 or later. The code is
free and the plan is to charge for managed hosting, which makes the licence a commercial decision
before it is a legal one.

MIT was the obvious alternative and was rejected on one point. The only serious threat to a
hosting business is somebody forking the code and selling hosting against it. MIT permits exactly
that with no obligation. AGPL permits it too, and requires them to publish whatever they changed,
which removes most of the reason to bother.

The usual argument against AGPL is that large companies forbid it. That argument does not apply
here. The user is one person running `docker compose up` on a laptop or a small server, and nothing
in the AGPL touches them: running unmodified software, even for a household, triggers no
obligation. A source-available licence like BSL would have blocked commercial hosting outright and
cost the goodwill of being genuinely open, for a threat that a copyleft licence already handles.

Copyright stays with the author, so a different licence can always be sold to somebody who wants
one. The AGPL binds everyone downstream, not the author.

## Consequences

- Contributions are taken under the Developer Certificate of Origin, signed off per commit. A
  contributor licence agreement was not used: a DCO is one line in `CONTRIBUTING.md` and does not
  ask anyone to hand over rights.
- Every contribution arrives under AGPL-3.0-or-later as well, so relicensing the project as a whole
  would need every contributor's agreement. That is the price of not running a CLA and it is
  accepted.
- A public read-only demo instance is a network service under the AGPL, so it has to offer its
  source. It runs unmodified code from this repo, and the footer links here.
- If the managed tier ever runs modified code, those modifications get published. Design the
  managed tier as configuration switches on the same code rather than as a private fork.
