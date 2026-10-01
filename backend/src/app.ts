import express from "express"
import cors from "cors"

import userRoutes from "./routes/user.routes.js"
import authRoutes from "./routes/auth.routes.js"
import courseRoutes from "./routes/course.routes.js"
import lessonRoutes from "./routes/lesson.routes.js"
import quizRoutes from "./routes/quiz.routes.js"
import progressRoutes from "./routes/progress.routes.js"
import enrollmentRoutes from "./routes/enrollment.routes.js"

const app = express()

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
)

app.use(express.json())

app.get("/api", (req, res) => {
  res.json({
    message: "MRSUTWEB API is running",
  })
})

app.use("/api/users", userRoutes)
app.use("/api/auth", authRoutes)
app.use("/api/courses", courseRoutes)
app.use("/api/lessons", lessonRoutes)
app.use("/api/quizzes", quizRoutes)
app.use("/api/progress", progressRoutes)
app.use("/api/enrollments", enrollmentRoutes)

export default app