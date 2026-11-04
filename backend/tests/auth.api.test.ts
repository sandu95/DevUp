import { afterAll, beforeAll, describe, expect, it } from "vitest"
import request from "supertest"
import app from "../src/app.js"
import jwt from "jsonwebtoken"
import { prisma } from "../src/lib/prisma.js"

describe("Authentication API", () => {
    const userIds: number[] = []
    const registrationEmails: string[] = []
    let studentId: number
    let adminId: number

    beforeAll(async () => {
        process.env.JWT_SECRET = "test-secret"
        for (const role of ["STUDENT", "ADMIN"] as const) {
            const user = await prisma.user.create({ data: {
                name: "Authentication Test User",
                email: `auth-${crypto.randomUUID()}@example.com`,
                password: "unused-test-password",
                role,
            } })
            userIds.push(user.id)
        }
        ;[studentId, adminId] = userIds as [number, number]
    })

    afterAll(async () => {
        if (userIds.length || registrationEmails.length) {
            await prisma.user.deleteMany({ where: { OR: [
                { id: { in: userIds } },
                { email: { in: registrationEmails } },
            ] } })
        }
        await prisma.$disconnect()
    })

    it("should reject /users/me without authentication token", async () => {
        const response = await request(app)
            .get("/api/users/me")

        expect(response.status).toBe(401)

        expect(response.body).toEqual({
            message: "Authentication token is required",
        })
    })

    it("should reject /users/me with an invalid token", async () => {
        const response = await request(app)
            .get("/api/users/me")
            .set("Authorization", "Bearer invalid-token")

        expect(response.status).toBe(401)

        expect(response.body).toEqual({
            message: "Invalid or expired token",
        })
    })

    it("should accept a valid JWT", async () => {
        const token = jwt.sign(
            {
                userId: studentId,
                role: "STUDENT",
            },
            process.env.JWT_SECRET!
        )

        const response = await request(app)
            .get("/api/users/me")
            .set("Authorization", `Bearer ${token}`)

        expect(response.status).toBe(200)
        expect(response.body.user).toMatchObject({ id: studentId, role: "STUDENT" })
        expect(response.body.user).not.toHaveProperty("password")
    })

    it("should reject an expired session with 401", async () => {
        const token = jwt.sign(
            { userId: studentId, role: "STUDENT" },
            process.env.JWT_SECRET!,
            { expiresIn: -1 }
        )
        const response = await request(app).get("/api/users/me")
            .set("Authorization", `Bearer ${token}`)
        expect(response.status).toBe(401)
        expect(response.body).not.toHaveProperty("user")
    })

    it("should return 404 when the session user has been deleted", async () => {
        const user = await prisma.user.create({ data: {
            name: "Deleted Session Test User",
            email: `deleted-auth-${crypto.randomUUID()}@example.com`,
            password: "unused-test-password",
        } })
        userIds.push(user.id)
        const token = jwt.sign({ userId: user.id, role: "STUDENT" }, process.env.JWT_SECRET!)
        await prisma.user.delete({ where: { id: user.id } })
        const response = await request(app).get("/api/users/me")
            .set("Authorization", `Bearer ${token}`)
        expect(response.status).toBe(404)
        expect(response.body).toEqual({ message: "User not found" })
    })

    it("should reject a student from an admin-only endpoint", async () => {
        process.env.JWT_SECRET = "test-secret"

        const token = jwt.sign(
            {
                userId: studentId,
                role: "STUDENT",
            },
            process.env.JWT_SECRET
        )

        const response = await request(app)
            .get("/api/users/stats")
            .set("Authorization", `Bearer ${token}`)

        expect(response.status).toBe(403)

        expect(response.body).toEqual({
            message: "Access denied",
        })
    })

    it("should allow an admin to access admin-only endpoint", async () => {
        process.env.JWT_SECRET = "test-secret"

        const token = jwt.sign(
            {
                userId: adminId,
                role: "ADMIN",
            },
            process.env.JWT_SECRET
        )

        const response = await request(app)
            .get("/api/users/stats")
            .set("Authorization", `Bearer ${token}`)

        expect(response.status).toBe(200)

        expect(response.body).toHaveProperty("users")
        expect(typeof response.body.users).toBe("number")
    })

    it.each([
        { email: {}, password: "secret" }, { email: "user@example.com", password: 123 }, {},
    ])("rejects malformed login fields with 400", async (body) => {
        expect((await request(app).post("/api/auth/login").send(body)).status).toBe(400)
    })

    it.each([
        { name: 12, email: "user@example.com", password: "123456" },
        { name: "User", email: "invalid", password: "123456" },
        { name: "User", email: "user@example.com", password: {} }, {},
    ])("rejects malformed registration fields with 400", async (body) => {
        expect((await request(app).post("/api/auth/register").send(body)).status).toBe(400)
    })

    it("maps simultaneous registration of the same email to one success and one conflict", async () => {
        const email = `duplicate-${crypto.randomUUID()}@example.com`
        registrationEmails.push(email)
        const results = await Promise.all([1, 2].map(() => request(app).post("/api/auth/register")
            .send({ name: "Concurrent User", email, password: "test123456" })))
        expect(results.map((result) => result.status).sort()).toEqual([201, 409])
    })

    it("should register, login and fetch the current user", async () => {
        const email = `test-${crypto.randomUUID()}@example.com`
        registrationEmails.push(email)

        const registerResponse = await request(app)
            .post("/api/auth/register")
            .send({
                name: "Test User",
                email,
                password: "test123456",
            })

        expect(registerResponse.status).toBe(201)

        expect(registerResponse.body.user).toMatchObject({
            name: "Test User",
            email,
            role: "STUDENT",
        })
        expect(registerResponse.body.user).not.toHaveProperty("password")

        const failedLogin = await request(app).post("/api/auth/login")
            .send({ email, password: "incorrect-password" })
        expect(failedLogin.status).toBe(401)
        expect(failedLogin.body).not.toHaveProperty("token")

        const loginResponse = await request(app)
            .post("/api/auth/login")
            .send({
                email,
                password: "test123456",
            })

        expect(loginResponse.status).toBe(200)

        expect(loginResponse.body.token).toBeDefined()

        const token = loginResponse.body.token

        const meResponse = await request(app)
            .get("/api/users/me")
            .set("Authorization", `Bearer ${token}`)

        expect(meResponse.status).toBe(200)

        expect(meResponse.body.user).toMatchObject({
            name: "Test User",
            email,
            role: "STUDENT",
        })
        expect(meResponse.body.user).not.toHaveProperty("password")

        await prisma.user.deleteMany({
            where: {
                email,
            },
        })
    })
})
