import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, ArrowRight, Droplet } from 'lucide-react';
import useApiStore from '../store/apiStore';

const NotFoundPage = () => {
  const { isAuthenticated } = useApiStore();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Main Content */}
      <div className="min-h-[calc(100vh-180px)] flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full text-center">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          >
            {/* 404 Illustration */}
            <motion.div
              initial={{ scale: 0, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="flex justify-center mb-8"
            >
              <div className="relative">
                {/* Background decorative elements */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-64 h-64 bg-gray-200 dark:bg-gray-800 rounded-full opacity-30" />
                </div>
                
                {/* 404 with mountain illustration */}
                <div className="relative z-10 text-gray-300 dark:text-gray-700">
                  <svg className="w-full max-w-md h-40" viewBox="0 0 400 160" fill="none" xmlns="http://www.w3.org/2000/svg">
                    {/* Left 4 */}
                    <text x="20" y="130" fontSize="140" fontWeight="900" fill="currentColor" opacity="0.2" fontFamily="system-ui, -apple-system, sans-serif">4</text>
                    
                    {/* Mountain - centered between 4's */}
                    <g transform="translate(160, 20)">
                      {/* Back mountain */}
                      <polygon points="20,50 60,110 -20,110" fill="currentColor" opacity="0.08" />
                      {/* Main mountain */}
                      <polygon points="40,30 90,110 -10,110" fill="currentColor" opacity="0.15" />
                      {/* Snow cap */}
                      <polygon points="40,30 50,45 30,45" fill="currentColor" opacity="0.05" />
                    </g>
                    
                    {/* Right 4 */}
                    <text x="260" y="130" fontSize="140" fontWeight="900" fill="currentColor" opacity="0.2" fontFamily="system-ui, -apple-system, sans-serif">4</text>
                  </svg>
                </div>
              </div>
            </motion.div>

            {/* Title */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-3"
            >
              Lost Your Way?
            </motion.h1>

            {/* Message */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-gray-600 dark:text-gray-400 text-base md:text-lg mb-8"
            >
              It seems the trail you're looking for doesn't exist or has moved.
            </motion.p>

            {/* Back to Home Button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="flex justify-center mb-6"
            >
              <Link
                to="/"
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors shadow-sm"
              >
                <Home size={18} />
                Back to Home
              </Link>
            </motion.div>

          </motion.div>
        </div>
      </div>

      {/* Footer */}
      <div className="fixed bottom-0 left-0 right-0 py-6 text-center border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="text-sm text-gray-500 dark:text-gray-500"
          >
            © 2024 WISHTRAIL JOURNEY
          </motion.p>
          
          <div className="flex items-center gap-6">
            <a href="/help" className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
              HELP CENTER
            </a>
            <a href="/status" className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
              SYSTEM STATUS
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;
