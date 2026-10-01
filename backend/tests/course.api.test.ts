import { beforeAll, afterAll, describe, expect, it } from "vitest"
import request from "supertest"
import jwt from "jsonwebtoken"
import { prisma } from "../src/lib/prisma.js"
import app from "../src/app.js"

describe("Courses API", () => {
    let adminToken: string
    let courseId: number

    beforeAll(() => {
        process.env.JWT_SECRET = "test-secret"

        adminToken = jwt.sign(
            {
                userId: 1,
                role: "ADMIN",
            },
            process.env.JWT_SECRET
        )
    })

    afterAll(async () => {
        if (courseId) {
            await prisma.course.deleteMany({
                where: {
                    id: courseId,
                },
            })
        }

        await prisma.$disconnect()
    })

    it("should create a draft course as admin", async () => {
        const response = await request(app)
            .post("/api/courses")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({
                title: "Test Course",
                description: "Course created by automated test",
            })

        expect(response.status).toBe(201)

        expect(response.body.course).toMatchObject({
            title: "Test Course",
            description: "Course created by automated test",
            status: "DRAFT",
        })

        courseId = response.body.course.id
    })

    it("should publish the course", async () => {
        const response = await request(app)
            .patch(`/api/courses/${courseId}`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({
                status: "PUBLISHED",
            })

        expect(response.status).toBe(200)

        expect(response.body.course).toMatchObject({
            id: courseId,
            status: "PUBLISHED",
        })
    })

    it("should reject modification of a published course", async () => {
        const response = await request(app)
            .patch(`/api/courses/${courseId}`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({
                title: "Modified after publication",
            })

        expect(response.status).toBe(409)

        expect(response.body).toEqual({
            message: "Published courses cannot be modified",
        })
    })

    it("should reject a student from modifying a course", async () => {
        const studentToken = jwt.sign(
            {
                userId: 1,
                role: "STUDENT",
            },
            process.env.JWT_SECRET!
        )

        const response = await request(app)
            .patch(`/api/courses/${courseId}`)
            .set("Authorization", `Bearer ${studentToken}`)
            .send({
                title: "Student modification",
            })

        expect(response.status).toBe(403)

        expect(response.body).toEqual({
            message: "Access denied",
        })
    })
})