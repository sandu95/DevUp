# DevUp — project handoff context

Updated for transfer from a prior ChatGPT conversation on 2026-11-04.

> IMPORTANT: This document summarizes previous discussion, pasted source, and proposed changes. Not all changes were confirmed copied into the local repository. **Inspect the actual files and Git history before acting.**

## Verified local state — 2026-11-06

This section supersedes the historical proposals below. Recheck the working tree and Git history before editing.

- Current Git remote: `https://github.com/sandu95/DevUp.git`; working branch: `main`.
- The original stabilization baseline is commit `6971ca3`. The follow-up lifecycle/validation/CI work described below builds on that baseline; inspect Git for the current commit and working-tree state.

- Lesson listing requires authentication and enrollment, with admin preview access. Public course pages use curriculum metadata without lesson content.
- Manual completion requires enrollment for every role and rejects lessons with quizzes (409).
- Quiz submission checks enrollment in both controller and service. Attempts, answers, and perfect-score completion are committed in one transaction. Displayed scores use `Math.floor`; passing uses exact answer counts.
- Completion writes preserve the original timestamp on repeated and concurrent requests. API tests cover partial/perfect scores, retakes, concurrency, and transaction rollback.
- Lesson and quiz pages distinguish failed existence/progress checks from confirmed absence. Requests are cancelled on route changes; quiz submission has a synchronous duplicate-request guard.
- `AuthProvider` remains in `frontend/src/context/AuthContext.tsx`; context and `useAuth` are in `frontend/src/context/useAuth.ts`. The API client's default result type is `unknown`.
- Session restoration is cancelled on unmount, login, and logout. Stale responses are ignored. A 401 or 404 from `/users/me` clears the saved session; network/server errors preserve saved credentials.
- Admin loaders have complete effect dependencies and cancellation. Admin forms and the public course view reset when the route ID changes.
- Admin lesson/question forms suggest `max(position) + 1`, including after deletions. Server create/update endpoints validate positive 32-bit positions and return 409 for occupied positions. Existing content is not renumbered. Authoring API tests cover gaps, create/update conflicts, malformed fields, deletes, and published-course guards.
- Draft courses reject enrollment and learner progress writes for every role. Students cannot access draft lessons/quizzes or personal draft history, even with a legacy enrollment. Admin preview remains available without enrollment; draft preview has no learner completion controls.
- Publishing validates lesson content and every existing quiz: nonblank titles/text/options, at least one lesson/question/option, and exactly one correct option per question. Invalid publication returns 409 with actionable issues and does not save accompanying metadata. Lessons without quizzes remain valid.
- Auth/course/quiz/answer payloads reject malformed types; numeric IDs use positive PostgreSQL 32-bit limits. Duplicate registration, enrollment and quiz creation map unique conflicts to 409.
- Course progress uses `Math.floor`; course completion actions and badges use exact lesson counts. Enrollment creation returns current progress, including preserved progress after re-enrollment. API coverage verifies 199/200 is 99%, then 200/200 is 100%.
- Login, course enrollment, dashboard and catalog requests are cancelled on unmount; login/enrollment have synchronous duplicate-request guards. Search controls and mobile navigation have accessible names; admin rows wrap on narrow screens.
- Backend: 112 passing tests across 14 suites, including PostgreSQL API tests. Tests require `.env.test` with a database name ending in `_test` and override inherited environment configuration.
- Backend build, frontend build, and global frontend ESLint passed. `git diff --check` passed.
- Browser verification: 34 Playwright scenarios passed locally in Chromium (production preview) and installed Microsoft Edge (development server with Strict Mode, headless), with desktop and 390×844 mobile viewports. Covered public access, login/enrollment, manual completion/reload/logout, 401/404/500 session restoration, delayed old-session rejection during login, quiz lookup failure/retry, SPA navigation during a delayed lookup, keyboard radio selection, partial/perfect scores, duplicate submission prevention, failed retakes, unavailable progress, returning to the lesson/course after a perfect score, admin lesson/question/answer authoring, draft preview, failed/successful publication followed by student enrollment, cancelled delayed login, exact completion counts despite a legacy rounded percentage, mobile catalog/dashboard/admin navigation and all four admin forms with enlarged text.
- Browser testing found and fixed missing label associations in admin lesson/quiz/question/answer forms and stale edit state after deleting the edited answer option.
- Run `npm run test:e2e` from `frontend`; see `frontend/e2e/README.md`. The suite requires `backend/.env.test`, creates/removes its own records, and runs isolated API/frontend servers on ports 3001/5180. It refuses to reuse existing servers.
- Optional settings are backend `PORT` and `CORS_ORIGIN`, and frontend `VITE_API_URL`. Regular defaults remain 3000, `http://localhost:5173`, and `http://localhost:3000/api` respectively.
- Frontend E2E type-checking (`npm run typecheck:e2e`), lint, both builds, all 112 backend tests and all 34 browser scenarios passed. Screenshots/report are in ignored frontend `test-results/` and `playwright-report/` folders. Finish Prisma generation before browser testing because changing generated files restarts the watched test API.
- Setup is documented in the root README. Backend scripts `db:generate`, `db:deploy`, and `db:deploy:test` use the actual `prisma7.config.ts`; test migration deployment explicitly loads `.env.test` and refuses a database without the `_test` suffix. `.env.test.example` contains placeholders only. Local client generation and test migration deployment passed.
- `.github/workflows/ci.yml` uses Node 24/PostgreSQL 16, backend/frontend checks, test migrations and Chromium browser tests. `PLAYWRIGHT_BROWSER_CHANNEL=chromium` selects the CI engine; installed Edge remains the local default. The first remote run (41837108165, commit `6f3914b`) passed backend/frontend checks and 18/19 browser scenarios, then failed on `/admin` overflowing a 390px viewport. Explicit `grid-cols-1` on admin grids and wrapping lesson actions fix the layout; the enlarged-text regression reproduced 554px of page width before the fix and passed afterwards. Mobile failures now include dimensions and overflowing elements. Read GitHub Actions for the latest remote result.
- The original six-step lesson/quiz stabilization plan is complete. Step 6 now explicitly verifies cancellation of an old delayed quiz lookup during SPA navigation and confirms the completed lesson, Review action, course progress changing from 0/2 to 1/2 (50%), correct Continue destination, and persistence after reload following a perfect quiz.
- The UI consistency batch following `97be988` introduces shared `Button`/`ButtonLink`, `FormField`, `StatusBadge`, `ProgressBar`, `EmptyState`, `ErrorMessage` and `PageHeader` components, plus a shared course-card skeleton. Catalog, Courses and Dashboard now use the same CourseCard layout, spacing and indigo controls. Enrollment, cancellation and exact completion-count rules are preserved; no API contracts or dependencies changed.
- Course searches have visible labels, filters expose `aria-pressed`, progress bars expose their values, and loading skeletons have a status label. Loading failures show an alert without an empty-state message. The public catalog filters out drafts even with an active admin session; authenticated admin draft preview remains available in Courses. Three new browser scenarios cover loading/search/clear, filters and guarded enrollment, progress accessibility and API errors. UI screenshots are generated under ignored test-results paths and were reviewed on desktop/mobile.
- The lesson-reading batch (2026-11-05) adds react-markdown 10.1.0 and a shared LessonContent renderer for learner content and live admin preview. Headings, lists, emphasis, links, quotes and fenced code render semantically; the page keeps one h1. Plain-text line breaks remain visible. Raw HTML is escaped and unsafe link destinations remain filtered. Code blocks scroll horizontally and support keyboard focus. See docs/LESSON_CONTENT.md for authoring examples.
- LessonNavigation uses ordered curriculum metadata for published courses and the existing protected lesson list for admin drafts. Previous/Next handle gaps, boundaries and single-lesson courses without recording progress. Retry is independent of reading/completion. Requests are cancelled on route changes, and the newly loaded title receives focus. The five new scenarios cover content safety/layout, saved/live preview, navigation gaps/boundaries, retry, and stale-request cancellation including Strict Mode duplicate requests. Authoring tests wait for persisted option text and the ready Add option button before fixture cleanup.
- The original dependency review reduced frontend audit alerts to 10 moderate and backend alerts to 4 high. Remediation on 2026-11-06 now gives 0 findings in full and omit-dev audits for both packages. Prisma CLI/client/adapter-pg are pinned together at 7.10.1, whose upstream dependencies include deepmerge-ts 8.0.2 and mysql2 3.24.4. Scoped frontend overrides install minimatch 11.0.5 only for three ESLint/typescript-eslint consumers. See docs/PERFORMANCE_AND_DEPENDENCIES.md for compatibility checks and maintenance.
- The admin-authoring batch (2026-11-05) adds GET /courses/:id/publication-check, restricted to ADMIN (401/403/400/404 covered). A shared backend validator supplies structured readiness issues and the original publication error strings. Readiness is read-only and final publication still revalidates transactionally. Admin checklists link to the matching editors, retry failed reads and cancel stale requests. No correct-answer flags or authoring graph is returned.
- Admin forms now show field-linked errors, including server position/correct-answer conflicts. A shared modal replaces every window.confirm: Cancel is focused first; Escape/Cancel restore focus; unanswered confirmations cancel on unmount. Writes have duplicate guards and disabled controls. Failed deletions can be retried; list actions use separate rows for readable titles. See docs/ADMIN_AUTHORING.md.
- Local coverage now includes 112 backend tests and 34 scenarios per browser. The initial production JavaScript is 282.49 kB minified / 87.81 kB gzip, down from 501.51 / 142.37 kB. The >500 kB build warning is resolved without raising its threshold.
- The most recent remotely verified baseline is `3eb87a2`: GitHub Actions run `42131841831` passed all steps, including 34 Chromium scenarios on production assets. The subsequent dependency remediation and new audit/tooling gates are local changes and await a new commit/push/remote run.
- Page modules now load through top-level React.lazy imports, with Suspense inside the existing layouts so navigation stays visible. RouteContent handles failed downloads with Reload page and resets on pathname changes. Guards redirect before protected modules download. Home remains eager.
- AdminLessonPage is reduced from 595 to 155 lines; useLessonAuthoring keeps route cancellation, shared write guards, validation and edit state, while QuizForm and QuestionForm render controlled forms. API routes and schema are unchanged.
- PLAYWRIGHT_PREVIEW=true builds with the isolated API URL and tests production assets. This mode passed remote run 42131841831 for the performance batch. The security follow-up adds npm run test:tooling (three checks for discovery, ignores and parser/rule execution) and full dependency audit gates to CI. Before adding those tests, old/new minimatch produced exactly the same 49 linted files and diagnostics. Clean npm ci installations, client generation and test migration deployment passed. See docs/PERFORMANCE_AND_DEPENDENCIES.md.
- Optional future validation outside that plan: other browser engines and real mobile devices, broader visual/accessibility checks, and additional navigation/submission races beyond the covered scenarios.

