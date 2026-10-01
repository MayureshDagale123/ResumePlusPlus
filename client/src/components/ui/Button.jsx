const variants = {
  filled:  'bg-violet-600 hover:bg-violet-500 text-white font-medium transition-colors duration-200',
  outline: 'border border-violet-500 text-violet-400 hover:bg-violet-500/10 font-medium transition-colors duration-200',
  ghost:   'text-gray-400 hover:text-white hover:bg-gray-800 font-medium transition-colors duration-200',
}

export default function Button({
  variant = 'filled',
  className = '',
  children,
  ...props
}) {
  return (
    <button
      className={`px-5 py-2.5 rounded-lg text-sm ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
