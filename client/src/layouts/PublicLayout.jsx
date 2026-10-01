import { Link, Outlet } from 'react-router-dom'
import Button from '../components/ui/Button'

export default function PublicLayout() {
  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-40 bg-black/80 backdrop-blur-md border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-2 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center">
            <img src="/logo.jpeg" alt="Resume++" className="h-16" />
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="outline" className="text-sm">Login</Button>
            </Link>
            <Link to="/register">
              <Button variant="filled" className="text-sm">Register</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Page content — padded for fixed navbar height */}
      <main className="flex-1 pt-16">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-black border-t border-gray-800 py-8">
        <div className="max-w-7xl mx-auto px-6 flex flex-col items-center gap-2 text-center">
          <span className="text-lg font-bold text-white">Resume++</span>
          <p className="text-gray-400 text-sm">
            Find relevant jobs and optimize your resume with AI.
          </p>
          <p className="text-gray-600 text-xs">
            © {new Date().getFullYear()} Resume++. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
