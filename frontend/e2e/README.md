# Browser verification

From `frontend`, run `npm run test:e2e`. The suite uses the installed Microsoft Edge browser in headless mode; no separate browser download is required. Microsoft Edge must be installed.

Install both packages' dependencies and apply the Prisma schema to the test database first. `backend/.env.test` must contain a `DATABASE_URL` whose database name ends in `_test`. Fixtures create unique student/admin accounts and courses and delete only those records after each test. Browser tests use their own JWT secret.

The suite starts its own API at `http://localhost:3001` and Vite at `http://localhost:5180`. It refuses to reuse an existing server. The regular app defaults remain API port 3000 and frontend origin 5173. Optional app settings are `PORT`, `CORS_ORIGIN`, and frontend `VITE_API_URL` (including `/api`).

Run `npx tsc -p tsconfig.e2e.json` to type-check the tests. Run `npm run test:e2e -- --headed` to watch the browser, or `npm run test:e2e -- --grep "quiz"` to select scenarios.

The 14 scenarios cover public access, login/session restoration/logout, enrollment, manual completion, quiz lookup failures/retry, SPA navigation while a quiz lookup is delayed, keyboard radio selection, partial and perfect scores, duplicate submission prevention, failed retakes, unavailable progress, returning to the lesson/course after a perfect score, admin ordering/conflicts/deletion, single-choice answer authoring, and mobile navigation/layout. The return-to-course scenario checks the completed lesson, Review action, progress changing from 0/2 to 1/2 (50%), correct Continue destination, and persistence after reload. Each test also checks for uncaught browser errors.

Screenshots, failure traces and the HTML report are written to ignored `test-results/` and `playwright-report/` folders. Open the latest report with `npx playwright show-report`.
