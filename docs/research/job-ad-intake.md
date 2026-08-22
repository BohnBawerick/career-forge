# Job ad intake from a URL

Research for issue [#6](https://github.com/BohnBawerick/career-forge/issues/6). Answers open
question 16. Written 2026-08-22. Not legal advice.

## Recommendation

Ship a three-lane intake and never fetch a job board's HTML from a shared server. Lane one is
paste-the-text, always available in both deployment modes, and the only lane guaranteed to work
for every URL a user will ever hand us. Lane two is URL resolution restricted to an allowlist of
documented, unauthenticated, vendor-published read APIs: Greenhouse `boards-api`, Lever
`api.lever.co/v0/postings`, Ashby `posting-api/job-board`. Those three cover most direct company
career pages, they need no key, and reading them breaks nobody's terms because the vendor built
them to be read. Lane three is a single user-triggered fetch of an arbitrary URL, available only
in self-hosted mode, off by default, one HTTP request per button press, with robots.txt checked
and the result shown to the user before the fetch runs. The managed instance never gets lane
three, because a server fetching thousands of ads on many users' behalf is the exact activity
every board's terms name and block. If we later want URL intake to work on Seek, Indeed and
LinkedIn for managed users, the answer is a browser extension that reads the page the user
already has open, which is how Simplify, Teal and Huntr all solve it. That is a v2 item, not v1.

## Per-board table

| Board | Terms on automated access | robots.txt for ad pages | Structured data | Public read API |
|---|---|---|---|---|
| Seek (AU) | Prohibited without written consent. Explicit "designed for individual human use" clause plus an anti-circumvention clause naming rate limiting and fingerprinting. Content licensed for "personal, non-commercial use" only. | `Disallow: */job/` for `User-agent: *`. Ads live at `/job/<id>`, so every crawler is blocked. Also blocks `?` query URLs, `/graphql`, `/api/jobsearch/`. | Unverified. | No. `developer.seek.com` is partner-gated and posting-side. `positionProfile` reads only ads belonging to hirers you have a relationship with. |
| Indeed | Prohibited. Names "bots, scrapers, spiders, AI or Agentic AI" and grants crawl permission only "as outlined in our robots.txt". Job-seeker licence is "personal, non-commercial" and "automatically revoked" on other use. | `Disallow: /viewjob?`, `/job/`, `/Job/`, `/m/viewjob?`, `/jobs/US/`. Ad pages blocked for `*`. | Unverified. Indeed's documented ingestion path is XML feeds in, not JSON-LD out. | No. Publisher Programme is closed. Current APIs are partner write-side only. |
| LinkedIn | Prohibited absolutely. Section 8.2.2 bans "software, devices, scripts, robots ... (such as crawlers, browser plugins and add-ons)" used to scrape or copy. No personal-use carve-out. Section 8.2.4 also bans copying content obtained through third parties. | `User-agent: *` / `Disallow: /` at the end of the file, with a header comment saying automated access without permission is "strictly prohibited". Named crawlers get allowlists that still exclude every jobs path. | Unverified from any LinkedIn source. Third-party guides claim JSON-LD exists on public job pages. | No. Job Posting API is partner-gated, write-side, and closed to new partners. |
| Glassdoor | Prohibited without express written permission. Services are "for your personal, non-commercial use" absent a separate agreement. | Mixed. `/jobview/`, `/Jobs/*_P*.htm*`, `/api/`, `/graph` blocked, but ordinary `/job-listing/` pages are not blanket-disallowed for `*`. The ToS still requires written permission. | Unverified. | Retired. Glassdoor's help centre says it no longer supports API partnerships. |
| Greenhouse | No scraping clause found in any terms covering the hosted boards. The only bot clause sits in the My Greenhouse job-seeker agreement, and whether it reaches logged-out `job-boards.greenhouse.io` pages is unverified. | `job-boards.greenhouse.io`: the `Disallow: /` block is commented out, so nothing is blocked. `boards.greenhouse.io`: only `/embed/`. | Yes, vendor-confirmed. Greenhouse says it "adds metadata about job posts into the source code of job boards so Google web scrapers can parse the posts more easily", and documents which optional fields it omits. | Yes. `GET https://boards-api.greenhouse.io/v1/boards/{token}/jobs/{id}?questions=true`. No auth. No documented rate limit. |
| Lever | No scraping or bot clause in the terms of service. Restrictions cover service-bureau resale and reverse engineering only. | `jobs.lever.co`: `User-agent: *` / `Allow: /` with `Crawl-delay: 1`. Named AI training crawlers are disallowed, and a Cloudflare `Content-Signal: search=yes,ai-train=no,use=reference` line sets an express reservation. | Vendor help article exists but would not render. Unverified. | Yes. `GET https://api.lever.co/v0/postings/{site}/{id}`, EU instance at `api.eu.lever.co`. No auth for reads. The documented 429 limit applies only to application POSTs. |
| Ashby | No scraping, bot or automated-access clause. Section 5.1 bars building a competing product. | `jobs.ashbyhq.com`: blocks `/meeting/`, `/b/`, `/api/`. Job board paths allowed. | Partly. The `jobPosting.info` API returns a `linkedData` object documented for search-engine rich results, so Ashby generates the markup. Whether hosted `jobs.ashbyhq.com` pages emit it is unverified. | Yes. `GET https://api.ashbyhq.com/posting-api/job-board/{name}?includeCompensation=true`. No auth, no key, no documented limit. |
| Workday | No single terms page. Each tenant career site carries the employer's own terms, so there is nothing to reason about in general. Unverified. | Per tenant, no apex host. On `nvidia.wd5.myworkdayjobs.com`, `/wday/cxs/` is not disallowed, but rules vary and must be read per host. | Unverified. | No documented public API. Career sites call an undocumented internal endpoint, `POST /wday/cxs/{tenant}/{site}/jobs`. Undocumented means it can change or be shut off without notice, and Akamai bot management is reported in front of tenant sites. Treat as unavailable. |

Two patterns fall out of that table. The aggregators, the four whose business is the data, all
prohibit automated reading and block their ad paths in robots.txt. The ATS vendors, whose business
is software for employers, mostly publish a free unauthenticated read API and say nothing against
reading. Career-forge should live entirely on the second side of that line.

On robots.txt specifically: it is advisory, not access control. RFC 9309 says so directly, "These
rules are not a form of access authorization", and scopes itself to crawlers, "Crawlers are
automated clients". A single fetch a human just asked for is arguably outside that scope. Google
runs on exactly that reading for its own products: "Because the fetch was requested by a user,
these fetchers generally ignore robots.txt rules", covering Google Read Aloud, Gemini Notebook,
Google Messages link previews and others. That argument is real and worth having in our back
pocket. It does not help against a terms-of-service clause, which is what Seek, Indeed, LinkedIn
and Glassdoor actually rely on.

### Structured data, and why it does not rescue us

Google's JobPosting requirements are strict about placement, which is the useful part. The markup
"must appear on the same page as the job description that job seekers can read in their browser",
and "Users must be able to see the job posting details without the need to login". Required
properties are `datePosted`, `description`, `hiringOrganization`, `jobLocation` and `title`. Any
board that wants Google traffic therefore puts a complete, machine-readable copy of the ad on the
public page.

The catch is that JSON-LD sitting on a page we are not allowed to fetch is worth nothing. Markup
solves parsing, never permission. It matters for lane three and for a browser extension, where we
already have the HTML legitimately, and it means extraction is a solved problem there: run
`extruct` first, fall back to Readability or trafilatura plus a model pass.

Adoption numbers are thin. The Web Almanac 2024 structured data chapter does not report
JobPosting at all. The only figures I found are Web Data Commons domain counts, roughly 7,000
sites in 2017 to 63,000 in 2024, and I could not verify those against the WDC page itself. Treat
adoption as "probably high among boards that want Google traffic, unmeasured".

Google for Jobs still runs the organic widget in 2026. The Jobs API was killed in 2021 and the
paid Job Ads pilot in 2024. The EU antitrust thread, opened after 23 European job sites complained
in 2019 and pushed by Jobindex in 2022, produced no Commission decision I could find. Jobindex
settled its separate Danish case in February 2025. Status unresolved.

## Self-hosted versus managed, compared

This is the question that decides the design, so take it slowly.

The terms all bind a person. Seek licenses content for "your personal, non-commercial purposes".
Indeed permits use "for your personal, non-commercial purpose of seeking employment" and revokes
the licence the moment you use it for anything else. Glassdoor says the services are "for your
personal, non-commercial use". None of them contemplate a piece of software the user runs. They
contemplate a user and a purpose.

That gap is where self-hosting sits. When career-forge runs on the user's own laptop, on their own
residential connection, and fetches one ad because they clicked a button, the fetch is the user's
act. Their purpose is finding a job. Their volume is one. Nothing about it is distinguishable from
opening the page in a browser, which nobody argues is prohibited. Indeed's clause is the sharpest
of the four, and even it only revokes the licence for use "for any other purpose". The purpose is
unchanged.

When the managed instance fetches, everything changes at once. The requester is a company, not a
job seeker. The purpose is running a service, which is commercial by any reading. The volume is
every user's every ad, arriving from one IP. And there is now a defendant with an address, which
matters more than any of the doctrine below, because the practical risk in scraping has never been
losing a case. It is receiving a cease-and-desist and having to comply.

The practical picture points the same way.

Rate limiting and IP blocking do not treat the two modes alike. Self-hosted traffic arrives from a
residential IP with a browser-like fingerprint, one request at a time, minutes apart. Managed
traffic arrives from a datacentre ASN at whatever aggregate rate the user base produces. Cloudflare
scores bots on "headers, session characteristics, and browser signals" across billions of requests
a day, plus heuristic fingerprint matching and JavaScript detection for headless browsers. Its docs
do not name ASN reputation, but the practical result is well established: a datacentre IP running a
headless browser is the easiest thing in the world to classify. Seek and Glassdoor already block
plain HTTP clients at the edge hard enough that reading their own robots.txt required a text proxy.
Seek's terms go further and name the measures, "rate-limiting, traffic shaping and device
fingerprinting", then prohibit circumventing them. So the managed instance would be blocked, would
be tempted to buy residential proxies to get unblocked, and buying residential proxies to defeat a
block a site deliberately set is where a defensible position stops being defensible.

There is one more asymmetry worth naming. A managed instance that fetches and stores ads is
building a database of other people's postings. That is what the sui generis database right in the
EU exists to stop. A self-hosted instance holds the twenty ads its one user applied to, which is
not a database of anything.

Where this lands: self-hosted single fetch is defensible, low risk, and genuinely the user's act.
Managed server-side fetching is indefensible, and the fact that career-forge ships both modes is
not a reason to build one intake path. It is a reason to build a capability that exists in one mode
and not the other, and to say so plainly in the docs.

## Case law and its standing

The US line has moved a long way, and it has moved in a direction that matters: statutory claims
have narrowed, contract claims have not.

Van Buren v United States, 593 U.S. 374, decided 3 June 2021, read the CFAA's "exceeds authorized
access" narrowly. The Court adopted a "gates-up-or-down inquiry": one either can or cannot access a
computer system, and one either can or cannot access particular areas within it. Improper motive
for obtaining information otherwise available to you is not a federal crime. The Court expressly
left open whether the gates must be technological or can be contractual.

hiQ Labs v LinkedIn is the case everyone cites for "scraping public data is legal", and it ended
the other way. The Ninth Circuit twice held hiQ's scraping of public profiles likely did not
violate the CFAA. Then on 4 November 2022 the district court granted LinkedIn summary judgment on
breach of contract, holding that a user agreement banning scraping is enforceable, and that hiQ
had assented by creating a corporate account. A consent judgment followed on 6 December 2022:
$500,000, a permanent injunction ending all scraping of LinkedIn, and destruction of the derived
data. The CFAA portions of that stipulation carry no precedential weight because the parties agreed
them. The lesson is the one to carry into this design. hiQ won the statute and lost the contract,
and the contract is what shut it down.

Meta Platforms v Bright Data, N.D. Cal., 23 January 2024, is the most useful case here and the
least cited. Judge Chen held that Meta's terms could not be read to prohibit logged-off scraping of
public data, because the terms govern "your use" and a logged-off scraper is not a "user". He
leaned on Meta having deleted a pre-2009 clause that bound anyone merely "accessing" the site. He
also held the survival clause unenforceable to bind a former account holder in perpetuity. The
holding is fact-specific and depends entirely on how a given site drafted its terms. Seek and
Indeed both draft around exactly this, addressing the visitor rather than the account holder, so
Bright Data does not transfer to them. It is still the clearest statement that logged-out reading
of public pages is not automatically a contract breach, and one practitioner called it the most
important scraping opinion to date while conceding it sits "at odds with the bulk of historical
case law". Treat it as persuasive, not settled.

Ryanair v Booking.com is a mess and its current standing is unresolved. Ryanair sued under the CFAA
in 2020, unable to rely on its own terms because Irish law governed them. At summary judgment in
2024 the court followed hiQ, holding public data cannot ground a CFAA claim, while noting that a
cease-and-desist letter can revoke authorization to a protected portion of a site. A Delaware jury
found for Ryanair in July 2024 and awarded $5,000, the exact statutory minimum. The district court
then set the verdict aside as a matter of law because Ryanair had not proved $5,000 in loss.
Ryanair appealed to the Third Circuit; Booking asked the court to affirm on the alternative ground
that there was never a CFAA violation. EFF and the Reporters Committee filed amicus briefs urging
the court to hold that policy violations are not hacking. I found no Third Circuit opinion, and the
sources run out in late 2025. Unverified as of August 2026, so do not rely on it either way.

On the EU side there are two things to know.

Ryanair v PR Aviation, CJEU C-30/14, 15 January 2015, holds that the Database Directive's mandatory
lawful-user protections in Articles 6, 8 and 15 apply only to *protected* databases. If a database
qualifies for neither copyright nor the sui generis right, the owner is free to restrict its use by
contract, with no statutory floor to fall back on. The perverse result, noted widely at the time, is
that unprotected databases can end up better protected than IP law allows. For us it means a
European board's terms are the operative instrument, not the directive.

The sui generis right itself, Directive 96/9/EC Article 7(1), covers extraction of the whole or a
substantial part. A single job ad is an insubstantial part of a job board by any measure. Article
7(5) closes that gap for "repeated and systematic extraction ... of insubstantial parts" that
conflicts with normal exploitation or unreasonably prejudices the maker's interests, and
Directmedia, C-304/07, frames the test as whether the repeated takings reconstruct a substantial
part. One user pulling twenty ads over a job hunt does not reconstruct anything. A managed service
pulling every ad its users touch, month after month, is the exact pattern Article 7(5) describes.
Same asymmetry as everything else in this document.

One more EU angle. Article 4 of the DSM Directive 2019/790 allows text and data mining of lawfully
accessed works unless the rightholder has reserved the right "in an appropriate manner, such as
machine-readable means". An Amsterdam court held in 2024 that the reservation must be
machine-readable. Lever's robots.txt carries `Content-Signal: ai-train=no, use=reference`, which
is precisely such a reservation. It permits reference use and forbids training use, so reading a
Lever ad to extract requirements stays inside it. Feeding ad text to a model is a question worth
keeping separate from fetching it.

Australia has no equivalent of the CFAA reaching public pages, and no EU-style database right.
Criminal Code Act 1995 s 478.1 covers unauthorised access to *restricted* data, meaning data behind
a password or access control, so it does not reach public job ads. Copyright protection for factual
compilations was narrowed sharply by IceTV v Nine Network (2009), which criticised the sweat-of-
the-brow reasoning in Telstra v Desktop Marketing. So in Australia the exposure is contract, and
contract only, which puts Seek's terms back at the centre.

## Third-party resolver services

Only two services genuinely take a URL and hand back a JobPosting object.

Diffbot's Job API is `GET /v3/job?url=...`, one listing per request, currently beta, returning
title, employer, datePosted, location, skills, remote status and salary. It costs one credit per
Extract request, two with proxy. A free tier of 10,000 credits and paid tiers around $299 a month
are reported but I could not confirm them on the docs page. Zyte API treats `jobPosting` as a
first-class automatic-extraction type alongside product and article, priced per successful request
across five HTTP and five browser tiers, with failures free. Neither publishes clear
redistribution terms, and both of them are scraping the same blocked pages we would be, which
moves the ToS problem rather than solving it.

Everything else is bulk search, not URL resolution. Fantastic.jobs sells feeds from $1 per 1,000
jobs self-serve up to $4,000 a month managed. TheirStack is search-only, free for 200 credits a
month, $49 a month for 1,500. Coresignal starts at $49 a month and rises to $800 plus. Bright Data
sells datasets at $2.50 per 1,000 records. SerpApi's Google Jobs endpoint is query-based, free for
250 searches a month, $25 for 1,000. JSearch has a `/job-details` endpoint but it keys off their
own job ID, not an arbitrary URL. Apify hosts per-board actors whose authors warn the results
contain personal data and that the ToS risk is yours.

The cautionary tale is Proxycurl. LinkedIn sued in January 2025 over fake accounts and mass
scraping, Proxycurl settled, was ordered to delete all LinkedIn data, and shut down on 4 July 2025.
A paid API is not insulation.

Open source splits cleanly. JobSpy (MIT) scrapes LinkedIn, Indeed, Glassdoor, Google, ZipRecruiter
and more, with proxy rotation built in, which hands the entire terms problem to whoever runs it.
The extraction libraries do not have that problem because they parse HTML you already hold:
extruct (BSD-3) for JSON-LD, microdata and RDFa, Mozilla Readability (Apache-2.0), trafilatura
(Apache-2.0 from 1.8.0, GPLv3+ before that). No library does Readability plus schema.org
JobPosting in one step, so the build is extruct first with Readability or trafilatura as fallback.
That is the right stack for lanes two and three and for any future extension.

Official aggregator APIs exist but none of them help. Adzuna is free with a key and covers
Australia, but the limits are 25 requests a minute, 250 a day, 2,500 a month, descriptions are
truncated, links redirect through Adzuna, attribution branding is mandatory at a specified pixel
size, and commercial use beyond a 14-day trial needs written consent. Jooble grants 500 requests
per key for the lifetime of the key. Germany's Arbeitsagentur Jobsuche API is effectively open via
a publicly known static key, but it is German jobs only and has no official developer programme.
EURES has no public query API, only an unofficial reverse-engineered spec. Australia has no public
postings API that I could find: APSJobs runs on Salesforce Experience Cloud with no documented
REST interface, and Workforce Australia offers contract-based posting integration only. USAJOBS is
free and self-serve but federal-only, and its terms restrict the data to the registering company.
None of these resolve a URL the user pasted, which is the actual job.

## Fallback design

Paste-the-text is always legal. The question is how much it costs the user.

Honest answer: less than it looks, and I could not find a measured number, so this is an estimate.
The user is already on the ad page, because that is where the URL came from. Copy-all is
Ctrl+A Ctrl+C, then Ctrl+V into a textarea. That is three keystrokes and one extra page visit
versus one paste of a URL. The real costs are not keystrokes. They are that pasted text arrives
with navigation chrome, cookie banners and "similar jobs" blocks mixed in, and that the URL,
company and posting date have to be re-derived or typed. Both are fixable. A model pass cleans
chrome out reliably, and we can ask for the URL as a separate optional field purely as a record,
never fetching it.

The comparison that matters is not paste versus URL. It is paste versus a URL lane that works on
maybe a third of pastes and fails silently on the rest. A fallback that is always correct beats a
primary path that is sometimes correct, and building paste first means lanes two and three are
optimisations rather than load-bearing.

A browser extension closes the gap almost completely, and there is clear precedent. Simplify
Copilot reads the page you are on, autofills across 100+ ATS and 20,000+ career sites, and parses
LinkedIn and Indeed descriptions. Teal's Job Search Companion auto-populates from 40+ boards. Huntr
does the same with a "Save to Board" button. All three degrade to a manual form when they do not
recognise the page, which is the detail worth copying. An extension inverts the legal question
entirely: the page was fetched by the user's own browser, in their own session, as a human visit.
Nothing automated fetched anything. LinkedIn's section 8.2.2 does name "browser plugins and
add-ons", so LinkedIn specifically is still off the table, but Seek, Indeed and Glassdoor are all
written against automated *access*, and an extension does not access anything.

The cost of an extension is real: two store review processes, Manifest V3, and Chrome's limited use
policy, which requires that collection of browsing activity be "required for a user-facing feature
described prominently" on the store page and that data only go to third parties where "necessary
to providing or improving your single purpose". Sending page content to the user's own self-hosted
instance fits that, but it needs a disclosure and an affirmative compliance statement. That is a
v2-sized piece of work with its own release cadence, so it should not gate v1.

A bookmarklet is the cheap version and I do not think it works. It needs no store review, but
Content Security Policy on most large sites blocks injected script or its outbound fetch, and the
user has to drag a link to a bookmarks bar that many browsers now hide by default. Cheap to try,
not something to plan around.

So the fallback ladder, in order of what v1 ships:

1. Paste the text. Universal, legal everywhere, works on day one.
2. Paste a URL that matches the Greenhouse, Lever or Ashby API allowlist. Resolved through the
   vendor's own documented endpoint. No HTML fetched, no terms engaged.
3. Self-hosted only, opt-in, default off: fetch this one URL from my machine. One request per
   click. No crawl, no retry storm, no background refresh. Check robots.txt, show the user what it
   says, let them proceed. Store the extracted text in their record and nothing else.
4. v2: browser extension for the managed instance, which is the only way managed users ever get
   URL intake on Seek, Indeed or Glassdoor.

Two rules to write into the code and the docs now. The managed instance must have no code path
that fetches a user-supplied URL, so the split is structural rather than a config flag someone
flips later. And nothing we fetch gets shared between users or retained beyond the user's own
application record, which keeps us clear of Article 7(5) and of every "database of postings"
argument.

## Open questions

- Does the My Greenhouse user agreement's bot clause reach logged-out `job-boards.greenhouse.io`
  pages? If it does, lane two loses Greenhouse and needs re-checking. Nobody has tested this.
- Does Lever emit JobPosting JSON-LD on `jobs.lever.co`? Their help article would not render. Only
  matters for lane three, since lane two uses the API.
- What is the Third Circuit doing in Ryanair v Booking.com? No opinion found. Worth one search
  before any decision that leans on CFAA reasoning.
- Are the ATS read APIs rate limited in ways they do not document? Greenhouse, Lever and Ashby all
  document limits for writes and nothing for reads. Build a client-side limit anyway and back off
  on 429.
- Lever's `ai-train=no` content signal permits reference use and forbids training use. Where does
  "send the ad text to Claude to extract requirements" sit? Inference is not training, but this
  deserves its own decision, probably in the AI provider ticket rather than here.
- Should lane three honour robots.txt or just report it? I have written it as "check and show".
  The Google user-triggered-fetcher precedent supports ignoring it outright for a fetch a human
  asked for. Showing it costs nothing and looks better if anyone asks.
- Workday coverage. Its undocumented `/wday/cxs/` endpoint would cover a lot of enterprise
  postings, and I have deliberately excluded it. Revisit only if user demand is real, and never on
  the managed instance.

## Sources

Terms and robots.txt

- https://au.seek.com/terms
- https://www.seek.com.au/robots.txt (403 to non-browser clients; read via `https://r.jina.ai/`)
- https://www.indeed.com/legal
- https://www.indeed.com/robots.txt
- https://www.linkedin.com/legal/user-agreement
- https://www.linkedin.com/robots.txt
- https://www.glassdoor.com/about/terms.htm (403 direct; read via `https://r.jina.ai/`)
- https://www.glassdoor.com/robots.txt
- https://my.greenhouse.io/users/agreement
- https://job-boards.greenhouse.io/robots.txt
- https://boards.greenhouse.io/robots.txt
- https://www.lever.co/legal/terms-of-service/
- https://jobs.lever.co/robots.txt
- https://www.ashbyhq.com/terms
- https://jobs.ashbyhq.com/robots.txt
- https://nvidia.wd5.myworkdayjobs.com/robots.txt

APIs and developer docs

- https://developers.greenhouse.io/job-board.html
- https://github.com/grnhse/greenhouse-api-docs
- https://github.com/lever/postings-api
- https://developers.ashbyhq.com/docs/public-job-posting-api
- https://developers.ashbyhq.com/reference/jobpostinginfo
- https://developer.seek.com/
- https://learn.microsoft.com/en-us/linkedin/talent/job-postings/api/overview
- https://help.glassdoor.com/s/article/Glassdoor-API
- https://developer.adzuna.com/docs/terms_of_service
- https://jooble.org/api/about
- https://jobsuche.api.bund.dev/
- https://developer.usajobs.gov/

Structured data and crawling standards

- https://developers.google.com/search/docs/appearance/structured-data/job-posting
- https://developers.google.com/search/docs/crawling-indexing/google-user-triggered-fetchers
- https://www.rfc-editor.org/rfc/rfc9309.html
- https://support.greenhouse.io/hc/en-us/articles/115003185526-Job-post-visibility-on-Google-for-Jobs
- https://almanac.httparchive.org/en/2024/structured-data
- https://developers.cloudflare.com/bots/concepts/bot-score/

Case law

- https://www.supremecourt.gov/opinions/20pdf/19-783_k53l.pdf (Van Buren, 593 U.S. 374)
- https://en.wikipedia.org/wiki/Van_Buren_v._United_States
- https://law.justia.com/cases/federal/appellate-courts/ca9/17-16783/17-16783-2022-04-18.html
- https://newmedialaw.proskauer.com/2022/11/11/court-finds-hiq-breached-linkedins-terms-prohibiting-scraping-but-in-mixed-ruling-declines-to-grant-summary-judgment-to-either-party-as-to-certain-key-issues/
- https://www.zwillgen.com/alternative-data/hiq-v-linkedin-wrapped-up-web-scraping-lessons-learned/
- https://www.fbm.com/publications/major-decision-affects-law-of-scraping-and-online-data-collection-meta-platforms-v-bright-data/
- https://www.quinnemanuel.com/the-firm/news-events/client-alert-meta-v-bright-data-significant-decision-for-web-scraping-industry/
- https://www.hklaw.com/en/insights/publications/2024/08/district-court-ruling-offers-insight-into-computer-fraud
- https://www.eff.org/deeplinks/2025/07/ryanairs-cfaa-claim-against-bookingcom-has-nothing-do-actual-hacking
- https://www.rcfp.org/briefs-comments/ryanair-v-booking-com/
- https://www.pinsentmasons.com/out-law/news/website-operators-can-prohibit-screen-scraping-of-unprotected-data-via-terms-and-conditions-says-eu-court-in-ryanair-case
- https://www.wipo.int/wipolex/en/text/126788 (Directive 96/9/EC)
- https://eur-lex.europa.eu/legal-content/EN/TXT/PDF/?uri=CELEX:01996L0009-20190606
- https://ipkitten.blogspot.com/2025/02/dutch-court-holds-that-tdm-opt-out-must.html
- https://legalblogs.wolterskluwer.com/copyright-blog/the-new-copyright-directive-text-and-data-mining-articles-3-and-4/
- https://www.gtlaw.com.au/knowledge/screen-scraping-legal-or-not
- https://en.wikipedia.org/wiki/Telstra_Corporation_Ltd_v_Desktop_Marketing_Systems_Pty_Ltd

Resolver services and extensions

- https://www.diffbot.com/docs/extract/job
- https://docs.zyte.com/zyte-api/usage/extract/index.html
- https://theirstack.com/en/pricing
- https://coresignal.com/pricing/
- https://brightdata.com/pricing/datasets
- https://serpapi.com/pricing
- https://www.openwebninja.com/api/jsearch
- https://nubela.co/blog/goodbye-proxycurl/
- https://github.com/speedyapply/JobSpy
- https://github.com/scrapinghub/extruct
- https://github.com/mozilla/readability
- https://trafilatura.readthedocs.io/
- https://chromewebstore.google.com/detail/simplify-copilot-autofill/pbanhockgagggenencehbnadejlgchfc
- https://chromewebstore.google.com/detail/teal-job-search-companion/opafjjlpbiaicbbgifbejoochmmeikep
- https://chromewebstore.google.com/detail/huntr-job-search-tracker/mihdfbecejheednfigjpdacgeilhlmnf
- https://developer.chrome.com/docs/webstore/program-policies/limited-use
