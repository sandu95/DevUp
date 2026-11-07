# Performance and dependency review

Performance measurements were verified on 2026-11-05. The performance batch was published as `3eb87a2` and passed GitHub Actions run `42131841831`. Dependency remediation below was verified locally on 2026-11-06 and has not been committed or pushed.

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

- Backend build and 112 tests across 14 suites passed with the updated dependencies.
- Frontend build, lint and E2E TypeScript passed.
- Clean npm ci installations passed for both packages, including standard lifecycle scripts. Client generation and test migration deployment passed again after reinstalling. No new migration was required.
- Three lint-tooling tests passed after the clean installation. Full and omit-dev audits exited successfully with zero findings in both packages.
- All 34 browser scenarios passed in Chromium against the production build and in Edge against the development server with Strict Mode.
- Three new scenarios cover deferred page requests with visible navigation/loading, module failure and reload recovery, and redirects before protected modules download.
- PLAYWRIGHT_PREVIEW=true builds with the isolated test API URL, then serves Vite preview. CI selects this mode for Chromium; default local testing still uses the development server. This mode passed remote run 42131841831 for the performance batch. The subsequent audit gates and tooling tests await a new push/remote run.
