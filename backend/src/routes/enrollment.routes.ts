import { Router } from "express"
import {
  enroll,
  getMyEnrollments,
  unenroll,
} from "../controllers/enrollment.controller.js"
import { authenticate } from "../middleware/auth.middleware.js"

const router = Router()

router.get(
  "/me",
  authenticate,
  getMyEnrollments
)

router.post(
  "/courses/:courseId",
  authenticate,
  enroll
)

router.delete(
  "/courses/:courseId",
  authenticate,
  unenroll
)

export default router