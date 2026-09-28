import { Router } from "express"
import {
  addAnswerOption,
  addQuestion,
  create,
  getStudentQuiz,
  getAdminQuiz,
  submit,
  getMyAttempts,
} from "../controllers/quiz.controller.js"
import {
  authenticate,
  authorize,
} from "../middleware/auth.middleware.js"

const router = Router()

router.get(
  "/attempts/me",
  authenticate,
  getMyAttempts
)

router.get(
  "/:id",
  authenticate,
  getStudentQuiz
)

router.get(
  "/:id/admin",
  authenticate,
  authorize("ADMIN"),
  getAdminQuiz
)

router.post(
  "/",
  authenticate,
  authorize("ADMIN"),
  create
)

router.post(
  "/:quizId/questions",
  authenticate,
  authorize("ADMIN"),
  addQuestion
)

router.post(
  "/questions/:questionId/options",
  authenticate,
  authorize("ADMIN"),
  addAnswerOption
)

router.post(
  "/:id/submit",
  authenticate,
  submit
)

export default router