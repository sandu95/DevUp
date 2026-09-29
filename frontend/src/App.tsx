import { Routes, Route } from "react-router-dom"
import LoginPage from "./pages/LoginPage"
import DashboardPage from "./pages/DashboardPage"
import CoursesPage from "./pages/CoursesPage"
import CourseDetailsPage from "./pages/CourseDetailsPage"
import LessonPage from "./pages/LessonPage"
import QuizPage from "./pages/QuizPage"
import AdminPage from "./pages/AdminPage"
import AdminCoursePage from "./pages/AdminCoursePage"
import AdminLessonPage from "./pages/AdminLessonPage"
import AdminQuestionPage from "./pages/AdminQuestionPage"
import ProtectedRoute from "./components/ProtectedRoute"
import AppLayout from "./layouts/AppLayout"
import PublicLayout from "./layouts/PublicLayout"
import HomePage from "./pages/HomePage"
import CatalogPage from "./pages/CatalogPage"
import PublicCoursePage from "./pages/PublicCoursePage"

function App() {
  return (
    <Routes>
      {/* Public */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/catalog" element={<CatalogPage />} />
        <Route path="/catalog/:id" element={<PublicCoursePage />} />
      </Route>

      <Route path="/login" element={<LoginPage />} />

      {/* Student / authenticated */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/courses" element={<CoursesPage />} />
          <Route path="/courses/:id" element={<CourseDetailsPage />} />
          <Route path="/lessons/:id" element={<LessonPage />} />
          <Route path="/quizzes/:id" element={<QuizPage />} />

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
    </Routes>
  )
}

export default App