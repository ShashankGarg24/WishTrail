import { motion } from 'framer-motion';
import { Wrench, Sparkles } from 'lucide-react';
import { useState, useEffect } from 'react';

const FloatingParticle = ({ delay = 0, duration = 20 }) => (
  <motion.div
    className="absolute w-1 h-1 bg-blue-400 dark:bg-blue-300 rounded-full opacity-60"
    initial={{ x: Math.random() * window.innerWidth, y: window.innerHeight + 20, opacity: 0 }}
    animate={{
      y: -20,
      opacity: [0, 0.6, 0.6, 0],
      x: Math.random() * window.innerWidth,
    }}
    transition={{
      duration,
      delay,
      repeat: Infinity,
      ease: 'linear',
    }}
  />
);

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
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-indigo-950 via-purple-900 to-slate-900">
      {/* Animated mesh gradient background */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 opacity-20 blur-3xl animate-pulse" />
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 90, 0],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
          className="absolute -left-1/4 -top-1/4 w-96 h-96 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-full blur-3xl opacity-30"
        />
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            rotate: [0, -90, 0],
          }}
          transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
          className="absolute -right-1/4 -bottom-1/4 w-96 h-96 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full blur-3xl opacity-30"
        />
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            x: [0, 100, 0],
            y: [0, -50, 0],
          }}
          transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-1/2 left-1/2 w-64 h-64 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full blur-3xl opacity-20"
        />
      </div>

      {/* Floating particles */}
      {[...Array(20)].map((_, i) => (
        <FloatingParticle key={i} delay={i * 0.5} duration={15 + Math.random() * 10} />
      ))}

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.02)_1px,transparent_1px)] bg-[size:50px_50px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,black,transparent)]" />

      <div className="relative z-10 container mx-auto px-4 py-8 sm:py-12 min-h-screen flex items-center justify-center">
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.19, 1, 0.22, 1] }}
          className="w-full max-w-5xl"
        >
          {/* Icon and sparkles */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
            className="flex justify-center mb-6 sm:mb-8"
          >
            <div className="relative">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
                className="absolute -inset-8 sm:-inset-12"
              >
                <Sparkles className="absolute top-0 left-0 w-4 h-4 sm:w-6 sm:h-6 text-yellow-400" />
                <Sparkles className="absolute top-0 right-0 w-3 h-3 sm:w-5 sm:h-5 text-pink-400" />
                <Sparkles className="absolute bottom-0 left-0 w-3 h-3 sm:w-5 sm:h-5 text-blue-400" />
                <Sparkles className="absolute bottom-0 right-0 w-4 h-4 sm:w-6 sm:h-6 text-purple-400" />
              </motion.div>
              <motion.div
                animate={{
                  boxShadow: [
                    '0 0 20px rgba(59, 130, 246, 0.5)',
                    '0 0 60px rgba(168, 85, 247, 0.8)',
                    '0 0 20px rgba(59, 130, 246, 0.5)',
                  ],
                }}
                transition={{ duration: 2, repeat: Infinity }}
                className="relative p-5 sm:p-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 shadow-2xl"
              >
                <Wrench size={48} className="sm:w-16 sm:h-16 text-white" strokeWidth={1.5} />
              </motion.div>
            </div>
          </motion.div>

          {/* Title with gradient */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-center mb-4 sm:mb-6"
          >
            <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent drop-shadow-2xl">
              Under Maintenance
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-base sm:text-lg md:text-xl text-center text-gray-300 mb-8 sm:mb-12 max-w-2xl mx-auto leading-relaxed px-4"
          >
            {defaultMessage}
          </motion.p>

          {/* Estimated Time */}
          {estimatedTime && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 backdrop-blur-md text-blue-300 rounded-full mb-8 border border-white/20"
            >
              <span className="text-sm sm:text-base font-medium">Estimated time: {estimatedTime}</span>
            </motion.div>
          )}

          {/* Action Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
            className="flex flex-col items-center gap-4"
          >
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleCheckNow}
              disabled={isChecking}
              className="px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold rounded-full shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isChecking ? 'Checking...' : 'Check Status'}
            </motion.button>

            <div className="text-sm text-gray-400">
              Auto-retry in <span className="font-semibold text-white">{countdown}s</span>
            </div>
          </motion.div>

          {/* Info Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2 }}
            className="mt-12 bg-white/5 backdrop-blur-md rounded-2xl p-6 sm:p-8 border border-white/10 max-w-2xl mx-auto"
          >
            <h3 className="text-lg sm:text-xl font-semibold text-white mb-3">
              What's happening?
            </h3>
            <p className="text-sm sm:text-base text-gray-300 leading-relaxed">
              We're upgrading our systems to serve you better. Your data is safe, and we'll be back online shortly. 
              Thank you for your patience!
            </p>
          </motion.div>

          {/* Footer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.4 }}
            className="mt-8"
          >
            <p className="text-sm text-gray-400">
              Questions? Contact us at{' '}
              <a
                href="mailto:thewishtrail@gmail.com"
                className="text-blue-400 hover:text-blue-300 transition-colors underline decoration-blue-400/30 hover:decoration-blue-300"
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
