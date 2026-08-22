# Nothing is processed until a Job is named

The app stores Sources and does nothing with them. Naming a Job is what starts parsing, Screening,
the Interview, matching and generation. There is no background processing at upload time.

A reader would expect the opposite, so it is worth stating plainly: the work is deliberately
deferred. Every question the Interview asks then has a reason behind it, because a specific Job
wants a specific thing. "Tell me about yourself" is a far worse question than "this job wants X, what
have you got". It also keeps token spend tied to intent, since the person only pays for work on jobs
they actually want.

## Consequences

The first Application is slow, because the Bank starts empty and everything is mined at once. Later
ones are fast. This has to be explained in the interface rather than hidden, or the first run reads
as the app being broken.

One deliberate exception: an unattached "warm up my Bank" Interview can be started by hand. It is
general rather than Job-precise, and it is the person's choice, not something the app does on its
own.
