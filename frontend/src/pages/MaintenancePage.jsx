import { motion } from 'framer-motion';
import { UserCog, Droplet } from 'lucide-react';

/**
 * Maintenance Mode Screen
 * Displayed when the application is under maintenance
 */
const MaintenancePage = ({ message }) => {
  const defaultMessage = message || 'WishTrail is currently undergoing scheduled maintenance to improve your growth experience. We\'ll be back shortly.';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">

      {/* Main Content */}
      <div className="min-h-[calc(100vh-80px)] flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full text-center">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          >
            {/* Icon */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="flex justify-center mb-8"
            >
              <div className="relative">
                {/* Pulsing background effect */}
                <motion.div
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.3, 0.1, 0.3],
                  }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                  className="absolute inset-0 bg-blue-400 dark:bg-blue-500 rounded-full blur-2xl"
                />
                
                {/* Icon container */}
                <div className="relative w-32 h-32 bg-white dark:bg-gray-800 rounded-3xl shadow-xl flex items-center justify-center">
                  <UserCog className="w-16 h-16 text-blue-500" strokeWidth={1.5} />
                  
                  {/* Loading bar */}
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200 dark:bg-gray-700 rounded-b-3xl overflow-hidden">
                    <motion.div
                      animate={{
                        x: ['-100%', '100%'],
                      }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                      className="h-full w-1/3 bg-[#4c99e6]"
                    />
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Title */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4"
            >
              We're Refining the Path
            </motion.h1>

            {/* Message */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-gray-600 dark:text-gray-400 text-base md:text-lg mb-8 leading-relaxed"
            >
              {defaultMessage}
            </motion.p>
          </motion.div>
        </div>
      </div>

      {/* Footer */}
      <div className="fixed bottom-0 left-0 right-0 py-6 text-center">
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-sm text-gray-500 dark:text-gray-500"
        >
          © 2024 WishTrail. Preparing for your next milestone.
        </motion.p>
      </div>
    </div>
  );
};

export default MaintenancePage;
