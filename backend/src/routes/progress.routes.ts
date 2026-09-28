import { Router } from "express"
import {
  completeLesson,
  getMyProgress,
} from "../controllers/progress.controller.js"
import { authenticate } from "../middleware/auth.middleware.js"

const router = Router()

router.get("/me", authenticate, getMyProgress)

router.post(
  "/lessons/:lessonId/complete",
  authenticate,
  completeLesson
)

export default router