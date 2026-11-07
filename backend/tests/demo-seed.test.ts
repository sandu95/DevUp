import { readFileSync, readdirSync } from "node:fs"
import { Client } from "pg"
import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "../src/generated/prisma/client.js"
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import bcrypt from "bcryptjs"
import { seedDemo, demoAccounts } from "../src/demo/seed.js"
import { getPublicationIssues, publicationInclude } from "../src/lib/course-publication.js"
import { prisma as testPrisma } from "../src/lib/prisma.js"

describe("Reproducible demo seed", () => {
  const database = `devup_seed_${crypto.randomUUID().replaceAll("-", "")}_demo`
  let admin: Client
  let demo: PrismaClient
  let created = false
  const password = "example-only-demo-password"
  const counts = async () => ({ users: await demo.user.count(), courses: await demo.course.count(),
    lessons: await demo.lesson.count(), attempts: await demo.quizAttempt.count(), answers: await demo.quizAnswer.count() })

  beforeAll(async () => {
    // Vitest already requires a _test source. Only create/drop this suite's own database.
    const source = new URL(process.env.DATABASE_URL!)
    if (!source.pathname.endsWith("_test")) throw new Error("Demo seed tests require a _test source")
    admin = new Client({ connectionString: source.href })
    await admin.connect()
    await admin.query(`CREATE DATABASE "${database}"`)
    created = true
    source.pathname = `/${database}`
    source.search = ""
    const migrationClient = new Client({ connectionString: source.href })
    await migrationClient.connect()
    try {
      for (const folder of readdirSync(new URL("../prisma/migrations/", import.meta.url)).sort()) {
        if (/^\d/.test(folder)) await migrationClient.query(readFileSync(new URL(`../prisma/migrations/${folder}/migration.sql`, import.meta.url), "utf8"))
      }
    } finally { await migrationClient.end() }
    demo = new PrismaClient({ adapter: new PrismaPg({ connectionString: source.href }) })
  })
  beforeEach(async () => {
    await demo.course.deleteMany()
    await demo.user.deleteMany()
  })
  afterAll(async () => {
    await demo?.$disconnect()
    await testPrisma.$disconnect()
    if (created && /^devup_seed_[a-f0-9]{32}_demo$/.test(database)) await admin.query(`DROP DATABASE "${database}"`)
    await admin?.end()
  })

  it("creates valid published courses, an actionable draft and consistent learner progress/history", async () => {
    expect(await seedDemo(demo, password)).toEqual({ status: "created" })
    expect(await counts()).toEqual({ users: 3, courses: 4, lessons: 9, attempts: 3, answers: 9 })
    const courses = await demo.course.findMany({ include: publicationInclude })
    for (const course of courses.filter((course) => course.status === "PUBLISHED")) expect(getPublicationIssues(course)).toEqual([])
    expect(getPublicationIssues(courses.find((course) => course.status === "DRAFT")!)).toEqual([
      expect.objectContaining({ target: "question", message: expect.stringContaining("exactly one correct answer") }),
    ])
    const learner = await demo.user.findUniqueOrThrow({ where: { email: demoAccounts.learner.email } })
    expect(await bcrypt.compare(password, learner.password)).toBe(true)
    expect(await demo.enrollment.count({ where: { userId: learner.id } })).toBe(2)
    const attempts = await demo.quizAttempt.findMany({ orderBy: { startedAt: "desc" }, include: {
      answers: { include: { answerOption: true } }, quiz: { include: { questions: true } },
    } })
    expect(attempts.map((attempt) => attempt.score)).toEqual([0, 100, 33])
    for (const attempt of attempts) {
      expect(attempt.answers).toHaveLength(attempt.quiz.questions.length)
      const correct = attempt.answers.filter((answer) => answer.answerOption.isCorrect).length
      expect(attempt.score).toBe(Math.floor(correct / attempt.quiz.questions.length * 100))
    }
    const htmlLessonId = attempts[0]!.quiz.lessonId
    expect((await demo.lessonProgress.findUniqueOrThrow({ where: { userId_lessonId: { userId: learner.id, lessonId: htmlLessonId } } })).completedAt)
      .toEqual(new Date("2026-01-13T12:00:00Z"))
    expect(await demo.lessonProgress.count({ where: { completed: true } })).toBe(3)
    const newcomer = await demo.user.findUniqueOrThrow({ where: { email: demoAccounts.newcomer.email } })
    expect(await demo.enrollment.count({ where: { userId: newcomer.id } })).toBe(0)
  })

  it("preserves edits, password hashes, timestamps and additional records when run again", async () => {
    await seedDemo(demo, password)
    const draft = await demo.course.findFirstOrThrow({ where: { status: "DRAFT" } })
    await demo.course.update({ where: { id: draft.id }, data: { title: "Edited during the demo" } })
    await demo.user.create({ data: { name: "Additional learner", email: "additional@demo.devup.local", password: "unchanged" } })
    const users = await demo.user.findMany({ orderBy: { id: "asc" } })
    const attempts = await demo.quizAttempt.findMany({ orderBy: { id: "asc" } })
    const progress = await demo.lessonProgress.findMany({ orderBy: { id: "asc" } })
    const before = await counts()
    expect(await seedDemo(demo, "a-different-demo-password")).toEqual({ status: "already-seeded" })
    expect(await counts()).toEqual(before)
    expect(await demo.user.findMany({ orderBy: { id: "asc" } })).toEqual(users)
    expect(await demo.quizAttempt.findMany({ orderBy: { id: "asc" } })).toEqual(attempts)
    expect(await demo.lessonProgress.findMany({ orderBy: { id: "asc" } })).toEqual(progress)
    expect((await demo.course.findUniqueOrThrow({ where: { id: draft.id } })).title).toBe("Edited during the demo")
  })

  it("refuses an unrelated nonempty database and never seeds the test/application target", async () => {
    await demo.user.create({ data: { name: "Unrelated", email: "unrelated@example.com", password: "unchanged" } })
    await expect(seedDemo(demo, password)).rejects.toThrow("nonempty database")
    expect(await counts()).toEqual({ users: 1, courses: 0, lessons: 0, attempts: 0, answers: 0 })
    await expect(seedDemo(testPrisma, password)).rejects.toThrow("dedicated _demo")
  })

  it("rolls back the entire dataset if historical attempt creation fails", async () => {
    await demo.$executeRaw`ALTER TABLE "QuizAttempt" ADD CONSTRAINT demo_reject_zero CHECK (score > 0)`
    try {
      await expect(seedDemo(demo, password)).rejects.toThrow()
      expect(await counts()).toEqual({ users: 0, courses: 0, lessons: 0, attempts: 0, answers: 0 })
    } finally { await demo.$executeRaw`ALTER TABLE "QuizAttempt" DROP CONSTRAINT demo_reject_zero` }
  })

  it("serializes concurrent seeds without creating duplicate accounts or courses", async () => {
    const results = await Promise.all([seedDemo(demo, password), seedDemo(demo, password)])
    expect(results.map((result) => result.status).sort()).toEqual(["already-seeded", "created"])
    expect(await counts()).toEqual({ users: 3, courses: 4, lessons: 9, attempts: 3, answers: 9 })
  })
})
