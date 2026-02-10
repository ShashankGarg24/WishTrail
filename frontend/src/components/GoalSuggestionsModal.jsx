import { lazy, Suspense, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, RefreshCw } from 'lucide-react'
const GoalSuggestions = lazy(() => import('./GoalSuggestions'));
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
          className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-5xl max-h-[85vh] overflow-hidden flex flex-col border border-gray-200 dark:border-gray-800 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
          style={{ fontFamily: 'Manrope' }}
        >
          <div className="overflow-y-auto p-6 flex-1 scrollbar-hide">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white" style={{ fontFamily: 'Manrope' }}>{title}</h2>
              <div className="flex items-center gap-3">
                <button onClick={handleShuffle} className="text-sm text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 inline-flex items-center gap-1" style={{ fontFamily: 'Manrope' }}>
                  <RefreshCw className="h-4 w-4" /> Shuffle
                </button>
                <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>
            </div>
            <div className="mt-2 text-sm text-gray-600 dark:text-gray-400 mb-6" style={{ fontFamily: 'Manrope' }}>
              Not sure where to start? Pick any idea and customize it. You can always edit or add more goals later.
            </div>
            <Suspense fallback={null}><GoalSuggestions
              key={shuffleVersion}
              interests={interests}
              onSelect={(g) => { onSelect?.(g); onClose?.() }}
              onCreate={onCreate}
              variant="inline"
              forceExpanded
              showHeader={false}
              limit={limit}
              containerClassName="mt-0"
              innerContainerClassName="w-full"
            /></Suspense>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800 flex-shrink-0 text-center">
            <div className="max-w-full mx-auto">
              <p className="text-sm text-gray-500 dark:text-gray-400" style={{ fontFamily: 'Manrope' }}>
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