import { test as base, expect, type Page, type Request } from "@playwright/test"
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

async function openDraftQuiz(page: Page) {
  await page.getByRole("link", { name: "Explore courses", exact: true }).click()
  const draft = page.getByRole("article").filter({ has: page.getByRole("heading", { name: "Browser Draft Course", exact: true }) })
  await draft.getByRole("link", { name: "Preview draft", exact: true }).click()
  const lesson = page.getByRole("heading", { name: "Draft First", exact: true }).locator("..").locator("..")
  await lesson.getByRole("link", { name: "Preview", exact: true }).click()
  await page.getByRole("link", { name: "Preview quiz", exact: true }).click()
  await expect(page.getByRole("heading", { name: "Draft Quiz", exact: true })).toBeVisible()
}

test("quiz history is protected and available in desktop and mobile personal navigation", async ({ page, data }) => {
  let reads = 0
  let downloads = 0
  page.on("request", (request) => {
    if (request.url().includes("/api/quizzes/attempts/me")) reads++
    if (pageModule("QuizHistoryPage").test(request.url())) downloads++
  })
  await page.goto("/quiz-history")
  await expect(page).toHaveURL("/")
  expect(reads).toBe(0)
  expect(downloads).toBe(0)
  await login(page, data.student)
  await page.getByRole("link", { name: "Quiz history", exact: true }).click()
  await expect(page.getByRole("heading", { name: "Quiz history", exact: true })).toBeFocused()
  await expect(page.getByRole("heading", { name: "No quiz attempts yet", exact: true })).toBeVisible()
  await expect(page.getByRole("link", { name: "Quiz history", exact: true })).toHaveAttribute("aria-current", "page")
  await page.getByRole("button", { name: "Log out", exact: true }).click()
  await login(page, data.admin, "/admin")
  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByRole("button", { name: "Open menu", exact: true }).click()
  await page.getByRole("link", { name: "Quiz history", exact: true }).click()
  await expect(page).toHaveURL("/quiz-history")
  await expect(page.getByRole("button", { name: "Close navigation", exact: true })).toHaveCount(0)
  await expect(page.getByRole("heading", { name: "No quiz attempts yet", exact: true })).toBeVisible()
})

test("quiz history shows saved scores, quiz filtering and mobile cards without claiming lesson completion", async ({ page, data }, info) => {
  await enroll(page, data)
  const otherQuiz = await prisma.quiz.create({ data: { lessonId: data.manualLessonId,
    title: "Another programming knowledge check with a longer title for the mobile layout" } })
  await prisma.quizAttempt.create({ data: { userId: data.student.id, quizId: otherQuiz.id, score: 100,
    startedAt: new Date("2020-01-01T12:00:00Z") } })
  await prisma.quizAttempt.create({ data: { userId: data.admin.id, quizId: data.quizId, score: 88, completedAt: new Date() } })
  const draftQuiz = await prisma.quiz.findUniqueOrThrow({ where: { lessonId: data.draftLessonId } })
  await prisma.quizAttempt.create({ data: { userId: data.student.id, quizId: draftQuiz.id, score: 100, completedAt: new Date() } })
  await page.goto(`/quizzes/${data.quizId}`)
  for (const index of [1, 2, 3]) await page.getByText(`Wrong ${index}`, { exact: true }).click()
  await page.getByRole("button", { name: "Submit quiz", exact: true }).click()
  await expect(page.getByText("0%", { exact: true })).toBeVisible()
  await page.getByRole("button", { name: "Try again", exact: true }).click()
  for (const index of [1, 2, 3]) await page.getByText(`Correct ${index}`, { exact: true }).click()
  await page.getByRole("button", { name: "Submit quiz", exact: true }).click()
  await expect(page.getByRole("status")).toContainText("Your lesson has been marked as completed")
  const completed = await prisma.lessonProgress.findUniqueOrThrow({ where: { userId_lessonId: { userId: data.student.id, lessonId: data.quizLessonId } } })
  await page.getByRole("link", { name: "View quiz history", exact: true }).click()
  await expect(page).toHaveURL(`/quiz-history?quizId=${data.quizId}`)
  await expect(page.getByRole("status")).toHaveText("2 attempts for Browser Knowledge Check")
  const cards = page.getByRole("article")
  await expect(cards).toHaveCount(2)
  await expect(cards.nth(0).getByText("100%", { exact: true })).toBeVisible()
  await expect(cards.nth(1).getByText("0%", { exact: true })).toBeVisible()
  await expect(cards.nth(0).locator("time")).toHaveAttribute("datetime", /T/)
  await expect(page.getByText("Perfect score", { exact: true })).toHaveCount(0)
  await page.getByRole("link", { name: "View all attempts", exact: true }).click()
  await expect(page.getByRole("status")).toHaveText("3 attempts")
  await expect(page.getByRole("article")).toHaveCount(3)
  await expect(page.getByText("88%", { exact: true })).toHaveCount(0)
  await expect(page.getByRole("heading", { name: "Draft Quiz", exact: true })).toHaveCount(0)
  const pending = cards.filter({ has: page.getByRole("heading", { name: otherQuiz.title, exact: true }) })
  await expect(pending.getByText("In progress", { exact: true })).toBeVisible()
  await expect(pending.getByText("Not submitted", { exact: true })).toBeVisible()
  await expect(pending.getByText("100%", { exact: true })).toHaveCount(0)
  await page.screenshot({ path: info.outputPath("quiz-history-desktop.png"), fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.addStyleTag({ content: "html { font-size: 20px !important; }" })
  await expectPageToFitViewport(page)
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }))
  await page.screenshot({ path: info.outputPath("quiz-history-mobile.png"), fullPage: true })
  await pending.getByRole("link", { name: "Quiz attempts", exact: true }).click()
  await expect(page.getByRole("status")).toContainText("1 attempt for Another programming")
  await expect(page.getByRole("article")).toHaveCount(1)
  await page.getByRole("link", { name: "View all attempts", exact: true }).click()
  await expect(page.getByRole("status")).toHaveText("3 attempts")
  await page.reload()
  await expect(page.getByRole("status")).toHaveText("3 attempts")
  await page.getByRole("article").first().getByRole("link", { name: "Open quiz", exact: true }).click()
  await expect(page).toHaveURL(`/quizzes/${data.quizId}`)
  await expect(page.getByRole("radio")).toHaveCount(6)
  expect(await prisma.quizAttempt.count({ where: { userId: data.student.id, quizId: data.quizId } })).toBe(2)
  expect((await prisma.lessonProgress.findUniqueOrThrow({ where: { id: completed.id } })).completedAt).toEqual(completed.completedAt)
})

test("quiz history distinguishes loading, read errors and empty results with retry and refresh", async ({ page, data }) => {
  await login(page, data.student)
  let unavailable = true
  let release!: () => void
  const delayed = new Promise<void>((resolve) => { release = resolve })
  await page.route("**/api/quizzes/attempts/me", async (route) => {
    await delayed
    try {
      await route.fulfill(unavailable ? { status: 503, json: { message: "History temporarily unavailable" } } : { json: { attempts: [] } })
    } catch (error) { if (!route.request().failure()) throw error }
  })
  try {
    await page.goto("/quiz-history")
    await expect(page.getByRole("status")).toHaveText("Loading your quiz history...")
    await expect(page.getByRole("button", { name: "Refresh history", exact: true })).toBeDisabled()
    await expect(page.getByText("No quiz attempts yet", { exact: true })).toHaveCount(0)
    release()
    await expect(page.getByRole("alert")).toContainText("History temporarily unavailable")
    await expect(page.getByText("No quiz attempts yet", { exact: true })).toHaveCount(0)
    unavailable = false
    await page.getByRole("button", { name: "Retry", exact: true }).click()
    await expect(page.getByRole("heading", { name: "No quiz attempts yet", exact: true })).toBeVisible()
    await expect(page.getByRole("status")).toHaveText("0 attempts")
    unavailable = true
    await page.getByRole("button", { name: "Refresh history", exact: true }).click()
    await expect(page.getByRole("alert")).toContainText("History temporarily unavailable")
    await expect(page.getByText("No quiz attempts yet", { exact: true })).toHaveCount(0)
  } finally { release() }
})

test("quiz history cancels a delayed quiz filter when returning to all attempts", async ({ page, data }) => {
  await login(page, data.student)
  const pending: Request[] = []
  let settled = 0
  let release!: () => void
  const delayed = new Promise<void>((resolve) => { release = resolve })
  await page.route("**/api/quizzes/attempts/me*", async (route) => {
    if (!new URL(route.request().url()).searchParams.has("quizId")) {
      await route.fulfill({ json: { attempts: [] } })
      return
    }
    pending.push(route.request())
    await delayed
    try { await route.fulfill({ json: { attempts: [{ id: 1, quizId: data.quizId, score: 100,
      startedAt: "2026-01-01T12:00:00Z", completedAt: "2026-01-01T12:00:00Z",
      quiz: { id: data.quizId, lessonId: data.quizLessonId, title: "Old filtered quiz" } }] } }) }
    catch (error) { if (!route.request().failure()) throw error }
    finally { settled++ }
  })
  try {
    await page.goto(`/quiz-history?quizId=${data.quizId}`)
    await expect(page.getByRole("status")).toHaveText("Loading your quiz history...")
    await expect.poll(() => pending.length).toBeGreaterThan(0)
    await page.getByRole("link", { name: "View all attempts", exact: true }).click()
    await expect(page.getByRole("status")).toHaveText("0 attempts")
    await expect.poll(() => pending.every((request) => Boolean(request.failure()))).toBe(true)
    release()
    await expect.poll(() => settled).toBe(pending.length)
    await expect(page.getByRole("article")).toHaveCount(0)
    await expect(page.getByRole("heading", { name: "No quiz attempts yet", exact: true })).toBeVisible()
  } finally { release() }
})

