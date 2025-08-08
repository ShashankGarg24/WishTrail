import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, RefreshCw } from 'lucide-react'
import GoalSuggestions from './GoalSuggestions'

const GoalSuggestionsModal = ({ isOpen, onClose, interests = [], onSelect, limit = 6, title = 'Goal Suggestions' }) => {
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    if (isOpen) window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  const [shuffleVersion, setShuffleVersion] = useState(0)
  const handleShuffle = () => setShuffleVersion((v) => v + 1)

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 flex items-center justify-center p-4"
        style={{ zIndex: 10000 }}
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto p-4 border border-gray-200 dark:border-gray-700 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h2>
            <div className="flex items-center gap-2">
              <button onClick={handleShuffle} className="text-sm text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 inline-flex items-center gap-1">
                <RefreshCw className="h-4 w-4" /> Shuffle
              </button>
              <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
          </div>
          <div className="mt-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
            Not sure where to start? Pick any idea and customize it. You can always edit or add more goals later.
          </div>
          <GoalSuggestions
            key={shuffleVersion}
            interests={interests}
            onSelect={(g) => { onSelect?.(g); onClose?.() }}
            variant="inline"
            forceExpanded
            showHeader={false}
            limit={limit}
            containerClassName="mt-0"
            innerContainerClassName="w-full"
          />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export default GoalSuggestionsModal 