## 1. Purpose and users
DevUp is an educational web platform built for a university project (MRSUTWEB). Visitors can explore courses; students enroll, read lessons, answer quizzes, and track progress; admins author and manage content. Primary aim is a functioning, coherent full-stack application, not an oversized LMS.

## 2. Technology
- Backend: Node.js/Express + TypeScript + Prisma 7.10.1 + PostgreSQL (`@prisma/adapter-pg`, `pg`). PostgreSQL local port 5432, database `mrsutweb` in the earlier environment.
- Frontend: React + TypeScript + Vite + Tailwind CSS + React Router.
- JWT authentication: frontend AuthContext, token currently stored in `localStorage`; API wrapper function `api<T>(endpoint, options)`; backend auth middleware `authenticate`, `authorize("ADMIN")`.
- Frontend dev origin historically `http://localhost:5173`; backend API historically `http://localhost:3000/api`.
- Main models: `User`, `Course`, `Lesson`, `Enrollment`, `LessonProgress`, `Quiz`, `Question`, `AnswerOption`, `QuizAttempt`, and a `QuizAnswer` relation used in service code. Inspect actual `schema.prisma` for exact fields/constraints.
- Roles: `STUDENT`, `ADMIN`; course statuses: `DRAFT`, `PUBLISHED`.
- GitHub repository at the time of previous discussions: `https://github.com/sandur95/Proiect`, branch `main`. Earlier Windows directory `D:\1 UTM\TI\MRSUTWEB\Proiect`.

