# Performance and dependency review

Performance measurements were verified on 2026-11-05. The performance batch was published as `3eb87a2` and passed GitHub Actions run `42131841831`. Dependency remediation was verified locally on 2026-11-06, published as 468cd15 and passed GitHub Actions run 42385365361. The CourseDetails/Quiz refactorings, UI consistency and quiz history work below are local work verified on 2026-11-07.

## Route loading

Home and the layouts remain available in the initial bundle. Other pages use top-level [React lazy imports](https://react.dev/reference/react/lazy). Each layout keeps its navigation outside the page's Suspense boundary. Login has the same boundary without a surrounding layout.

RouteContent provides an accessible Loading page status and a page error boundary. Failed module downloads show Reload page; a full reload retries the import, whose rejected promise React otherwise caches. Changing the pathname resets the boundary. API errors continue to use each page's existing handling. Authentication and role guards run before protected page components render, and server authorization remains required.

Measured production build output for the original route-splitting batch:

| JavaScript | Before | After |
| --- | ---: | ---: |
| Initial entry, minified | 501.51 kB | 282.49 kB |
| Initial entry, gzip | 142.37 kB | 87.81 kB |
| Deferred Markdown renderer | included in entry | 119.65 kB / 36.17 kB gzip |

The initial entry is about 44% smaller before compression. Other route/shared chunks are fetched when needed; this does not mean the sum of all application files became 44% smaller. No chunk warning threshold was raised, and the production build no longer reports a chunk over 500 kB.

## Targeted refactoring

The initial extraction reduced AdminLessonPage from 595 to 155 lines (currently 152 after shared UI adoption). useLessonAuthoring owns loading, quiz/question mutations, form state and validation, confirmation requests, synchronous duplicate guards and cancellation on unmount. QuizForm and QuestionForm render the controlled forms. Admin-only response types live in types/authoring.ts, including correct-answer flags; student quiz contracts are unchanged.

The route wrapper still keys the content by lesson id. Existing ids, labels, field errors, order suggestions, publication guards and edit-state resets are preserved. Further refactoring follows one workflow at a time; CourseDetailsPage and QuizPage are described below.

### Course details (2026-11-07)

The initial extraction reduced CourseDetailsPage from 568 to 108 lines (currently 100 after shared UI adoption). useCourseDetails preserves the original loading, enrollment, progress and derived completion/next-lesson logic. It retains one route AbortController, the synchronous enrollment guard and progress retry. Route content is keyed by course and session identity. Presentation is split into CourseSummary, CourseProgressPanel, CourseActionCard and CourseCurriculum, with the original DOM structure, text and Tailwind styles at extraction time; the later shared-UI batch below unifies controls and progress rendering. CurriculumLesson and course-progress DTOs live alongside the existing Course/Enrollment types.

No HTTP or Prisma contract changed. Unknown progress still shows Open actions and retry rather than a fabricated 0% or a guessed Continue destination. Completion still checks every curriculum lesson id. Client-side cancellation prevents stale UI updates; it does not guarantee rollback of a request already accepted by the server.

Four new browser scenarios cover failed enrollment/retry and duplicate prevention, saved progress recovery, cancelled delayed metadata reads, a delayed enrollment during same-document history navigation to another course, and completed-course review/reload. Captures include course-details-progress-unknown.png and course-details-completed-mobile.png. This batch brought the suite to 38 scenarios per browser.

### Quiz (2026-11-07)

The initial extraction reduced QuizPage from 565 to 148 lines (currently 147 after shared UI/history adoption). useQuiz owns loading, selected answers, ordered questions, answered counts, submission/retake and completion verification. A one-off AST comparison confirmed that the 17 original state/effect/handler/derived declarations were preserved. QuizQuestionCard renders the native fieldset/legend/radio controls; QuizProgressPanel renders answered progress; QuizSubmitBar renders the guarded submit controls; QuizResultPanel renders result and completion messages. The initial extraction preserved markup, labels, copy and styles; shared-UI and history changes follow below. The route/session key isolates answers and results between quiz instances.

Student DTOs in types/quiz.ts exclude isCorrect and do not reuse admin authoring DTOs. No API or Prisma contract changed. Passing still requires totalQuestions > 0 and correctAnswers === totalQuestions in both submit handling and result presentation. The frontend never writes manual lesson completion after a quiz; it reads server progress to distinguish checking, confirmed, not-recorded and unknown completion states. The synchronous submission guard and route AbortController remain active through that read. Cancelling the read does not roll back an already committed attempt/completion.

Four new browser scenarios exercise HTTP submit failure/retry without lost answers, disabled controls and duplicate prevention, cancellation of a delayed submit before opening another quiz, cancellation of a delayed completion read after the server has recorded completion, and a mocked legacy 100% result with only 2/3 correct answers followed by a clean retake. That batch brought local suites to 42 scenarios per browser. The submit-error screenshot is quiz-submit-error.png; existing perfect-quiz.png and mobile-quiz.png captures cover the extracted components.

### Shared UI and read recovery (2026-11-07)

Shared Button/ButtonLink styles now cover public, learner and admin actions, including outlined destructive controls. LoadingState announces initial loads and hides visual skeletons from assistive technology. ErrorMessage optionally offers a read retry; mutation failures retain their explicit form actions. Initial retries do not clear catalog/course filters or overwrite mounted admin editors. Course progress uses the shared accessible ProgressBar. Existing quiz progress retains question-count aria values.

Lesson progress can be reread separately from quiz existence; manual writes wait for an in-flight retry, and both actions have synchronous guards. Perfect-score progress retries only GET the saved completion, retaining the result and original completion timestamp. Failed/unconfirmed verification uses amber feedback. Route changes abort these reads. Unknown SPA URLs select the existing public/authenticated layout and focus the 404 heading. Wrapping public navigation fixes overflow at 390px with enlarged text.

Eight additional browser scenarios cover recovery, no false empty/edit states, keyboard focus, primary-button contrast of at least 4.5:1, duplicate suppression and cancelled progress retries. The suite now contains 50 scenarios per browser. No HTTP, Prisma or dependency change is part of this batch.

### Quiz history (2026-11-07)

QuizHistoryPage remains a lazy route (about 4 kB minified in the production build) and reuses existing UI without new dependencies. The initial entry is 284.51 kB minified, with no chunk-size warning. useQuizAttempts cancels initial/retried reads when the quiz filter or session changes. QuizAttemptCard shows only the existing personal-history DTO; no answers or correctness flags are requested. A stored score does not prove passing or lesson completion, and a nullable completedAt is handled explicitly. The existing endpoint is unchanged in shape, with strict empty/repeated filter validation and deterministic ordering of equal timestamps. No schema or progress/submission changes are needed. Five HTTP tests bring backend coverage to 117 across 15 suites; five browser scenarios bring coverage to 55 per browser. Both builds, frontend lint/E2E TypeScript, three tooling checks, the complete backend suite and all 55 Chromium production/Edge development scenarios passed. Desktop/mobile captures were reviewed.

### Reproducible demo (2026-11-07)

The optional demo commands and content add no dependencies or browser imports. Regular runtime routes and schema are unchanged. The backend build compiles the guarded demo CLI and content; the frontend launcher explicitly selects a separate API URL. The create-only seed and configuration have nine tests, bringing the backend suite to 126 across 17 suites. Demo integration tests create an ephemeral _demo database and require CREATEDB for the configured test role. Both builds and frontend checks passed. Local migration, repeated seed and an actual read-only Chromium walkthrough of the isolated demo passed, with desktop/mobile captures reviewed. The 55-scenario Chromium/Edge baseline remains the point-4 run and was not repeated for this setup/data batch. See [the demo guide](DEMO.md).

## Dependency review

These are npm audit package counts, including packages flagged through another dependency; they are not counts of independent application exploits. Both full audits now exit successfully with zero findings.

| Audit | Before performance batch | After 2026-11-05 | After remediation |
| --- | --- | --- | --- |
| Frontend, full tree | 13: 3 high, 10 moderate | 10 moderate | 0 |
| Frontend, omit dev | not measured before | 0 | 0 |
| Backend, full tree | 8: 6 high, 2 moderate | 4 high | 0 |
| Backend, omit dev | not measured before | 4 high | 0 |

Compatible updates are recorded in the lockfiles:

- Frontend Vite 8.3.1 to 8.3.6, source-map-js 1.2.1 to 1.2.2, Zod 4.6.5 to 4.6.7, and their necessary build dependencies. The declared Vite minimum is now 8.3.6.
- Backend Vite 8.3.1 to 8.3.6, body-parser 2.3.0 to 2.4.0, qs 6.16.0 to 6.17.1 and fast-uri 3.1.8 to 3.1.9.
- npm initially generated a versionless optional Rolldown entry. It was removed and regenerated from registry metadata. Both lockfiles now contain the complete Linux ppc64 entry; npm ci dry runs pass.

The initial performance batch added no direct dependency and applied no force fix, downgrade or override. The subsequent remediation uses the upstream Prisma patch and scoped frontend overrides described below.

### Prisma remediation

prisma, @prisma/client and @prisma/adapter-pg are pinned together at 7.10.1. This is a [stable upstream patch with security dependency updates](https://github.com/prisma/orm/releases/tag/7.10.1), rather than the Prisma 8 release candidate advertised by the latest npm tag. Its @prisma/config uses deepmerge-ts 8.0.2 and its CLI uses mysql2 3.24.4. No backend override is needed. The generated client is 7.10.1; the isolated PostgreSQL test database has no pending migration. No schema or HTTP contract changed.

### ESLint/minimatch remediation

The installed ESLint 10/typescript-eslint 8 tooling still requests minimatch 10. A global force fix proposes root downgrades, so frontend package.json overrides only three identified consumers to minimatch 11.0.5: eslint@^10.10.0, @eslint/config-array@0.23 and @typescript-eslint/typescript-estree@8. Their ESM/CommonJS imports remain supported. [Minimatch 11 replaces the matching engine](https://github.com/isaacs/minimatch#readme), so this cross-major override is a reviewed compatibility exception, not a claim of universal interchangeability with version 10. Node.js 24 remains the supported project environment.

Before adding tooling tests, the override produced exactly the same 49 linted files and diagnostics as the old version (0 errors, 0 warnings). Three permanent tests in frontend/scripts/lint-tooling.test.mjs check complete TypeScript/TSX discovery through brace/globstar patterns, inclusion/exclusion rules and actual parser/rule execution. Run npm run test:tooling from frontend. CI now runs these tests and full npm audits for both packages, failing on any reported severity. These checks do not suppress audit findings.

Remove the scoped overrides once upstream consumers support patched minimatch directly, then rerun tooling tests and lint before updating the lockfile. Keep the ESLint parent selector synchronized with the direct dependency range; npm rejects conflicting direct-dependency override selectors. Future dependency upgrades should preserve Prisma-family version alignment. Audit results are a point-in-time registry result, not a guarantee against future advisories.

Relevant advisories: [minimatch](https://github.com/advisories/GHSA-g3hv-75wg-m249), [source-map-js](https://github.com/advisories/GHSA-68fv-2mgg-jv7q), [Zod](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5), [body-parser](https://github.com/advisories/GHSA-27r3-jxmh-p828), [deepmerge-ts](https://github.com/advisories/GHSA-ggr8-5vv4-36mx), [mysql2 authentication](https://github.com/advisories/GHSA-3f6p-5ww8-9rcr) and [mysql2 compression](https://github.com/advisories/GHSA-rgwj-5xj2-c3m3). See also the [npm audit documentation](https://docs.npmjs.com/cli/v11/commands/npm-audit/).

## Verification

Final combined validation (point 6, 2026-11-07) passed both builds, 126/126 backend tests (17 suites), frontend lint/E2E TypeScript/tooling and 55/55 scenarios in each of Chromium production and Edge development/Strict Mode. Full and omit-dev audits returned zero findings in both packages. Prisma generation and test migration deployment passed. The current regular production entry is 284.51 kB / 88.55 kB gzip. See [the validation record](VALIDATION.md); the historical batch results below remain separate from the pending new remote CI run.

- Backend build and 112 tests across 14 suites passed with the updated dependencies.
- Frontend build, lint and E2E TypeScript passed.
- Clean npm ci installations passed for both packages, including standard lifecycle scripts. Client generation and test migration deployment passed again after reinstalling. No new migration was required.
- Three lint-tooling tests passed after the clean installation. Full and omit-dev audits exited successfully with zero findings in both packages.
- The security batch passed 34 scenarios per browser. After CourseDetails refactoring, 38 scenarios passed; after Quiz refactoring, all 42 scenarios passed in Chromium against the production build and in Edge against the development server with Strict Mode. The UI consistency batch passed 50/50 in each of those modes, plus five targeted production cases after the final Home/loading adjustments. Frontend build, lint, E2E TypeScript and all three tooling checks passed; no backend retest was needed for this frontend-only batch.
- Three new scenarios cover deferred page requests with visible navigation/loading, module failure and reload recovery, and redirects before protected modules download.
- PLAYWRIGHT_PREVIEW=true builds with the isolated test API URL, then serves Vite preview. CI selects this mode for Chromium; default local testing still uses the development server. This mode passed remote run 42131841831 for the performance batch. The audit gates and tooling tests passed remote run 42385365361 for 468cd15. The later CourseDetails/Quiz, UI consistency and quiz-history changes await a new push/remote run.
