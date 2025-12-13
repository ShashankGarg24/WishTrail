import { motion, AnimatePresence } from 'framer-motion';
import { Star, Sparkles, Rocket, Zap } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

const pad = (n) => String(n).padStart(2, '0');

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

const Digit = ({ value, label }) => (
  <div className="flex flex-col items-center">
    <AnimatePresence mode="wait">
      <motion.div
        key={value}
        initial={{ y: -20, opacity: 0, rotateX: -90 }}
        animate={{ y: 0, opacity: 1, rotateX: 0 }}
        exit={{ y: 20, opacity: 0, rotateX: 90 }}
        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
        className="relative"
      >
        <div className="px-4 py-3 sm:px-6 sm:py-5 md:px-8 md:py-6 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 min-w-[70px] sm:min-w-[90px] md:min-w-[110px]">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-2xl" />
          <div className="relative text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-mono font-black bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 dark:from-blue-400 dark:via-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">
            {pad(value)}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.3 }}
      className="mt-2 text-xs sm:text-sm font-semibold text-white uppercase tracking-wider"
    >
      {label}
    </motion.div>
  </div>
);

const ComingSoonPage = ({ message, launchDate }) => {
  // Default launch: next New Year (Jan 1, 2026 local time)
  const defaultTarget = new Date(2026, 0, 1, 0, 0, 0);
  const targetDate = useRef(launchDate ? new Date(launchDate) : defaultTarget).current;

  const [now, setNow] = useState(Date.now());
  const [launched, setLaunched] = useState(false);
  const [initialTotal, setInitialTotal] = useState(null);

  const defaultMessage = message || 'We are preparing something amazing. Launching soon!';

  useEffect(() => {
    const initial = Math.max(0, Math.floor((targetDate.getTime() - Date.now()) / 1000));
    setInitialTotal(initial || 1);
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [targetDate]);

  useEffect(() => {
    if (now >= targetDate.getTime()) setLaunched(true);
  }, [now, targetDate]);

  const remainingSec = Math.max(0, Math.floor((targetDate.getTime() - now) / 1000));
  const days = Math.floor(remainingSec / 86400);
  const hours = Math.floor((remainingSec % 86400) / 3600);
  const mins = Math.floor((remainingSec % 3600) / 60);
  const secs = remainingSec % 60;

  const elapsed = Math.max(0, (initialTotal - remainingSec) / initialTotal);
  const pct = Math.min(1, Math.max(0, elapsed));

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
                <Rocket size={48} className="sm:w-16 sm:h-16 text-white" strokeWidth={1.5} />
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
              Coming Soon
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

          {!launched ? (
            <>
              {/* Countdown timer */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.8, type: 'spring' }}
                className="flex flex-wrap justify-center gap-3 sm:gap-4 md:gap-6 mb-8 sm:mb-12 px-2"
              >
                <Digit value={days} label="Days" />
                <Digit value={hours} label="Hours" />
                <Digit value={mins} label="Minutes" />
                <Digit value={secs} label="Seconds" />
              </motion.div>

              {/* Notify section */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.2 }}
                className="bg-white/5 backdrop-blur-md rounded-2xl p-6 sm:p-8 border border-white/10 max-w-xl mx-auto"
              >
                <p className="text-sm sm:text-base text-gray-300 text-center mb-2">
                  Want to be notified when we launch?
                </p>
                <p className="text-xs sm:text-sm text-gray-400 text-center">
                  Contact us at{' '}
                  <a
                    href="mailto:thewishtrail@gmail.com"
                    className="text-blue-400 hover:text-blue-300 transition-colors underline decoration-blue-400/30 hover:decoration-blue-300"
                  >
                    thewishtrail@gmail.com
                  </a>
                </p>
              </motion.div>
            </>
          ) : (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200 }}
              className="space-y-6 py-8"
            >
              <motion.div
                animate={{
                  rotate: [0, 10, -10, 10, 0],
                  scale: [1, 1.1, 1, 1.1, 1],
                }}
                transition={{ duration: 0.8, repeat: Infinity, repeatDelay: 2 }}
                className="text-5xl sm:text-6xl md:text-7xl text-center"
              >
                🎉
              </motion.div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-center bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                We&apos;re Live!
              </h2>
              <p className="text-base sm:text-lg text-gray-300 text-center max-w-md mx-auto">
                Thanks for your patience — enjoy exploring WishTrail!
              </p>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => window.location.reload()}
                className="mx-auto block px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold rounded-full shadow-lg hover:shadow-xl transition-all"
              >
                Enter Now
              </motion.button>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default ComingSoonPage;
