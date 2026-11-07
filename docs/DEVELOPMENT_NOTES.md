# DevUp / MRSUTWEB --- Development Notes

## 1. Project overview

**Project name:** DevUp

**Theme:** Web platform with programming courses.

The platform is designed around: - public course catalog; - course
details and curriculum; - lessons; - quizzes associated with lessons; -
student enrollment; - learning progress; - user accounts; -
administration of courses, lessons and quizzes.

### Main user roles

-   `STUDENT` --- can browse published courses, enroll, access
    enrolled-course content, complete lessons and take quizzes.
-   `ADMIN` --- manages courses, lessons and quizzes and has access to
    administrative functionality.

------------------------------------------------------------------------

## 2. Technical stack

### Backend

-   Node.js
-   Express `5.2.1`
-   TypeScript `7.0.2`
-   Prisma `7.10.1`
-   PostgreSQL
-   `@prisma/adapter-pg`
-   `pg`
-   JWT (`jsonwebtoken`)
-   `bcryptjs`
-   CORS
-   `tsx`

### Automated testing

-   Vitest `5.0.3`
-   Supertest `7.3.0`
-   `@types/supertest`

### Frontend

The project uses React for the frontend.

------------------------------------------------------------------------

## 3. Backend structure

The backend is organized into several layers:

``` text
backend/
├── prisma/
│   ├── migrations/
│   └── schema.prisma
├── src/
│   ├── controllers/
│   ├── lib/
│   ├── middleware/
│   ├── routes/
│   ├── services/
│   └── server.ts
├── tests/
├── .env
├── .env.test
├── .env.example
├── package.json
└── package-lock.json
```

### Main backend layers

**Routes** - define API endpoints and middleware.

**Controllers** - validate requests; - check
authentication/authorization; - return HTTP responses; - call services.

**Services** - contain business logic; - communicate with
Prisma/database.

**Middleware** - JWT authentication; - role authorization; - optional
authentication for public endpoints.

------------------------------------------------------------------------

## 4. Authentication and authorization

Authentication uses JWT.

The token contains:

``` text
userId
role
```

Supported roles:

``` text
STUDENT
ADMIN
```

### Middleware

`authenticate` - requires a valid Bearer token; - returns `401` when the
token is missing, invalid or expired.

`authorize("ADMIN")` - restricts an endpoint to administrators; -
returns `403` for users without the required role.

`optionalAuthenticate` - allows public access when no token is
supplied; - if a valid token is supplied, the request receives
authenticated-user context.

------------------------------------------------------------------------

## 5. Course access model

The course API distinguishes between public users, students and
administrators.

### Public users

Visitors can access published course information and the public
curriculum.

### Students

Students see published courses and can access course content after
enrollment.

### Administrators

Administrators can access draft courses and perform course management
operations.

### Course modification rule

Published courses cannot be modified through the protected
administrative operations.

------------------------------------------------------------------------

## 6. Enrollment

Enrollment is associated with a user and course.

Main operations:

``` text
GET    /api/enrollments/me
POST   /api/enrollments/courses/:courseId
DELETE /api/enrollments/courses/:courseId
```

Important rules:

-   authentication is required;
-   a student cannot enroll twice in the same course;
-   enrollment is required for student access to course content;
-   enrollment data includes calculated course progress.

------------------------------------------------------------------------

## 7. Lessons

Main operations include:

``` text
GET    /api/lessons/course/:courseId
GET    /api/lessons/:id
POST   /api/lessons
PATCH  /api/lessons/:id
DELETE /api/lessons/:id
```

Important rules:

-   lesson administration is restricted to `ADMIN`;
-   students must be enrolled in the course to access protected lesson
    content;
-   invalid lesson IDs return `400`;
-   missing lessons return `404`;
-   unauthorized students receive `403`.

------------------------------------------------------------------------

## 8. Progress

Main endpoints:

``` text
GET  /api/progress/me
GET  /api/progress/courses/:courseId
POST /api/progress/lessons/:lessonId/complete
```

