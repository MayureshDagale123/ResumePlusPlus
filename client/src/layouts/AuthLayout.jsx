import { useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const NAV_TABS = [
  { label: 'Dashboard',        path: '/dashboard',     icon: '🏠' },
  { label: 'Find Jobs',        path: '/jobs',          icon: '🔍' },
  { label: 'Saved Jobs',       path: '/jobs/saved',    icon: '💾' },
  { label: 'Create Resume',    path: '/resume/create', icon: '📝' },
  { label: 'My Resume',        path: '/resume',        icon: '📄' },
  { label: 'Resume Optimizer', path: '/optimizer',     icon: '⚡' },
]

export default function AuthLayout() {
  const { pathname } = useLocation()
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  // Correct active tab logic — more specific paths take priority
  const isActive = (path) => {
    if (pathname === path) return true
    const otherTabPaths = NAV_TABS.map(t => t.path).filter(p => p !== path)
    const moreSpecificMatch = otherTabPaths.some(
      p => p.length > path.length && (pathname === p || pathname.startsWith(p + '/'))
    )
    if (moreSpecificMatch) return false
    return pathname.startsWith(path + '/')
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const handleMobileNav = (path) => {
    setMenuOpen(false)
    navigate(path)
  }

  const initial     = user?.name?.[0]?.toUpperCase() ?? 'U'
  const displayName = user?.name?.split(' ')[0] ?? 'User'

  return (
    <div className="min-h-screen bg-black flex flex-col">

      {/* ── Top bar ──────────────────────────────────────────── */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-[#0a0a0a]/95 backdrop-blur-md border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-2">

          {/* Logo */}
          <Link to="/dashboard" className="shrink-0" onClick={() => setMenuOpen(false)}>
            <img src="/logo.jpeg" alt="Resume++" className="h-10 w-auto" />
          </Link>

          {/* Desktop nav tabs — hidden on mobile */}
          <nav className="hidden lg:flex items-center gap-1 flex-1 justify-center">
            {NAV_TABS.map((tab) => (
              <Link
                key={tab.path}
                to={tab.path}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150 whitespace-nowrap ${
                  isActive(tab.path)
                    ? 'text-violet-400 bg-violet-500/10'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                {tab.label}
              </Link>
            ))}
          </nav>

          {/* Right side: profile + hamburger */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Avatar + name (always visible) */}
            <div className="flex items-center gap-2 text-gray-400">
              <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-sm font-bold text-violet-400 shrink-0">
                {initial}
              </div>
              <span className="text-sm hidden sm:block">{displayName}</span>
              {/* Logout — visible on desktop */}
              <button onClick={handleLogout}
                className="text-xs text-gray-500 hover:text-red-400 transition-colors ml-1 hidden lg:block">
                Logout
              </button>
            </div>

            {/* Hamburger button — visible on mobile/tablet */}
            <button
              onClick={() => setMenuOpen(o => !o)}
              className="lg:hidden w-9 h-9 flex flex-col items-center justify-center gap-1.5 rounded-lg hover:bg-gray-800 transition-colors"
              aria-label="Toggle menu"
            >
              <span className={`block w-5 h-0.5 bg-gray-300 transition-all duration-200 ${menuOpen ? 'rotate-45 translate-y-2' : ''}`} />
              <span className={`block w-5 h-0.5 bg-gray-300 transition-all duration-200 ${menuOpen ? 'opacity-0' : ''}`} />
              <span className={`block w-5 h-0.5 bg-gray-300 transition-all duration-200 ${menuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
            </button>
          </div>
        </div>

        {/* ── Mobile dropdown menu ─────────────────────────────── */}
        {menuOpen && (
          <div className="lg:hidden border-t border-gray-800 bg-[#0a0a0a] px-4 py-3">
            <nav className="flex flex-col gap-1">
              {NAV_TABS.map((tab) => (
                <button
                  key={tab.path}
                  onClick={() => handleMobileNav(tab.path)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors text-left w-full ${
                    isActive(tab.path)
                      ? 'text-violet-400 bg-violet-500/10'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  }`}
                >
                  <span className="text-base">{tab.icon}</span>
                  {tab.label}
                  {isActive(tab.path) && (
                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-violet-400" />
                  )}
                </button>
              ))}

              {/* Logout in mobile menu */}
              <div className="border-t border-gray-800 mt-2 pt-2">
                <button
                  onClick={() => { setMenuOpen(false); handleLogout() }}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-gray-500 hover:text-red-400 hover:bg-gray-800 transition-colors w-full text-left"
                >
                  <span>🚪</span>
                  Logout
                </button>
              </div>
            </nav>
          </div>
        )}
      </header>

      {/* Page content */}
      <main className="flex-1 pt-16 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}
