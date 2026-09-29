import { Router } from "express"
import {
  create,
  getAll,
  getOne,
  update,
  remove,
  getPublicCurriculum,
} from "../controllers/course.controller.js"
import {
  authenticate,
  authorize,
  optionalAuthenticate,
} from "../middleware/auth.middleware.js"

const router = Router()

router.get(
  "/",
  optionalAuthenticate,
  getAll
)

router.get(
  "/:id/curriculum",
  getPublicCurriculum
)

router.get(
  "/:id",
  optionalAuthenticate,
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