Course progress is calculated from:

``` text
completedLessons
totalLessons
percentage
```

The percentage is calculated as:

``` text
completedLessons / totalLessons × 100
```

rounded to the nearest integer.

### Lesson completion rule

A lesson without a quiz can be completed directly.

A lesson with a quiz cannot be manually completed.

The API returns `409` when an attempt is made to manually complete a
lesson that has a quiz.

A lesson containing a quiz becomes completed after the student achieves
`100%` on that quiz.

------------------------------------------------------------------------

## 9. Quiz system

Quiz functionality includes:

-   quiz creation;
-   question creation;
-   answer option creation;
-   question/option update;
-   question/option deletion;
-   student quiz access;
-   quiz submission;
-   quiz attempts;
-   lesson completion based on quiz score.

### Quiz submission flow

``` text
Student
   ↓
Authenticated request
   ↓
Enrollment check
   ↓
Validate submitted answers
   ↓
Calculate score
   ↓
Create QuizAttempt
   ↓
If score = 100%
   ↓
Mark lesson completed
```

### Important validation rules

The API rejects:

-   invalid quiz IDs;
-   missing/invalid answer arrays;
-   incomplete answers;
-   invalid question IDs;
-   answer options belonging to another question;
-   duplicate question answers.

The public API uses the response:

``` text
400
Invalid quiz answers
```

for invalid question/answer/duplicate-answer cases.

------------------------------------------------------------------------

## 10. Database

PostgreSQL is used as the main database.

Development database:

``` text
mrsutweb
```

Testing database:

``` text
mrsutweb_test
```

The test database is intentionally separated from the development
database.

Prisma migrations are used to keep the database schema synchronized with
the project.

------------------------------------------------------------------------

## 11. Environment configuration

The development environment uses `.env`.

Automated tests use `.env.test`.

Sensitive values must not be committed to GitHub.

The repository should contain `.env.example` with placeholder values
instead of real credentials.

Typical variables include:

``` text
DATABASE_URL
JWT_SECRET
```

------------------------------------------------------------------------

## 12. Automated testing

Automated backend testing was added using:

``` text
Vitest
Supertest
```

Tests run against the dedicated:

``` text
mrsutweb_test
```

database.

The current suite contains:

``` text
112 tests
112 passed
```

The tests cover the main backend areas:

-   authentication;
-   authorization;
-   courses;
-   enrollments;
-   lessons;
-   progress;
-   quizzes;
-   validation and error cases.

### Running all tests

``` powershell
npm test
```

### Running a specific test file

Example:

``` powershell
npm test quiz.api.test.ts
```

### Testing principle

Tests should be isolated whenever possible.

A test should create and clean up the data it needs instead of relying
on data created by another test.

This became important during implementation because some tests initially
reused the same lesson/course and therefore inherited state from
previous tests.

------------------------------------------------------------------------

## 13. Testing lessons learned

### Separate test database

Using a separate database prevents automated tests from modifying
development data.

### Test isolation

A test that expects no `LessonProgress` should use a lesson that has not
been completed by another test.

### API contract vs internal errors

The API may intentionally map multiple internal service errors to the
same public response.

For example:

``` text
INVALID_QUESTION
INVALID_ANSWER_OPTION
DUPLICATE_QUESTION
```

are exposed as:

``` text
400
Invalid quiz answers
```

Tests should verify the public API contract rather than
implementation-specific internal error messages.

### Mocking

Vitest module mocks are hoisted. Test mocks must therefore avoid
referencing top-level variables before they are initialized.

------------------------------------------------------------------------

## 14. Important API endpoints

### Authentication

``` text
POST /api/auth/register
POST /api/auth/login
```

### Courses

``` text
GET    /api/courses
GET    /api/courses/:id
GET    /api/courses/:id/curriculum
POST   /api/courses
PATCH  /api/courses/:id
DELETE /api/courses/:id
```

