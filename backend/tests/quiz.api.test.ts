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

describe("Quiz API", () => {
    let userId: number
    let studentToken: string
    let courseId: number
    let lessonId: number
    let quizId: number
    let questionId: number
    let correctOptionId: number
    let wrongOptionId: number

    beforeAll(async () => {
        process.env.JWT_SECRET = "test-secret"

        const user = await prisma.user.create({
            data: {
                name: "Quiz Test Student",
                email: `quiz-${Date.now()}@example.com`,
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
                title: "Quiz Test Course",
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
                title: "Quiz Test Lesson",
                content: "Test content",
                position: 1,
                courseId,
            },
        })

        lessonId = lesson.id

        const quiz = await prisma.quiz.create({
            data: {
                title: "Test Quiz",
                lessonId,
            },
        })

        quizId = quiz.id

        const question = await prisma.question.create({
            data: {
                text: "What is 2 + 2?",
                position: 1,
                quizId,
            },
        })

        questionId = question.id

        const correctOption = await prisma.answerOption.create({
            data: {
                text: "4",
                isCorrect: true,
                questionId,
            },
        })

        correctOptionId = correctOption.id

        const wrongOption = await prisma.answerOption.create({
            data: {
                text: "5",
                isCorrect: false,
                questionId,
            },
        })

        wrongOptionId = wrongOption.id
    })

    afterAll(async () => {
        await prisma.quizAnswer.deleteMany({
            where: {
                attempt: {
                    userId,
                },
            },
        })

        await prisma.quizAttempt.deleteMany({
            where: {
                userId,
            },
        })

        await prisma.lessonProgress.deleteMany({
            where: {
                userId,
            },
        })

        await prisma.answerOption.deleteMany({
            where: {
                questionId,
            },
        })

        await prisma.question.deleteMany({
            where: {
                id: questionId,
            },
        })

        await prisma.quiz.deleteMany({
            where: {
                id: quizId,
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

    it("should submit a quiz with 100% and complete the lesson", async () => {
        const response = await request(app)
            .post(`/api/quizzes/${quizId}/submit`)
            .set(
                "Authorization",
                `Bearer ${studentToken}`
            )
            .send({
                answers: [
                    {
                        questionId,
                        answerOptionId: correctOptionId,
                    },
                ],
            })

        expect(response.status).toBe(201)

        expect(response.body).toMatchObject({
            message: "Quiz submitted successfully",
            result: {
                score: 100,
                correctAnswers: 1,
                totalQuestions: 1,
            },
        })

        expect(response.body.result.attemptId).toBeTypeOf(
            "number"
        )

        const progress =
            await prisma.lessonProgress.findUnique({
                where: {
                    userId_lessonId: {
                        userId,
                        lessonId,
                    },
                },
            })

        expect(progress).not.toBeNull()

        expect(progress).toMatchObject({
            userId,
            lessonId,
            completed: true,
        })

        expect(progress?.completedAt).not.toBeNull()
    })

    it("should not complete the lesson when the quiz score is below 100%", async () => {
        const testCourse = await prisma.course.create({
            data: {
                title: "Quiz Failed Test Course",
                status: "PUBLISHED",
            },
        })

        const testLesson = await prisma.lesson.create({
            data: {
                title: "Quiz Failed Test Lesson",
                content: "Test content",
                position: 1,
                courseId: testCourse.id,
            },
        })

        await prisma.enrollment.create({
            data: {
                userId,
                courseId: testCourse.id,
            },
        })

        const testQuiz = await prisma.quiz.create({
            data: {
                title: "Failed Quiz Test",
                lessonId: testLesson.id,
            },
        })

        const testQuestion = await prisma.question.create({
            data: {
                text: "What is 2 + 2?",
                position: 1,
                quizId: testQuiz.id,
            },
        })

        const wrongOption = await prisma.answerOption.create({
            data: {
                text: "5",
                isCorrect: false,
                questionId: testQuestion.id,
            },
        })

        await prisma.answerOption.create({
            data: {
                text: "4",
                isCorrect: true,
                questionId: testQuestion.id,
            },
        })

        const response = await request(app)
            .post(`/api/quizzes/${testQuiz.id}/submit`)
            .set(
                "Authorization",
                `Bearer ${studentToken}`
            )
            .send({
                answers: [
                    {
                        questionId: testQuestion.id,
                        answerOptionId: wrongOption.id,
                    },
                ],
            })

        expect(response.status).toBe(201)

        expect(response.body.result).toMatchObject({
            score: 0,
            correctAnswers: 0,
            totalQuestions: 1,
        })

        const progress =
            await prisma.lessonProgress.findUnique({
                where: {
                    userId_lessonId: {
                        userId,
                        lessonId: testLesson.id,
                    },
                },
            })

        expect(progress).toBeNull()

        await prisma.quizAnswer.deleteMany({
            where: {
                attempt: {
                    userId,
                    quizId: testQuiz.id,
                },
            },
        })

        await prisma.quizAttempt.deleteMany({
            where: {
                userId,
                quizId: testQuiz.id,
            },
        })

        await prisma.answerOption.deleteMany({
            where: {
                questionId: testQuestion.id,
            },
        })

        await prisma.question.delete({
            where: {
                id: testQuestion.id,
            },
        })

        await prisma.quiz.delete({
            where: {
                id: testQuiz.id,
            },
        })

        await prisma.enrollment.delete({
            where: {
                userId_courseId: {
                    userId,
                    courseId: testCourse.id,
                },
            },
        })

        await prisma.lesson.delete({
            where: {
                id: testLesson.id,
            },
        })

        await prisma.course.delete({
            where: {
                id: testCourse.id,
            },
        })
    })

    it("should reject incomplete quiz answers", async () => {
        const response = await request(app)
            .post(`/api/quizzes/${quizId}/submit`)
            .set(
                "Authorization",
                `Bearer ${studentToken}`
            )
            .send({
                answers: [],
            })

        expect(response.status).toBe(400)

        expect(response.body).toEqual({
            message: "All questions must be answered",
        })
    })

    it("should reject duplicate question answers", async () => {
        const secondQuestion = await prisma.question.create({
            data: {
                text: "What is 3 + 3?",
                position: 2,
                quizId,
            },
        })

        const secondCorrectOption =
            await prisma.answerOption.create({
                data: {
                    text: "6",
                    isCorrect: true,
                    questionId: secondQuestion.id,
                },
            })

        const response = await request(app)
            .post(`/api/quizzes/${quizId}/submit`)
            .set(
                "Authorization",
                `Bearer ${studentToken}`
            )
            .send({
                answers: [
                    {
                        questionId,
                        answerOptionId: correctOptionId,
                    },
                    {
                        questionId,
                        answerOptionId: wrongOptionId,
                    },
                ],
            })

        expect(response.status).toBe(400)

        expect(response.body).toEqual({
            message: "Invalid quiz answers",
        })

        await prisma.answerOption.deleteMany({
            where: {
                questionId: secondQuestion.id,
            },
        })

        await prisma.question.delete({
            where: {
                id: secondQuestion.id,
            },
        })
    })
})