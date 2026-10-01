import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import AuthLayout from '../layouts/AuthLayout'

export default function ProtectedRoute() {
  const { isAuthenticated, loading } = useAuth()

  // While checking auth state on mount, show a centered spinner
  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // Not authenticated — redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  // Authenticated — render AuthLayout (which contains <Outlet /> for child routes)
  return <AuthLayout />
}