test("quiz history rejects invalid URL filters without fetching broader history", async ({ page, data }) => {
  await login(page, data.student)
  let reads = 0
  page.on("request", (request) => { if (request.url().includes("/api/quizzes/attempts/me")) reads++ })
  for (const filter of ["", "bad", "0", "-1", "1.5", "2147483648", "1&quizId=2"]) {
    await page.goto(`/quiz-history?quizId=${filter}`)
    await expect(page.getByRole("alert")).toHaveText("Invalid quiz filter.")
    await expect(page.getByRole("article")).toHaveCount(0)
  }
  expect(reads).toBe(0)
  await page.getByRole("link", { name: "View all attempts", exact: true }).click()
  await expect(page.getByRole("status")).toHaveText("0 attempts")
  await page.goto("/quiz-history?quizId=2147483647")
  await expect(page.getByRole("heading", { name: "No attempts for this quiz yet", exact: true })).toBeVisible()
})

test("public unknown routes provide keyboard navigation and fit enlarged mobile text", async ({ page }, info) => {
  await page.goto("/missing-page")
  await expect(page.getByRole("heading", { name: "Page not found", exact: true })).toBeFocused()
  await expect(page.getByRole("link", { name: "Back to home", exact: true })).toBeVisible()
  await page.keyboard.press("Tab")
  const browse = page.getByRole("link", { name: "Browse courses", exact: true })
  await expect(browse).toBeFocused()
  const style = await browse.evaluate((element) => {
    const css = getComputedStyle(element)
    const canvas = document.createElement("canvas")
    canvas.width = canvas.height = 1
    const context = canvas.getContext("2d")!
    const luminance = (color: string) => {
      context.fillStyle = color
      context.fillRect(0, 0, 1, 1)
      const channels = [...context.getImageData(0, 0, 1, 1).data].slice(0, 3).map((value) => {
        const channel = value / 255
        return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
      })
      return channels[0]! * 0.2126 + channels[1]! * 0.7152 + channels[2]! * 0.0722
    }
    const text = luminance(css.color)
    const background = luminance(css.backgroundColor)
    return { outline: css.outlineStyle, width: css.outlineWidth,
      contrast: (Math.max(text, background) + 0.05) / (Math.min(text, background) + 0.05) }
  })
  expect(style.outline).toBe("solid")
  expect(style.width).toBe("2px")
  expect(style.contrast).toBeGreaterThanOrEqual(4.5)
  await page.screenshot({ path: info.outputPath("not-found-desktop-focus.png"), fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.addStyleTag({ content: "html { font-size: 20px !important; }" })
  await expectPageToFitViewport(page)
  await page.screenshot({ path: info.outputPath("not-found-mobile.png"), fullPage: true })
  await page.keyboard.press("Enter")
  await expect(page).toHaveURL("/catalog")
  await page.goto("/catalog/unknown/path")
  await expect(page.getByRole("heading", { name: "Page not found", exact: true })).toBeVisible()
  await page.reload()
  await expect(page.getByRole("heading", { name: "Page not found", exact: true })).toBeVisible()
})

test("authenticated unknown routes keep learner navigation and admin guards", async ({ page, data }) => {
  await login(page, data.student)
  let adminReads = 0
  page.on("request", (request) => { if (/\/api\/(lessons\/course|quizzes\/.*\/admin)/.test(request.url())) adminReads++ })
  await page.goto("/admin/unknown/path")
  await expect(page.getByRole("heading", { name: "Page not found", exact: true })).toBeVisible()
  await expect(page.getByRole("button", { name: "Log out", exact: true })).toBeVisible()
  await page.getByRole("link", { name: "Go to dashboard", exact: true }).click()
  await expect(page).toHaveURL("/dashboard")
  await page.goto(`/admin/courses/${data.draftCourseId}`)
  await expect(page).toHaveURL("/dashboard")
  expect(adminReads).toBe(0)
})

test("public read failures retry without losing the catalog search", async ({ page, data }) => {
  let unavailable = true
  await page.route("**/api/courses", (route) => unavailable
    ? route.fulfill({ status: 503, json: { message: "Catalog temporarily unavailable" } }) : route.continue())
  await page.goto("/catalog")
  await expect(page.getByRole("alert")).toContainText("Catalog temporarily unavailable")
  await expect(page.getByText("No courses available yet", { exact: true })).toHaveCount(0)
  await page.getByLabel("Search courses", { exact: true }).fill("Browser Programming")
  unavailable = false
  await page.getByRole("button", { name: "Retry", exact: true }).click()
  await expect(page.getByRole("heading", { name: "Browser Programming Course", exact: true })).toBeVisible()
  await expect(page.getByLabel("Search courses", { exact: true })).toHaveValue("Browser Programming")
  unavailable = true
  await page.route(`**/api/courses/${data.courseId}/curriculum`, (route) => unavailable
    ? route.fulfill({ status: 503, json: { message: "Curriculum temporarily unavailable" } }) : route.continue())
  await page.goto(`/catalog/${data.courseId}`)
  await expect(page.getByRole("alert")).toContainText("Curriculum temporarily unavailable")
  unavailable = false
  await page.getByRole("button", { name: "Retry", exact: true }).click()
  await expect(page.getByRole("heading", { name: "Browser Programming Course", exact: true })).toBeVisible()
  await expect(page.getByRole("button", { name: "Enroll in course", exact: true })).toBeEnabled()
})

test("learner read failures recover on dashboard, courses and course details", async ({ page, data }) => {
  await login(page, data.student)
  let unavailable = true
  await page.route("**/api/enrollments/me", (route) => unavailable
    ? route.fulfill({ status: 503, json: { message: "Enrollment reads unavailable" } }) : route.continue())
  await page.goto("/dashboard")
  await expect(page.getByRole("alert")).toContainText("Enrollment reads unavailable")
  await expect(page.getByText("You haven't enrolled in any courses yet.", { exact: true })).toHaveCount(0)
  unavailable = false
  await page.getByRole("button", { name: "Retry", exact: true }).click()
  await expect(page.getByText("You haven't enrolled in any courses yet.", { exact: true })).toBeVisible()
  unavailable = true
  await page.goto("/courses")
  await expect(page.getByRole("alert")).toContainText("Enrollment reads unavailable")
  await page.getByLabel("Search courses", { exact: true }).fill("Browser")
  await page.getByRole("button", { name: "Available", exact: true }).click()
  unavailable = false
  await page.getByRole("button", { name: "Retry", exact: true }).click()
  await expect(page.getByRole("heading", { name: "Browser Programming Course", exact: true })).toBeVisible()
  await expect(page.getByLabel("Search courses", { exact: true })).toHaveValue("Browser")
  await expect(page.getByRole("button", { name: "Available", exact: true })).toHaveAttribute("aria-pressed", "true")
  unavailable = true
  await page.goto(`/courses/${data.courseId}`)
  await expect(page.getByRole("alert")).toContainText("Enrollment reads unavailable")
  unavailable = false
  await page.getByRole("button", { name: "Retry", exact: true }).click()
  await page.getByRole("button", { name: "Enroll in course", exact: true }).click()
  await expect(page.getByRole("progressbar", { name: "Course progress", exact: true })).toHaveAttribute("aria-valuenow", "0")
})

test("quiz read and progress retries preserve the result and create only one attempt", async ({ page, data }, info) => {
  await enroll(page, data)
  let quizUnavailable = true
  await page.route(`**/api/quizzes/${data.quizId}`, (route) => quizUnavailable
    ? route.fulfill({ status: 503, json: { message: "Quiz read unavailable" } }) : route.continue())
  await page.goto(`/quizzes/${data.quizId}`)
  await expect(page.getByRole("alert")).toContainText("Quiz read unavailable")
  await expect(page.getByRole("button", { name: "Submit quiz", exact: true })).toHaveCount(0)
  quizUnavailable = false
  await page.getByRole("button", { name: "Retry", exact: true }).click()
  for (const index of [1, 2, 3]) await page.getByText(`Correct ${index}`, { exact: true }).click()
  let progressReads = 0
  let submits = 0
  let manualWrites = 0
  page.on("request", (request) => {
    if (request.method() !== "POST") return
    if (request.url().endsWith(`/quizzes/${data.quizId}/submit`)) submits++
    if (request.url().includes("/progress/lessons/")) manualWrites++
  })
  let release!: () => void
  const delayed = new Promise<void>((resolve) => { release = resolve })
  let started!: () => void
  const requested = new Promise<void>((resolve) => { started = resolve })
  await page.route(`**/api/progress/courses/${data.courseId}`, async (route) => {
    progressReads++
    if (progressReads === 1) await route.fulfill({ status: 503, json: { message: "Progress unavailable" } })
    else if (progressReads === 2) await route.fulfill({ json: { progress: { lessons: [{ id: data.quizLessonId, completed: false }] } } })
    else { started(); await delayed; await route.continue() }
  })
  try {
    await page.getByRole("button", { name: "Submit quiz", exact: true }).click()
    await expect(page.getByRole("status")).toContainText("We couldn't verify")
    await expect(page.getByText("100%", { exact: true })).toBeVisible()
    const saved = await prisma.lessonProgress.findUniqueOrThrow({ where: { userId_lessonId: { userId: data.student.id, lessonId: data.quizLessonId } } })
    await page.getByRole("button", { name: "Retry progress check", exact: true }).click()
    await expect(page.getByRole("status")).toContainText("hasn't been marked as completed yet")
    await page.setViewportSize({ width: 390, height: 844 })
    await expectPageToFitViewport(page)
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }))
    await page.screenshot({ path: info.outputPath("quiz-progress-retry-mobile.png"), fullPage: true })
    const retry = page.getByRole("button", { name: "Retry progress check", exact: true })
    await retry.evaluate((button: HTMLButtonElement) => { button.click(); button.click() })
    await requested
    await expect(page.getByRole("status")).toContainText("Checking your lesson progress")
    expect(progressReads).toBe(3)
    release()
    await expect(page.getByRole("status")).toContainText("Your lesson has been marked as completed")
    expect(submits).toBe(1)
    expect(manualWrites).toBe(0)
    expect(await prisma.quizAttempt.count({ where: { userId: data.student.id, quizId: data.quizId } })).toBe(1)
    expect((await prisma.lessonProgress.findUniqueOrThrow({ where: { id: saved.id } })).completedAt).toEqual(saved.completedAt)
  } finally { release() }
})

