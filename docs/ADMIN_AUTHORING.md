# Admin authoring

Admins manage draft content from /admin and its course, lesson and question pages. Published course content stays immutable; the server continues enforcing those rules.

## Publication checks

1. Open a course in /admin and select Published in the Status field to see the publication checklist. The course management page also provides a collapsible Publication readiness section.
2. Review the saved-content issues and follow Manage lessons, Review lesson or Review answers to the corresponding editor.
3. Save draft edits, then use Refresh checks when returning to a previously opened checklist.
4. Select Published and Save changes to publish.

Checks are informational snapshots of saved content, including lesson text, quiz questions, nonblank answer options and exactly one correct answer per question. Unsaved form edits are checked by the final publication request. Refresh/check failures are explicit and can be retried. The server revalidates inside the publication transaction, so a successful earlier check cannot authorize publishing content that later becomes invalid.

The admin-only GET /api/courses/:id/publication-check returns {check:{courseId,status,ready,issues}}. Each issue has a message, target and optional lessonId/questionId. It does not return answer options or isCorrect flags. Anonymous requests return 401, students 403, invalid ids 400 and missing courses 404. Existing PATCH publication errors keep their message and string issues contract.

## Form errors

- Required titles/text/content reject whitespace-only values.
- Lesson and question positions must be positive signed 32-bit integers. Gaps remain supported.
- Errors appear beside the field and are linked through aria-describedby/aria-invalid. The first invalid field receives focus.
- Editing a field clears its previous error. Position conflicts and correct-answer conflicts from the server are placed beside the relevant control.
- Mutation controls are disabled during writes, with synchronous guards against duplicate requests. Server validation remains required.

## Delete confirmations

Course, lesson, quiz, question and answer deletion uses one native modal dialog with the affected content and cascade consequences. Initial focus is on Cancel. Tab/Shift+Tab stay within the modal; Cancel and Escape leave the data unchanged and return focus to the triggering control. Leaving the page cancels an unanswered confirmation.

Delete sends the existing authorized HTTP request only after confirmation. A failed request leaves the record in place and shows an alert; reopening the confirmation allows another attempt. Buttons stay disabled during the write to prevent duplicates.

Course deletion also removes its lessons, quizzes, enrollments, progress and attempts. Lesson/quiz/question/answer dialogs describe their corresponding cascade effects before confirmation.

## Verification

HTTP tests cover authorization, invalid ids, read-only checks, action targets, unchanged publication error messages and content becoming invalid after a ready result. Browser coverage checks inline validation without invalid writes, cancellation/focus, failed-delete retry, duplicate prevention, course cascade deletion, checklist retry/cancellation and publication after correction. Existing lesson and quiz flows remain covered.

Browser screenshots include publication-checklist.png and delete-dialog-mobile.png in ignored frontend/test-results directories. Admin list actions have separate rows so titles stay readable on narrow screens.

The frontend production build currently warns that its main minified chunk exceeds 500 kB (about 501 kB, about 142 kB gzip). Build succeeds; route-based loading/code splitting is a follow-up, without raising the warning threshold.
