import { test as base, expect, type Page } from "@playwright/test"
import { createBrowserData, prisma } from "../../backend/tests/browser.fixtures.ts"

type BrowserData = Awaited<ReturnType<typeof createBrowserData>>
const test = base.extend<{ data: BrowserData }>({
  data: async ({ page }, provide) => {
    const pageErrors: string[] = []
    page.on("pageerror", (error) => pageErrors.push(error.message))
    const data = await createBrowserData()
    try { await provide(data) } finally { await data.cleanup() }
    expect(pageErrors).toEqual([])
  },
})
test.afterAll(async () => { await prisma.$disconnect() })

async function login(page: Page, user: BrowserData["student"], destination = "/dashboard") {
  await page.goto("/login")
  await page.getByLabel("Email", { exact: true }).fill(user.email)
  await page.getByLabel("Password", { exact: true }).fill(user.password)
  await page.getByRole("button", { name: "Sign in", exact: true }).click()
  await expect(page).toHaveURL(destination)
}
async function enroll(page: Page, data: BrowserData) {
  await login(page, data.student)
  await page.goto(`/courses/${data.courseId}`)
  await page.getByRole("button", { name: "Enroll in course", exact: true }).click()
  await expect(page.getByRole("link", { name: "Continue learning", exact: true })).toBeVisible()
}

async function expectPageToFitViewport(page: Page) {
  const layout = await page.evaluate(() => ({
    viewportWidth: window.innerWidth,
    pageWidth: document.documentElement.scrollWidth,
    overflowingElements: [...document.querySelectorAll("main *")].flatMap((element) => {
      const bounds = element.getBoundingClientRect()
      return bounds.right > window.innerWidth
        ? [{ tag: element.tagName, id: element.id, width: bounds.width, right: bounds.right }]
        : []
    }).slice(0, 8),
  }))
  expect(layout.pageWidth, JSON.stringify({ url: page.url(), ...layout }))
    .toBeLessThanOrEqual(layout.viewportWidth)
}

test("public catalog, login, enrollment, manual completion, reload and logout", async ({ page, data }, info) => {
  await page.goto(`/catalog/${data.courseId}`)
  await expect(page.getByRole("heading", { name: "Browser Programming Course", exact: true })).toBeVisible()
  await expect(page.getByText("Manual lesson content", { exact: true })).toHaveCount(0)
  await enroll(page, data)
  await page.getByRole("link", { name: "Continue learning", exact: true }).click()
  await expect(page).toHaveURL(`/lessons/${data.manualLessonId}`)
  await page.getByRole("button", { name: "Mark as completed", exact: true }).click()
  await expect(page.getByRole("button", { name: "Lesson completed", exact: true })).toBeDisabled()
  await page.reload()
  await expect(page.getByRole("button", { name: "Lesson completed", exact: true })).toBeVisible()
  await page.screenshot({ path: info.outputPath("completed-lesson.png"), fullPage: true })
  await page.getByRole("button", { name: "Log out", exact: true }).click()
  await expect(page).toHaveURL("/")
  expect(await page.evaluate(() => localStorage.getItem("token"))).toBeNull()
})

test("quiz lookup failure blocks manual completion until retry succeeds", async ({ page, data }) => {
  await enroll(page, data)
  const lookup = `**/api/quizzes/lesson/${data.manualLessonId}`
  await page.route(lookup, (route) => route.fulfill({ status: 500, json: { message: "Simulated lookup failure" } }))
  await page.goto(`/lessons/${data.manualLessonId}`)
  await expect(page.getByRole("alert")).toContainText("Could not check")
  await expect(page.getByRole("button", { name: "Mark as completed", exact: true })).toHaveCount(0)
  await page.unroute(lookup)
  await page.getByRole("button", { name: "Retry", exact: true }).click()
  await expect(page.getByRole("button", { name: "Mark as completed", exact: true })).toBeEnabled()
})