test("lesson read retries keep quiz uncertainty separate from saved progress", async ({ page, data }) => {
  await enroll(page, data)
  await prisma.lessonProgress.create({ data: { userId: data.student.id, lessonId: data.manualLessonId, completed: true, completedAt: new Date() } })
  let lessonUnavailable = true
  let progressUnavailable = true
  let quizUnavailable = true
  await page.route(`**/api/lessons/${data.manualLessonId}`, (route) => lessonUnavailable
    ? route.fulfill({ status: 503, json: { message: "Lesson read unavailable" } }) : route.continue())
  await page.route(`**/api/progress/courses/${data.courseId}`, (route) => progressUnavailable
    ? route.fulfill({ status: 503, json: { message: "Progress read unavailable" } }) : route.continue())
  await page.route(`**/api/quizzes/lesson/${data.manualLessonId}`, (route) => quizUnavailable
    ? route.fulfill({ status: 503, json: { message: "Quiz lookup unavailable" } }) : route.continue())
  await page.goto(`/lessons/${data.manualLessonId}`)
  await expect(page.getByRole("alert")).toContainText("Lesson read unavailable")
  lessonUnavailable = false
  await page.getByRole("button", { name: "Retry", exact: true }).click()
  await expect(page.getByText("Manual completion is unavailable until this check succeeds.", { exact: true })).toBeVisible()
  progressUnavailable = false
  await page.getByRole("button", { name: "Retry progress", exact: true }).click()
  await expect(page.getByRole("button", { name: "Retry progress", exact: true })).toHaveCount(0)
  await expect(page.getByRole("button", { name: "Mark as completed", exact: true })).toHaveCount(0)
  quizUnavailable = false
  await page.getByRole("button", { name: "Retry", exact: true }).click()
  await expect(page.getByRole("button", { name: "Lesson completed", exact: true })).toBeDisabled()
})

test("leaving a pending progress retry cancels the read and keeps the next quiz clean", async ({ page, data }) => {
  await prisma.enrollment.create({ data: { userId: data.admin.id, courseId: data.courseId } })
  await login(page, data.admin, "/admin")
  await page.goto(`/quizzes/${data.quizId}`)
  for (const index of [1, 2, 3]) await page.getByText(`Correct ${index}`, { exact: true }).click()
  let unavailable = true
  let pending: Request | undefined
  let release!: () => void
  const delayed = new Promise<void>((resolve) => { release = resolve })
  let started!: () => void
  const requested = new Promise<void>((resolve) => { started = resolve })
  let settled!: () => void
  const finished = new Promise<void>((resolve) => { settled = resolve })
  await page.route(`**/api/progress/courses/${data.courseId}`, async (route) => {
    if (unavailable) {
      await route.fulfill({ status: 503, json: { message: "Progress unavailable" } })
      return
    }
    pending = route.request()
    started()
    await delayed
    try { await route.fulfill({ json: { progress: { lessons: [{ id: data.quizLessonId, completed: true }] } } }) }
    catch (error) { if (!pending.failure()) throw error }
    finally { settled() }
  })
  try {
    await page.getByRole("button", { name: "Submit quiz", exact: true }).click()
    await expect(page.getByRole("status")).toContainText("We couldn't verify")
    unavailable = false
    await page.getByRole("button", { name: "Retry progress check", exact: true }).click()
    await requested
    await openDraftQuiz(page)
    await expect.poll(() => Boolean(pending?.failure())).toBe(true)
    release()
    await finished
    await expect(page.getByRole("heading", { name: "Draft Quiz", exact: true })).toBeVisible()
    await expect(page.getByText("Perfect score", { exact: true })).toHaveCount(0)
    await expect(page.getByRole("button", { name: "Retry progress check", exact: true })).toHaveCount(0)
  } finally { release() }
})

test("admin initial read retries recover all editors without false empty states", async ({ page, data }) => {
  await login(page, data.admin, "/admin")
  const question = await prisma.question.findFirstOrThrow({ where: { quiz: { lessonId: data.draftLessonId } } })
  const screens = [
    { url: "/admin", api: "**/api/courses", heading: "Course management" },
    { url: `/admin/courses/${data.draftCourseId}`, api: `**/api/courses/${data.draftCourseId}`, heading: "Browser Draft Course" },
    { url: `/admin/lessons/${data.draftLessonId}`, api: `**/api/lessons/${data.draftLessonId}`, heading: "Draft First" },
    { url: `/admin/questions/${question.id}`, api: `**/api/quizzes/questions/${question.id}/admin`, heading: `Question ${question.position}` },
  ]
  for (const screen of screens) {
    let unavailable = true
    await page.route(screen.api, (route) => unavailable
      ? route.fulfill({ status: 503, json: { message: "Editor read unavailable" } }) : route.continue())
    await page.goto(screen.url)
    await expect(page.getByRole("alert")).toContainText("Editor read unavailable")
    await expect(page.locator("form")).toHaveCount(0)
    unavailable = false
    await page.getByRole("button", { name: "Retry", exact: true }).click()
    await expect(page.getByRole("heading", { name: screen.heading, exact: true })).toBeVisible()
    await expect(page.locator("form").first()).toBeVisible()
    await page.unroute(screen.api)
  }
})

test("quiz submission failure keeps answers and retry prevents duplicates", async ({ page, data }, info) => {
  await enroll(page, data)
  await page.goto(`/quizzes/${data.quizId}`)
  for (const index of [1, 2, 3]) await page.getByText(`Correct ${index}`, { exact: true }).click()
  const payloads: unknown[] = []
  let manualWrites = 0
  page.on("request", (request) => {
    if (request.method() === "POST" && /\/progress\/lessons\/\d+\/complete$/.test(request.url())) manualWrites++
  })
  let release!: () => void
  const delayed = new Promise<void>((resolve) => { release = resolve })
  let started!: () => void
  const requested = new Promise<void>((resolve) => { started = resolve })
  await page.route(`**/api/quizzes/${data.quizId}/submit`, async (route) => {
    payloads.push(route.request().postDataJSON())
    if (payloads.length === 1) {
      await route.fulfill({ status: 503, json: { message: "Quiz submission unavailable" } })
      return
    }
    started()
    await delayed
    await route.continue()
  })
  try {
    await page.getByRole("button", { name: "Submit quiz", exact: true }).click()
    await expect(page.getByRole("alert")).toHaveText("Quiz submission unavailable")
    await expect(page.locator('input[type="radio"]:checked')).toHaveCount(3)
    expect(await prisma.quizAttempt.count({ where: { userId: data.student.id, quizId: data.quizId } })).toBe(0)
    await page.screenshot({ path: info.outputPath("quiz-submit-error.png"), fullPage: true, animations: "disabled" })
    await page.getByRole("button", { name: "Submit quiz", exact: true }).click()
    await requested
    const submit = page.getByRole("button", { name: "Submitting...", exact: true })
    await expect(submit).toBeDisabled()
    for (const radio of await page.getByRole("radio").all()) await expect(radio).toBeDisabled()
    await submit.dispatchEvent("click")
    await expect(page.getByRole("radio", { name: "Correct 1", exact: true })).toBeChecked()
    expect(payloads).toHaveLength(2)
    expect(payloads[1]).toEqual(payloads[0])
    release()
    await expect(page.getByRole("status")).toContainText("Your lesson has been marked as completed")
    expect(manualWrites).toBe(0)
    expect(await prisma.quizAttempt.count({ where: { userId: data.student.id, quizId: data.quizId } })).toBe(1)
  } finally { release() }
})

