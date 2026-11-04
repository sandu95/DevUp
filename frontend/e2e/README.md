# Browser verification

From `frontend`, run `npm run test:e2e`. By default, the suite uses installed Microsoft Edge in headless mode; no separate browser download is required for Edge. Alternatively, run `npx playwright install chromium` and set `PLAYWRIGHT_BROWSER_CHANNEL=chromium` before running the suite. The GitHub Actions workflow uses Chromium; local verification currently covers Edge only.

Install both packages' dependencies, then run `npm run db:generate` and `npm run db:deploy:test` from `backend`. Configure `backend/.env.test` from `.env.test.example` with a `DATABASE_URL` whose database name ends in `_test`. Fixtures create unique student/admin accounts and courses and delete only those records after each test. Browser tests use their own JWT secret. Finish Prisma generation before starting browser tests: changing generated files while the watched API runs can restart it and interrupt a request.

The suite starts its own API at `http://localhost:3001` and Vite at `http://localhost:5180`. It refuses to reuse an existing server. The regular app defaults remain API port 3000 and frontend origin 5173. Optional app settings are `PORT`, `CORS_ORIGIN`, and frontend `VITE_API_URL` (including `/api`).

Run `npm run typecheck:e2e` to type-check the tests. Run `npm run test:e2e -- --headed` to watch the browser, or `npm run test:e2e -- --grep "quiz"` to select scenarios.

The 19 scenarios cover public access, login/session restoration/logout, enrollment, manual completion, quiz lookup failures/retry, SPA navigation while a quiz lookup is delayed, keyboard radio selection, partial and perfect scores, duplicate submission prevention, failed retakes, unavailable progress, returning to the lesson/course after a perfect score, admin ordering/conflicts/deletion, single-choice answer authoring, draft preview, failed and successful publication, cancellation of a delayed login, exact completion counts despite a rounded legacy percentage, and mobile catalog/dashboard/admin navigation/layout. The return-to-course scenario checks the completed lesson, Review action, progress changing from 0/2 to 1/2 (50%), correct Continue destination, and persistence after reload. Tests using account fixtures also check for uncaught browser errors.

Screenshots, failure traces and the HTML report are written to ignored `test-results/` and `playwright-report/` folders. Open the latest report with `npx playwright show-report`.