test("a delayed quiz lookup is cancelled during SPA navigation and cannot change the next lesson", async ({ page, data }) => {
  await enroll(page, data)
  const lookup = `**/api/quizzes/lesson/${data.manualLessonId}`
  await page.route(lookup, (route) => route.fulfill({ status: 500, json: { message: "Simulated lookup failure" } }))
  await page.getByRole("link", { name: "Continue learning", exact: true }).click()
  await expect(page.getByRole("alert")).toContainText("Could not check")
  await page.unroute(lookup)

  let release!: () => void
  const delayed = new Promise<void>((resolve) => { release = resolve })
  let started!: () => void
  const requested = new Promise<void>((resolve) => { started = resolve })
  let settled!: () => void
  const finished = new Promise<void>((resolve) => { settled = resolve })
  let cancelled = false
  page.on("requestfailed", (request) => {
    if (request.url().endsWith(`/quizzes/lesson/${data.manualLessonId}`) &&
        request.failure()?.errorText.includes("ERR_ABORTED")) cancelled = true
  })
  await page.route(lookup, async (route) => {
    started()
    await delayed
    try {
      // The old lesson has no quiz; applying this response to the new lesson
      // would incorrectly reveal the manual-completion button.
      await route.fulfill({ status: 200, json: { quiz: null } })
    } catch (error) {
      if (!cancelled) throw error
    } finally {
      settled()
    }
  })

  try {
    await page.getByRole("button", { name: "Retry", exact: true }).click()
    await requested
    await expect(page.getByText("Checking for a lesson quiz...", { exact: true })).toBeVisible()
    // Follow app links so the request outlives its React component without
    // replacing the browser document with page.goto().
    await page.getByRole("link", { name: "Back to course", exact: true }).click()
    const quizRow = page.getByRole("heading", { name: "Browser Quiz Lesson", exact: true }).locator("..").locator("..")
    await quizRow.getByRole("link", { name: "Start", exact: true }).click()
    await expect(page).toHaveURL(`/lessons/${data.quizLessonId}`)
    await expect(page.getByRole("link", { name: "Start quiz", exact: true })).toBeVisible()
    await expect.poll(() => cancelled).toBe(true)
    release()
    await finished
    await expect(page.getByRole("heading", { name: "Browser Quiz Lesson", exact: true })).toBeVisible()
    await expect(page.getByRole("link", { name: "Start quiz", exact: true })).toHaveAttribute("href", `/quizzes/${data.quizId}`)
    await expect(page.getByRole("button", { name: "Mark as completed", exact: true })).toHaveCount(0)
    await expect(page.getByRole("alert")).toHaveCount(0)
  } finally {
    release()
  }
})

test("returning from a perfect quiz refreshes lesson and course progress", async ({ page, data }) => {
  await enroll(page, data)
  await expect(page.getByText("0 of 2 lessons completed", { exact: true })).toBeVisible()
  const quizRow = page.getByRole("heading", { name: "Browser Quiz Lesson", exact: true }).locator("..").locator("..")
  await quizRow.getByRole("link", { name: "Start", exact: true }).click()
  await page.getByRole("link", { name: "Start quiz", exact: true }).click()
  for (const index of [1, 2, 3]) await page.getByText(`Correct ${index}`, { exact: true }).click()
  await page.getByRole("button", { name: "Submit quiz", exact: true }).click()
  await expect(page.getByRole("status")).toContainText("Your lesson has been marked as completed")
  await page.getByRole("link", { name: "Back to lesson", exact: true }).first().click()
  await expect(page).toHaveURL(`/lessons/${data.quizLessonId}`)
  await expect(page.locator("article header").getByText(/Completed$/)).toBeVisible()
  await expect(page.getByRole("link", { name: "Retake quiz", exact: true }).first()).toBeVisible()
  await page.getByRole("link", { name: "Back to course", exact: true }).click()
  await expect(page).toHaveURL(`/courses/${data.courseId}`)
  await expect(page.getByText("1 of 2 lessons completed", { exact: true })).toBeVisible()
  await expect(page.getByText("50%", { exact: true })).toBeVisible()
  await expect(quizRow.getByRole("link", { name: "Review", exact: true })).toBeVisible()
  await expect(page.getByRole("link", { name: "Continue learning", exact: true })).toHaveAttribute("href", `/lessons/${data.manualLessonId}`)
  await page.reload()
  await expect(page.getByText("1 of 2 lessons completed", { exact: true })).toBeVisible()
  await expect(page.getByText("50%", { exact: true })).toBeVisible()
  await expect(quizRow.getByRole("link", { name: "Review", exact: true })).toBeVisible()
})

