import { Router } from "express"
import {
  addAnswerOption,
  addQuestion,
  create,
  getStudentQuiz,
  getAdminQuiz,
  submit,
  getMyAttempts,
  getByLesson,
  getAdminQuestion,
  deleteAnswerOptionController,
  deleteQuestionController,
  updateAnswerOptionController,
  updateQuestionController,
  updateQuizController,
  deleteQuizController,
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
  "/lesson/:lessonId",
  authenticate,
  getByLesson
)

router.get(
  "/questions/:questionId/admin",
  authenticate,
  authorize("ADMIN"),
  getAdminQuestion
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

router.patch(
  "/questions/:questionId",
  authenticate,
  authorize("ADMIN"),
  updateQuestionController
)

router.delete(
  "/questions/:questionId",
  authenticate,
  authorize("ADMIN"),
  deleteQuestionController
)

router.patch(
  "/options/:optionId",
  authenticate,
  authorize("ADMIN"),
  updateAnswerOptionController
)

router.delete(
  "/options/:optionId",
  authenticate,
  authorize("ADMIN"),
  deleteAnswerOptionController
)

router.patch(
  "/:id",
  authenticate,
  authorize("ADMIN"),
  updateQuizController
)

router.delete(
  "/:id",
  authenticate,
  authorize("ADMIN"),
  deleteQuizController
)

export default router