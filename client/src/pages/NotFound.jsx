import { useNavigate } from 'react-router-dom'
import Button from '../components/ui/Button'

export default function NotFound() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center text-center px-6">
      <h1 className="text-8xl font-bold text-violet-500 mb-4">404</h1>
      <h2 className="text-2xl font-bold text-white mb-3">Page not found</h2>
      <p className="text-gray-400 mb-8 max-w-md">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Button variant="filled" onClick={() => navigate('/')}>
        Back to Home
      </Button>
    </div>
  )
}
