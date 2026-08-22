# Open questions

Answer these before writing a spec. Each one changes the build.

## Product

1. Who is the first user? Engineers like me, or anyone? Narrow beats broad for v1.
2. Is the core value the resume generation, or the evidence base behind it? Pick one to lead with.
3. Does the public portfolio site ship in v1 or later?
4. Guided interview to extract portfolio detail: chat, or a form? Chat is better output, more work.

## Shape

5. Web app, desktop app, or CLI plus local web UI? Bring-your-own-key pushes toward local-first.
6. If hosted, who pays for hosting? If local-only, how do non-technical users install it?
7. Multi-user with accounts, or single-user per install?

## AI

8. Which providers at launch? A provider abstraction is cheap now and expensive later.
9. What runs on the model and what runs on plain code? Parsing, matching and scoring may not need
   a model at all.
10. How is hallucination blocked? Hard rule candidate: every resume line must trace to an inventory
    record ID, or it does not get written.

## Data

11. What is the canonical profile schema? This is the whole product. Consider JSON Resume as a
    starting point rather than inventing one.
12. Where does data live? Local files, SQLite, Postgres or Supabase?
13. Export and portability: users must be able to take their data and leave.

## Documents

14. Resume output format: docx, PDF, or both? Templates: user-supplied or built-in?
15. How do users bring their own template without the generator breaking on it?

## Job intake

16. Scraping job boards is against most terms of service. `Get_a_real_job` dodges this by keeping
    submission manual. What is the public app's answer? Paste-only is the safe default.
17. Auto-apply: tempting, and probably a legal and ethical trap. Decide early and write it down.

## Open source and licensing

18. Licence? MIT, AGPL, or source-available?
19. Is there a paid layer, or is this purely a portfolio and community piece?
20. Does the project accept contributions from day one, or ship first and open the door later?

## Migration

21. Does `Get_a_real_job` become a user of this app, or stay separate? If it becomes a user, my own
    data is the first real test case.
22. My private data must not leak into the public repo. Seed with fabricated data, same as
    mrb-platform does.
