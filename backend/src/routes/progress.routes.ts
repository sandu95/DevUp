import { Router } from "express"
import {
  completeLesson,
  getMyCourseProgress,
  getMyProgress,
} from "../controllers/progress.controller.js"
import { authenticate } from "../middleware/auth.middleware.js"

const router = Router()

router.get("/me", authenticate, getMyProgress)

router.get(
  "/courses/:courseId",
  authenticate,
  getMyCourseProgress
)

router.post(
  "/lessons/:lessonId/complete",
  authenticate,
  completeLesson
)

export default router