test("leaving a pending quiz submission cannot replace the next quiz with its result", async ({ page, data }) => {
  await prisma.enrollment.create({ data: { userId: data.admin.id, courseId: data.courseId } })
  await login(page, data.admin, "/admin")
  await page.goto(`/quizzes/${data.quizId}`)
  for (const index of [1, 2, 3]) await page.getByText(`Correct ${index}`, { exact: true }).click()
  let pending: Request | undefined
  let release!: () => void
  const delayed = new Promise<void>((resolve) => { release = resolve })
  let started!: () => void
  const requested = new Promise<void>((resolve) => { started = resolve })
  let settled!: () => void
  const finished = new Promise<void>((resolve) => { settled = resolve })
  await page.route(`**/api/quizzes/${data.quizId}/submit`, async (route) => {
    pending = route.request()
    started()
    await delayed
    try {
      await route.fulfill({ status: 201, json: { result: { attemptId: 1, score: 100, correctAnswers: 3, totalQuestions: 3 } } })
    } catch (error) { if (!pending.failure()) throw error }
    finally { settled() }
  })
  try {
    await page.getByRole("button", { name: "Submit quiz", exact: true }).click()
    await requested
    await openDraftQuiz(page)
    await expect.poll(() => Boolean(pending?.failure())).toBe(true)
    release()
    await finished
    await expect(page.getByRole("heading", { name: "Draft Quiz", exact: true })).toBeVisible()
    await expect(page.getByText("Perfect score", { exact: true })).toHaveCount(0)
    await expect(page.locator('input[type="radio"]:checked')).toHaveCount(0)
    await expect(page.getByRole("button", { name: "Submit quiz", exact: true })).toBeDisabled()
  } finally { release() }
})

test("leaving a quiz during completion verification cancels its delayed progress read", async ({ page, data }) => {
  await prisma.enrollment.create({ data: { userId: data.admin.id, courseId: data.courseId } })
  await login(page, data.admin, "/admin")
  await page.goto(`/quizzes/${data.quizId}`)
  for (const index of [1, 2, 3]) await page.getByText(`Correct ${index}`, { exact: true }).click()
  let pending: Request | undefined
  let release!: () => void
  const delayed = new Promise<void>((resolve) => { release = resolve })
  let started!: () => void
  const requested = new Promise<void>((resolve) => { started = resolve })
  let settled!: () => void
  const finished = new Promise<void>((resolve) => { settled = resolve })
  await page.route(`**/api/progress/courses/${data.courseId}`, async (route) => {
    pending = route.request()
    started()
    await delayed
    try {
      await route.fulfill({ status: 200, json: { progress: { lessons: [{ id: data.quizLessonId, completed: true }] } } })
    } catch (error) { if (!pending.failure()) throw error }
    finally { settled() }
  })
  try {
    await page.getByRole("button", { name: "Submit quiz", exact: true }).click()
    await requested
    await expect(page.getByRole("status")).toHaveText("Perfect score! Checking your lesson progress...")
    await openDraftQuiz(page)
    await expect.poll(() => Boolean(pending?.failure())).toBe(true)
    release()
    await finished
    await expect(page.getByRole("status")).toContainText("Draft preview")
    await expect(page.getByText("Perfect score", { exact: true })).toHaveCount(0)
    expect(await prisma.lessonProgress.count({ where: { userId: data.admin.id, lessonId: data.quizLessonId, completed: true } })).toBe(1)
  } finally { release() }
})

test("quiz result uses exact answer counts instead of a rounded legacy percentage", async ({ page, data }) => {
  await enroll(page, data)
  await page.goto(`/quizzes/${data.quizId}`)
  for (const index of [1, 2, 3]) await page.getByText(`Correct ${index}`, { exact: true }).click()
  let progressReads = 0
  page.on("request", (request) => { if (request.url().endsWith(`/progress/courses/${data.courseId}`)) progressReads++ })
  await page.route(`**/api/quizzes/${data.quizId}/submit`, (route) => route.fulfill({ status: 201, json: { result: { attemptId: 1, score: 100, correctAnswers: 2, totalQuestions: 3 } } }))
  await page.getByRole("button", { name: "Submit quiz", exact: true }).click()
  await expect(page.getByText("Quiz submitted", { exact: true })).toBeVisible()
  await expect(page.getByText("Perfect score", { exact: true })).toHaveCount(0)
  await expect(page.getByRole("status")).toContainText("A perfect score completes this lesson.")
  expect(progressReads).toBe(0)
  await page.getByRole("button", { name: "Try again", exact: true }).click()
  await expect(page.locator('input[type="radio"]:checked')).toHaveCount(0)
  await expect(page.getByRole("progressbar", { name: "Questions answered", exact: true })).toHaveAttribute("aria-valuenow", "0")
  await expect(page.getByRole("button", { name: "Submit quiz", exact: true })).toBeDisabled()
})

async function confirmDeletion(page: Page, label: string) {
  const dialog = page.getByRole("dialog")
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole("button", { name: "Cancel", exact: true })).toBeFocused()
  await dialog.getByRole("button", { name: label, exact: true }).click()
  await expect(dialog).toHaveCount(0)
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

function pageModule(name: string) {
  return new RegExp(`/(src/pages/${name}\\.tsx|assets/${name}-[^/]+\\.js)(\\?.*)?$`)
}

test("course details retry enrollment, prevent duplicates and restore saved progress", async ({ page, data }, info) => {
  // Saved progress may remain after an earlier enrollment was removed.
  await prisma.lessonProgress.create({ data: { userId: data.student.id, lessonId: data.manualLessonId, completed: true, completedAt: new Date() } })
  await login(page, data.student)
  await page.goto(`/courses/${data.courseId}`)
  await expect(page.getByText("Locked", { exact: true })).toHaveCount(2)
  let attempts = 0
  let release!: () => void
  const delayed = new Promise<void>((resolve) => { release = resolve })
  let started!: () => void
  const requested = new Promise<void>((resolve) => { started = resolve })
  await page.route(`**/api/enrollments/courses/${data.courseId}`, async (route) => {
    attempts++
    if (attempts === 1) {
      await route.fulfill({ status: 503, json: { message: "Enrollment unavailable" } })
      return
    }
    started()
    await delayed
    await route.continue()
  })
  let progressReads = 0
  await page.route(`**/api/progress/courses/${data.courseId}`, async (route) => {
    if (++progressReads === 1) await route.fulfill({ status: 503, json: { message: "Progress unavailable" } })
    else await route.continue()
  })
  try {
    await page.getByRole("button", { name: "Enroll in course", exact: true }).click()
    await expect(page.getByText("Enrollment unavailable", { exact: true })).toBeVisible()
    expect(await prisma.enrollment.count({ where: { userId: data.student.id, courseId: data.courseId } })).toBe(0)
    await page.getByRole("button", { name: "Enroll in course", exact: true }).click()
    await requested
    const pending = page.getByRole("button", { name: "Enrolling...", exact: true })
    await expect(pending).toBeDisabled()
    await pending.dispatchEvent("click")
    expect(attempts).toBe(2)
    release()
    await expect(page.getByText("Progress could not be loaded.", { exact: false })).toBeVisible()
    await expect(page.getByRole("link", { name: "Open", exact: true })).toHaveCount(2)
    await expect(page.getByRole("link", { name: "Continue learning", exact: true })).toHaveCount(0)
    await expect(page.getByText("0%", { exact: true })).toHaveCount(0)
    await page.screenshot({ path: info.outputPath("course-details-progress-unknown.png"), fullPage: true, animations: "disabled" })
    await page.getByRole("button", { name: "Retry", exact: true }).click()
    await expect(page.getByText("1 of 2 lessons completed", { exact: true })).toBeVisible()
    await expect(page.getByText("50%", { exact: true })).toBeVisible()
    await expect(page.getByRole("link", { name: "Continue learning", exact: true })).toHaveAttribute("href", `/lessons/${data.quizLessonId}`)
    await expect(page.getByRole("link", { name: "Review", exact: true })).toHaveCount(1)
    await expect(page.getByRole("link", { name: "Start", exact: true })).toHaveCount(1)
    expect(await prisma.enrollment.count({ where: { userId: data.student.id, courseId: data.courseId } })).toBe(1)
  } finally { release() }
})

