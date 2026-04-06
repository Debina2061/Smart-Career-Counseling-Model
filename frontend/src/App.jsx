import { Routes, Route } from "react-router-dom"
import { AuthProvider } from "./context/AuthContext"
import { AdminNotificationProvider } from "./context/AdminNotificationContext"
import ProtectedRoute from "./components/ProtectedRoute"
import Header from "./components/Header"
import LandingPage from "./pages/LandingPage"
import NotFound from "./pages/NotFound"
import SignUp from "./pages/SignUp"
import SignIn from "./pages/SignIn"
import GetStarted from "./pages/GetStarted"
import ForgotPassword from "./pages/ForgotPassword"
import ResetPassword from "./pages/ResetPassword"
import Dashboard from "./pages/Dashboard"
import ATSScanner from "./pages/ATSScanner"
import CareerRecommendation from "./pages/CareerRecommendation"
import Profile from "./pages/Profile"
import AIChatbot from "./pages/AIChatbot"
import ResumeBuilder from "./pages/ResumeBuilder"
import AdminRoute from "./components/AdminRoute"
import AdminDashboard from "./pages/admin/AdminDashboard"
import CareerManagement from "./pages/admin/CareerManagement"
import SkillsKeywords from "./pages/admin/SkillsKeywords"
import StudentManagement from "./pages/admin/StudentManagement"
import StudentDetail from "./pages/admin/StudentDetail"
import ReportsAnalytics from "./pages/admin/ReportsAnalytics"
import AdminProfile from "./pages/admin/AdminProfile"

function App() {
  return (
    <AuthProvider>
      <AdminNotificationProvider>
      <div className="min-h-screen flex flex-col">
        {/* PAGES */}
        <main>
          <Routes>
            <Route path="*" element={<NotFound />} />
            <Route path="/" element={<LandingPage />} />
            <Route path="/home" element={<LandingPage />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/signin" element={<SignIn />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/getstarted" element={<GetStarted />} />
            
            {/* Protected Routes */}
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/ats-scanner" element={
              <ProtectedRoute>
                <ATSScanner />
              </ProtectedRoute>
            } />
            <Route path="/career-recommendation" element={
              <ProtectedRoute>
                <CareerRecommendation />
              </ProtectedRoute>
            } />
            <Route path="/profile" element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            } />
            <Route path="/ai-chatbot" element={
              <ProtectedRoute>
                <AIChatbot />
              </ProtectedRoute>
            } />
            <Route path="/resume-builder" element={
              <ProtectedRoute>
                <ResumeBuilder />
              </ProtectedRoute>
            } />

            {/* Admin Routes */}
            <Route path="/admin" element={
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            } />
            <Route path="/admin/dashboard" element={
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            } />
            <Route path="/admin/careers" element={
              <AdminRoute>
                <CareerManagement />
              </AdminRoute>
            } />
            <Route path="/admin/skills" element={
              <AdminRoute>
                <SkillsKeywords />
              </AdminRoute>
            } />
            <Route path="/admin/students" element={
              <AdminRoute>
                <StudentManagement />
              </AdminRoute>
            } />
            <Route path="/admin/students/:userId" element={
              <AdminRoute>
                <StudentDetail />
              </AdminRoute>
            } />
            <Route path="/admin/reports" element={
              <AdminRoute>
                <ReportsAnalytics />
              </AdminRoute>
            } />
            <Route path="/admin/profile" element={
              <AdminRoute>
                <AdminProfile />
              </AdminRoute>
            } />
          </Routes>
        </main>
      </div>
      </AdminNotificationProvider>
    </AuthProvider>
  )
}

export default App
