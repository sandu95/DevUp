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

describe("Progress API", () => {
    let userId: number
    let studentToken: string
    let courseId: number
    let lessonId: number

    beforeAll(async () => {
        process.env.JWT_SECRET = "test-secret"

        const user = await prisma.user.create({
            data: {
                name: "Progress Test Student",
                email: `progress-${Date.now()}@example.com`,
                password: "test-password",
                role: "STUDENT",
            },
        })

        userId = user.id

        studentToken = jwt.sign(
            {
                userId,
                role: "STUDENT",
            },
            process.env.JWT_SECRET
        )

        const course = await prisma.course.create({
            data: {
                title: "Progress Test Course",
                status: "PUBLISHED",
            },
        })

        courseId = course.id

        await prisma.enrollment.create({
            data: {
                userId,
                courseId,
            },
        })

        const lesson = await prisma.lesson.create({
            data: {
                title: "Progress Test Lesson",
                content: "Test content",
                position: 1,
                courseId,
            },
        })

        lessonId = lesson.id
    })

    afterAll(async () => {
        await prisma.lessonProgress.deleteMany({
            where: {
                userId,
            },
        })

        await prisma.enrollment.deleteMany({
            where: {
                userId,
                courseId,
            },
        })

        await prisma.lesson.deleteMany({
            where: {
                id: lessonId,
            },
        })

        await prisma.course.deleteMany({
            where: {
                id: courseId,
            },
        })

        await prisma.user.delete({
            where: {
                id: userId,
            },
        })

        await prisma.$disconnect()
    })

    it("should complete a lesson without a quiz", async () => {
        const response = await request(app)
            .post(`/api/progress/lessons/${lessonId}/complete`)
            .set(
                "Authorization",
                `Bearer ${studentToken}`
            )

        expect(response.status).toBe(200)

        expect(response.body.progress).toMatchObject({
            userId,
            lessonId,
            completed: true,
        })

        expect(response.body.progress.completedAt).not.toBeNull()
    })

    it("should reject manual completion when the lesson has a quiz", async () => {
        const quizLesson = await prisma.lesson.create({
            data: {
                title: "Quiz Lesson",
                content: "Lesson with quiz",
                position: 2,
                courseId,
            },
        })

        const quiz = await prisma.quiz.create({
            data: {
                title: "Progress Test Quiz",
                lessonId: quizLesson.id,
            },
        })

        const response = await request(app)
            .post(
                `/api/progress/lessons/${quizLesson.id}/complete`
            )
            .set(
                "Authorization",
                `Bearer ${studentToken}`
            )

        expect(response.status).toBe(409)

        expect(response.body).toEqual({
            message:
                "This lesson has a quiz and can only be completed by achieving 100% on the quiz",
        })

        expect(
            await prisma.lessonProgress.findUnique({
                where: {
                    userId_lessonId: {
                        userId,
                        lessonId: quizLesson.id,
                    },
                },
            })
        ).toBeNull()

        await prisma.quiz.delete({
            where: {
                id: quiz.id,
            },
        })

        await prisma.lesson.delete({
            where: {
                id: quizLesson.id,
            },
        })
    })

    it("should return the correct course progress", async () => {
        const progressCourse = await prisma.course.create({
            data: {
                title: "Course Progress API Test",
                status: "PUBLISHED",
            },
        })

        await prisma.enrollment.create({
            data: {
                userId,
                courseId: progressCourse.id,
            },
        })

        const lesson1 = await prisma.lesson.create({
            data: {
                title: "Progress Lesson 1",
                content: "Content",
                position: 1,
                courseId: progressCourse.id,
            },
        })

        const lesson2 = await prisma.lesson.create({
            data: {
                title: "Progress Lesson 2",
                content: "Content",
                position: 2,
                courseId: progressCourse.id,
            },
        })

        await prisma.lessonProgress.create({
            data: {
                userId,
                lessonId: lesson1.id,
                completed: true,
                completedAt: new Date(),
            },
        })

        const response = await request(app)
            .get(
                `/api/progress/courses/${progressCourse.id}`
            )
            .set(
                "Authorization",
                `Bearer ${studentToken}`
            )

        expect(response.status).toBe(200)

        expect(response.body.progress).toMatchObject({
            courseId: progressCourse.id,
            completedLessons: 1,
            totalLessons: 2,
            percentage: 50,
        })

        await prisma.lessonProgress.deleteMany({
            where: {
                userId,
                lessonId: {
                    in: [lesson1.id, lesson2.id],
                },
            },
        })

        await prisma.enrollment.deleteMany({
            where: {
                userId,
                courseId: progressCourse.id,
            },
        })

        await prisma.lesson.deleteMany({
            where: {
                id: {
                    in: [lesson1.id, lesson2.id],
                },
            },
        })

        await prisma.course.delete({
            where: {
                id: progressCourse.id,
            },
        })
    })
})