test("leaving course details cancels every delayed metadata request", async ({ page, data }) => {
  await login(page, data.admin, "/admin")
  const held: Request[] = []
  const finished: Promise<void>[] = []
  let release!: () => void
  const delayed = new Promise<void>((resolve) => { release = resolve })
  let started!: () => void
  const requested = new Promise<void>((resolve) => { started = resolve })
  await page.route(`**/api/courses/${data.courseId}`, async (route) => {
    const request = route.request()
    held.push(request)
    let settled!: () => void
    finished.push(new Promise<void>((resolve) => { settled = resolve }))
    started()
    await delayed
    try {
      await route.fulfill({ status: 500, json: { message: "Old course request failed" } })
    } catch (error) { if (!request.failure()) throw error }
    finally { settled() }
  })
  try {
    await page.goto(`/courses/${data.courseId}`)
    await requested
    await page.getByRole("link", { name: "Explore courses", exact: true }).click()
    const draft = page.getByRole("article").filter({ has: page.getByRole("heading", { name: "Browser Draft Course", exact: true }) })
    await draft.getByRole("link", { name: "Preview draft", exact: true }).click()
    await expect(page.getByRole("heading", { name: "Browser Draft Course", exact: true })).toBeVisible()
    await expect.poll(() => held.length > 0 && held.every((request) => Boolean(request.failure()))).toBe(true)
    release()
    await Promise.all(finished)
    await expect(page.getByText("Old course request failed", { exact: true })).toHaveCount(0)
    await expect(page.getByRole("heading", { name: "Browser Draft Course", exact: true })).toBeVisible()
    await expect(page.getByRole("link", { name: "Preview", exact: true })).toHaveCount(2)
  } finally { release() }
})

test("a pending course enrollment is cancelled when history switches the course route", async ({ page, data }) => {
  await login(page, data.admin, "/admin")
  await page.goto(`/courses/${data.draftCourseId}`)
  await expect(page.getByRole("heading", { name: "Browser Draft Course", exact: true })).toBeVisible()
  await page.getByRole("link", { name: "Back to courses", exact: true }).click()
  const course = page.getByRole("article").filter({ has: page.getByRole("heading", { name: "Browser Programming Course", exact: true }) })
  await course.getByRole("link", { name: "Details", exact: true }).click()
  let pending: Request | undefined
  let release!: () => void
  const delayed = new Promise<void>((resolve) => { release = resolve })
  let started!: () => void
  const requested = new Promise<void>((resolve) => { started = resolve })
  let settled!: () => void
  const finished = new Promise<void>((resolve) => { settled = resolve })
  await page.route(`**/api/enrollments/courses/${data.courseId}`, async (route) => {
    pending = route.request()
    started()
    await delayed
    try { await route.fulfill({ status: 201, json: { message: "Enrolled successfully" } }) }
    catch (error) { if (!pending.failure()) throw error }
    finally { settled() }
  })
  try {
    await page.getByRole("button", { name: "Enroll in course", exact: true }).click()
    await requested
    // Skip the intervening course list without replacing the browser document.
    await page.evaluate(() => window.history.go(-2))
    await expect(page).toHaveURL(`/courses/${data.draftCourseId}`)
    await expect(page.getByRole("heading", { name: "Browser Draft Course", exact: true })).toBeVisible()
    await expect.poll(() => Boolean(pending?.failure())).toBe(true)
    release()
    await finished
    await expect(page.getByRole("status")).toContainText("Draft preview")
    await expect(page.getByRole("button", { name: "Enroll in course", exact: true })).toHaveCount(0)
    await expect(page.getByRole("link", { name: "Continue learning", exact: true })).toHaveCount(0)
    await expect(page.getByRole("link", { name: "Preview", exact: true })).toHaveCount(2)
  } finally { release() }
})

test("completed course details preserve review actions after reload", async ({ page, data }, info) => {
  await prisma.enrollment.create({ data: { userId: data.student.id, courseId: data.courseId } })
  await prisma.lessonProgress.createMany({ data: [data.manualLessonId, data.quizLessonId].map((lessonId) => ({ userId: data.student.id, lessonId, completed: true, completedAt: new Date() })) })
  await login(page, data.student)
  await page.goto(`/courses/${data.courseId}`)
  for (const reloaded of [false, true]) {
    if (reloaded) await page.reload()
    await expect(page.getByText("2 of 2 lessons completed", { exact: true })).toBeVisible()
    await expect(page.getByText("100%", { exact: true })).toBeVisible()
    await expect(page.getByRole("heading", { name: "Great work", exact: true })).toBeVisible()
    await expect(page.getByRole("link", { name: "Review course", exact: true })).toHaveAttribute("href", `/lessons/${data.manualLessonId}`)
    await expect(page.getByRole("link", { name: "Review", exact: true })).toHaveCount(2)
    await expect(page.getByRole("link", { name: "Continue learning", exact: true })).toHaveCount(0)
  }
  await page.setViewportSize({ width: 390, height: 844 })
  await expectPageToFitViewport(page)
  await page.screenshot({ path: info.outputPath("course-details-completed-mobile.png"), fullPage: true, animations: "disabled" })
})

test("route modules load on demand and keep navigation visible during loading", async ({ page }) => {
  const modules: string[] = []
  page.on("request", (request) => {
    if (["CatalogPage", "LessonPage", "AdminPage"].some((name) => pageModule(name).test(request.url()))) {
      modules.push(request.url())
    }
  })
  let release!: () => void
  const delayed = new Promise<void>((resolve) => { release = resolve })
  let started!: () => void
  const requested = new Promise<void>((resolve) => { started = resolve })
  await page.route(pageModule("CatalogPage"), async (route) => {
    started()
    await delayed
    await route.continue()
  })
  try {
    await page.goto("/")
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Learn to build.")
    expect(modules).toEqual([])
    await page.getByRole("link", { name: "Courses", exact: true }).click()
    await requested
    await expect(page.getByRole("status")).toHaveText("Loading page...")
    await expect(page.getByRole("link", { name: "Home", exact: true })).toBeVisible()
    release()
    await expect(page.getByLabel("Search courses", { exact: true })).toBeVisible()
    expect(modules.some((url) => pageModule("CatalogPage").test(url))).toBe(true)
    expect(modules.some((url) => pageModule("LessonPage").test(url) || pageModule("AdminPage").test(url))).toBe(false)
  } finally { release() }
})

test("a failed route module shows recovery controls and reload can retry", async ({ page }) => {
  await page.route(pageModule("CatalogPage"), (route) => route.abort("failed"))
  await page.goto("/catalog")
  await expect(page.getByRole("alert")).toContainText("Unable to load this page")
  await expect(page.getByRole("link", { name: "Home", exact: true })).toBeVisible()
  await page.unroute(pageModule("CatalogPage"))
  await page.getByRole("button", { name: "Reload page", exact: true }).click()
  await expect(page.getByLabel("Search courses", { exact: true })).toBeVisible()
  await expect(page.getByRole("alert")).toHaveCount(0)
})

test("authorization redirects before downloading protected page modules", async ({ page, data }) => {
  const protectedModules: string[] = []
  page.on("request", (request) => {
    if (["LessonPage", "AdminPage"].some((name) => pageModule(name).test(request.url()))) {
      protectedModules.push(request.url())
    }
  })
  await page.goto("/lessons/" + data.manualLessonId)
  await expect(page).toHaveURL("/")
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Learn to build.")
  expect(protectedModules).toEqual([])
  await login(page, data.student)
  await page.goto("/admin")
  await expect(page).toHaveURL("/dashboard")
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
  expect(protectedModules).toEqual([])
})

test("admin forms show inline errors before sending invalid writes", async ({ page, data }) => {
  await login(page, data.admin, "/admin")
  const writes: string[] = []
  page.on("request", (request) => {
    if (["POST", "PATCH", "DELETE"].includes(request.method())) writes.push(request.url())
  })
  await page.getByLabel("Title", { exact: true }).fill("   ")
  await page.getByRole("button", { name: "Create course", exact: true }).click()
  await expect(page.getByLabel("Title", { exact: true })).toBeFocused()
  await expect(page.getByLabel("Title", { exact: true })).toHaveAttribute("aria-invalid", "true")
  await expect(page.getByText("A course title is required.", { exact: true })).toBeVisible()
  await page.getByLabel("Title", { exact: true }).fill("Valid title")
  await expect(page.getByText("A course title is required.", { exact: true })).toHaveCount(0)

  await page.goto("/admin/courses/" + data.draftCourseId)
  await page.getByLabel("Title", { exact: true }).fill(" ")
  await page.getByLabel("Content", { exact: true }).fill(" ")
  await page.getByLabel("Position", { exact: true }).fill("0")
  await page.getByRole("button", { name: "Create lesson", exact: true }).click()
  await expect(page.getByLabel("Title", { exact: true })).toBeFocused()
  await expect(page.getByText("Lesson content is required.", { exact: true })).toBeVisible()
  await expect(page.getByLabel("Position", { exact: true })).toHaveAttribute("aria-invalid", "true")
  await page.getByLabel("Title", { exact: true }).fill("Valid lesson")
  await expect(page.getByText("A lesson title is required.", { exact: true })).toHaveCount(0)

  await page.goto("/admin/lessons/" + data.draftLessonId)
  await page.getByLabel("Quiz title", { exact: true }).fill(" ")
  await page.getByRole("button", { name: "Save changes", exact: true }).click()
  await expect(page.getByLabel("Quiz title", { exact: true })).toBeFocused()
  await expect(page.getByText("A quiz title is required.", { exact: true })).toBeVisible()
  await page.getByLabel("Question", { exact: true }).fill(" ")
  await page.getByLabel("Position", { exact: true }).fill("2147483648")
  await page.getByRole("button", { name: "Add question", exact: true }).click()
  await expect(page.getByLabel("Question", { exact: true })).toBeFocused()
  await expect(page.getByLabel("Position", { exact: true })).toHaveAttribute("aria-invalid", "true")

  await page.getByRole("link", { name: "Manage answers", exact: true }).first().click()
  await page.getByLabel("Answer text", { exact: true }).fill(" ")
  await page.getByRole("button", { name: "Add option", exact: true }).click()
  await expect(page.getByLabel("Answer text", { exact: true })).toBeFocused()
  await expect(page.getByText("Answer text is required.", { exact: true })).toBeVisible()
  expect(writes).toEqual([])
})