### Lessons

``` text
GET    /api/lessons/course/:courseId
GET    /api/lessons/:id
POST   /api/lessons
PATCH  /api/lessons/:id
DELETE /api/lessons/:id
```

### Enrollment

``` text
GET    /api/enrollments/me
POST   /api/enrollments/courses/:courseId
DELETE /api/enrollments/courses/:courseId
```

### Progress

``` text
GET  /api/progress/me
GET  /api/progress/courses/:courseId
POST /api/progress/lessons/:lessonId/complete
```

### Quizzes

``` text
GET    /api/quizzes/attempts/me
GET    /api/quizzes/lesson/:lessonId
GET    /api/quizzes/:id
GET    /api/quizzes/:id/admin
POST   /api/quizzes
POST   /api/quizzes/:quizId/questions
POST   /api/quizzes/questions/:questionId/options
POST   /api/quizzes/:id/submit
PATCH  /api/quizzes/questions/:questionId
DELETE /api/quizzes/questions/:questionId
PATCH  /api/quizzes/options/:optionId
DELETE /api/quizzes/options/:optionId
PATCH  /api/quizzes/:id
DELETE /api/quizzes/:id
```

------------------------------------------------------------------------

## 15. Git and GitHub

The project is maintained in Git.

Important project files that should be versioned include:

-   source code;
-   test files;
-   `package.json`;
-   `package-lock.json`;
-   Prisma schema;
-   Prisma migrations;
-   `.env.example`;
-   project documentation.

Sensitive files such as `.env` and `.env.test` should remain excluded
from Git.

Example commit for automated testing:

``` powershell
git add .
git commit -m "add automated backend tests"
git push
```

------------------------------------------------------------------------

## 16. Current project status

### Completed

-   backend foundation;
-   PostgreSQL database;
-   Prisma schema and migration;
-   JWT authentication;
-   role-based authorization;
-   public course catalog;
-   courses;
-   enrollments;
-   lessons;
-   quizzes;
-   quiz submission;
-   lesson progress;
-   course progress calculation;
-   automated backend testing;
-   draft preview and published-only learner access;
-   validated publication with actionable errors;
-   exact course completion counts;
-   126 passing automated tests;
-   Git/GitHub versioning.

### Current verification state

``` text
Automated tests: 126/126 passed (17 suites, 2026-11-07)
Backend build: passed
Frontend build: passed, initial JavaScript about 285 kB minified, no chunk-size warning
Frontend ESLint: passed (0 errors, 0 warnings); 3 tooling compatibility tests passed
Final browser validation at point 6: 55/55 passed in Chromium production preview and Edge development/Strict Mode (headless)
Demo walkthrough at point 5: passed in Chromium; separate demo endpoints healthy during point 6
Viewports: desktop and mobile 390x844
Frontend E2E TypeScript: passed
Full and omit-dev npm audits: 0 findings in both packages (point 6)
Original lesson/quiz stabilization plan (steps 1-6): completed
Prisma client generation and test migration deployment: passed
CI baseline 468cd15: passed, including audits, tooling checks and 34 production Chromium tests; CourseDetails/Quiz, UI and history follow-ups verified locally
```

The follow-up work adds published-only learning access, admin draft preview, validation before publication, consistent payload/ID checks and conflict responses, exact lesson-count completion, cancellation of requests on navigation, accessible search/navigation controls, and wrapping admin rows on mobile. Publication failures keep the course and accompanying metadata unchanged. Quizless lessons are publishable; existing quizzes require questions, nonblank options and exactly one correct answer per question.

See the root README for reproducible setup and `backend/.env.test.example` for the test configuration template. `.github/workflows/ci.yml` provisions PostgreSQL 16 and runs Node 24 checks plus Chromium browser tests. The first remote run passed backend/frontend checks and 18/19 browser tests; the mobile admin screen overflowed. Admin grids now explicitly use a single shrinkable column below the desktop breakpoint, and lesson actions wrap. A regression with enlarged text reproduced the failure locally before the fix and passes afterwards. Mobile assertions include layout diagnostics. Check GitHub Actions for the latest remote result.