test("quiz supports keyboard selection, partial/perfect scores and failed retakes", async ({ page, data }, info) => {
  await enroll(page, data)
  await page.goto(`/lessons/${data.quizLessonId}`)
  await expect(page.getByRole("button", { name: "Mark as completed", exact: true })).toHaveCount(0)
  await page.getByRole("link", { name: "Start quiz", exact: true }).click()
  const first = page.getByRole("radio", { name: /Correct 1/ })
  await first.focus()
  await page.keyboard.press("Space")
  await expect(first).toBeChecked()
  await page.keyboard.press("ArrowDown")
  await expect(page.getByRole("radio", { name: /Wrong 1/ })).toBeChecked()
  await page.keyboard.press("ArrowUp")
  await expect(first).toBeChecked()
  await page.getByText("Correct 2", { exact: true }).click()
  await page.getByText("Wrong 3", { exact: true }).click()
  await page.getByRole("button", { name: "Submit quiz", exact: true }).click()
  await expect(page.getByText("66%", { exact: true })).toBeVisible()
  expect(await prisma.lessonProgress.count({ where: { userId: data.student.id, lessonId: data.quizLessonId } })).toBe(0)
  await page.getByRole("button", { name: "Try again", exact: true }).click()
  for (const index of [1, 2, 3]) await page.getByText(`Correct ${index}`, { exact: true }).click()
  let submissions = 0
  page.on("request", (request) => { if (request.method() === "POST" && request.url().endsWith(`/quizzes/${data.quizId}/submit`)) submissions++ })
  await page.getByRole("button", { name: "Submit quiz", exact: true }).dblclick()
  await expect(page.getByRole("status")).toContainText("Your lesson has been marked as completed")
  expect(submissions).toBe(1)
  const original = await prisma.lessonProgress.findUniqueOrThrow({
    where: { userId_lessonId: { userId: data.student.id, lessonId: data.quizLessonId } },
  })
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0)
  await page.screenshot({ path: info.outputPath("perfect-quiz.png"), fullPage: true })
  await page.getByRole("link", { name: "Back to lesson", exact: true }).first().click()
  await page.getByRole("link", { name: "Retake quiz", exact: true }).first().click()
  for (const index of [1, 2, 3]) await page.getByText(`Wrong ${index}`, { exact: true }).click()
  await page.getByRole("button", { name: "Submit quiz", exact: true }).click()
  await expect(page.getByText("0%", { exact: true })).toBeVisible()
  expect(await prisma.lessonProgress.findUniqueOrThrow({ where: { id: original.id } })).toEqual(original)
})

test("failed progress lookup reports unknown state and successful completion clears it", async ({ page, data }) => {
  await enroll(page, data)
  await page.route(`**/api/progress/courses/${data.courseId}`, (route) => route.fulfill({ status: 500, json: { message: "Simulated progress failure" } }))
  await page.goto(`/lessons/${data.manualLessonId}`)
  await expect(page.getByRole("status")).toContainText("Progress could not be loaded")
  await page.getByRole("button", { name: "Mark as completed", exact: true }).click()
  await expect(page.getByRole("button", { name: "Lesson completed", exact: true })).toBeDisabled()
  await expect(page.getByText("Progress unavailable", { exact: true })).toHaveCount(0)
})

