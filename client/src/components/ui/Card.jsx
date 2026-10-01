export default function Card({ className = '', children, ...props }) {
  return (
    <div
      className={`bg-gray-900 border border-gray-800 rounded-xl p-6 ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}
