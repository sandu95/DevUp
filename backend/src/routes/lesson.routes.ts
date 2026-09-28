import { Router } from "express"
import {
  create,
  getByCourse,
  getOne,
  update,
  remove,
} from "../controllers/lesson.controller.js"
import {
  authenticate,
  authorize,
} from "../middleware/auth.middleware.js"

const router = Router()

router.get("/course/:courseId", getByCourse)

router.get(
  "/:id",
  authenticate,
  getOne
)

router.post(
  "/",
  authenticate,
  authorize("ADMIN"),
  create
)

router.patch(
  "/:id",
  authenticate,
  authorize("ADMIN"),
  update
)

router.delete(
  "/:id",
  authenticate,
  authorize("ADMIN"),
  remove
)

export default router