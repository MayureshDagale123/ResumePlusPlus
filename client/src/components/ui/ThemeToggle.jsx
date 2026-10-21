import { useTheme } from '../../context/ThemeContext'

export default function ThemeToggle({ className = '' }) {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`p-2 rounded-xl transition-all duration-200 border flex items-center justify-center ${
        isDark
          ? 'bg-gray-800/80 border-gray-700/80 text-amber-300 hover:text-amber-200 hover:bg-gray-700 shadow-sm'
          : 'bg-white border-gray-200 text-violet-600 hover:text-violet-700 hover:bg-gray-50 shadow-sm'
      } ${className}`}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
    >
      {isDark ? (
        <span className="text-base select-none leading-none" role="img" aria-label="Sun">
          ☀️
        </span>
      ) : (
        <span className="text-base select-none leading-none" role="img" aria-label="Moon">
          🌙
        </span>
      )}
    </button>
  )
}