test("a delayed old session rejection cannot clear a fresh login", async ({ page, data }) => {
  await page.addInitScript(() => { localStorage.setItem("token", "expired-browser-test-token") })
  let release!: () => void
  const delayed = new Promise<void>((resolve) => { release = resolve })
  let started!: () => void
  const requested = new Promise<void>((resolve) => { started = resolve })
  await page.route("**/api/users/me", async (route) => {
    started()
    await delayed
    await route.fulfill({ status: 401, json: { message: "Expired session" } }).catch(() => { /* Login may have aborted the old request. */ })
  })
  await page.goto("/login")
  await requested
  await page.getByLabel("Email", { exact: true }).fill(data.student.email)
  await page.getByLabel("Password", { exact: true }).fill(data.student.password)
  await page.getByRole("button", { name: "Sign in", exact: true }).click()
  await expect(page).toHaveURL("/dashboard")
  release()
  await expect(page.getByRole("button", { name: "Log out", exact: true })).toBeVisible()
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("user") || "null")?.role)).toBe("STUDENT")
})

for (const status of [401, 404]) {
  test(`session restoration clears saved credentials on HTTP ${status}`, async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("token", "obsolete-browser-test-token")
      localStorage.setItem("user", JSON.stringify({ id: -1, role: "STUDENT" }))
    })
    await page.route("**/api/users/me", (route) => route.fulfill({ status, json: { message: "Invalid session" } }))
    await page.goto("/dashboard")
    await expect(page).toHaveURL("/")
    expect(await page.evaluate(() => [localStorage.getItem("token"), localStorage.getItem("user")])).toEqual([null, null])
  })
}

test("server failure during session restoration preserves saved credentials", async ({ page }) => {
  await page.addInitScript(() => { localStorage.setItem("token", "retained-browser-test-token") })
  await page.route("**/api/users/me", (route) => route.fulfill({ status: 500, json: { message: "Server unavailable" } }))
  await page.goto("/dashboard")
  await expect(page).toHaveURL("/")
  expect(await page.evaluate(() => localStorage.getItem("token"))).toBe("retained-browser-test-token")
})

test("a perfect quiz does not claim confirmed completion when progress cannot be checked", async ({ page, data }) => {
  await enroll(page, data)
  await page.route(`**/api/progress/courses/${data.courseId}`, (route) => route.fulfill({ status: 500, json: { message: "Progress unavailable" } }))
  await page.goto(`/quizzes/${data.quizId}`)
  for (const index of [1, 2, 3]) await page.getByText(`Correct ${index}`, { exact: true }).click()
  await page.getByRole("button", { name: "Submit quiz", exact: true }).click()
  await expect(page.getByRole("status")).toContainText("couldn't verify the lesson completion status")
  expect(await prisma.lessonProgress.count({ where: { userId: data.student.id, lessonId: data.quizLessonId, completed: true } })).toBe(1)
})