------------------------------------------------------------------------

The first UI consistency batch shares buttons/links, labeled fields, badges, progress bars, headers, errors, empty states and loading placeholders across Catalog, Courses and Dashboard. All three pages reuse CourseCard with explicit routes/actions; completion badges still use exact lesson counts. The public catalog omits drafts during admin sessions while Courses retains draft preview. Loading errors no longer also show an empty state. New browser coverage checks search/clear, All/My/Available filters, pending enrollment, accessible progress, and error states; desktop/mobile screenshots were reviewed. This batch adds no dependencies or API changes. It is verified locally with 23 scenarios in both Chromium and Edge; its CI status is separate from the remotely verified baseline.

The lesson-reading batch (2026-11-05) adds a shared react-markdown renderer to lessons and an optional live preview to the draft lesson editor. Content remains a string; no schema or API changes are needed. The learner page supports headings, lists, emphasis, links, quotes and scrollable/focusable code blocks, preserving plain-text line breaks and a single page h1. Raw HTML stays escaped and unsafe URLs remain filtered. Previous/Next navigation follows actual curriculum order, supports gaps and single-lesson courses, retries independently from progress, cancels stale requests and focuses the new title. Navigating never records completion. Five new browser scenarios bring the local suite to 28 per browser. See [the content guide](LESSON_CONTENT.md). npm audit reports 13 pre-existing alerts; installation left existing locked package versions unchanged.

The admin-authoring batch (2026-11-05) reuses publication validation in a protected read-only readiness endpoint and the publication transaction. Checklists link to editors and support retry/cancellation. Forms expose inline errors and write guards. A shared modal replaces delete confirmations, with keyboard cancellation, focus restoration and cascade descriptions. Responsive action rows keep titles readable. Four HTTP scenarios plus strengthened rule checks bring backend coverage to 112 tests; three browser scenarios bring the suite to 31 per engine. See [the admin guide](ADMIN_AUTHORING.md). The frontend build succeeds with a >500 kB main-chunk warning; route-based loading is a follow-up.

The performance/refactoring/dependency batch (2026-11-05) loads page modules on demand and handles loading/download failure inside the existing layouts. The initial entry drops from 501.51 to 282.49 kB minified, with no raised chunk threshold. AdminLessonPage separates its authoring hook and controlled forms. Three new browser scenarios bring the suite to 34 per browser; Chromium uses production preview and Edge retains development/Strict Mode coverage. The CI browser step uses preview mode; this performance batch passed remote run 42131841831 with all 34 Chromium scenarios. Compatible dependency updates reduce frontend findings from 13 to 10 moderate and backend findings from 8 to 4 high; audits were not clean at that stage, before the remediation below. Both builds, lint, E2E TypeScript, 112 backend tests, 34 scenarios per browser and npm ci dry runs passed. See [the detailed review](PERFORMANCE_AND_DEPENDENCIES.md).

The dependency remediation (2026-11-06) pins the Prisma family at stable patch 7.10.1, adopting upstream deepmerge-ts 8.0.2 and mysql2 3.24.4 without backend overrides. Scoped minimatch 11.0.5 overrides repair the three ESLint/typescript-eslint consumers. Full and omit-dev audits now report 0 findings in both packages; neither root tooling downgrades nor ignored advisories are used. The same 49 files and diagnostics were observed before/after minimatch replacement, and three permanent tooling tests verify discovery, ignores and parser/rule execution. Clean npm ci installations, client generation, isolated test migration deployment, 112 backend tests and both builds passed. CI includes tooling tests and full audits; the security batch was published as 468cd15 and passed run 42385365361. See [the remediation details](PERFORMANCE_AND_DEPENDENCIES.md).

