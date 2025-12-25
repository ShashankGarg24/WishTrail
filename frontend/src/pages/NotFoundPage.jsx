import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

const NotFoundPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-slate-900 dark:via-gray-900 dark:to-zinc-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.4 }}>
          <div className="text-8xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 mb-4">404</div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Page not found</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">The page you’re looking for doesn’t exist or has been moved.</p>
          <div className="flex gap-3 justify-center">
            <Link to="/" className="btn-primary">Go Home</Link>
            <Link to="/discover" className="px-4 py-2 rounded-lg bg-white/80 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700">Discover</Link>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default NotFoundPage


