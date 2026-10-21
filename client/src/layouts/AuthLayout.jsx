import { useState, useRef, useEffect } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import ThemeToggle from '../components/ui/ThemeToggle'

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
  const [profileOpen, setProfileOpen] = useState(false)
  const profileRef = useRef(null)

  // Close profile dropdown on outside click or escape
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false)
      }
    }
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setProfileOpen(false)
        setMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  // Close dropdowns on route changes
  useEffect(() => {
    setProfileOpen(false)
    setMenuOpen(false)
  }, [pathname])

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
    setProfileOpen(false)
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
    <div className="min-h-screen bg-gray-50 dark:bg-black text-gray-900 dark:text-gray-100 flex flex-col transition-colors duration-200">

      {/* ── Top bar ──────────────────────────────────────────── */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#0a0a0a]/95 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-2">

          {/* Logo */}
          <Link to="/dashboard" className="shrink-0 flex items-center gap-2" onClick={() => setMenuOpen(false)}>
            <img src="/logo.jpeg" alt="Resume++" className="h-16 w-auto rounded-lg shadow-sm" />
          </Link>

          {/* Desktop nav tabs — hidden on mobile */}
          <nav className="hidden lg:flex items-center gap-1 flex-1 justify-center">
            {NAV_TABS.map((tab) => (
              <Link
                key={tab.path}
                to={tab.path}
                className={`px-3 py-2 rounded-xl text-sm font-semibold transition-all duration-150 whitespace-nowrap ${
                  isActive(tab.path)
                    ? 'text-violet-600 dark:text-violet-400 bg-violet-500/10 font-bold'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800/60'
                }`}
              >
                {tab.label}
              </Link>
            ))}
          </nav>

          {/* Right side: Theme Toggle + Profile Dropdown + Hamburger */}
          <div className="flex items-center gap-2.5 shrink-0">

            {/* Dark / Light Mode Toggle Button */}
            <ThemeToggle />

            {/* Profile Dropdown Container */}
            <div className="relative" ref={profileRef}>
              <button
                type="button"
                onClick={() => setProfileOpen((o) => !o)}
                className="flex items-center gap-2 py-1 px-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800/80 transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500/40"
                aria-label="User menu"
                aria-expanded={profileOpen}
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center text-sm font-bold text-white shadow-md ring-1 ring-white/10 shrink-0">
                  {initial}
                </div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 hidden sm:block max-w-[100px] truncate">
                  {displayName}
                </span>
                <span className="text-gray-400 text-xs hidden sm:block">▾</span>
              </button>

              {/* Profile Popover Menu (contains Logout) */}
              {profileOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-[#111113] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95">
                  {/* User Profile Header */}
                  <div className="px-3 py-2.5 bg-gray-50 dark:bg-gray-900/60 rounded-xl mb-1 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center text-sm font-bold text-white shrink-0 shadow">
                      {initial}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-gray-900 dark:text-white text-sm font-bold truncate leading-tight">
                        {user?.name || 'User'}
                      </p>
                      <p className="text-gray-500 dark:text-gray-400 text-xs truncate mt-0.5">
                        {user?.email || 'user@example.com'}
                      </p>
                    </div>
                  </div>

                  <div className="py-1">
                    <Link
                      to="/resume"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800/60 rounded-xl transition-colors font-medium"
                    >
                      <span>📄</span>
                      <span>My Resume</span>
                    </Link>

                    <Link
                      to="/jobs/saved"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800/60 rounded-xl transition-colors font-medium"
                    >
                      <span>💾</span>
                      <span>Saved Jobs</span>
                    </Link>
                  </div>

                  <div className="border-t border-gray-100 dark:border-gray-800/80 my-1 pt-1">
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex items-center gap-2.5 w-full text-left px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-colors font-semibold"
                    >
                      <span>🚪</span>
                      <span>Log Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Hamburger button — visible on mobile/tablet */}
            <button
              onClick={() => setMenuOpen(o => !o)}
              className="lg:hidden w-9 h-9 flex flex-col items-center justify-center gap-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Toggle menu"
            >
              <span className={`block w-5 h-0.5 bg-gray-600 dark:bg-gray-300 transition-all duration-200 ${menuOpen ? 'rotate-45 translate-y-2' : ''}`} />
              <span className={`block w-5 h-0.5 bg-gray-600 dark:bg-gray-300 transition-all duration-200 ${menuOpen ? 'opacity-0' : ''}`} />
              <span className={`block w-5 h-0.5 bg-gray-600 dark:bg-gray-300 transition-all duration-200 ${menuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
            </button>
          </div>
        </div>

        {/* ── Mobile dropdown menu ─────────────────────────────── */}
        {menuOpen && (
          <div className="lg:hidden border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-[#0a0a0a] px-4 py-3 shadow-lg">
            <nav className="flex flex-col gap-1">
              {NAV_TABS.map((tab) => (
                <button
                  key={tab.path}
                  onClick={() => handleMobileNav(tab.path)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-colors text-left w-full ${
                    isActive(tab.path)
                      ? 'text-violet-600 dark:text-violet-400 bg-violet-500/10'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  <span className="text-base">{tab.icon}</span>
                  {tab.label}
                  {isActive(tab.path) && (
                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-violet-500" />
                  )}
                </button>
              ))}

              {/* Logout in mobile menu */}
              <div className="border-t border-gray-200 dark:border-gray-800 mt-2 pt-2">
                <button
                  onClick={() => { setMenuOpen(false); handleLogout() }}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors w-full text-left"
                >
                  <span>🚪</span>
                  Log Out
                </button>
              </div>
            </nav>
          </div>
        )}
      </header>

      {/* Page content */}
      <main className="flex-1 pt-16 pb-20 lg:pb-6 overflow-y-auto">
        <Outlet />
      </main>

      {/* ── Mobile Bottom Navigation Bar (Thumb Friendly) ──────────── */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#0a0a0a]/95 backdrop-blur-lg border-t border-gray-200 dark:border-gray-800 px-2 py-1.5 flex items-center justify-around shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
        {[
          { label: 'Home',      path: '/dashboard',     icon: '🏠' },
          { label: 'Jobs',      path: '/jobs',          icon: '🔍' },
          { label: 'Builder',   path: '/resume/create', icon: '📝' },
          { label: 'My Resume', path: '/resume',        icon: '📄' },
          { label: 'Optimize',  path: '/optimizer',     icon: '⚡' },
        ].map((tab) => {
          const active = isActive(tab.path)
          return (
            <Link
              key={tab.path}
              to={tab.path}
              className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all ${
                active
                  ? 'text-violet-600 dark:text-violet-400 font-bold scale-105'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <span className="text-lg leading-none">{tab.icon}</span>
              <span className="text-[10px] tracking-tight mt-1">{tab.label}</span>
              {active && (
                <span className="w-1 h-1 rounded-full bg-violet-600 dark:bg-violet-400 mt-0.5" />
              )}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