The CourseDetails refactoring (2026-11-07, point 1 of the next plan) separates data/enrollment/progress logic into useCourseDetails and presentation into four course components. The route page is 108 lines instead of 568. Existing course access, copy/layout, retry, exact lesson completion, admin draft preview and abort/duplicate guards are preserved; no backend or database changes are needed. Four new browser scenarios bring local coverage to 38 per engine and include delayed reads/writes, enrollment retry and saved progress, and completed-course review/reload. Frontend build, lint, E2E TypeScript, three tooling tests and Chromium production/Edge development suites passed. Backend tests were not rerun for this frontend-only batch. Screenshots cover unknown progress on desktop and completed course details on mobile. This batch is local and uncommitted.

The QuizPage refactoring (2026-11-07, point 2) separates the original state/effects/handlers into useQuiz and renders questions, answered progress, submit controls and results through four components. QuizPage is 148 lines instead of 565. Student DTOs are separate from admin authoring DTOs. Exact answer counts still determine passing; a perfect result is confirmed with a progress read, and completion remains a server-side transaction. Four new scenarios check submit failure/retry with retained answers and duplicate prevention, cancellation of a pending submit, cancellation during post-submit progress verification, and a legacy 100% score with non-perfect answer counts. Browser coverage is now 42 scenarios per engine. Frontend build, lint, E2E TypeScript, tooling checks and Chromium production/Edge development suites passed; backend source/tests are unchanged for this batch. The earlier CourseDetails work is preserved locally.

The UI consistency batch (2026-11-07, point 3) extends shared buttons to public/learner/admin actions and uses announced loading states and reusable read-error retries. Initial failures recover in every data-backed page without discarding search/filter state. Lesson progress reads retry independently of quiz checks and cannot race a manual completion write. Quiz completion retries retain the result, perform only GET, prevent duplicates and cancel on navigation. Unknown SPA routes show an accessible 404 within the matching layout, while known admin routes retain their guards. Public navigation now wraps with enlarged mobile text. Eight new browser scenarios cover these paths, including focus/contrast and a single recorded quiz attempt across progress retries. Backend, schema, dependencies and mutation contracts are unchanged. Frontend build, lint, E2E TypeScript and three tooling checks passed, as did 50/50 Chromium production and 50/50 Edge development/Strict Mode scenarios. Captures for the focused 404 and mobile quiz-progress retry were reviewed. Backend tests were not rerun for this frontend-only batch. Points 1-3 are implemented locally; remaining work is quiz-attempt history and reproducible demo content.

The quiz-history batch (2026-11-07, point 4) adds /quiz-history and optional ?quizId filtering through the existing personal endpoint. Navigation is available to students and admins on desktop/mobile and from quiz results. The page shows recorded scores and dates, keeps incomplete attempts distinct, and never infers passing/completion from a historical percentage. Refresh/retry, invalid filters and stale-read cancellation use the shared UI and route/session isolation. The backend only tightens empty/repeated filter validation and adds an id tie-breaker for deterministic ordering; response shape, schema, submission and progress rules remain unchanged. Five HTTP scenarios verify ownership, publication visibility and filtering; five browser scenarios cover real saved attempts, filtering/reload, navigation, read recovery, cancellation and enlarged mobile text. Opening a quiz still uses the existing enrollment checks. The history endpoint currently returns all matching records without pagination. Both builds, frontend lint/E2E TypeScript, three tooling checks, all 117 backend tests across 15 suites and 55/55 browser scenarios in both Chromium production and Edge development/Strict Mode passed. Desktop/mobile captures were reviewed. Point 4 is complete locally.

