export default function Card({ className = '', children, ...props }) {
  return (
    <div
      className={`bg-white dark:bg-[#0f0f14] border border-gray-200 dark:border-gray-800/90 rounded-2xl p-6 shadow-sm dark:shadow-none text-gray-900 dark:text-gray-100 transition-colors ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}
