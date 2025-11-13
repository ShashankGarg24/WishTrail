import { useState, useEffect, lazy, Suspense } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, CheckCircle, Share2, Star } from 'lucide-react'
import { createPortal } from 'react-dom'
const ShareModal = lazy(() => import('./ShareModal'));
import useApiStore from '../store/apiStore'

const CelebrationModal = ({ wish, isOpen, onClose, goalTitle, pointsEarned }) => {
  const {user} = useApiStore()
  const [showQuote, setShowQuote] = useState(false)
  const [currentQuote, setCurrentQuote] = useState('')
  const [isShareModalOpen, setIsShareModalOpen] = useState(false)

  const motivationalQuotes = [
    "The only impossible journey is the one you never begin.\n- Tony Robbins",
    "Success is not final, failure is not fatal: it is the courage to continue that counts.\n- Winston Churchill",
    "Don't watch the clock; do what it does. Keep going.\n- Sam Levenson",
    "The future belongs to those who believe in the beauty of their dreams.\n- Eleanor Roosevelt",
    "It is during our darkest moments that we must focus to see the light.\n- Aristotle",
    "The way to get started is to quit talking and begin doing.\n- Walt Disney",
    "Your limitation—it's only your imagination.",
    "Push yourself, because no one else is going to do it for you.",
    "Great things never come from comfort zones.",
    "Dream it. Wish it. Do it.",
    "Success doesn't just find you. You have to go out and get it.",
    "The harder you work for something, the greater you'll feel when you achieve it.",
    "Dream bigger. Do bigger.",
    "Don't stop when you're tired. Stop when you're done.",
    "Wake up with determination. Go to bed with satisfaction.",
    "Do something today that your future self will thank you for.",
    "Little things make big days.",
    "It's going to be hard, but hard does not mean impossible.",
    "Don't wait for opportunity. Create it.",
    "Sometimes we're tested not to show our weaknesses, but to discover our strengths.",
    "The key to success is to focus on goals, not obstacles.",
    "If you want to achieve greatness, stop asking for permission.",
    "Champions keep playing until they get it right.\n- Billie Jean King",
    "The only person you are destined to become is the person you decide to be.\n- Ralph Waldo Emerson",
    "A goal is a dream with a deadline.\n- Napoleon Hill"
  ]

  useEffect(() => {
    if (isOpen) {
      // Show quote after a short delay
      const timer = setTimeout(() => {
        setShowQuote(true)
        const randomQuote = motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)]
        setCurrentQuote(randomQuote)
      }, 800)
      
      return () => clearTimeout(timer)
    } else {
      setShowQuote(false)
      setCurrentQuote('')
    }
  }, [isOpen])

  const confettiPieces = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    color: ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'][Math.floor(Math.random() * 8)],
    size: Math.random() * 10 + 5,
    delay: Math.random() * 3,
    duration: Math.random() * 3 + 2,
    initialX: Math.random() * 100,
    rotation: Math.random() * 360
  }))

  const handleShare = () => {
    setIsShareModalOpen(true)
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 overflow-hidden"
        style={{ zIndex: 10001 }}
        onClick={onClose}
      >
        {/* Confetti Animation */}
        <div className="absolute inset-0 pointer-events-none">
          {confettiPieces.map((piece) => (
            <motion.div
              key={piece.id}
              className="absolute"
              style={{
                left: `${piece.initialX}%`,
                top: '-10px',
                width: `${piece.size}px`,
                height: `${piece.size}px`,
                backgroundColor: piece.color,
                borderRadius: Math.random() > 0.5 ? '50%' : '0%',
              }}
              initial={{ 
                y: -10, 
                opacity: 0, 
                rotate: 0,
                scale: 0 
              }}
              animate={{ 
                y: window.innerHeight + 100, 
                opacity: [0, 1, 1, 0],
                rotate: piece.rotation,
                scale: [0, 1, 1, 0],
                x: [0, Math.random() * 100 - 50, Math.random() * 100 - 50]
              }}
              transition={{
                duration: piece.duration,
                delay: piece.delay,
                ease: "easeOut",
                repeat: Infinity,
                repeatDelay: 2
              }}
            />
          ))}
        </div>

        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white dark:bg-gray-800 p-8 rounded-2xl max-w-md w-full relative shadow-2xl border border-gray-200 dark:border-gray-700"
          onClick={(e) => e.stopPropagation()}
          style={{ zIndex: 10002 }}
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>

          {/* Goal Achieved Header */}
          <div className="text-center mb-6">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
              className="inline-flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full mb-4"
            >
              <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
            </motion.div>
            
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-2xl font-bold text-gray-900 dark:text-white mb-4"
            >
              Goal Achieved!
            </motion.h2>
            
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-lg font-medium text-gray-800 dark:text-gray-200"
            >
              "{goalTitle}"
            </motion.p>
          </div>

          {/* Points Display */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4, type: "spring" }}
            className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-700 mb-6"
          >
            <div className="flex items-center justify-center space-x-2">
              <Star className="h-5 w-5 text-yellow-500" />
              <span className="text-lg font-bold text-gray-900 dark:text-white">
                +{pointsEarned} Points Earned!
              </span>
              <Star className="h-5 w-5 text-yellow-500" />
            </div>
          </motion.div>

          {/* Quote */}
          <AnimatePresence>
            {showQuote && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: 0.5 }}
                className="mb-8 text-center"
              >
                <p className="text-gray-600 dark:text-gray-400 italic text-sm leading-relaxed">
                  "{currentQuote}"
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Buttons */}
          <div className="space-y-3">
                         <motion.button
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: 0.6 }}
               onClick={onClose}
               className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl"
             >
               Continue Your Journey! 🚀
             </motion.button>
             
             <motion.button
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: 0.7 }}
               onClick={handleShare}
               className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold py-3 px-6 rounded-lg transition-all duration-300 hover:bg-gray-50 dark:hover:bg-gray-600 shadow-sm hover:shadow-md flex items-center justify-center space-x-2"
             >
               <Share2 className="h-4 w-4" />
               <span>Share Achievement</span>
             </motion.button>
          </div>
        {/* Share Modal - Rendered at document body level */}
        {isShareModalOpen && createPortal(
          <Suspense fallback={null}>
          <ShareModal
            isOpen={isShareModalOpen}
            onClose={() => setIsShareModalOpen(false)}
            goal={wish}
            user={user}
          /></Suspense>,
          document.body
        )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export default CelebrationModal 