## 3. Current application routes and UI structure
Frontend routes previously supplied:
- PublicLayout: `/` (HomePage), `/catalog` (CatalogPage), `/catalog/:id` (PublicCoursePage).
- Standalone login: `/login` (LoginPage).
- Protected AppLayout: `/dashboard`, `/courses`, `/courses/:id`, `/lessons/:id`, `/quizzes/:id`.
- Protected admin under AppLayout: `/admin`, `/admin/courses/:id`, `/admin/lessons/:id`, `/admin/questions/:id`.
- The app does NOT have a separate My Courses page. `CoursesPage` implements Explore Courses, with All / My / Available filters and search. Dashboard shows enrolled courses, progress stats, and a featured/next course.
- Reusable `CourseCard` displays enrolled course and progress.
- Public courses require login/enrollment to access lessons.
- Logout should navigate Home; student login should navigate Dashboard; admin login to Admin.

UI preference: minimalist Tailwind, off-white page background, white cards, slate palette and indigo accent; sidebar for authenticated views, simple top navigation for visitors, responsive/mobile navigation.

## 4. Important API contracts observed in frontend / backend
- `GET /courses` -> `{ courses: Course[] }` (assumed in recent frontend code; verify actual backend response).
- `GET /courses/:id` -> `{ course }`.
- `GET /courses/:id/curriculum` -> public curriculum data (verify response shape).
- `GET /lessons/course/:courseId` -> `{ lessons }`.
- `GET /lessons/:id` -> `{ lesson }` (enrollment-gated).
- `GET /enrollments/me` -> `{ enrollments: [{ id, enrolledAt, course, progress: { completedLessons, totalLessons, percentage } }] }`.
- `POST /enrollments/courses/:courseId` -> enrollment creation.
- `GET /progress/courses/:courseId` -> `{ progress: { courseId, completedLessons, totalLessons, percentage, lessons: [{ id, title, position, completed, completedAt }] } }`.
- `POST /progress/lessons/:lessonId/complete` -> manually mark lesson complete, **only without a quiz**.
- `GET /quizzes/lesson/:lessonId` -> `{ quiz: { id, title, lessonId } | null }` for student UI.
- `GET /quizzes/:id` -> `{ quiz: { id, title, lessonId, lesson:{id,courseId}, questions:[{id,text,position,options:[{id,text,questionId}]}] } }`; student response must not include `isCorrect`.
- `POST /quizzes/:id/submit` request `{ answers: [{ questionId, answerOptionId }] }`, response `{ message, result: { attemptId, score, correctAnswers, totalQuestions } }`.
- `GET /quizzes/attempts/me` for quiz attempts.
All paths above are relative to `/api`.