test("delete dialogs support keyboard cancellation, retry and duplicate prevention", async ({ page, data }, info) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await login(page, data.admin, "/admin")
  await page.goto("/admin/courses/" + data.draftCourseId)
  const third = page.getByRole("heading", { name: "Draft Third", exact: true }).locator("..").locator("..")
  const trigger = third.getByRole("button", { name: "Delete", exact: true })
  const lesson = await prisma.lesson.findFirstOrThrow({ where: { courseId: data.draftCourseId, position: 3 } })
  let attempts = 0
  let release!: () => void
  const delayed = new Promise<void>((resolve) => { release = resolve })
  let started!: () => void
  const requested = new Promise<void>((resolve) => { started = resolve })
  await page.route("**/api/lessons/" + lesson.id, async (route) => {
    attempts++
    if (attempts === 1) {
      await route.fulfill({ status: 503, json: { message: "Delete unavailable" } })
      return
    }
    started()
    await delayed
    await route.continue()
  })
  try {
    await trigger.click()
    const dialog = page.getByRole("dialog", { name: "Delete lesson?", exact: true })
    await expect(dialog).toContainText("Draft Third")
    await expect(dialog.getByRole("button", { name: "Cancel", exact: true })).toBeFocused()
    await page.screenshot({ path: info.outputPath("delete-dialog-mobile.png"), animations: "disabled" })
    await page.keyboard.press("Tab")
    await expect(dialog.getByRole("button", { name: "Delete lesson", exact: true })).toBeFocused()
    await page.keyboard.press("Shift+Tab")
    await expect(dialog.getByRole("button", { name: "Cancel", exact: true })).toBeFocused()
    await page.keyboard.press("Escape")
    await expect(dialog).toHaveCount(0)
    await expect(trigger).toBeFocused()
    expect(attempts).toBe(0)
    await trigger.click()
    await dialog.getByRole("button", { name: "Cancel", exact: true }).click()
    await expect(trigger).toBeFocused()
    expect(attempts).toBe(0)

    await trigger.click()
    await confirmDeletion(page, "Delete lesson")
    await expect(page.getByRole("alert")).toContainText("Delete unavailable")
    await expect(trigger).toBeEnabled()
    expect(await prisma.lesson.count({ where: { id: lesson.id } })).toBe(1)

    await trigger.click()
    await confirmDeletion(page, "Delete lesson")
    await requested
    await expect(trigger).toBeDisabled()
    await expect(page.getByRole("button", { name: "Create lesson", exact: true })).toBeDisabled()
    await trigger.dispatchEvent("click")
    expect(attempts).toBe(2)
    release()
    await expect(page.getByRole("heading", { name: "Draft Third", exact: true })).toHaveCount(0)
    expect(await prisma.lesson.count({ where: { id: lesson.id } })).toBe(0)

    await page.goto("/admin")
    const course = page.getByRole("heading", { name: "Browser Draft Course", exact: true }).locator("..").locator("..").locator("..")
    await course.getByRole("button", { name: "Delete", exact: true }).click()
    await expect(page.getByRole("dialog")).toContainText("enrollments, progress and quiz attempts")
    await confirmDeletion(page, "Delete course")
    await expect(page.getByRole("heading", { name: "Browser Draft Course", exact: true })).toHaveCount(0)
    expect(await prisma.course.count({ where: { id: data.draftCourseId } })).toBe(0)
  } finally { release() }
})

test("publication checklist retries and cancels stale checks when publication is deselected", async ({ page, data }, info) => {
  await login(page, data.admin, "/admin")
  const endpoint = "**/api/courses/" + data.draftCourseId + "/publication-check"
  await page.route(endpoint, (route) => route.fulfill({ status: 503, json: { message: "Check unavailable" } }))
  const row = page.getByRole("heading", { name: "Browser Draft Course", exact: true }).locator("..").locator("..").locator("..")
  await row.getByRole("button", { name: "Edit", exact: true }).click()
  await page.getByLabel("Status", { exact: true }).selectOption("PUBLISHED")
  const checklist = page.getByRole("region", { name: "Publication checklist", exact: true })
  await expect(checklist.getByRole("alert")).toContainText("Check unavailable")
  await page.unroute(endpoint)
  await checklist.getByRole("button", { name: "Retry checks", exact: true }).click()
  await expect(checklist).toContainText("must have answer options")
  await expect(checklist.getByRole("link", { name: "Review answers", exact: true }).first()).toHaveAttribute("href", new RegExp("/admin/questions/[0-9]+$"))
  await page.evaluate(() => window.scrollTo({ top: 0 }))
  await page.screenshot({ path: info.outputPath("publication-checklist.png"), fullPage: true, animations: "disabled" })

  let release!: () => void
  const delayed = new Promise<void>((resolve) => { release = resolve })
  let started!: () => void
  const requested = new Promise<void>((resolve) => { started = resolve })
  const held = new Set<Request>()
  const finished: Promise<void>[] = []
  let hold = true
  await page.route(endpoint, async (route) => {
    if (!hold) { await route.continue(); return }
    const request = route.request()
    held.add(request)
    let settled!: () => void
    finished.push(new Promise<void>((resolve) => { settled = resolve }))
    started()
    await delayed
    try {
      await route.fulfill({ json: { check: { courseId: data.draftCourseId, status: "DRAFT", ready: true, issues: [] } } })
    } catch (error) {
      if (!request.failure()?.errorText.includes("ERR_ABORTED")) throw error
    } finally { settled() }
  })
  try {
    await checklist.getByRole("button", { name: "Refresh checks", exact: true }).click()
    await requested
    await expect(checklist).toContainText("Checking saved content...")
    await page.getByLabel("Status", { exact: true }).selectOption("DRAFT")
    await expect(checklist).toHaveCount(0)
    await expect.poll(() => held.size > 0 && [...held].every((request) => request.failure()?.errorText.includes("ERR_ABORTED"))).toBe(true)
    hold = false
    release()
    await Promise.all(finished)
    await page.getByLabel("Status", { exact: true }).selectOption("PUBLISHED")
    await expect(checklist).toContainText("must have answer options")
    await expect(checklist.getByText("Saved content is ready to publish.", { exact: true })).toHaveCount(0)
    expect((await prisma.course.findUnique({ where: { id: data.draftCourseId } }))?.status).toBe("DRAFT")
  } finally {
    hold = false
    release()
    await Promise.all(finished)
  }
})

test("lesson Markdown stays readable and keeps HTML and unsafe links inert", async ({ page, data }, info) => {
  const content = [
    "# Working with conditions",
    "",
    "Legacy line one",
    "Legacy line two",
    "",
    "Use **clear names** and `const` for values.",
    "",
    "## Checklist",
    "",
    "- Read the value",
    "- Handle missing values",
    "  - Keep a fallback",
    "",
    "1. Create a variable",
    "2. Print its value",
    "",
    "> Test one thing at a time.",
    "",
    "```typescript",
    "const markup = '<button>not HTML</button>';",
    "console.log('" + "long-example-".repeat(20) + "', markup);",
    "```",
    "",
    "[Reference](https://example.com/docs)",
    "",
    "[Unsafe link](javascript:alert%281%29)",
    "",
    "<script>globalThis.__lessonXss = true</script>",
    "<img src=x onerror='globalThis.__lessonXss = true'>",
  ].join("\n")
  await prisma.lesson.update({ where: { id: data.manualLessonId }, data: { content } })
  await enroll(page, data)
  await page.goto("/lessons/" + data.manualLessonId)
  const body = page.getByRole("region", { name: "Lesson content", exact: true })
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1)
  await expect(body.getByRole("heading", { name: "Working with conditions", level: 2 })).toBeVisible()
  await expect(body.getByRole("heading", { name: "Checklist", level: 3 })).toBeVisible()
  await expect(body.locator("strong")).toHaveText("clear names")
  await expect(body.locator("ul")).toHaveCount(2)
  await expect(body.locator("ol > li")).toHaveCount(2)
  expect(await body.getByText("Legacy line one", { exact: false }).innerText()).toContain("Legacy line one\nLegacy line two")
  const code = body.getByRole("region", { name: "Code example", exact: true })
  await expect(code.locator("code")).toContainText("<button>not HTML</button>")
  await expect(body.locator("button, script, img")).toHaveCount(0)
  await expect(body.getByRole("link", { name: "Reference", exact: true })).toHaveAttribute("href", "https://example.com/docs")
  await expect(body.getByRole("link", { name: "Unsafe link", exact: true })).toHaveCount(0)
  await expect(body.getByText("Unsafe link", { exact: true })).toBeVisible()
  expect(await page.evaluate(() => Reflect.get(window, "__lessonXss"))).toBeUndefined()
  await page.screenshot({ path: info.outputPath("lesson-markdown-desktop.png"), fullPage: true, animations: "disabled" })
  await page.setViewportSize({ width: 390, height: 844 })
  await code.focus()
  await expect(code).toBeFocused()
  expect(await code.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(true)
  await expectPageToFitViewport(page)
  await page.evaluate(() => window.scrollTo({ top: 0 }))
  await page.screenshot({ path: info.outputPath("lesson-markdown-mobile.png"), fullPage: true, animations: "disabled" })
})

