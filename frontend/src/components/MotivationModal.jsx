import { motion, AnimatePresence } from 'framer-motion'
import { X, Star, Sparkles, Heart, Zap, Target } from 'lucide-react'
import { useState, useEffect } from 'react'

const motivationalQuotes = [
  { text: "Every journey begins with a single step", icon: Target },
  { text: "Your dreams are worth the effort", icon: Star },
  { text: "Progress, not perfection", icon: Zap },
  { text: "You are capable of amazing things", icon: Sparkles },
  { text: "Small steps lead to big changes", icon: Heart },
  { text: "Believe in your journey", icon: Star },
  { text: "Your future self will thank you", icon: Target },
  { text: "Make today count", icon: Zap },
  { text: "You've got this!", icon: Sparkles },
  { text: "Keep moving forward", icon: Heart },
  { text: "Your potential is limitless", icon: Star },
  { text: "Dream big, start small", icon: Target },
  { text: "Consistency creates miracles", icon: Zap },
  { text: "You are stronger than you think", icon: Sparkles },
  { text: "Every day is a new opportunity", icon: Heart },
  { text: "Success is built one day at a time", icon: Target },
  { text: "Your goals are waiting for you", icon: Star },
  { text: "Embrace the challenge", icon: Zap },
  { text: "You are making progress", icon: Sparkles },
  { text: "Keep chasing your dreams", icon: Heart },
]

const MotivationModal = ({ isOpen, onClose }) => {
  const [motivation, setMotivation] = useState(null)

  useEffect(() => {
    if (isOpen) {
      // Pick a random motivation
      const randomMotivation = motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)]
      setMotivation(randomMotivation)
    }
  }, [isOpen])

  if (!motivation) return null

  const IconComponent = motivation.icon

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 20 }}
            transition={{ 
              type: "spring",
              stiffness: 300,
              damping: 25
            }}
            onClick={(e) => e.stopPropagation()}
            className="relative bg-gradient-to-br from-purple-50 via-white to-blue-50 dark:from-gray-800 dark:via-gray-800 dark:to-purple-900/30 rounded-3xl shadow-2xl max-w-md w-full p-8 overflow-hidden"
          >
            {/* Animated background stars */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {[...Array(8)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ 
                    opacity: [0, 1, 0],
                    scale: [0, 1, 0],
                    x: [0, Math.random() * 100 - 50],
                    y: [0, Math.random() * 100 - 50]
                  }}
                  transition={{
                    duration: 2,
                    delay: i * 0.15,
                    repeat: Infinity,
                    repeatDelay: 3
                  }}
                  className="absolute"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                  }}
                >
                  <Sparkles className="h-3 w-3 text-purple-400 dark:text-purple-300" />
                </motion.div>
              ))}
            </div>

            {/* Main content */}
            <div className="relative z-10 flex flex-col items-center text-center space-y-6">
              {/* Icon animation */}
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ 
                  type: "spring",
                  stiffness: 200,
                  damping: 15,
                  delay: 0.1
                }}
              >
                <motion.div
                  animate={{ 
                    rotate: [0, 5, -5, 0],
                    scale: [1, 1.05, 1]
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    repeatType: "reverse"
                  }}
                  className="p-6 bg-gradient-to-br from-purple-400 to-blue-500 rounded-full shadow-lg"
                >
                  <IconComponent className="h-12 w-12 text-white" />
                </motion.div>
              </motion.div>

              {/* Quote with staggered word animation */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                className="space-y-2"
              >
                <motion.h3 
                  className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-purple-600 dark:from-purple-400 dark:via-blue-400 dark:to-purple-400 bg-clip-text text-transparent"
                  animate={{ 
                    backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "linear"
                  }}
                  style={{
                    backgroundSize: '200% 200%'
                  }}
                >
                  {motivation.text}
                </motion.h3>
                
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.5, type: "spring" }}
                  className="flex items-center justify-center gap-1"
                >
                  {[...Array(3)].map((_, i) => (
                    <motion.div
                      key={i}
                      animate={{ 
                        y: [0, -8, 0],
                      }}
                      transition={{
                        duration: 1,
                        delay: 0.6 + i * 0.1,
                        repeat: Infinity,
                        repeatDelay: 2
                      }}
                    >
                      <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                    </motion.div>
                  ))}
                </motion.div>
              </motion.div>

              {/* CTA Button */}
              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onClose}
                className="px-8 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold rounded-full shadow-lg hover:shadow-xl transition-all duration-200"
              >
                Let's Go!
              </motion.button>
            </div>

            {/* Decorative gradient orbs */}
            <div className="absolute -top-10 -left-10 w-40 h-40 bg-purple-300 dark:bg-purple-500 rounded-full blur-3xl opacity-20 pointer-events-none" />
            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-blue-300 dark:bg-blue-500 rounded-full blur-3xl opacity-20 pointer-events-none" />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default MotivationModal
