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

describe("Enrollment API", () => {
    let studentToken: string
    let courseId: number
    let userId: number

    beforeAll(async () => {
        process.env.JWT_SECRET = "test-secret"

        const user = await prisma.user.create({
            data: {
                name: "Enrollment Test Student",
                email: `enrollment-${Date.now()}@example.com`,
                password: "test-password",
                role: "STUDENT",
            },
        })

        userId = user.id

        studentToken = jwt.sign(
            {
                userId: user.id,
                role: "STUDENT",
            },
            process.env.JWT_SECRET
        )

        const course = await prisma.course.create({
            data: {
                title: "Enrollment Test Course",
                description: "Course for enrollment tests",
                status: "PUBLISHED",
            },
        })

        courseId = course.id
    })

    afterAll(async () => {
        await prisma.enrollment.deleteMany({
            where: {
                userId,
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

    it("should enroll a student in a course", async () => {
        const response = await request(app)
            .post(`/api/enrollments/courses/${courseId}`)
            .set("Authorization", `Bearer ${studentToken}`)

        expect(response.status).toBe(201)

        expect(response.body.enrollment).toMatchObject({
            userId,
            courseId,
        })
    })

    it("should reject duplicate enrollment", async () => {
        const response = await request(app)
            .post(`/api/enrollments/courses/${courseId}`)
            .set("Authorization", `Bearer ${studentToken}`)

        expect(response.status).toBe(409)

        expect(response.body).toEqual({
            message: "Already enrolled in this course",
        })
    })

    it("should calculate course progress correctly", async () => {
        const lesson1 = await prisma.lesson.create({
            data: {
                title: "Lesson 1",
                content: "Test content",
                position: 1,
                courseId,
            },
        })

        const lesson2 = await prisma.lesson.create({
            data: {
                title: "Lesson 2",
                content: "Test content",
                position: 2,
                courseId,
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
            .get("/api/enrollments/me")
            .set("Authorization", `Bearer ${studentToken}`)

        expect(response.status).toBe(200)

        expect(response.body.enrollments).toHaveLength(1)

        expect(response.body.enrollments[0].progress).toEqual({
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

        await prisma.lesson.deleteMany({
            where: {
                id: {
                    in: [lesson1.id, lesson2.id],
                },
            },
        })
    })

    it("should return the student's enrollments with course progress", async () => {
        const response = await request(app)
            .get("/api/enrollments/me")
            .set("Authorization", `Bearer ${studentToken}`)

        expect(response.status).toBe(200)

        expect(response.body.enrollments).toHaveLength(1)

        expect(response.body.enrollments[0]).toMatchObject({
            course: {
                id: courseId,
                title: "Enrollment Test Course",
                status: "PUBLISHED",
            },
            progress: {
                completedLessons: 0,
                totalLessons: 0,
                percentage: 0,
            },
        })
    })
})