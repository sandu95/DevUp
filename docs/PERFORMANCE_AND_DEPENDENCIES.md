# Performance and dependency review

Verified locally on 2026-11-05, after the UI, lesson-reading and admin-authoring batch in `c13bb4e`.

## Route loading

Home and the layouts remain available in the initial bundle. Other pages use top-level [React lazy imports](https://react.dev/reference/react/lazy). Each layout keeps its navigation outside the page's Suspense boundary. Login has the same boundary without a surrounding layout.

RouteContent provides an accessible Loading page status and a page error boundary. Failed module downloads show Reload page; a full reload retries the import, whose rejected promise React otherwise caches. Changing the pathname resets the boundary. API errors continue to use each page's existing handling. Authentication and role guards run before protected page components render, and server authorization remains required.

Measured production build output:

| JavaScript | Before | After |
| --- | ---: | ---: |
| Initial entry, minified | 501.51 kB | 282.49 kB |
| Initial entry, gzip | 142.37 kB | 87.81 kB |
| Deferred Markdown renderer | included in entry | 119.65 kB / 36.17 kB gzip |

The initial entry is about 44% smaller before compression. Other route/shared chunks are fetched when needed; this does not mean the sum of all application files became 44% smaller. No chunk warning threshold was raised, and the production build no longer reports a chunk over 500 kB.

## Targeted refactoring

AdminLessonPage is reduced from 595 to 155 lines. useLessonAuthoring owns loading, quiz/question mutations, form state and validation, confirmation requests, synchronous duplicate guards and cancellation on unmount. QuizForm and QuestionForm render the controlled forms. Admin-only response types live in types/authoring.ts, including correct-answer flags; student quiz contracts are unchanged.

The route wrapper still keys the content by lesson id. Existing ids, labels, field errors, order suggestions, publication guards and edit-state resets are preserved. Further refactoring should follow one workflow at a time, with CourseDetailsPage and QuizPage as candidates.

## Dependency review

These are npm audit package counts, including packages flagged through another dependency; they are not counts of independent application exploits. The audit commands exit with code 1 while findings remain.

| Audit | Before | After |
| --- | --- | --- |
| Frontend, full tree | 13: 3 high, 10 moderate | 10 moderate |
| Frontend, omit dev | not measured before | 0 |
| Backend, full tree | 8: 6 high, 2 moderate | 4 high |
| Backend, omit dev | not measured before | 4 high |

Compatible updates are recorded in the lockfiles:

- Frontend Vite 8.3.1 to 8.3.6, source-map-js 1.2.1 to 1.2.2, Zod 4.6.5 to 4.6.7, and their necessary build dependencies. The declared Vite minimum is now 8.3.6.
- Backend Vite 8.3.1 to 8.3.6, body-parser 2.3.0 to 2.4.0, qs 6.16.0 to 6.17.1 and fast-uri 3.1.8 to 3.1.9.
- npm initially generated a versionless optional Rolldown entry. It was removed and regenerated from registry metadata. Both lockfiles now contain the complete Linux ppc64 entry; npm ci dry runs pass.

No direct dependency was added and no force fix, downgrade or override was applied.

Remaining work, in priority order:

1. Review the Prisma dependency family together. Prisma 7.10.0 brings deepmerge-ts 7.1.5 and mysql2 3.15.3; audit flags those packages, @prisma/config and prisma. This project uses PostgreSQL and does not directly import mysql2 or deepmerge-ts, but the findings also appear with omit dev, so they must not be dismissed as excluded development dependencies. At review time the cached registry listed 7.10.0 as the latest stable Prisma 7 release. Select a stable compatible release with repaired dependencies, align CLI/client/adapter versions, regenerate the client, deploy migrations to the isolated test database and rerun API/browser checks. Avoid forcing deepmerge-ts 8 into Prisma's current dependency range.
2. Review the ESLint/typescript-eslint tooling chain for minimatch 11.0.1 or newer. The installed 10.2.6 causes ten propagated moderate flags. Current ESLint metadata still requests minimatch ^10.2.6; audit proposes downgrades outside the declared root ranges. Prefer upstream-compatible releases or an explicitly tested compatibility change rather than an automatic force fix. Frontend omit-dev audit is clean, but the full tooling audit remains unresolved.

Relevant advisories: [minimatch](https://github.com/advisories/GHSA-g3hv-75wg-m249), [source-map-js](https://github.com/advisories/GHSA-68fv-2mgg-jv7q), [Zod](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5), [body-parser](https://github.com/advisories/GHSA-27r3-jxmh-p828), [deepmerge-ts](https://github.com/advisories/GHSA-ggr8-5vv4-36mx), [mysql2 authentication](https://github.com/advisories/GHSA-3f6p-5ww8-9rcr) and [mysql2 compression](https://github.com/advisories/GHSA-rgwj-5xj2-c3m3). See also the [npm audit documentation](https://docs.npmjs.com/cli/v11/commands/npm-audit/).

## Verification

- Backend build and 112 tests across 14 suites passed with the updated dependencies.
- Frontend build, lint and E2E TypeScript passed.
- All 34 browser scenarios passed in Chromium against the production build and in Edge against the development server with Strict Mode.
- Three new scenarios cover deferred page requests with visible navigation/loading, module failure and reload recovery, and redirects before protected modules download.
- PLAYWRIGHT_PREVIEW=true builds with the isolated test API URL, then serves Vite preview. CI now selects this mode for Chromium; default local testing still uses the development server. This workflow change is locally verified and awaits a new push/remote run.
- npm ci dry runs validate both lockfiles without reinstalling packages. They are not a new clean-install or Linux runtime verification.
