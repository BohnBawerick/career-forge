# career-forge

Shared language for the whole project. A glossary, nothing else. No implementation detail belongs
here.

The shape in one paragraph: a person feeds the app **Sources** and the app sits on them. Naming a
**Job** starts the work. A cheap **Screening** warns the person if the Job is a long stretch. An
**Interview** mines their **Projects** for **Evidence** that answers the Job's **Requirements**.
Every line of every generated **Document** cites Evidence, or it does not get written.

## The person and their material

**Account**:
One person's space, owning everything else here. One install may hold a single Account on a laptop
or many on a server.
_Avoid_: user, profile, tenant

**Source**:
A file the person handed the app, stored unchanged and kept forever. Old resumes, portfolio
exports, past applications. Roles, Projects and Evidence are parsed out of a Source and point back
at it.
_Avoid_: upload, import, attachment

**Role**:
A job the person held, holding employer, title and dates. A statement of fact, not a claim about
ability.
_Avoid_: position, employment, experience

**Project**:
One piece of work the person did, usually inside a Role. The event that Evidence is mined from. A
Project is always richer than anything yet written about it.
_Avoid_: portfolio entry, case study, achievement

**Evidence**:
One defensible claim about what the person did or can do, attached to a Role or a Project and
tagged with Skills. The atom of the Bank, and the only thing a generated line may cite.
_Avoid_: bullet, accomplishment, inventory record

**Facet**:
One of the several Evidence records the same Project yields when mined from different angles. The
same subsea manifold is design work to one Job and project management to another.
_Avoid_: aspect, variant

**Skill**:
A named capability used as a tag on Evidence. Per Account, free text, seeded from a starter list.
Carries no proof of its own and can never back a generated line by itself.
_Avoid_: competency, keyword, tag

**Bank**:
An Account's Roles, Projects, Evidence and Skills taken together. It grows with every Application
and never resets.
_Avoid_: inventory, profile, knowledge base

## The interview

**Interview**:
A conversation in which the app asks and the person answers, to mine Projects for Evidence the Bank
does not yet hold. Normally driven by a Job. May also be run unattached, to warm the Bank up.
_Avoid_: chat, questionnaire, onboarding

**Answer**:
The person's own words, stored raw and unedited. Evidence is derived from Answers and points back
at them.
_Avoid_: response, transcript, message

**Angle**:
The choice of which Evidence to present for a given Job and how to frame it. Angling is allowed and
is most of the value. Inventing is not.
_Avoid_: spin, tailoring, positioning

## The job

**Job**:
A position the person wants to apply for, entered as pasted text or fetched from an allowlisted
API. Stored unchanged, because the frozen copy is what the person reads back months later.
_Avoid_: ad, vacancy, listing, posting

**Requirement**:
One thing a Job asks for, extracted from its text. The unit that gets matched.
_Avoid_: criterion, must-have, keyword

**Alignment**:
How well one Evidence record answers one Requirement: strong, partial or none. A property of the
pairing, never of the Evidence. It decides what the Interview asks about and what it leaves alone.
_Avoid_: relevance, fit, confidence

**Gap**:
A Requirement still holding no Evidence after the Interview. Reported plainly on the Match and in
the Cover Letter, never papered over.
_Avoid_: weakness, missing skill

**Match**:
The comparison of a Job's Requirements against the Bank. Computed twice per Application, at
Screening and again at generation, so the person can see what the Interview bought them.
_Avoid_: score, fit report

**Screening**:
The first, cheap Match, run the moment a Job is added and before any tokens are spent on an
Interview. It exists to warn the person when a Job is a long stretch, then let them decide.
_Avoid_: pre-check, triage, filter

## The output

**Application**:
One person's attempt at one Job, owning its Match, its Interview and its Documents. Created when
the Job is added, and the record the person browses later to see what they sent and to whom.
_Avoid_: submission, attempt, entry

**Document**:
A file generated for an Application. Frozen at the moment it is produced and never edited; a change
means a new version. Three kinds exist.
_Avoid_: output, artefact, export, deliverable

**Resume**:
The tailored resume Document. Every line about ability cites Evidence. Role facts do not.

**Cover Letter**:
The tailored cover letter Document. Names Gaps honestly rather than hiding them.

**Interview Brief**:
The third Document, made on demand when the person marks that they got an interview rather than at
apply time. It reads the frozen Application and the Bank as it stands that day.
_Avoid_: prep pack, cheat sheet
