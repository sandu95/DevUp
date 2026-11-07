import type { Prisma } from "../generated/prisma/client.js"

function quiz(title: string, questions: { text: string; options: string[] }[]) {
  return { create: { title, questions: { create: questions.map((question, index) => ({
    text: question.text, position: index + 1,
    options: { create: question.options.map((text, index) => ({ text, isCorrect: index === 0 })) },
  })) } } }
}

export const demoCourses = [
  {
    title: "JavaScript Foundations", description: "Variables, arrays and functions, with short exercises and a knowledge check.", status: "PUBLISHED",
    lessons: { create: [
      { title: "Values and variables", position: 1, content: "## Values and variables\n\nUse `const` for a binding you will not reassign. Use `let` when the binding changes.\n\n```js\nconst course = 'JavaScript';\nlet lessonsRead = 0;\nlessonsRead += 1;\nconsole.log(course, lessonsRead);\n```\n\n### Practice\n\n1. Store your name in a constant.\n2. Create a counter with `let`.\n3. Increment the counter and print both values.\n\n> A constant binding does not make an object immutable." },
      { title: "Arrays and functions", position: 2, content: "## Transforming collections\n\nAn array stores an ordered collection. A function turns inputs into a result.\n\n```js\nconst scores = [4, 6, 8];\nconst double = (value) => value * 2;\nconst doubled = scores.map(double);\n```\n\n- `map` produces a new array.\n- `filter` keeps matching entries.\n- `find` returns the first matching entry.\n\n### Practice\n\nWrite a function that adds one to every score. Then take the quiz.", quiz: quiz("JavaScript knowledge check", [
        { text: "Which keyword declares a binding that cannot be reassigned?", options: ["const", "let", "var"] },
        { text: "Which method creates a new array by transforming every entry?", options: ["map", "find", "push"] },
        { text: "What does (value) => value * 2 return when value is 4?", options: ["8", "4", "2"] },
      ]) },
      { title: "Build a learning summary", position: 3, content: "## Your learning summary\n\nCombine variables, arrays and functions in a small program.\n\n```js\nconst lessons = ['Variables', 'Arrays', 'Functions'];\nconst summary = lessons.map((title, index) => `${index + 1}. ${title}`);\nconsole.log(summary.join('\\n'));\n```\n\n### Exercise\n\nAdd a fourth lesson. Write a function that returns the number of lessons. Once you understand the result, mark this lesson complete." },
    ] },
  },
  {
    title: "HTML and CSS Essentials", description: "Semantic markup, accessible forms and responsive layouts.", status: "PUBLISHED",
    lessons: { create: [
      { title: "Write semantic HTML", position: 1, content: "## Give content meaning\n\nUse one main heading and meaningful elements such as `main`, `article` and `nav`.\n\n```html\n<main>\n  <h1>My learning journal</h1>\n  <article>\n    <h2>Today I learned</h2>\n    <p>Semantic HTML helps readers and assistive technology.</p>\n  </article>\n</main>\n```\n\n### Practice\n\nCreate a journal entry with a title, a paragraph and a list. Give each form input a visible label." },
      { title: "Responsive layouts", position: 2, content: "## Make space for content\n\nFlexible layouts adapt to the available width.\n\n```css\n.cards {\n  display: flex;\n  flex-wrap: wrap;\n  gap: 1rem;\n}\n```\n\nTest your page with a narrow viewport and larger text. Keep keyboard focus visible and associate labels with their inputs.", quiz: quiz("HTML and CSS knowledge check", [
        { text: "Which element describes the main content of a page?", options: ["main", "span", "b"] },
        { text: "What connects a label to an input?", options: ["Matching for and id attributes", "Matching colors", "A placeholder alone"] },
        { text: "Which flexbox property allows items to move to another line?", options: ["flex-wrap: wrap", "overflow: hidden", "position: fixed"] },
      ]) },
    ] },
  },
  {
    title: "Git Workflow Basics", description: "Inspect a working tree and create focused commits. Available for a new enrollment.", status: "PUBLISHED",
    lessons: { create: [
      { title: "Inspect your changes", position: 1, content: "## Read before writing\n\nRun `git status` to see your working tree. Run `git diff` to review unstaged changes.\n\n```sh\ngit status\ngit diff\n```\n\n### Practice\n\nChange one sentence in a local README and inspect the difference. These commands do not publish your changes." },
      { title: "Create a focused commit", position: 2, content: "## Record one cohesive change\n\nStage the files that belong together, then review the staged diff.\n\n```sh\ngit add README.md\ngit diff --staged\ngit commit -m 'Clarify local setup'\n```\n\nWrite a message that explains the change. Publishing a commit with `git push` is a separate action." },
    ] },
  },
  {
    title: "TypeScript Workshop (Draft)", description: "Authoring practice: add the missing correct answer, review publication readiness, then publish.", status: "DRAFT",
    lessons: { create: [
      { title: "Primitive types", position: 1, content: "## Describe values\n\nTypeScript checks how values are used.\n\n```ts\nconst lessons: number = 3;\nconst course: string = 'TypeScript';\nconst completed: boolean = false;\n```\n\nThe draft quiz needs one correct answer before this course can be published.",
        quiz: { create: { title: "Types knowledge check", questions: { create: [{ text: "Which type describes the value 42?", position: 1,
          options: { create: [{ text: "string", isCorrect: false }, { text: "boolean", isCorrect: false }] } }] } } } },
      { title: "Describe an object", position: 3, content: "## Object shapes\n\n```ts\ninterface Lesson {\n  title: string;\n  completed: boolean;\n}\n\nconst lesson: Lesson = { title: 'Objects', completed: false };\n```\n\n### Practice\n\nAdd a numeric `position` property to the interface and update the object." },
    ] },
  },
] satisfies Prisma.CourseCreateInput[]
