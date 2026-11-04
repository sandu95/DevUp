# DevUp — instructions for coding agents

## Goal
DevUp is a university project: a web learning platform for programming courses, with a public catalog, authenticated student learning flow, quizzes, per-lesson progress, and admin authoring. Prefer incremental, tested changes over speculative rewrites.

## First steps on every new task
1. Read `docs/DEVUP_CONTEXT.md`, then inspect the relevant source files. The repository files and Git status are the source of truth; the context document is a handoff summary, not proof that proposed edits were applied.
2. Inspect the relevant route -> controller -> service -> Prisma model and matching frontend API consumers before changing contracts.
3. Briefly explain any conflict between existing code and the documented behavior; identify uncertain assumptions instead of silently changing them.
4. Make the smallest cohesive change, run relevant available checks (TypeScript/build/tests), and report what passed, failed, or was unavailable.
5. Do not claim verification without actually running it. Do not modify unrelated files or commit/push unless asked.
6. Respond to the user in Romanian. Keep code, identifiers, and UI copy in English, consistent with the existing project.

## Stack and structure
- Backend: Node.js, Express, TypeScript, Prisma 7, PostgreSQL. Main folders: `backend/src/controllers`, `backend/src/services`, `backend/src/routes`, `backend/src/middleware`, `backend/prisma`.
- Frontend: React, TypeScript, Tailwind CSS, React Router, Vite. Main folders: `frontend/src/pages`, `frontend/src/components`, `frontend/src/layouts`, `frontend/src/services`, `frontend/src/context`.
- Frontend API client is `api<T>(endpoint, options)` imported from `../services/api`; it is a function, not `api.get()`.
- React Router paths and API endpoint contracts must be inspected before changing them.

## Product invariants
- Visitors may view Home, Catalog, and public course details. Login required to enroll. Students must be enrolled before accessing lessons/quizzes or submitting quiz attempts.
- Admins manage courses/lessons/quizzes/questions; distinguish admin preview privileges from progress recording. Progress recording requires enrollment, including when an admin acts as a learner.
- A lesson WITHOUT a quiz can be manually marked complete by an enrolled learner.
- A lesson WITH a quiz must NOT be manually marked complete, even through direct HTTP requests.
- Submitting a quiz with ALL questions correct marks the corresponding lesson complete automatically. Partial scores do not mark it complete; already-completed lessons stay completed on subsequent failed attempts.
- Enforce authorization and completion rules server-side, not merely by hiding controls in React.
- Quiz attempts, submitted answers, and automatic lesson-progress updates should be committed in one Prisma transaction. Preserve original completion timestamp on repeats.
- Do not expose `isCorrect` in student-facing quiz API responses.
- Published courses should not have their quiz authoring data modified, consistent with existing guards.
- Quiz is single-choice per question for now.

## UX / coding preferences
- Minimal Tailwind design: warm off-white `#f7f7f5`, white cards, slate typography, one indigo accent, strong hierarchy, generous whitespace, subtle borders.
- Public pages use PublicLayout; authenticated pages use AppLayout. No separate My Courses route has been approved; the authenticated CoursesPage has All/My/Available filtering.
- Preserve accessibility of labels, keyboard radio selection, and accurate loading/error/empty states.
- Prefer existing project conventions; avoid introducing dependencies without need.

## Safety / robustness
- Validate path params and payload structure on server; handle 400/401/403/404/409 explicitly.
- Do not treat a failed `GET /quizzes/lesson/:lessonId` as proof that no quiz exists. When the existence check fails, do not show manual completion until resolved.
- Be mindful of stale async effects when route params change, duplicate submissions, and quiz score rounding (`correctAnswers === totalQuestions` for passing, not rounded percentage).
- Never disclose or commit `.env` contents or credentials; keep `backend/.env.example` as template only.

## Suggested first handoff task
Read `docs/DEVUP_CONTEXT.md` and inspect the real code. Without making edits first, provide a concise inventory of what's implemented vs. only proposed; identify backend/front-end inconsistencies for lesson completion and quiz submission; propose a minimal patch/test plan. Wait for the user's go-ahead before broad refactors.
