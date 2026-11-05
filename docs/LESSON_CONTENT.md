# Lesson content

Lessons keep their existing string content field. Administrators can write plain text or CommonMark Markdown in the Content field and select Show preview before saving. The preview and learner page use the same LessonContent renderer.

Use the Title field for the lesson title. Body headings start one level below the page title: # becomes h2, ## becomes h3, and deeper levels continue down to h6.

## Example

~~~~markdown
# Working with conditions

Use **clear names**, *short explanations*, and `const` for values.

## Checklist

- Read the value
- Handle missing values
  - Keep a fallback

1. Create a variable
2. Print its value

> Test one thing at a time.

```typescript
const score = 10;
if (score > 0) {
  console.log("Keep learning");
}
```

[Reference](https://example.com/docs)
~~~~

Separate paragraphs with a blank line. Single line breaks in existing plain text remain visible. Code blocks preserve spacing and allow horizontal scrolling; they are keyboard focusable on narrow screens.

## Preview and saving

- Show preview updates immediately as the Content field changes.
- Previewing does not save or publish the lesson.
- Save changes persists the same Markdown source. Reopening the editor preserves it.
- Existing published-course authoring guards still apply.
- Raw HTML is displayed as text. Put HTML examples inside fenced code blocks.
- Links use react-markdown's default URL filtering; script URLs do not become active links. HTTP(S) reference links open separately with noopener/noreferrer.

## Navigation

Previous and Next follow the actual curriculum ordered by position, including gaps. The lesson counter is its ordinal in the curriculum, rather than its database position. A single-lesson course has only the Course outline action; first and last lessons do not link beyond their boundaries.

Reading another lesson does not mark anything complete. Quizless lessons still require manual completion; quiz lessons still require a perfect quiz. Admin draft preview records no learner progress.

Published navigation uses the existing public curriculum metadata endpoint. Admin draft navigation uses the existing protected lesson-list endpoint. A navigation failure provides Retry navigation while the lesson remains readable. Pending requests are cancelled when leaving a lesson.

## Verification and maintenance

Playwright covers structured Markdown, HTML/script and unsafe-link handling, desktop/mobile code overflow, live admin preview, persistence, navigation boundaries/gaps, retry, stale requests and unchanged completion rules. Example screenshots are generated in ignored frontend/test-results directories.

The renderer uses [react-markdown](https://github.com/remarkjs/react-markdown) without a raw-HTML plugin. The schema and API payloads are unchanged.

During installation, npm audit reported 13 existing alerts (10 moderate, 3 high) in the pre-existing dependency graph. Existing locked package versions were unchanged, and no automatic audit fixes were applied. Dependency remediation should be reviewed separately.
