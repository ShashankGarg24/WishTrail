import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, RefreshCw } from 'lucide-react'
import GoalSuggestions, { ALL_GOAL_CATEGORIES } from './GoalSuggestions'
import { lockBodyScroll, unlockBodyScroll } from '../utils/scrollLock'

const THEME_COLOR = '#4c99e6'

const GoalSuggestionsModal = ({ isOpen, onClose, interests = [], onSelect, onCreate, limit = 6, title = 'Goal Suggestions' }) => {
  useEffect(() => {
    if (!isOpen) return
    const handler = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  const [shuffleVersion, setShuffleVersion] = useState(0)
  const [selectedCategory, setSelectedCategory] = useState('all')
  const handleShuffle = () => setShuffleVersion((v) => v + 1)

  useEffect(() => { if (isOpen) { lockBodyScroll(); return () => unlockBodyScroll(); } }, [isOpen])

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 flex items-center justify-center p-4"
        style={{ zIndex: 10000, fontFamily: 'Manrope' }}
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-5xl max-h-[90vh] sm:max-h-[85vh] overflow-hidden flex flex-col border border-gray-200 dark:border-gray-800 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
          style={{ fontFamily: 'Manrope' }}
        >
          <div className="overflow-y-auto p-4 sm:p-6 flex-1 scrollbar-hide">
            <div className="flex items-start justify-between gap-3 mb-2">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white" style={{ fontFamily: 'Manrope' }}>{title}</h2>
              <div className="flex items-center gap-2 sm:gap-3">
                <button onClick={handleShuffle} aria-label="Refresh suggestions" className="p-2 sm:p-2.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors" style={{ color: THEME_COLOR }}>
                  <RefreshCw className="h-5 w-5 sm:h-6 sm:w-6" />
                </button>
                <button onClick={onClose} aria-label="Close" className="p-2 sm:p-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                  <X className="h-5 w-5 sm:h-6 sm:w-6 text-gray-500" />
                </button>
              </div>
            </div>
            <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-3" style={{ fontFamily: 'Manrope' }}>
              Not sure where to start? Pick any idea and customize it. You can always edit or add more goals later.
            </div>
            <div className="flex gap-2 overflow-x-auto pb-3 mb-3 scrollbar-hide" aria-label="Goal categories">
              {['all', ...ALL_GOAL_CATEGORIES].map((category) => {
                const active = selectedCategory === category
                return <button key={category} type="button" onClick={() => setSelectedCategory(category)} className="flex-none px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wide transition-colors" style={active ? { color: 'white', backgroundColor: THEME_COLOR } : { color: '#4b5563', backgroundColor: '#f3f4f6' }}>{category === 'all' ? 'All' : category}</button>
              })}
            </div>
            <GoalSuggestions
              key={`${selectedCategory}-${shuffleVersion}`}
              interests={interests}
              category={selectedCategory}
              onSelect={(g) => { onSelect?.(g); onClose?.() }}
              onCreate={onCreate}
              variant="inline"
              forceExpanded
              showHeader={false}
              limit={limit}
              containerClassName="mt-0"
              innerContainerClassName="w-full"
            />
          </div>

          {/* Footer */}
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-200 dark:border-gray-800 flex-shrink-0 text-center">
            <div className="max-w-full mx-auto">
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400" style={{ fontFamily: 'Manrope' }}>
                Can't find what you're looking for?{' '}
                <button onClick={() => onCreate?.()} className="font-semibold transition-opacity hover:opacity-80" style={{ color: THEME_COLOR, fontFamily: 'Manrope' }}>
                  Create from scratch
                </button>
              </p>
            </div>
          </div>
      </motion.div>
    </motion.div>
    </AnimatePresence>
  )
}

export default GoalSuggestionsModal
