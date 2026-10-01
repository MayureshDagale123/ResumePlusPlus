export default function AppLoader() {
  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
      <div className="flex flex-col items-center gap-4">
        <span className="text-3xl font-bold text-violet-500 animate-pulse">
          Resume++
        </span>
        <div className="w-10 h-10 rounded-full border-2 border-gray-800 border-t-violet-500 animate-spin" />
      </div>
    </div>
  )
}
