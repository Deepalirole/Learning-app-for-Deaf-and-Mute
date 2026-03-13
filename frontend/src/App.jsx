import { Navigate, Route, Routes } from 'react-router-dom'

import Dashboard from './pages/Dashboard.jsx'
import Detect from './pages/Detect.jsx'
import ForgotPassword from './pages/ForgotPassword.jsx'
import Achievements from './pages/Achievements.jsx'
import Chatbot from './pages/Chatbot.jsx'
import Learn from './pages/Learn.jsx'
import Login from './pages/Login.jsx'
import Practice from './pages/Practice.jsx'
import ResetPassword from './pages/ResetPassword.jsx'
import Settings from './pages/Settings.jsx'
import Signup from './pages/Signup.jsx'
import Home from './pages/Home.jsx'
import About from './pages/About.jsx'
import Support from './pages/Support.jsx'
import Privacy from './pages/Privacy.jsx'
import Terms from './pages/Terms.jsx'
import NotFound from './pages/NotFound.jsx'

import AuthLayout from './lib/AuthLayout.jsx'
import ProtectedRoute from './lib/ProtectedRoute.jsx'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/about" element={<About />} />
      <Route path="/support" element={<Support />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/terms" element={<Terms />} />
      <Route
        path="/detect"
        element={
          <ProtectedRoute>
            <AuthLayout>
              <Detect />
            </AuthLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/learn"
        element={
          <ProtectedRoute>
            <AuthLayout>
              <Learn />
            </AuthLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/practice"
        element={
          <ProtectedRoute>
            <AuthLayout>
              <Practice />
            </AuthLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/chatbot"
        element={
          <ProtectedRoute>
            <AuthLayout>
              <Chatbot />
            </AuthLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/achievements"
        element={
          <ProtectedRoute>
            <AuthLayout>
              <Achievements />
            </AuthLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <AuthLayout>
              <Settings />
            </AuthLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <AuthLayout>
              <Dashboard />
            </AuthLayout>
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

export default App