test("admin lesson and question forms handle gaps, conflicts and deletion of edited items", async ({ page, data }) => {
  await login(page, data.admin, "/admin")
  await page.goto(`/admin/courses/${data.draftCourseId}`)
  await expect(page.getByLabel("Position", { exact: true })).toHaveValue("4")
  await page.getByLabel("Title", { exact: true }).fill("Browser New Lesson")
  await page.getByLabel("Content", { exact: true }).fill("New content")
  await page.getByRole("button", { name: "Create lesson", exact: true }).click()
  await expect(page.getByRole("heading", { name: "Browser New Lesson", exact: true })).toBeVisible()
  await expect(page.getByLabel("Position", { exact: true })).toHaveValue("5")
  const third = page.getByRole("heading", { name: "Draft Third", exact: true }).locator("..").locator("..")
  await third.getByRole("button", { name: "Edit", exact: true }).click()
  await page.getByLabel("Position", { exact: true }).fill("1")
  await page.getByRole("button", { name: "Save changes", exact: true }).click()
  await expect(page.getByText("A lesson already uses this position in the course", { exact: true })).toBeVisible()
  page.once("dialog", (dialog) => dialog.accept())
  await third.getByRole("button", { name: "Delete", exact: true }).click()
  await expect(page.getByLabel("Title", { exact: true })).toHaveValue("")
  await expect(page.getByLabel("Position", { exact: true })).toHaveValue("5")
  await page.goto(`/admin/lessons/${data.draftLessonId}`)
  await expect(page.getByLabel("Position", { exact: true })).toHaveValue("4")
  await page.getByLabel("Question", { exact: true }).fill("Browser new question")
  await page.getByRole("button", { name: "Add question", exact: true }).click()
  await expect(page.getByLabel("Position", { exact: true })).toHaveValue("5")
  const question = page.getByText("Draft question third", { exact: true }).locator("..").locator("..")
  await question.getByRole("button", { name: "Edit", exact: true }).click()
  await page.getByLabel("Position", { exact: true }).fill("1")
  await page.getByRole("button", { name: "Save changes", exact: true }).last().click()
  await expect(page.getByText("A question already uses this position in the quiz", { exact: true })).toBeVisible()
  page.once("dialog", (dialog) => dialog.accept())
  await question.getByRole("button", { name: "Delete", exact: true }).click()
  await expect(page.getByText("Draft question third", { exact: true })).toHaveCount(0)
  await expect(page.getByLabel("Question", { exact: true })).toHaveValue("")
  await expect(page.getByLabel("Position", { exact: true })).toHaveValue("5")
})

test("admin answer authoring allows one correct answer and resets after deleting the edited option", async ({ page, data }) => {
  await login(page, data.admin, "/admin")
  await page.goto(`/admin/lessons/${data.draftLessonId}`)
  await page.getByRole("heading", { name: "Draft question first", exact: true }).locator("..")
    .getByRole("link", { name: "Manage answers", exact: true }).click()
  await page.getByLabel("Answer text", { exact: true }).fill("Browser right answer")
  await page.getByRole("checkbox", { name: /Correct answer/ }).check()
  await page.getByRole("button", { name: "Add option", exact: true }).click()
  await expect(page.getByText("Browser right answer", { exact: true })).toBeVisible()
  await expect(page.getByRole("checkbox", { name: /Correct answer/ })).toBeDisabled()
  await page.getByLabel("Answer text", { exact: true }).fill("Browser second answer")
  await page.getByRole("button", { name: "Add option", exact: true }).click()
  await expect(page.getByText("Browser second answer", { exact: true })).toBeVisible()
  const option = page.getByText("Browser right answer", { exact: true }).locator("..").locator("..")
  await option.getByRole("button", { name: "Edit", exact: true }).click()
  await expect(page.getByRole("checkbox", { name: /Correct answer/ })).toBeChecked()
  page.once("dialog", (dialog) => dialog.accept())
  await option.getByRole("button", { name: "Delete", exact: true }).click()
  await expect(page.getByText("Browser right answer", { exact: true })).toHaveCount(0)
  await expect(page.getByLabel("Answer text", { exact: true })).toHaveValue("")
  await expect(page.getByRole("checkbox", { name: /Correct answer/ })).not.toBeChecked()
  await expect(page.getByRole("checkbox", { name: /Correct answer/ })).toBeEnabled()
  await page.getByLabel("Answer text", { exact: true }).fill("Browser replacement answer")
  await page.getByRole("checkbox", { name: /Correct answer/ }).check()
  await page.getByRole("button", { name: "Add option", exact: true }).click()
  await expect(page.getByText("Browser replacement answer", { exact: true })).toBeVisible()
})

