# Every generated line cites Evidence

A generated line making any claim about ability must carry the identifier of at least one Evidence
record, and a validator checks every identifier against the Bank before the Document is produced. A
line with no Evidence behind it is rejected outright, never flagged and shipped. Role facts
(employer, title, dates) are exempt, because the rule covers claims about ability, not the header of
a resume.

Lying is the default failure mode of AI resume tools, so this rule is the product rather than a
safety feature bolted to it. Constrained decoding alone cannot guarantee a real identifier, which is
why the check is a server-side validator and not a prompt instruction.

## Consequences

A rejected line is not thrown away. It is a signal that the Bank is missing something the model
thought was worth saying, so it is turned into an Interview question instead. Rejection feeds the
engine that fixes the cause.
