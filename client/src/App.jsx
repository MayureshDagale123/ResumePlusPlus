import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'

import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import CursorSpotlight from './components/CursorSpotlight'
import AppLoader from './components/AppLoader'
import ProtectedRoute from './components/ProtectedRoute'

import PublicLayout from './layouts/PublicLayout'

import Landing from './pages/Landing'
import Register from './pages/Register'
import Login from './pages/Login'
import GoogleCallback from './pages/GoogleCallback'
import Dashboard from './pages/Dashboard'
import FindJobs from './pages/FindJobs'
import SavedJobs from './pages/SavedJobs'
import JobDetails from './pages/JobDetails'
import CreateResume from './pages/CreateResume'
import MyResume from './pages/MyResume'
import OptimizedResumePreview from './pages/OptimizedResumePreview'
import Optimizer from './pages/Optimizer'
import NotFound from './pages/NotFound'

function App() {
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1500)
    return () => clearTimeout(timer)
  }, [])

  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <CursorSpotlight />
          {loading ? (
            <AppLoader />
          ) : (
            <Routes>
              {/* Public routes */}
              <Route element={<PublicLayout />}>
                <Route path="/" element={<Landing />} />
                <Route path="/register" element={<Register />} />
                <Route path="/login" element={<Login />} />
                <Route path="/auth/callback" element={<GoogleCallback />} />
              </Route>

              {/* Protected routes — ProtectedRoute handles auth check and renders AuthLayout */}
              <Route element={<ProtectedRoute />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/jobs" element={<FindJobs />} />
                <Route path="/jobs/saved" element={<SavedJobs />} />
                <Route path="/job/:id" element={<JobDetails />} />
                <Route path="/resume/create" element={<CreateResume />} />
                <Route path="/resume" element={<MyResume />} />
                <Route path="/resume/optimized/:id" element={<OptimizedResumePreview />} />
                <Route path="/optimizer" element={<Optimizer />} />
              </Route>

              {/* 404 */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          )}
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
