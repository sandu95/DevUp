import { lazy } from "react"
import { Routes, Route } from "react-router-dom"
import { RouteContent } from "./components/RouteContent"
import ProtectedRoute from "./components/ProtectedRoute"
import AppLayout from "./layouts/AppLayout"
import PublicLayout from "./layouts/PublicLayout"
import HomePage from "./pages/HomePage"
import NotFoundLayout from "./layouts/NotFoundLayout"

const LoginPage = lazy(() => import("./pages/LoginPage"))
const DashboardPage = lazy(() => import("./pages/DashboardPage"))
const CoursesPage = lazy(() => import("./pages/CoursesPage"))
const CourseDetailsPage = lazy(() => import("./pages/CourseDetailsPage"))
const LessonPage = lazy(() => import("./pages/LessonPage"))
const QuizPage = lazy(() => import("./pages/QuizPage"))
const QuizHistoryPage = lazy(() => import("./pages/QuizHistoryPage"))
const AdminPage = lazy(() => import("./pages/AdminPage"))
const AdminCoursePage = lazy(() => import("./pages/AdminCoursePage"))
const AdminLessonPage = lazy(() => import("./pages/AdminLessonPage"))
const AdminQuestionPage = lazy(() => import("./pages/AdminQuestionPage"))
const CatalogPage = lazy(() => import("./pages/CatalogPage"))
const PublicCoursePage = lazy(() => import("./pages/PublicCoursePage"))
const NotFoundPage = lazy(() => import("./pages/NotFoundPage"))

function App() {
  return (
    <Routes>
      {/* Public */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/catalog" element={<CatalogPage />} />
        <Route path="/catalog/:id" element={<PublicCoursePage />} />
      </Route>

      <Route element={<RouteContent />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>

      {/* Student / authenticated */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/courses" element={<CoursesPage />} />
          <Route path="/courses/:id" element={<CourseDetailsPage />} />
          <Route path="/lessons/:id" element={<LessonPage />} />
          <Route path="/quizzes/:id" element={<QuizPage />} />
          <Route path="/quiz-history" element={<QuizHistoryPage />} />

          <Route element={<ProtectedRoute allowedRole="ADMIN" />}>
            <Route path="/admin" element={<AdminPage />} />
            <Route
              path="/admin/courses/:id"
              element={<AdminCoursePage />}
            />
            <Route
              path="/admin/lessons/:id"
              element={<AdminLessonPage />}
            />
            <Route
              path="/admin/questions/:id"
              element={<AdminQuestionPage />}
            />
          </Route>
        </Route>
      </Route>
      <Route element={<NotFoundLayout />}>
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}

export default App
