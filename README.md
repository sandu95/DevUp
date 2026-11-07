
# DevUp

University programming-course platform built with Express, TypeScript, Prisma/PostgreSQL, React, React Router and Vite. Visitors browse published courses; enrolled students read lessons, answer single-choice quizzes and track progress. Admins author draft content and publish validated courses.

## Local setup

Use Node.js 24, PostgreSQL (CI uses version 16), and npm. Install Microsoft Edge to use the default local browser-test configuration.

Create separate application and test databases in PostgreSQL:

```sql
CREATE DATABASE mrsutweb;
CREATE DATABASE mrsutweb_test;
```

In PowerShell, configure the backend:

```powershell
cd backend
npm ci
Copy-Item .env.example .env
Copy-Item .env.test.example .env.test
```

Edit the local files with your PostgreSQL connection details and a development JWT secret. The test URL must use the separate `_test` database. Real `.env` files are excluded from Git; only examples are committed.

```powershell
npm run db:generate
npm run db:deploy
npm run db:deploy:test
npm run dev
```

`db:deploy` applies migrations to the database in your application configuration. `db:deploy:test` explicitly loads `.env.test` and refuses database names that do not end in `_test`.

In another terminal:

```powershell
cd frontend
npm ci
npm run dev
```

Open `http://localhost:5173`. The default API is `http://localhost:3000/api`. Optional settings: backend `PORT` and `CORS_ORIGIN`; frontend `VITE_API_URL` (see `frontend/.env.example`).

Accounts are not seeded automatically. `POST /api/auth/register` creates a student. Course authoring requires a local user with the `ADMIN` role; public registration never grants that role.

## Content and publication rules

- Students can enroll in published courses only. Drafts are hidden from student learning APIs, including legacy draft enrollments. Admins can preview drafts without enrolling.
- Publication requires at least one lesson with a title and content. Every existing quiz must have questions, nonblank answer options, and exactly one correct option per question. A lesson without a quiz is valid.
- Published authoring content is immutable. Manual completion applies only to lessons without quizzes; a perfect quiz automatically completes its lesson in the same transaction as the attempt and answers.
- Course completion uses exact lesson counts. An incomplete course never displays a rounded 100%.

## Checks

From `backend`: `npm test` and `npm run build`.

From `frontend`: `npm run test:tooling`, `npm run lint`, `npm run typecheck:e2e`, `npm run build`, and `npm run test:e2e`. Run `npm audit` from each package to check the complete dependency tree.

Browser tests start isolated servers on ports 3001/5180 against `.env.test`, create their own accounts/content and remove them afterwards. They refuse to reuse existing servers. See [browser test instructions](frontend/e2e/README.md).

For Chromium instead of Edge, install it from `frontend` with `npx playwright install chromium`, set `PLAYWRIGHT_BROWSER_CHANNEL=chromium`, then run the browser tests. For example, in PowerShell: `$env:PLAYWRIGHT_BROWSER_CHANNEL = 'chromium'`.

The workflow in [.github/workflows/ci.yml](.github/workflows/ci.yml) runs on pushes and pull requests to `main`. It provisions an ephemeral PostgreSQL database, generates Prisma, applies migrations, runs full dependency audits, backend/frontend checks, lint-tooling compatibility tests and the browser suite in Chromium. Reports and traces are uploaded as CI artifacts. Check the repository's Actions tab for the latest result.

## Project references

- [Current context](docs/DEVUP_CONTEXT.md)
- [Lesson content and Markdown guide](docs/LESSON_CONTENT.md)
- [Admin authoring guide](docs/ADMIN_AUTHORING.md)
- [Performance and dependency review](docs/PERFORMANCE_AND_DEPENDENCIES.md)
- [Development notes](docs/DEVELOPMENT_NOTES.md)
- [Agent instructions](AGENTS.md)
