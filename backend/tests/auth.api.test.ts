import { describe, expect, it } from "vitest"
import request from "supertest"
import app from "../src/app.js"
import jwt from "jsonwebtoken"
import { prisma } from "../src/lib/prisma.js"

describe("Authentication API", () => {
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
        process.env.JWT_SECRET = "test-secret"

        const token = jwt.sign(
            {
                userId: 1,
                role: "STUDENT",
            },
            process.env.JWT_SECRET
        )

        const response = await request(app)
            .get("/api/users/me")
            .set("Authorization", `Bearer ${token}`)

        expect(response.status).toBe(404)
    })

    it("should reject a student from an admin-only endpoint", async () => {
        process.env.JWT_SECRET = "test-secret"

        const token = jwt.sign(
            {
                userId: 1,
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
                userId: 1,
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

    it("should register, login and fetch the current user", async () => {
        const email = `test-${Date.now()}@example.com`

        await prisma.user.deleteMany({
            where: {
                email,
            },
        })

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

        await prisma.user.deleteMany({
            where: {
                email,
            },
        })
    })
})