test("lesson navigation follows curriculum gaps and handles first, last and single lessons", async ({ page, data }) => {
  await prisma.lesson.update({ where: { id: data.quizLessonId }, data: { position: 4 } })
  await enroll(page, data)
  await page.goto("/lessons/" + data.manualLessonId)
  const navigation = page.getByRole("navigation", { name: "Lesson navigation", exact: true })
  await expect(navigation.getByText("Lesson 1 of 2", { exact: true })).toBeVisible()
  await expect(navigation.getByRole("link", { name: /Previous lesson:/ })).toHaveCount(0)
  await navigation.getByRole("link", { name: "Next lesson: Browser Quiz Lesson", exact: true }).click()
  await expect(page.getByRole("heading", { name: "Browser Quiz Lesson", exact: true })).toBeFocused()
  await expect(navigation.getByText("Lesson 2 of 2", { exact: true })).toBeVisible()
  await expect(navigation.getByRole("link", { name: /Next lesson:/ })).toHaveCount(0)
  await expect(page.getByRole("button", { name: "Mark as completed", exact: true })).toHaveCount(0)
  await navigation.getByRole("link", { name: "Previous lesson: Browser Manual Lesson", exact: true }).click()
  await expect(page.getByRole("heading", { name: "Browser Manual Lesson", exact: true })).toBeFocused()
  expect(await prisma.lessonProgress.count({ where: { userId: data.student.id } })).toBe(0)
  await prisma.lesson.delete({ where: { id: data.quizLessonId } })
  await page.reload()
  await expect(navigation.getByText("Lesson 1 of 1", { exact: true })).toBeVisible()
  await expect(navigation.getByRole("link", { name: /Previous lesson:|Next lesson:/ })).toHaveCount(0)
  await expect(navigation.getByRole("link", { name: "Course outline", exact: true })).toHaveAttribute("href", "/courses/" + data.courseId)
})

test("admin Markdown preview updates live and matches the saved draft lesson", async ({ page, data }, info) => {
  await login(page, data.admin, "/admin")
  await page.goto("/admin/courses/" + data.draftCourseId)
  const third = page.getByRole("heading", { name: "Draft Third", exact: true }).locator("..").locator("..")
  await third.getByRole("button", { name: "Edit", exact: true }).click()
  const content = "# Editor preview\n\n- First point\n\n```html\n<button>Example</button>\n```"
  await page.getByLabel("Content", { exact: true }).fill(content)
  await page.getByRole("button", { name: "Show preview", exact: true }).click()
  const preview = page.getByRole("region", { name: "Lesson content preview", exact: true })
  await expect(preview.getByRole("heading", { name: "Editor preview", level: 2 })).toBeVisible()
  await expect(preview.getByRole("region", { name: "Code example", exact: true })).toContainText("<button>Example</button>")
  await expect(preview.getByRole("button")).toHaveCount(0)
  const updated = content + "\n\n- Updated point"
  await page.getByLabel("Content", { exact: true }).fill(updated)
  await expect(preview.getByRole("listitem").filter({ hasText: "Updated point" })).toBeVisible()
  expect((await prisma.lesson.findFirst({ where: { courseId: data.draftCourseId, position: 3 } }))?.content).toBe("Third content")
  await page.evaluate(() => window.scrollTo({ top: 0 }))
  await page.screenshot({ path: info.outputPath("lesson-editor-preview.png"), fullPage: true, animations: "disabled" })
  await page.getByRole("button", { name: "Save changes", exact: true }).click()
  await expect(page.getByLabel("Title", { exact: true })).toHaveValue("")
  await expect(third.getByText(/Editor preview/)).toBeVisible()
  await page.reload()
  await third.getByRole("button", { name: "Edit", exact: true }).click()
  await expect(page.getByLabel("Content", { exact: true })).toHaveValue(updated)
  const lesson = await prisma.lesson.findFirstOrThrow({ where: { courseId: data.draftCourseId, position: 3 } })
  await page.goto("/lessons/" + lesson.id)
  await expect(page.getByRole("region", { name: "Lesson content", exact: true }).getByRole("heading", { name: "Editor preview", level: 2 })).toBeVisible()
  const navigation = page.getByRole("navigation", { name: "Lesson navigation", exact: true })
  await expect(navigation.getByRole("link", { name: "Previous lesson: Draft First", exact: true })).toHaveAttribute("href", "/lessons/" + data.draftLessonId)
  await expect(page.getByRole("button", { name: "Mark as completed", exact: true })).toHaveCount(0)
  expect(await prisma.lessonProgress.count({ where: { userId: data.admin.id } })).toBe(0)
})

test("failed lesson navigation can retry without blocking reading or manual completion", async ({ page, data }) => {
  await enroll(page, data)
  const curriculum = "**/api/courses/" + data.courseId + "/curriculum"
  await page.route(curriculum, (route) => route.fulfill({ status: 503, json: { message: "Navigation unavailable" } }))
  await page.goto("/lessons/" + data.manualLessonId)
  const navigation = page.getByRole("navigation", { name: "Lesson navigation", exact: true })
  await expect(navigation.getByRole("alert")).toContainText("Lesson navigation could not be loaded")
  await expect(page.getByRole("region", { name: "Lesson content", exact: true })).toContainText("Manual lesson content")
  await page.getByRole("button", { name: "Mark as completed", exact: true }).click()
  await expect(page.getByRole("button", { name: "Lesson completed", exact: true })).toBeDisabled()
  await page.unroute(curriculum)
  await navigation.getByRole("button", { name: "Retry navigation", exact: true }).click()
  await expect(navigation.getByRole("link", { name: "Next lesson: Browser Quiz Lesson", exact: true })).toBeVisible()
  expect(await prisma.lessonProgress.count({ where: { userId: data.student.id, completed: true } })).toBe(1)
})

test("delayed navigation metadata is cancelled when leaving the old lesson", async ({ page, data }) => {
  await enroll(page, data)
  let release!: () => void
  const delayed = new Promise<void>((resolve) => { release = resolve })
  let started!: () => void
  const requested = new Promise<void>((resolve) => { started = resolve })
  const heldRequests = new Set<Request>()
  const finished: Promise<void>[] = []
  const endpoint = "/courses/" + data.courseId + "/curriculum"
  await page.route("**/api" + endpoint, async (route) => {
    if (!page.url().endsWith("/lessons/" + data.manualLessonId)) {
      await route.continue()
      return
    }
    // Strict Mode may send and cancel an initial request before mounting again.
    // Hold every request for the old lesson, rather than assuming there is one.
    const request = route.request()
    heldRequests.add(request)
    let settled!: () => void
    finished.push(new Promise<void>((resolve) => { settled = resolve }))
    started()
    await delayed
    try {
      await route.fulfill({ json: { lessons: [{ id: data.manualLessonId, title: "Old lesson", position: 1 }] } })
    } catch (error) {
      if (!request.failure()?.errorText.includes("ERR_ABORTED")) throw error
    } finally { settled() }
  })
  try {
    await page.goto("/lessons/" + data.manualLessonId)
    await requested
    await expect(page.getByText("Loading lesson navigation...", { exact: true })).toBeVisible()
    await page.getByRole("link", { name: "Back to course", exact: true }).click()
    await page.getByRole("heading", { name: "Browser Quiz Lesson", exact: true }).locator("..").locator("..")
      .getByRole("link", { name: "Start", exact: true }).click()
    const navigation = page.getByRole("navigation", { name: "Lesson navigation", exact: true })
    await expect(navigation.getByRole("link", { name: "Previous lesson: Browser Manual Lesson", exact: true })).toBeVisible()
    await expect.poll(() => heldRequests.size > 0 && [...heldRequests].every((request) =>
      request.failure()?.errorText.includes("ERR_ABORTED")
    )).toBe(true)
    release()
    await Promise.all(finished)
    await expect(navigation.getByText("Lesson 2 of 2", { exact: true })).toBeVisible()
    await expect(navigation.getByRole("alert")).toHaveCount(0)
    await expect(page.getByRole("heading", { name: "Browser Quiz Lesson", exact: true })).toBeVisible()
  } finally {
    release()
    await Promise.all(finished)
  }
})

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

