import {
  beforeAll,
  afterAll,
  describe,
  expect,
  it,
} from "vitest"
import request from "supertest"
import jwt from "jsonwebtoken"
import { prisma } from "../src/lib/prisma.js"
import app from "../src/app.js"

describe("Lesson API", () => {
  let enrolledStudentId: number
  let notEnrolledStudentId: number
  let enrolledStudentToken: string
  let notEnrolledStudentToken: string
  let courseId: number
  let lessonId: number

  beforeAll(async () => {
    process.env.JWT_SECRET = "test-secret"

    const enrolledStudent = await prisma.user.create({
      data: {
        name: "Enrolled Student",
        email: `enrolled-${Date.now()}@example.com`,
        password: "test-password",
        role: "STUDENT",
      },
    })

    enrolledStudentId = enrolledStudent.id

    const notEnrolledStudent = await prisma.user.create({
      data: {
        name: "Not Enrolled Student",
        email: `not-enrolled-${Date.now()}@example.com`,
        password: "test-password",
        role: "STUDENT",
      },
    })

    notEnrolledStudentId = notEnrolledStudent.id

    enrolledStudentToken = jwt.sign(
      {
        userId: enrolledStudentId,
        role: "STUDENT",
      },
      process.env.JWT_SECRET
    )

    notEnrolledStudentToken = jwt.sign(
      {
        userId: notEnrolledStudentId,
        role: "STUDENT",
      },
      process.env.JWT_SECRET
    )

    const course = await prisma.course.create({
      data: {
        title: "Lesson Test Course",
        description: "Course for lesson tests",
        status: "PUBLISHED",
      },
    })

    courseId = course.id

    await prisma.enrollment.create({
      data: {
        userId: enrolledStudentId,
        courseId,
      },
    })

    const lesson = await prisma.lesson.create({
      data: {
        title: "Test Lesson",
        content: "Test lesson content",
        position: 1,
        courseId,
      },
    })

    lessonId = lesson.id
  })

  afterAll(async () => {
    await prisma.lesson.deleteMany({
      where: {
        id: lessonId,
      },
    })

    await prisma.enrollment.deleteMany({
      where: {
        courseId,
      },
    })

    await prisma.course.deleteMany({
      where: {
        id: courseId,
      },
    })

    await prisma.user.deleteMany({
      where: {
        id: {
          in: [
            enrolledStudentId,
            notEnrolledStudentId,
          ],
        },
      },
    })

    await prisma.$disconnect()
  })

  it("should allow an enrolled student to access a lesson", async () => {
    const response = await request(app)
      .get(`/api/lessons/${lessonId}`)
      .set(
        "Authorization",
        `Bearer ${enrolledStudentToken}`
      )

    expect(response.status).toBe(200)

    expect(response.body.lesson).toMatchObject({
      id: lessonId,
      title: "Test Lesson",
      courseId,
    })
  })

  it("should reject a student who is not enrolled", async () => {
    const response = await request(app)
      .get(`/api/lessons/${lessonId}`)
      .set(
        "Authorization",
        `Bearer ${notEnrolledStudentToken}`
      )

    expect(response.status).toBe(403)

    expect(response.body).toEqual({
      message: "You are not enrolled in this course",
    })
  })
})