# Auto-apply feasibility

Research for [issue #4](https://github.com/BohnBawerick/career-forge/issues/4). Answers open
question 17 in `docs/OPEN_QUESTIONS.md`.

Question: can career-forge legitimately press "Apply" on a user's behalf, after the user has
reviewed the generated resume and cover letter? Primary user is in Australia. EU users expected.

Researched 2026-08-22. Every claim below carries a source. Where a source could not be read
directly, the text says so.

## Verdict

**TRAP.** Do not build a server-side Apply button, and do not store job board passwords. Three
findings kill it independently, so no amount of engineering rescues the design. First, no job
board or ATS offers a submission API a candidate-side tool can obtain: every submit endpoint that
exists (Greenhouse, Lever, Ashby, SmartRecruiters, Workday) authenticates with a key minted inside
the *employer's* account, and Seek, Indeed and LinkedIn have no candidate submit API at all.
Second, the two boards that matter most for this user write the prohibition out in plain text:
Seek's own developer docs forbid "automatically submitting an application on a candidate's behalf",
and Indeed's ToS bans "any automation, scripting, or bots to automate the Indeed Apply process".
Third, storing a replayable password makes career-forge a controller of credentials under GDPR
Art. 32, and two European regulators have already fined for recoverable password storage, one of
them EUR 91m. The prior art agrees: every product that submitted at machine speed either died,
got stripped, or lives on account bans. The one survivor, Simplify, fills the form and hands the
click back to the human. That is the shape worth revisiting in v2, and it is described at the
bottom of this file. For v1, submission stays manual, exactly as `Get_a_real_job` already handles
it.

## Per-platform table

Question asked of each: is there a documented API a third party can call to submit a candidate's
application, and can a small independent project get access?

| Platform | Submission API for a candidate-side tool | Who holds the credential | Open to an independent project |
|---|---|---|---|
| Seek (AU) | No. The SEEK API is hirer/ATS side: post jobs, export applications after the fact. "Apply with SEEK" only pre-fills an ATS-hosted form. [docs](https://developer.seek.com/use-cases/apply-with-seek) | Partner token plus a per-hirer relationship configured by SEEK support | No. Requires a hirer relationship a job seeker cannot have, plus integration certification |
| Indeed | No candidate-side path. "Indeed Apply" and Job Sync deliver applications *to* an ATS partner's `postUrl`. "Apply with Indeed" needs the job seeker to click and authorize. [docs](https://docs.indeed.com/indeed-apply) | Indeed-provisioned OAuth credentials in Partner Console | No. "Indeed must approve, in writing, any Integration" and there is no partner category for a job seeker tool |
| LinkedIn | No. Apply Connect flows applications outward to an ATS (`GET /v2/jobApplications`). Nothing submits inward. [docs](https://learn.microsoft.com/en-us/linkedin/talent/apply-connect/apply-connect-overview) | Partner Program membership plus a Recruiter Corporate or Recruiter Professional Services licence | No. Fully gated, eight-step certification |
| Workday | No public candidate apply API. Tenant-scoped SOAP `Put_Candidate` exists in the Recruiting service. [docs](https://community.workday.com/sites/default/files/file-hosting/productionapi/Recruiting/v23.2/Put_Candidate.html) | Integration System User or OAuth client created inside each employer's tenant | No, strongly. Every employer is a separate tenant. The `myworkdayjobs.com/wday/cxs/` JSON the career site uses is undocumented and bot-protected |
| Greenhouse | Yes, technically. `POST /v1/boards/{board_token}/jobs/{id}` submits an application. [docs](https://raw.githubusercontent.com/grnhse/greenhouse-api-docs/master/source/includes/job-board/_applications.md) | Job Board API key created by the employer's Greenhouse admin, meant to be shared with that employer's integration partners | No. Each employer must hand over a key. GETs are unauthenticated; only the POST needs the key |
| Lever | Yes, technically. `POST /postings/:posting/apply`. [docs](https://hire.lever.co/developer/documentation#apply-to-a-posting) | Employer's API key, or partner OAuth app registered with Lever | No. Partner programme requires review, sandbox build, QA meeting, and each customer still authorizes separately |
| Ashby | Yes, technically. `POST applicationForm.submit`. [docs](https://developers.ashbyhq.com/reference/applicationformsubmit) | Employer's Ashby API key with `candidatesWrite`, granted by an Ashby admin | No. Ashby contracts only with business entities, and section 5.1 of its [terms](https://www.ashbyhq.com/terms) bars service-bureau use |
| SmartRecruiters | Yes. `POST /postings/{uuid}/candidates`. [docs](https://developers.smartrecruiters.com/docs/application-api) | `X-SmartToken` API key from an org administrator, or OAuth with `candidate_applications_manage` | No. Per-employer credential. There is no unauthenticated variant |

The pattern is the same everywhere and it is not an accident. These APIs exist so an employer can
put its own careers page in front of its own ATS. Every one of them assumes the hiring company is
the party that wants the integration. A job seeker is not a party to that relationship, and there
is no product category on any of these eight platforms for a tool that applies on a candidate's
behalf.

SmartRecruiters is the closest thing to an opening, and it is narrow. If an employer chose to issue
career-forge a key, submission would work. That is a per-employer sales motion, not a feature.

## Terms of service findings

Two boards ban automated submission in words that leave nothing to argue about.

Seek, in its own developer documentation: SEEK Profile information from Apply with SEEK "is only to
be used to pre-fill an apply form where a candidate can review and edit the form before submitting.
It must not be used for any other purpose, such as authenticating candidates, creating user
accounts, or automatically submitting an application on a candidate's behalf."
([developer.seek.com](https://developer.seek.com/use-cases/apply-with-seek)) This is the single
most directly on-point sentence found in the whole investigation, and it comes from the board this
project's first user actually uses.

Indeed, Terms of Service section A.3.5: "Use of any automation, scripting, or bots to automate the
Indeed Apply process outside of Indeed's official vendors and tooling is prohibited."
([indeed.com/legal](https://www.indeed.com/legal), last updated 17 July 2026)

LinkedIn User Agreement section 8.2, effective 3 November 2025
([linkedin.com/legal/user-agreement](https://www.linkedin.com/legal/user-agreement)), covers both
halves of the question. On automation: do not "[d]evelop, support or use software, devices,
scripts, robots or any other means or processes (such as crawlers, browser plugins and add-ons or
any other technology) to scrape or copy the Services", and do not "[u]se bots or other unauthorized
automated methods to access the Services". Note that browser plugins are named, which matters for
the extension path below. On credentials: do not "use or attempt to use another's account (such as
sharing log-in credentials or copying cookies)".

LinkedIn also states the consequence on a help page rather than burying it in the agreement:
members who use prohibited tools "risk having their accounts restricted or shut down"
([help page a1341387](https://www.linkedin.com/help/linkedin/answer/a1341387)).

Seek's candidate terms at [au.seek.com/terms](https://au.seek.com/terms) reportedly prohibit
automated access and sharing login credentials with a third party. **Unverified**: that page
returned HTTP 403 to every fetch attempt, so the wording comes from a search index rather than a
direct read. The developer-docs quote above is verified and says enough on its own.

Indeed's terms carry no flat prohibition on credential sharing that could be located. Section B.1.5
only disclaims liability if credentials are used improperly by a third party, and account sharing is
routed through a formal "Linked Account" feature. **Unverified** whether a blanket clause exists
elsewhere.

Greenhouse's candidate-facing [My Greenhouse User Agreement](https://my.greenhouse.io/users/agreement)
bans "automated means, including spiders, robots, crawlers, or similar means or processes", though
it is scoped to My Greenhouse rather than to employer-hosted board pages. Lever's and Workday's
developer terms sit behind login and could not be read. **Unverified.**

## Legal findings by jurisdiction

### EU, GDPR

A stored password is personal data. Art. 4(1) covers "any information relating to an identified or
identifiable natural person" ([Art. 4](https://gdpr-info.eu/art-4-gdpr/)). This is not a theoretical
reading. Ireland's DPC fined Meta EUR 91m in September 2024 for storing user passwords in plaintext,
finding infringements of both Art. 5(1)(f) and Art. 32(1)
([DPC press release](https://www.dataprotection.ie/en/news-media/press-releases/DPC-announces-91-million-fine-of-Meta)).
Germany's first GDPR fine, EUR 20,000 from LfDI Baden-Württemberg, was also for unencrypted,
unhashed password storage under Art. 32(1)(a)
([GDPRhub summary](https://gdprhub.eu/index.php?title=LfDI_-_O_1018/115), secondary).

Art. 32(1) requires measures "appropriate to the risk", "[t]aking into account the state of the
art", and names encryption first ([Art. 32](https://gdpr-info.eu/art-32-gdpr/)). Art. 25 binds the
controller to build protection in at design time, not bolt it on
([Art. 25](https://gdpr-info.eu/art-25-gdpr/)).

The hard problem is structural, not procedural. Hashing is the accepted answer for passwords, and
career-forge cannot hash: it has to replay the password to log in. That forces reversible
encryption, which is exactly the storage class the DPC and LfDI decisions punished. A tool that
must be able to recover a plaintext password can never claim the state of the art defence that a
hashing tool can.

Self-hosting probably moves the controller role to whoever runs the instance, leaving the project
as a distributor that processes nothing. EDPB Guidelines 07/2020 on controller and processor are
the reference ([EDPB](https://www.edpb.europa.eu/documents/guideline/guidelines-072020-on-the-concepts-of-controller-and-processor-in-the-gdpr_en)).
**Unverified at paragraph level**: the PDF would not fetch, and no EDPB text was found that
addresses self-hosted open-source software directly. Treat this as a reasoned position, not settled
ground. It is also cold comfort: shipping a design that hands every self-hoster an
Art. 32 problem is a bad thing to ship even if the liability lands on them.

Application content raises Art. 9 special category data, since applications routinely carry health,
disability and ethnicity fields. Not researched in depth this round.

### Australia, Privacy Act 1988

APP 11.1 requires reasonable steps to protect personal information from misuse, loss and
unauthorised access. The OAIC guidance names encryption and strong passwords as example controls,
and says an entity "is not excused from taking particular steps ... by reason only that it would be
inconvenient, time-consuming or impose some cost"
([OAIC APP 11 chapter](https://www.oaic.gov.au/privacy/australian-privacy-principles/australian-privacy-principles-guidelines/chapter-11-app-11-security-of-personal-information)).

The small business exemption in s 6D
([Privacy Act](https://www.legislation.gov.au/C2004A03712/latest/text)) exempts operators under AUD
3m annual turnover, but s 6D(4) pulls back in any entity that discloses personal information about
another individual for a benefit, service or advantage. Any hosted or paid version of career-forge
would need to check that limb carefully. An individual running their own instance on their own data
is outside the Act's reach as an organisation, and a project that ships code and holds nobody's
data is not an APP entity. **Both characterisations unverified**: no OAIC guidance on open-source
distribution or self-hosting was found.

The Notifiable Data Breaches scheme (Part IIIC) would bite on a credential leak. s 26WG lists
whether the information was protected by encryption among the factors bearing on likely serious
harm, and s 26WH gives 30 days from suspicion to assess
([OAIC NDB guidance](https://www.oaic.gov.au/privacy/privacy-guidance-for-organisations-and-government-agencies/preventing-preparing-for-and-responding-to-data-breaches/data-breach-preparation-and-response/part-4-notifiable-data-breach-ndb-scheme)).

Reform to watch: the Privacy and Other Legislation Amendment Act 2024 (Act No. 128 of 2024, assented
10 December 2024, [legislation.gov.au](https://www.legislation.gov.au/C2024A00128/asmade)) created a
statutory tort for serious invasion of privacy, commenced 10 June 2025, actionable without proof of
damage. It did not remove the small business exemption. Schedule 2 element detail comes from
secondary summaries; the Schedule text itself was not retrieved.

### Computer misuse

This is the part that turns out to matter least, and it is worth saying why.

*Van Buren v. United States*, 593 U.S. 374 (2021), narrowed the CFAA to a "gates-up-or-down
inquiry": a person exceeds authorized access only by reaching areas "that are off-limits to him",
and an improper purpose does not convert authorised access into a violation
([opinion text via Cornell](https://www.law.cornell.edu/supremecourt/text/19-783); supremecourt.gov
returned 403). A tool logging in with the account holder's own credentials and consent is the
gates-up case.

*hiQ Labs v. LinkedIn* (9th Cir., 18 April 2022,
[opinion PDF](https://cdn.ca9.uscourts.gov/datastore/opinions/2022/04/18/17-16783.pdf)) held that
"without authorization" is "inapplicable where ... prior authorization is not generally required
but a particular person, or bot, is refused access", and expressly distinguished *Nosal II*, which
"involved an employee accessing without permission an employer's private computer for which access
permissions in the form of user accounts were required". That distinction is the public page versus
auth wall line, and career-forge would be on the auth wall side of it.

But look at how hiQ actually ended, because the popular retelling gets it backwards. hiQ won
preliminary injunctive relief on the CFAA question twice and lost everything else. On 4 November
2022 the district court found hiQ breached LinkedIn's User Agreement and held the anti-scraping and
fake-profile terms enforceable in contract. On 6 December 2022 the parties stipulated to a
USD 500,000 judgment plus a permanent injunction
([Privacy World, secondary](https://www.privacyworld.blog/2022/12/linkedins-data-scraping-battle-with-hiq-labs-ends-with-proposed-judgment/)).
Contract killed hiQ, not the CFAA. Winning the computer-misuse argument bought hiQ nothing.

Australia's Criminal Code Act 1995 Part 10.7 s 478.1 criminalises unauthorised access to restricted
data, and s 476.2 defines access as unauthorised if the person "is not entitled to cause that
access", adding that an ulterior purpose does not of itself make access unauthorised
([legislation.gov.au](https://www.legislation.gov.au/C2004A04868/latest/text); only the table of
contents was retrievable, so **section text is unverified**). The account holder's permission goes
to entitlement. The open question is whether entitlement flows from the account holder or the system
owner, and terms banning automated access muddy it. No Australian ruling on the point was found.

Directive 2013/40/EU Art. 3 requires Member States to criminalise access "without right" to an
information system "where committed by infringing a security measure". Infringing a security measure
is a mandatory element, which again points away from a consented login
([EUR-Lex CELEX 32013L0040](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=celex%3A32013L0040);
direct fetch failed, text read from the retained-EU reproduction at legislation.gov.uk).

Summary of this section: criminal computer-misuse exposure is low. Contract exposure and data
protection exposure are the real ones, and they are enough.

## Prior art and what happened to them

**AIHawk / Jobs_Applier_AI_Agent** is the case with a primary source, and it is the one to read
closely. Python, local Selenium/Playwright on the user's own machine, AGPL-3.0, created 4 August
2024, 30,221 stars as of 22 August 2026. It was renamed three times, and each rename walked further
away from LinkedIn: `linkedIn_auto_jobs_applier_with_AI`, then
`LinkedIn_AIHawk_automatic_job_application`, then `Auto_Jobs_Applier_AIHawk`, then the current
`Jobs_Applier_AI_Agent_AIHawk`. Every old path still 301s to the new one.

The maintainer said why, in his own words, on 31 January 2025: "LinkedIn requested the removal of
all links to the platform and banned all contributors to the project, so I was forced to decide to
eliminate any form of automation on LinkedIn."
([issue #1084](https://github.com/feder-cr/Jobs_Applier_AI_Agent_AIHawk/issues/1084)) Read that
carefully. A request, plus bans on contributor accounts. No cease and desist document is public, so
the widely repeated "LinkedIn sent AIHawk a C&D" is **unverified**. The auto-apply code and most
historical commits were removed from the repo; the README now says third-party provider plugins
were removed "due to copyright considerations". Upstream now only generates resumes.

Worth noting where the maintainer went next: `invisible_playwright` and `anti-detect-browser-bench`.
Once you are building anti-detection tooling, you have conceded that the platform is an adversary,
and career-forge should not want to be in that race.

**Sonara AI** ran server-side auto-apply at roughly USD 49/month, announced shutdown on 1 February
2024 after failing to raise, and was acquired by BOLD LLC mid-2024
([PitchBook profile](https://pitchbook.com/profiles/company/527734-99)). The cause was funding, not
enforcement. All sources here are secondary, mostly competitor-run content sites, so treat details
as soft. It matters only as evidence that server-side auto-apply is a hard business, not that it
was shut down.

**LazyApply** is alive: a Chrome extension driving the user's own logged-in browser across LinkedIn,
Indeed, ZipRecruiter, Dice and Greenhouse, and it submits rather than just filling. lazyapply.com
returns 403 to automated fetches, so credential handling could not be confirmed from the primary
source. **Unverified.** Reports of LinkedIn restrictions hitting its users come from a competitor's
blog and should be discounted accordingly.

**Simplify** is the counterexample worth copying. It fills, and the human submits. Its own docs:
"you always review everything before submitting it yourself"
([help.simplify.jobs](https://help.simplify.jobs/articles/1749022-installing-and-setting-up-copilot)).
A multipage autofill toggle advances through pages, and the final click still belongs to the user.
It is listed on the Chrome Web Store, supports Workday, Lever, Greenhouse, iCIMS, Taleo and
BambooHR, and has faced no public enforcement.

LoopCV and JobCopilot submit server-side across LinkedIn, Indeed and 30+ boards, and nothing public
has happened to them yet. Jobright.ai mostly matches and tailors, with a fill extension.

The other side of this deserves a mention, because it changes what "success" means. LinkedIn told
CNBC on 29 October 2025 it sees about 9,500 applications per minute, up more than 45% year on year
([CNBC](https://www.cnbc.com/2025/10/29/recruiters-are-drinking-through-a-fire-hose-of-job-applications-experts-say.html)).
Greenhouse's CEO calls it a "doom loop": around 254 applicants per posting and applications per
recruiter up 412%
([Yahoo Finance](https://finance.yahoo.com/technology/ai/articles/job-seekers-using-ai-apply-173021648.html)).
Ashby, drawing on 100M+ applications, reports 300+ applications per open role and candidates 50%
less likely to reach interview than five years ago
([PR Newswire, May 2026](https://www.prnewswire.com/news-releases/new-data-from-ashby-reveals-surge-in-applications-rising-selectivity-and-shifting-recruiter-workloads-302765846.html)).
Volume is now the problem, so a tool whose pitch is more volume is selling into a market that has
turned against it. career-forge's evidence-backed generation rule is the opposite bet, and the
better one.

## Safer middle paths, ranked

**1. Fill, do not submit.** Generate the documents, then help the user get them into the employer's
own form, with the final click always theirs. This is Simplify's shape and Simplify is still
standing. Chrome Web Store policy supports it: the Spam and Abuse policy bans extensions that "send
messages on behalf of the user without giving the user the ability to confirm the content and
intended recipients"
([program policies](https://developer.chrome.com/docs/webstore/program-policies/spam-and-abuse)), a
rule a fill-then-human-submits design satisfies literally and a silent bulk submitter fails. Two
cautions. Store compliance and board compliance are separate questions: LinkedIn's section 8.2
names "browser plugins and add-ons" explicitly, so an extension that touches LinkedIn is still in
breach of LinkedIn's terms even while Google is fine with it. And Simplify mostly targets ATS
portals, not LinkedIn. The defensible line is ATS portals only, and no LinkedIn automation at all.

**2. Email applications where the ad gives an address.** No terms to breach, no credentials, no
automation of anyone's system. Australia's Spam Act 2003 s 6 defines a commercial electronic message
by whether it offers, advertises or promotes goods, services or business opportunities
([legislation.gov.au](https://www.legislation.gov.au/C2004A01214/latest/text)). A genuine
individual applying for an advertised role does not read as promotion, and the Schedule 1
designated-message carve-out for factual content is a fallback. **Unverified**: no ACMA guidance or
determination on job-seeker email was found, so this reading has no cited authority behind it. Two
real cautions anyway. A contractor pitching services does cross into promotion. And bulk-sending
near-identical applications to harvested addresses looks like spam whatever s 6 says. The practical
obstacles are not legal: spam filtering, no ATS record, no confirmation of receipt.

**3. Local browser automation under the user's own logged-in session.** This is the tempting one,
and it is tempting for the wrong reason. It genuinely solves credential custody: nothing leaves the
machine, no password sits on a server, no breach surface. It does nothing about the terms of
service. *Meta v. Bright Data* (N.D. Cal., 23 January 2024) turned on exactly this distinction, with
Bright Data winning because it scraped while logged **off**, since the terms bind users
([Quinn Emanuel client alert](https://www.quinnemanuel.com/the-firm/news-events/client-alert-meta-v-bright-data-significant-decision-for-web-scraping-industry/),
secondary). Inverted, an already-logged-in session sits squarely inside the contract. Where the code
runs is legally irrelevant. Whose session it drives is everything. The realistic worst case for a
user is an account ban, and losing a Seek or LinkedIn account mid-job-search is a serious harm to
inflict on someone. If career-forge ever ships this, it belongs behind an explicit warning that
names the risk.

**4. Server-side submission with stored credentials.** Do not build this. It fails on terms, on
GDPR Art. 32, and on prior art, and it is the specific design that got AIHawk stripped.

## Open questions

- Seek's candidate terms at au.seek.com/terms could not be read directly (HTTP 403). Someone should
  open that page in a normal browser and confirm the automated-access and credential-sharing
  clauses before any decision relies on them.
- Would SmartRecruiters, or an individual employer on Greenhouse or Lever, actually issue a key to
  an open-source job seeker tool? Nobody appears to have asked. The answer is probably no, but the
  question is cheap.
- Does Art. 9 special category data change the calculus for storing application content, separately
  from credentials? Not researched.
- Does the EDPB have anything on self-hosted open-source software and the controller role? Nothing
  was found. If it exists, it changes how much of the risk the project can hand to self-hosters.
- If career-forge ships a fill-only extension, does it exclude LinkedIn entirely on principle, or
  fill on LinkedIn and accept that users are in breach of section 8.2? This is a values call, not a
  research question.

## Sources

Developer documentation

- Seek, Apply with SEEK: https://developer.seek.com/use-cases/apply-with-seek
- Seek, application export: https://developer.seek.com/use-cases/application-export
- Indeed Apply: https://docs.indeed.com/indeed-apply
- Indeed, Apply with Indeed: https://docs.indeed.com/indeed-apply/apply-with-indeed
- LinkedIn Apply Connect: https://learn.microsoft.com/en-us/linkedin/talent/apply-connect/apply-connect-overview
- Greenhouse Job Board API, submit an application: https://raw.githubusercontent.com/grnhse/greenhouse-api-docs/master/source/includes/job-board/_applications.md
- Greenhouse, create a job board API key: https://support.greenhouse.io/hc/en-us/articles/13446638483355-Create-a-job-board-API-key-for-an-integration
- Lever developer documentation: https://hire.lever.co/developer/documentation
- Lever partner programme: https://hire.lever.co/developer/partner
- Ashby applicationForm.submit: https://developers.ashbyhq.com/reference/applicationformsubmit
- Ashby authentication: https://developers.ashbyhq.com/docs/authentication
- SmartRecruiters Application API: https://developers.smartrecruiters.com/docs/application-api
- Workday Recruiting Put_Candidate: https://community.workday.com/sites/default/files/file-hosting/productionapi/Recruiting/v23.2/Put_Candidate.html

Terms of service

- Indeed legal: https://www.indeed.com/legal
- LinkedIn User Agreement: https://www.linkedin.com/legal/user-agreement
- LinkedIn, prohibited software and extensions: https://www.linkedin.com/help/linkedin/answer/a1341387
- Seek website terms (403, unverified): https://au.seek.com/terms
- Ashby terms: https://www.ashbyhq.com/terms
- My Greenhouse user agreement: https://my.greenhouse.io/users/agreement
- Chrome Web Store, spam and abuse policy: https://developer.chrome.com/docs/webstore/program-policies/spam-and-abuse

Law and regulator guidance

- GDPR Art. 4: https://gdpr-info.eu/art-4-gdpr/
- GDPR Art. 25: https://gdpr-info.eu/art-25-gdpr/
- GDPR Art. 32: https://gdpr-info.eu/art-32-gdpr/
- Irish DPC, EUR 91m Meta plaintext password fine: https://www.dataprotection.ie/en/news-media/press-releases/DPC-announces-91-million-fine-of-Meta
- LfDI Baden-Württemberg password fine (secondary): https://gdprhub.eu/index.php?title=LfDI_-_O_1018/115
- EDPB Guidelines 07/2020 on controller and processor: https://www.edpb.europa.eu/documents/guideline/guidelines-072020-on-the-concepts-of-controller-and-processor-in-the-gdpr_en
- OAIC, APP 11 security of personal information: https://www.oaic.gov.au/privacy/australian-privacy-principles/australian-privacy-principles-guidelines/chapter-11-app-11-security-of-personal-information
- OAIC, notifiable data breaches scheme: https://www.oaic.gov.au/privacy/privacy-guidance-for-organisations-and-government-agencies/preventing-preparing-for-and-responding-to-data-breaches/data-breach-preparation-and-response/part-4-notifiable-data-breach-ndb-scheme
- Privacy Act 1988 (Cth): https://www.legislation.gov.au/C2004A03712/latest/text
- Privacy and Other Legislation Amendment Act 2024: https://www.legislation.gov.au/C2024A00128/asmade
- Criminal Code Act 1995 (Cth): https://www.legislation.gov.au/C2004A04868/latest/text
- Spam Act 2003 (Cth): https://www.legislation.gov.au/C2004A01214/latest/text
- Directive 2013/40/EU: https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=celex%3A32013L0040
- Van Buren v. United States, 593 U.S. 374 (2021): https://www.law.cornell.edu/supremecourt/text/19-783
- hiQ Labs v. LinkedIn, 9th Cir. 18 April 2022: https://cdn.ca9.uscourts.gov/datastore/opinions/2022/04/18/17-16783.pdf
- hiQ consent judgment (secondary): https://www.privacyworld.blog/2022/12/linkedins-data-scraping-battle-with-hiq-labs-ends-with-proposed-judgment/
- Meta v. Bright Data client alert (secondary): https://www.quinnemanuel.com/the-firm/news-events/client-alert-meta-v-bright-data-significant-decision-for-web-scraping-industry/

Prior art and market

- AIHawk issue #1084, maintainer statement: https://github.com/feder-cr/Jobs_Applier_AI_Agent_AIHawk/issues/1084
- AIHawk README: https://github.com/feder-cr/Jobs_Applier_AI_Agent_AIHawk/blob/main/README.md
- Simplify Copilot help: https://help.simplify.jobs/articles/1749022-installing-and-setting-up-copilot
- Sonara PitchBook profile: https://pitchbook.com/profiles/company/527734-99
- CNBC on application volume, 29 October 2025: https://www.cnbc.com/2025/10/29/recruiters-are-drinking-through-a-fire-hose-of-job-applications-experts-say.html
- Greenhouse CEO on the "doom loop": https://finance.yahoo.com/technology/ai/articles/job-seekers-using-ai-apply-173021648.html
- Ashby application data, May 2026: https://www.prnewswire.com/news-releases/new-data-from-ashby-reveals-surge-in-applications-rising-selectivity-and-shifting-recruiter-workloads-302765846.html
- 404 Media on auto-application bots: https://www.404media.co/i-applied-to-2-843-roles-the-rise-of-ai-powered-job-application-bots/