test("catalog loading, search and clearing use the shared course cards", async ({ page, data }, info) => {
  let release!: () => void
  const delayed = new Promise<void>((resolve) => { release = resolve })
  let started!: () => void
  const requested = new Promise<void>((resolve) => { started = resolve })
  await page.route("**/api/courses", async (route) => {
    started()
    await delayed
    await route.continue()
  })
  try {
    await page.goto("/catalog")
    await requested
    await expect(page.getByRole("status", { name: "Loading courses", exact: true })).toBeVisible()
    await expect(page.getByRole("heading", { name: "No courses found", exact: true })).toHaveCount(0)
    release()
    await expect(page.getByRole("heading", { name: "Browser Programming Course", exact: true })).toBeVisible()
    await page.getByLabel("Search courses", { exact: true }).fill(`no-course-${data.student.id}`)
    await expect(page.getByRole("heading", { name: "No courses found", exact: true })).toBeVisible()
    await page.getByRole("button", { name: "Clear search", exact: true }).click()
    await page.getByLabel("Search courses", { exact: true }).fill("Browser Programming Course")
    const card = page.getByRole("article").filter({ has: page.getByRole("heading", { name: "Browser Programming Course", exact: true }) })
    await expect(card.getByRole("link", { name: "View course", exact: true })).toHaveAttribute("href", `/catalog/${data.courseId}`)
    await expectPageToFitViewport(page)
    await page.screenshot({ path: info.outputPath("catalog-ui.png"), fullPage: true, animations: "disabled" })
  } finally { release() }
})

test("course filters, enrollment and dashboard preserve accessible progress", async ({ page, data }, info) => {
  await login(page, data.student)
  await expect(page.getByRole("heading", { name: "You haven't enrolled in any courses yet.", exact: true })).toBeVisible()
  await page.goto("/courses")
  await page.getByLabel("Search courses", { exact: true }).fill("Browser Programming Course")
  await page.getByRole("button", { name: "My courses", exact: true }).click()
  await expect(page.getByRole("button", { name: "My courses", exact: true })).toHaveAttribute("aria-pressed", "true")
  await expect(page.getByRole("heading", { name: "No courses found", exact: true })).toBeVisible()
  await page.getByRole("button", { name: "Clear filters", exact: true }).click()
  await expect(page.getByRole("button", { name: "All courses", exact: true })).toHaveAttribute("aria-pressed", "true")
  await page.getByLabel("Search courses", { exact: true }).fill("Browser Programming Course")
  await page.getByRole("button", { name: "Available", exact: true }).click()
  let release!: () => void
  const delayed = new Promise<void>((resolve) => { release = resolve })
  let started!: () => void
  const requested = new Promise<void>((resolve) => { started = resolve })
  let submissions = 0
  await page.route(`**/api/enrollments/courses/${data.courseId}`, async (route) => {
    submissions++
    started()
    await delayed
    await route.continue()
  })
  try {
    await page.getByRole("button", { name: "Enroll", exact: true }).click()
    await requested
    await expect(page.getByRole("button", { name: "Enrolling...", exact: true })).toBeDisabled()
    await page.getByRole("button", { name: "Enrolling...", exact: true }).dispatchEvent("click")
    expect(submissions).toBe(1)
    release()
    await expect(page.getByRole("heading", { name: "No courses found", exact: true })).toBeVisible()
    await page.getByRole("button", { name: "My courses", exact: true }).click()
    const card = page.getByRole("article").filter({ has: page.getByRole("heading", { name: "Browser Programming Course", exact: true }) })
    await expect(card.getByRole("link", { name: "Continue", exact: true })).toBeVisible()
    await expect(card.getByRole("progressbar", { name: "Browser Programming Course progress", exact: true })).toHaveAttribute("aria-valuenow", "0")
    await page.screenshot({ path: info.outputPath("courses-ui.png"), fullPage: true, animations: "disabled" })
    await page.goto("/dashboard")
    await expect(page.getByRole("progressbar", { name: "Featured course progress", exact: true })).toHaveAttribute("aria-valuenow", "0")
    await page.setViewportSize({ width: 390, height: 844 })
    await expectPageToFitViewport(page)
    await page.screenshot({ path: info.outputPath("dashboard-mobile-ui.png"), fullPage: true, animations: "disabled" })
  } finally { release() }
})

test("course loading errors show alerts instead of empty states", async ({ page, data }) => {
  await page.route("**/api/courses", (route) => route.fulfill({ status: 503, json: { message: "Course service unavailable" } }))
  await page.goto("/catalog")
  await expect(page.getByRole("alert")).toContainText("Course service unavailable")
  await expect(page.getByRole("heading", { name: /No courses/ })).toHaveCount(0)
  await login(page, data.student)
  await page.goto("/courses")
  await expect(page.getByRole("alert")).toContainText("Course service unavailable")
  await expect(page.getByRole("heading", { name: /No courses/ })).toHaveCount(0)
  await page.route("**/api/enrollments/me", (route) => route.fulfill({ status: 503, json: { message: "Progress service unavailable" } }))
  await page.goto("/dashboard")
  await expect(page.getByRole("alert")).toContainText("Progress service unavailable")
  await expect(page.getByRole("heading", { name: "You haven't enrolled in any courses yet.", exact: true })).toHaveCount(0)
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
  await third.getByRole("button", { name: "Delete", exact: true }).click()
  await confirmDeletion(page, "Delete lesson")
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
  await question.getByRole("button", { name: "Delete", exact: true }).click()
  await confirmDeletion(page, "Delete question")
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
  await expect(page.locator("p").filter({ hasText: /^Browser right answer$/ })).toBeVisible()
  await expect(page.getByRole("checkbox", { name: /Correct answer/ })).toBeDisabled()
  await page.getByLabel("Answer text", { exact: true }).fill("Browser second answer")
  await page.getByRole("button", { name: "Add option", exact: true }).click()
  await expect(page.locator("p").filter({ hasText: /^Browser second answer$/ })).toBeVisible()
  const option = page.getByText("Browser right answer", { exact: true }).locator("..").locator("..")
  await option.getByRole("button", { name: "Edit", exact: true }).click()
  await expect(page.getByRole("checkbox", { name: /Correct answer/ })).toBeChecked()
  await option.getByRole("button", { name: "Delete", exact: true }).click()
  await confirmDeletion(page, "Delete answer option")
  await expect(page.getByText("Browser right answer", { exact: true })).toHaveCount(0)
  await expect(page.getByLabel("Answer text", { exact: true })).toHaveValue("")
  await expect(page.getByRole("checkbox", { name: /Correct answer/ })).not.toBeChecked()
  await expect(page.getByRole("checkbox", { name: /Correct answer/ })).toBeEnabled()
  await page.getByLabel("Answer text", { exact: true }).fill("Browser replacement answer")
  await page.getByRole("checkbox", { name: /Correct answer/ }).check()
  await page.getByRole("button", { name: "Add option", exact: true }).click()
  await expect(page.locator("p").filter({ hasText: /^Browser replacement answer$/ })).toBeVisible()
  await expect(page.getByRole("button", { name: "Add option", exact: true })).toBeEnabled()
})

test("admin draft preview has no enrollment or personal completion controls", async ({ page, data }) => {
  await login(page, data.admin, "/admin")
  await page.goto("/catalog")
  await expect(page.getByRole("heading", { name: "Browser Programming Course", exact: true })).toBeVisible()
  await expect(page.getByRole("heading", { name: "Browser Draft Course", exact: true })).toHaveCount(0)
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
  const checklist = page.getByRole("region", { name: "Publication checklist", exact: true })
  await expect(checklist).toContainText("must have answer options")
  await expect(checklist.getByRole("link", { name: "Review answers", exact: true }).first()).toHaveAttribute("href", new RegExp("/admin/questions/[0-9]+$"))
  await page.getByRole("button", { name: "Save changes", exact: true }).click()
  await expect(page.getByRole("alert")).toContainText("Course cannot be published")
  await expect(page.getByRole("alert")).toContainText("must have answer options")
  await expect(courseRow.getByText("DRAFT", { exact: true })).toBeVisible()
  // A lesson without a quiz is valid; remove the unfinished quiz through the UI.
  await page.goto(`/admin/lessons/${data.draftLessonId}`)
  await page.getByRole("button", { name: "Delete quiz", exact: true }).click()
  await confirmDeletion(page, "Delete quiz")
  await expect(page.getByRole("button", { name: "Create quiz", exact: true })).toBeVisible()
  await page.goto("/admin")
  await courseRow.getByRole("button", { name: "Edit", exact: true }).click()
  await page.getByLabel("Status", { exact: true }).selectOption("PUBLISHED")
  await expect(checklist).toContainText("Saved content is ready to publish.")
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
  const dashboardCard = page.getByRole("article").filter({ has: page.getByRole("heading", { name: "Browser Programming Course", exact: true }) })
  await expect(dashboardCard.getByText("Completed", { exact: true })).toHaveCount(0)
  await expect(dashboardCard.getByRole("link", { name: "Continue", exact: true })).toBeVisible()
  await expect(dashboardCard.getByRole("link", { name: "Review", exact: true })).toHaveCount(0)
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
    await expect(page.locator('main [aria-busy="true"]')).toHaveCount(0)
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
