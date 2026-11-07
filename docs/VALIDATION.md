# Local validation — 2026-11-07

Point 6 validates the complete local work from points 1–5: course/quiz refactoring, shared UI/read recovery, personal quiz history and reproducible demo setup. The change batch is based on `468cd15`. These checks were completed before publication; use Git history and the matching GitHub Actions run for publication status.

## Results

| Check | Result |
| --- | --- |
| Prisma client generation | Passed, 7.10.1 |
| Guarded test migration deployment | Passed, no pending migrations |
| Backend build | Passed |
| Backend tests | 126/126, 17 suites |
| Frontend lint-tooling tests | 3/3 |
| Frontend ESLint | Passed, no errors or warnings |
| Browser-test TypeScript | Passed |
| Frontend production build | Passed, no chunk-size warning |
| Backend full / omit-dev audits | 0 / 0 vulnerabilities |
| Frontend full / omit-dev audits | 0 / 0 vulnerabilities |
| Chromium production browser suite | 55/55 |
| Edge development/Strict Mode browser suite | 55/55 |
| Git whitespace checks | Passed for tracked changes and new text files |
| Local environment files | Ignored; only placeholder templates appear in Git candidates |

The regular production build's initial JavaScript entry is **284.51 kB minified / 88.55 kB gzip**. The history page and Markdown renderer remain deferred. Audit counts describe the registry result on this validation date.

## Reproduce

Verified locally with Node.js **24.14.1** and npm **11.11.0**, on branch `main`. From `backend`:

```powershell
npm run db:generate
npm run db:deploy:test
npm run build
npm test
npm audit --audit-level=low
npm audit --omit=dev --audit-level=low
```

From `frontend`:

```powershell
npm run test:tooling
npm run lint
npm run typecheck:e2e
npm run build
npm audit --audit-level=low
npm audit --omit=dev --audit-level=low
$env:PLAYWRIGHT_BROWSER_CHANNEL = 'chromium'
$env:PLAYWRIGHT_PREVIEW = 'true'
npm run test:e2e
$env:PLAYWRIGHT_BROWSER_CHANNEL = 'msedge'
$env:PLAYWRIGHT_PREVIEW = 'false'
npm run test:e2e
```

The test configuration explicitly loads `.env.test` and requires a database name ending in `_test`. Demo integration tests create/drop only their own temporary `_demo` database; the configured PostgreSQL test role needs `CREATEDB`. The browser suite starts its own servers on 3001/5180 and refuses to reuse existing servers. Finish client generation and builds before starting browser tests.

## Scope and artifacts

The backend suite covers authorization, completion transactions, preserved timestamps, input validation, publication/authoring, personal history and demo guards/idempotence/rollback/concurrency. Browser scenarios cover public and protected navigation, lesson/quiz completion, stale requests, duplicate submissions, read recovery, 404 views, history filtering, authoring and desktop/mobile layout.

The fresh history/mobile and 404/keyboard-focus captures were visually reviewed. Browser reports and screenshots are ignored under `frontend/playwright-report/` and `frontend/test-results/`. Each run replaces the previous run's report. The separate demo remains on 3002/5174; both endpoints returned HTTP 200 during final validation. Its read-only Chromium walkthrough was completed in point 5; see [the demo guide](DEMO.md).

This is local Windows verification. The combined changes require their own GitHub Actions run after publication. The remote baseline recorded before publication is `468cd15`, run `42385365361`; it verifies that earlier commit. CI performs clean installation and checks on Linux/PostgreSQL 16.
