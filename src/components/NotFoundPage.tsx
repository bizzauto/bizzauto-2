import { Link } from 'react-router-dom'
import { Home } from 'lucide-react'

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
      <div className="text-center">
        <h1 className="text-9xl font-bold text-blue-600">404</h1>
        <p className="text-2xl font-semibold mt-4">Page Not Found</p>
        <p className="text-gray-500 mt-2">
          The page you're looking for doesn't exist.
        </p>
        <Link
          to="/dashboard"
          className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Home size={18} />
          Go to Dashboard
        </Link>
      </div>
    </div>
  )
}
