import { Router } from "express"
import {
  getUsersStats,
  getCurrentUser,
} from "../controllers/user.controller.js"

import {
  authenticate,
  authorize,
} from "../middleware/auth.middleware.js"

const router = Router()

router.get(
  "/stats",
  authenticate,
  authorize("ADMIN"),
  getUsersStats
)

router.get("/me", authenticate, getCurrentUser)

export default router