The reproducible-demo batch (2026-11-07, point 5) adds explicit migrate/seed/serve commands for a dedicated local _demo database and separate 3002/5174 ports. A guarded ignored .env.demo supplies separate JWT/account secrets. The seed creates three accounts, three published courses plus an actionable draft, nine Markdown lessons, saved enrollment/progress and three quiz attempts with matching submitted answers. It refuses an unrelated nonempty database, is atomic and serializes concurrent runs; subsequent calls preserve all edits and saved learning state. Nine additional tests bring backend coverage to 126 across 17 suites. Both builds, frontend lint/E2E TypeScript/tooling, the demo migration and first/repeated seeds, both demo launchers and a read-only Chromium desktop/mobile walkthrough passed. The normal 55-case browser baseline from point 4 was not rerun because this batch changes only demo setup/data, not application UI/API behavior. Demo test fixtures require CREATEDB for the .env.test role and remove only their own randomly named _demo database. See [the setup and walkthrough](DEMO.md). Points 1-5 are complete locally; commit/push and a fresh remote CI run remain separate.

Final combined validation (2026-11-07, point 6) passed Prisma generation/test migration deployment, both builds, all 126 backend tests across 17 suites, frontend lint/E2E TypeScript, three tooling checks and all 55 scenarios in both Chromium production and Edge development/Strict Mode. Full and omit-dev audits returned zero findings in both packages. Git whitespace checks and environment-file exclusions passed, and fresh screenshots were reviewed. Local source required no further fixes in this step. The separate demo remained available. See [the final validation record](VALIDATION.md) for exact commands, scope and remote-CI status. Points 1-6 are complete. Check Git history and the matching GitHub Actions run for publication status.

## 17. Future development / remaining work

This section should be updated as the project evolves.

Remaining follow-up:

-   keep Prisma CLI/client/adapter versions aligned when upgrading;
-   remove scoped minimatch overrides once upstream ESLint/typescript-eslint consumers adopt patched versions directly, after rerunning tooling tests and lint;
-   all six local steps are complete: course/quiz refactoring, shared UI/read recovery, quiz history, demo content and final validation;
-   inspect the matching GitHub Actions run after publishing the completed batch;

-   monitor GitHub Actions results after changes;
-   verify Chromium results in CI and optionally additional real devices;
-   extend accessibility/visual review beyond the covered labels, keyboard selection and mobile viewport checks.

Potential areas to document when implemented:

-   frontend integration details;
-   dashboard behavior;
-   admin interface;
-   course/lesson management UI;
-   quiz management UI;
-   user profile functionality;
-   deployment configuration;
-   production environment configuration;
-   additional API and integration tests.

------------------------------------------------------------------------

## 18. Useful commands

### Development

``` powershell
npm run dev
```

### Build

``` powershell
npm run build
```

### Production start

``` powershell
npm start
```

### All tests

``` powershell
npm test
```

### Frontend browser tests

From `frontend`, run `npm run test:e2e`. Tests default to installed Microsoft Edge; `PLAYWRIGHT_BROWSER_CHANNEL=chromium` selects an installed Playwright Chromium. They start isolated servers on ports 3001/5180 against the database in `backend/.env.test`. See `frontend/e2e/README.md` for setup and report instructions. Reports and screenshots are excluded from Git.

### Specific backend test file

``` powershell
npm test <test-file>.test.ts
```

### Prisma migration deployment

``` powershell
npm run db:deploy
```

Use `npm run db:deploy:test` to explicitly load `.env.test` and apply migrations only to a database whose name ends in `_test`. Use `npm run db:generate` to regenerate the client with `prisma7.config.ts` before running builds or browser tests.

### Git status

``` powershell
git status
```

### Git push

``` powershell
git push
```

------------------------------------------------------------------------

## 19. Project decision log

The document should be updated whenever an important architectural or
business-rule decision is made.

Current decisions include:

1.  The platform is called **DevUp**.
2.  The course catalog is publicly accessible.
3.  Course/lesson learning content is protected by authentication and
    enrollment.
4.  `ADMIN` has management privileges.
5.  Students use quiz results to complete lessons that contain quizzes.
6.  A score of `100%` is required for automatic lesson completion.
7.  Automated tests use a separate PostgreSQL database.
8.  Automated tests use Vitest and Supertest.
9.  Tests are expected to be isolated and independent.
10. API tests validate the externally visible HTTP contract.