## 5. Quiz / progress business rules (agreed)
1. Only an enrolled learner can record their own lesson progress or submit quiz answers. Admin management/preview is a separate permission.
2. For lessons WITHOUT quizzes: enrolled learner can manually complete via progress endpoint.
3. For lessons WITH quizzes: manual completion is forbidden (HTTP 409); completion happens automatically on a quiz with every question correct.
4. For successful quiz: create QuizAttempt, QuizAnswer records, and mark LessonProgress in ONE Prisma transaction. Repeated attempts must not reset the original completedAt.
5. For imperfect quiz: save attempt but do not change LessonProgress; retry is allowed. A later failed attempt must not revert a previously completed lesson.
6. Calculate `passed = totalQuestions > 0 && correctAnswers === totalQuestions`. A rounded percentage of 100 is NOT sufficient. Displayed integer score may use `Math.floor(correctAnswers / totalQuestions * 100)` to avoid a false displayed 100.
7. Validate all submitted question IDs, option IDs, duplicates, and completeness on server. An empty quiz cannot be submitted.
8. Keep student quiz response safe from `isCorrect` leaks; admin-only endpoints may include it if routes are secured.
9. If quiz presence cannot be checked due to network/server error, do not allow manual completion on frontend.

## 6. Backend source examined in prior chat
### `backend/src/services/quiz.service.ts` (user pasted)
- CRUD services for Quiz/Question/AnswerOption.
- `getQuizForStudent` excludes `isCorrect`; `getQuizForAdmin` includes options.
- Existing `submitQuiz(quizId, userId, submittedAnswers)` checks existence, no-questions, exact answer count, duplicate questions, valid question/option, computes correctAnswers.
- Originally saved QuizAttempt + QuizAnswer in transaction, then outside transaction called `markLessonCompleted` if `score===100`. This was changed in discussion to keep attempt/answers/progress in one transaction and pass only on exact correct answer count. User pasted a revised `submitQuiz` confirming this modified structure (but verify disk).
- A further suggestion was to verify the user's course enrollment inside `submitQuiz` itself; user has not confirmed applying it.

### `backend/src/services/progress.service.ts` (user pasted)
- Originally `markLessonCompleted(userId,lessonId)` did a bare `lessonProgress.upsert` with no guard.
- Proposed replacement validates lesson, enrollment, no quiz and preserves existing completedAt. User has not confirmed on-disk replacement.
- `getUserProgress` reads user's LessonProgress; `getCourseProgress` formats progress for all course lessons.

