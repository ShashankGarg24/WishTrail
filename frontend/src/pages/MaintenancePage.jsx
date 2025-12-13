import { motion } from 'framer-motion';
import { Settings, Clock, RefreshCw } from 'lucide-react';
import { useState, useEffect } from 'react';

/**
 * Maintenance Mode Screen
 * Displayed when the application is under maintenance
 */
const MaintenancePage = ({ message, estimatedTime }) => {
  const [countdown, setCountdown] = useState(60);
  const [isChecking, setIsChecking] = useState(false);

  const defaultMessage = message || 'We\'re currently performing scheduled maintenance to improve your experience.';

  // Countdown timer for auto-retry
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          window.location.reload();
          return 60;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleCheckNow = () => {
    setIsChecking(true);
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-gray-900 dark:to-zinc-900 flex items-center justify-center px-4 py-12">
      <div className="max-w-2xl w-full">
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="text-center"
        >
          {/* Animated Icon */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
            className="flex justify-center mb-8"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full blur-2xl opacity-30 animate-pulse" />
              <div className="relative p-6 rounded-full bg-white dark:bg-gray-800 shadow-2xl">
                <Settings size={64} className="text-blue-500 dark:text-blue-400" strokeWidth={1.5} />
              </div>
            </div>
          </motion.div>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4"
          >
            Under Maintenance
          </motion.h1>

          {/* Message */}
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-lg text-gray-600 dark:text-gray-400 mb-6 max-w-lg mx-auto leading-relaxed"
          >
            {defaultMessage}
          </motion.p>

          {/* Estimated Time */}
          {estimatedTime && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full mb-8"
            >
              <Clock size={18} />
              <span className="text-sm font-medium">Estimated time: {estimatedTime}</span>
            </motion.div>
          )}

          {/* Progress Dots */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="flex justify-center gap-2 mb-8"
          >
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.3, 1, 0.3],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  delay: i * 0.2,
                }}
                className="w-3 h-3 bg-blue-500 dark:bg-blue-400 rounded-full"
              />
            ))}
          </motion.div>

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          >
            <button
              onClick={handleCheckNow}
              disabled={isChecking}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/30"
            >
              <RefreshCw size={18} className={isChecking ? 'animate-spin' : ''} />
              {isChecking ? 'Checking...' : 'Check Now'}
            </button>

            <div className="text-sm text-gray-500 dark:text-gray-500">
              Auto-retry in <span className="font-semibold text-gray-700 dark:text-gray-300">{countdown}s</span>
            </div>
          </motion.div>

          {/* Info Card */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="mt-12 p-6 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl"
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              What's happening?
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              We're upgrading our systems to serve you better. Your data is safe, and we'll be back online shortly. 
              Thank you for your patience!
            </p>
          </motion.div>

          {/* Footer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="mt-8"
          >
            <p className="text-sm text-gray-500 dark:text-gray-500">
              Questions? Contact us at{' '}
              <a
                href="mailto:thewishtrail@gmail.com"
                className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
              >
                thewishtrail@gmail.com
              </a>
            </p>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default MaintenancePage;
