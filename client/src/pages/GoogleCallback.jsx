/**
 * GoogleCallback.jsx
 *
 * This page lives at /auth/callback.
 * After Google OAuth succeeds, the server redirects here with:
 *   /auth/callback?token=<jwt>
 *
 * This page:
 *   1. Reads the token from the URL
 *   2. Stores it in localStorage
 *   3. Calls GET /api/auth/me to get the user object
 *   4. Updates AuthContext
 *   5. Redirects to /dashboard
 *
 * On error (no token, or token invalid):
 *   Redirects to /login with an error message
 */

import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import api from '../services/api'

export default function GoogleCallback() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  useEffect(() => {
    const handleCallback = async () => {
      const token = searchParams.get('token')
      const error = searchParams.get('error')

      if (error || !token) {
        navigate('/login?error=google_failed')
        return
      }

      try {
        // Store token so the axios interceptor picks it up
        localStorage.setItem('token', token)

        // Verify token with backend
        await api.get('/auth/me')

        // Reload so AuthContext re-hydrates from token
        window.location.href = '/dashboard'
      } catch {
        localStorage.removeItem('token')
        navigate('/login?error=google_failed')
      }
    }

    handleCallback()
  }, [])

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-400 text-sm">Signing you in with Google…</p>
      </div>
    </div>
  )
}