test("admin draft preview has no enrollment or personal completion controls", async ({ page, data }) => {
  await login(page, data.admin, "/admin")
  await page.goto("/courses")
  const draft = page.getByRole("article").filter({ has: page.getByRole("heading", { name: "Browser Draft Course", exact: true }) })
  await expect(draft.getByRole("button", { name: "Enroll", exact: true })).toHaveCount(0)
  await draft.getByRole("link", { name: "Preview draft", exact: true }).click()
  await expect(page.getByRole("status")).toContainText("Draft preview")
  await expect(page.getByRole("button", { name: "Enroll in course", exact: true })).toHaveCount(0)
  const lesson = page.getByRole("heading", { name: "Draft First", exact: true }).locator("..").locator("..")
  await lesson.getByRole("link", { name: "Preview", exact: true }).click()
  await expect(page.getByRole("status")).toContainText("Progress is not recorded")
  await expect(page.getByRole("button", { name: "Mark as completed", exact: true })).toHaveCount(0)
  await page.getByRole("link", { name: "Preview quiz", exact: true }).click()
  await expect(page.getByRole("status")).toContainText("Draft preview")
  await expect(page.getByRole("button", { name: "Submit quiz", exact: true })).toBeDisabled()
})

test("publication reports incomplete quizzes, then unlocks student enrollment after correction", async ({ page, data }) => {
  await login(page, data.admin, "/admin")
  const courseRow = page.getByRole("heading", { name: "Browser Draft Course", exact: true })
    .locator("..").locator("..").locator("..")
  await courseRow.getByRole("button", { name: "Edit", exact: true }).click()
  await page.getByLabel("Status", { exact: true }).selectOption("PUBLISHED")
  await page.getByRole("button", { name: "Save changes", exact: true }).click()
  await expect(page.getByRole("alert")).toContainText("Course cannot be published")
  await expect(page.getByRole("alert")).toContainText("must have answer options")
  await expect(courseRow.getByText("DRAFT", { exact: true })).toBeVisible()
  // A lesson without a quiz is valid; remove the unfinished quiz through the UI.
  await page.goto(`/admin/lessons/${data.draftLessonId}`)
  page.once("dialog", (dialog) => dialog.accept())
  await page.getByRole("button", { name: "Delete quiz", exact: true }).click()
  await expect(page.getByRole("button", { name: "Create quiz", exact: true })).toBeVisible()
  await page.goto("/admin")
  await courseRow.getByRole("button", { name: "Edit", exact: true }).click()
  await page.getByLabel("Status", { exact: true }).selectOption("PUBLISHED")
  await page.getByRole("button", { name: "Save changes", exact: true }).click()
  await expect(courseRow.getByText("PUBLISHED", { exact: true })).toBeVisible()
  await expect(page.getByRole("alert")).toHaveCount(0)
  await page.getByRole("button", { name: "Log out", exact: true }).click()
  await login(page, data.student)
  await page.goto(`/courses/${data.draftCourseId}`)
  await page.getByRole("button", { name: "Enroll in course", exact: true }).click()
  await page.getByRole("link", { name: "Continue learning", exact: true }).click()
  await page.getByRole("button", { name: "Mark as completed", exact: true }).click()
  await expect(page.getByRole("button", { name: "Lesson completed", exact: true })).toBeDisabled()
})

test("leaving login cancels a delayed sign-in without restoring the old session", async ({ page, data }) => {
  await page.goto("/catalog")
  await page.getByRole("link", { name: "Log in", exact: true }).click()
  let release!: () => void
  const delayed = new Promise<void>((resolve) => { release = resolve })
  let started!: () => void
  const requested = new Promise<void>((resolve) => { started = resolve })
  let settled!: () => void
  const finished = new Promise<void>((resolve) => { settled = resolve })
  let cancelled = false
  page.on("requestfailed", (request) => {
    if (request.url().endsWith("/auth/login") && request.failure()?.errorText.includes("ERR_ABORTED")) cancelled = true
  })
  await page.route("**/api/auth/login", async (route) => {
    const response = await route.fetch()
    started()
    await delayed
    try { await route.fulfill({ response }) } catch (error) { if (!cancelled) throw error } finally { settled() }
  })
  try {
    await page.getByLabel("Email", { exact: true }).fill(data.student.email)
    await page.getByLabel("Password", { exact: true }).fill(data.student.password)
    await page.getByRole("button", { name: "Sign in", exact: true }).click()
    await requested
    await page.goBack()
    await expect(page).toHaveURL("/catalog")
    await expect.poll(() => cancelled).toBe(true)
    release()
    await finished
    await expect(page.getByRole("link", { name: "Log in", exact: true })).toBeVisible()
    expect(await page.evaluate(() => localStorage.getItem("token"))).toBeNull()
  } finally { release() }
})

