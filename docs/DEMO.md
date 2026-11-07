# Reproducible local demo

The demo uses a separate local PostgreSQL database ending in `_demo`, API port **3002** and frontend port **5174**. The regular application and browser-test configuration keep their existing databases and ports. Nothing is seeded during normal startup.

## Setup

Use Node.js 24 and install both packages as described in the root README. Create a fresh database in PostgreSQL:

```sql
CREATE DATABASE devup_demo;
```

From `backend`:

```powershell
Copy-Item .env.demo.example .env.demo
```

Edit the local `.env.demo`: set its database connection, a separate `JWT_SECRET` of at least 24 characters and a `DEMO_PASSWORD` of at least 12 characters. Replace every placeholder. The password is shared by the three disposable demo accounts. The real file is ignored by Git; never copy its values into documentation or commits.

```powershell
npm run db:generate
npm run db:deploy:demo
npm run db:seed:demo
npm run dev:demo
```

In another terminal, from `frontend`:

```powershell
npm run dev:demo
```

Open **http://localhost:5174**. The frontend command always selects `http://localhost:3002/api`, regardless of the normal `VITE_API_URL`. The API command explicitly loads `.env.demo`, sets its separate port/CORS origin, and uses that file for subsequent dotenv loads. Commands reject production mode, remote database hosts, application/test database names, non-public schemas and connection overrides. Local database hosts supported are `localhost`, `127.0.0.1` and `::1`.

## Accounts and starting state

All three accounts use the password stored locally as `DEMO_PASSWORD`.

| Account | Role | Starting state |
| --- | --- | --- |
| `admin@demo.devup.local` | ADMIN | Authoring and draft preview; no learner enrollment |
| `learner@demo.devup.local` | STUDENT | Two enrolled courses, saved progress and three quiz attempts |
| `new@demo.devup.local` | STUDENT | Empty dashboard/history; ready for first enrollment |

| Course | Visibility | Demo learner progress |
| --- | --- | --- |
| JavaScript Foundations | Published, 3 lessons | 1/3 complete (33%); a 1/3 quiz result (33%) has not completed the quiz lesson |
| HTML and CSS Essentials | Published, 2 lessons | 2/2 complete (100%); a perfect quiz followed by a failed retake preserves completion |
| Git Workflow Basics | Published, 2 lessons without quizzes | Available for enrollment |
| TypeScript Workshop (Draft) | Admin only, lesson positions 1 and 3 | Intentionally missing the correct quiz option |

Content includes Markdown explanations, code blocks and short exercises. Historical attempts have fixed January 2026 dates, submitted answers, scores **33%, 100%, 0%**, and matching lesson progress. Dates display in the browser's timezone. Course and user IDs come from PostgreSQL; follow UI links instead of assuming numeric IDs.

## Suggested walkthrough

1. As a visitor, open Catalog: three published courses appear and the draft stays hidden.
2. Sign in as the demo learner. Compare the in-progress JavaScript course with the completed HTML/CSS course. Open Quiz history to review the three saved results.
3. Open JavaScript's **Arrays and functions** lesson. Its quiz answers are `const`, `map`, `8`. A perfect submission completes this lesson automatically; complete **Build a learning summary** manually to finish the course.
4. Review the completed HTML/CSS course. A failed retake adds history while its completion stays intact.
5. Sign in as the new learner to demonstrate enrollment and empty states, or enroll in Git Workflow Basics to demonstrate lessons without quizzes.
6. Sign in as admin. Open the TypeScript draft's Publication readiness, then its question editor. Add answer **number**, marked correct, to “Which type describes the value 42?”. The saved course is then ready to publish. Remove the ?(Draft)? suffix from its title in the course editor when publishing. Students can enroll after publication.

## Reruns and fresh presentations

Seeding is create-only and transactional. It requires an empty database on its first run and records dataset version 1 through its reserved admin account. An unrelated nonempty database is refused. A PostgreSQL transaction lock serializes concurrent seed commands.

Running `db:seed:demo` again preserves edits, added records, passwords, attempt history and original completion timestamps. Changing `DEMO_PASSWORD` in the file does not reset existing account passwords. Published content is never rewritten by a rerun. If the reserved dataset marker was removed or renamed outside the app, seeding refuses the nonempty database rather than trying to repair it.

For a fresh presentation, stop the demo API, create another empty database such as `devup_presentation_demo`, point `.env.demo` at it, deploy migrations and seed again. Restart the API and sign in again. There is no automatic reset or database-deletion command.

## Verification

`npm test` from `backend` includes configuration guards, baseline consistency, rerun preservation, rollback and concurrent seeding. Demo-seed tests create and remove a uniquely named temporary `_demo` database using the connection in `.env.test`; its PostgreSQL role therefore needs **CREATEDB**. Cleanup targets only that test-created database. CI's PostgreSQL service user already has this capability.

The existing browser suite continues to use `_test` and ports 3001/5180. It does not depend on the demo dataset. The demo was also checked in Chromium at its actual ports: catalog visibility, all three account logins, 33%/100% progress, available-course filtering, three history results, new-learner empty states, admin publication issue and enlarged mobile layout. Those checks did not modify the initial demo data.