### `backend/src/controllers/progress.controller.ts` (user pasted)
- Originally controller checked lesson existence, enrollment (except admin), quiz existence, then called `markLessonCompleted`; errors mostly mapped to 500.
- Proposed simplification moved invariant checking to service and mapped `LESSON_NOT_FOUND` -> 404, `NOT_ENROLLED` -> 403, `LESSON_HAS_QUIZ` -> 409. User has not confirmed applying it.
- Course-progress read still allowed admin bypass for reading; separate from recording progress.

### `backend/src/controllers/quiz.controller.ts` (uploaded in conversation)
- `getStudentQuiz`: validates ID, fetches sanitized quiz, checks enrollment for non-admin.
- `getAdminQuiz` uses admin version (with answers).
- `submit`: validates quiz ID, answers shape, checks enrollment for non-admin, calls `submitQuiz`, maps domain errors.
- Proposed improvement: robustly validate `null` or malformed answer array entries, require enrollment even for admin when SUBMITTING to record personal progress, map `NOT_ENROLLED` -> 403. On-disk application unconfirmed.
- Admin mutation controllers guard against editing quizzes in PUBLISHED courses.

### `backend/src/routes/quiz.routes.ts` (user pasted)
- `GET /attempts/me`, `GET /lesson/:lessonId`, `GET /:id`, `POST /:id/submit` use `authenticate` and controller checks.
- `/admin` quiz/question data and all mutation endpoints use `authenticate` + `authorize("ADMIN")`.
- Route patterns were judged not to conflict. File did not need changes.

## 7. Frontend source and recent design work
- Recent redesign suggestions/replacements provided for HomePage, PublicLayout, CatalogPage, PublicCoursePage, LoginPage, AppLayout, DashboardPage, CoursesPage, CourseDetailsPage, LessonPage, QuizPage. **Do not assume all are present on disk.**
- `CourseDetailsPage` fetches course, lessons, enrollments, and progress. Provides Enroll/Continue/Review actions, lesson list and progress.
- `QuizPage` fetches sanitized quiz, sends single-answer-per-question payload, shows result and retry. A revised downloadable `QuizPage.tsx` was created in chat, but its existence in local repo is unknown.
- `LessonPage`: previous version displayed Mark as completed EVEN when a quiz existed; additionally `catch { setQuiz(null) }` incorrectly treated API failures as no quiz. A revised downloadable `LessonPage.tsx` was provided in chat; user may still need to place it into repo. Check actual file. Correct condition is to render manual completion only if quiz lookup SUCCEEDED and confirmed `quiz: null`. Quiz lookup failure must show retry/error, not manual button. Runtime progress fetch failures must not be interpreted as `completed=false` definitively.
- `api.ts`: original generic 401 handling forcibly cleared auth and reloaded `/login`, causing unexpected redirection from dashboard. Proposed fix: API wrapper throws typed status, with auth state handled in AuthContext. Verify actual implementation.

## 8. Open work / verification priorities
1. Read current Git state, package scripts, actual Prisma schema, routes/controllers/services, and relevant frontend files; compare with this handoff.
2. Check quiz submit and lesson progress invariants end-to-end. Ensure no transaction split or admin bypass.
3. Check `LessonPage.tsx`: manual completion must only show after confirmed no-quiz; handle query failure; show accurate status after quiz.
4. Check `QuizPage.tsx`: true pass condition, honest completion status (avoid claiming DB completion without success).
5. Confirm API responses match frontend TypeScript assumptions; eliminate inconsistencies and generic 500 for anticipated domain errors.
6. Test: unenrolled student GET/POST quiz=403; manual completion WITH quiz=409; without quiz=200; 80% quiz not complete; 100% completes; failed retake retains completion/timestamp; duplicate/invalid answers=400; server/network error during quiz lookup does not reveal completion button.
7. Run `tsc`/build/test scripts available in both packages, and review HTTP results with Postman or integration tests.
8. After core flow is stable, return to responsive UI polish and authoring experience as needed. No separate My Courses route unless user asks.

## 9. Working agreements
- Speak Romanian with user. Keep UI labels and source identifiers in English.
- Be evidence-driven: don't claim a change was applied until confirmed on disk. Distinguish observed code from prior suggestions.
- Work incrementally and show exact edited files/diffs, with rationale; avoid arbitrary endpoint renaming or schema migrations.
- Before edits, verify original behavior with source and (if available) tests. Ask only for truly missing information; Codex can inspect files directly.
- Never expose credentials or edit `.env` secrets.