test("a rounded legacy percentage does not mark an incomplete course completed", async ({ page, data }) => {
  await enroll(page, data)
  await page.route("**/api/enrollments/me", (route) => route.fulfill({ json: { enrollments: [{
    id: 1, enrolledAt: new Date().toISOString(), course: {
      id: data.courseId, title: "Browser Programming Course", description: "Browser test course",
      imageUrl: null, status: "PUBLISHED", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    }, progress: { completedLessons: 199, totalLessons: 200, percentage: 100 },
  }] } }))
  await page.goto("/dashboard")
  await expect(page.getByText("In progress", { exact: true }).first()).toBeVisible()
  await expect(page.getByText("Done", { exact: true })).toHaveCount(0)
  await page.goto("/courses")
  const course = page.getByRole("article").filter({ has: page.getByRole("heading", { name: "Browser Programming Course", exact: true }) })
  await expect(course.getByRole("link", { name: "Continue", exact: true })).toBeVisible()
  await expect(course.getByRole("link", { name: "Review", exact: true })).toHaveCount(0)
})

test("catalog, dashboard and admin screens remain usable on a mobile viewport", async ({ page, data }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto("/catalog")
  await page.getByRole("searchbox", { name: "Search courses", exact: true }).fill("Browser")
  await expectPageToFitViewport(page)
  await login(page, data.admin, "/admin")
  for (const path of ["/dashboard", "/courses", "/admin", `/admin/courses/${data.draftCourseId}`, `/admin/lessons/${data.draftLessonId}`]) {
    await page.goto(path)
    await expect(page.locator("h1")).toBeVisible()
    await expectPageToFitViewport(page)
    await expect(page.getByRole("button", { name: "Open menu", exact: true })).toBeVisible()
  }
})

test("admin authoring forms fit a mobile viewport with enlarged text", async ({ page, data }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await login(page, data.admin, "/admin")
  for (const path of ["/admin", `/admin/courses/${data.draftCourseId}`, `/admin/lessons/${data.draftLessonId}`]) {
    await page.goto(path)
    await expect(page.locator("h1")).toBeVisible()
    // Simulate larger browser text and its effect on intrinsic form-control sizes.
    await page.addStyleTag({ content: ":root { font-size: 24px; }" })
    await expectPageToFitViewport(page)
    await expect(page.getByRole("textbox").first()).toBeEditable()
  }
  await page.getByRole("link", { name: "Manage answers", exact: true }).first().click()
  await expect(page).toHaveURL(/\/admin\/questions\/\d+$/)
  await expect(page.getByRole("heading", { name: "Answer options", exact: true })).toBeVisible()
  await expectPageToFitViewport(page)
  await expect(page.getByRole("textbox").first()).toBeEditable()
})

test("mobile navigation and quiz layout fit the viewport", async ({ page, data }, info) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await enroll(page, data)
  await page.goto(`/quizzes/${data.quizId}`)
  await expect(page.getByRole("heading", { name: "Browser Knowledge Check", exact: true })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.screenshot({ path: info.outputPath("mobile-quiz.png"), fullPage: true })
  await page.getByRole("button", { name: "Open menu", exact: true }).click()
  await page.getByRole("link", { name: "Explore courses", exact: true }).click()
  await expect(page).toHaveURL("/courses")
  await page.getByRole("button", { name: "Open menu", exact: true }).click()
  await page.getByRole("button", { name: "Log out", exact: true }).click()
  await expect(page).toHaveURL("/")
})
