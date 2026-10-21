const variants = {
  filled:
    'bg-violet-600 hover:bg-violet-500 text-white font-semibold transition-all duration-200 shadow-sm shadow-violet-500/20 active:scale-[0.98]',
  outline:
    'border border-violet-500/50 text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-500/10 font-medium transition-all duration-200 active:scale-[0.98]',
  ghost:
    'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800/60 font-medium transition-all duration-200',
}

export default function Button({
  variant = 'filled',
  className = '',
  children,
  ...props
}) {
  return (
    <button
      className={`px-5 py-2.5 rounded-xl text-sm ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
