import { useEffect, useState } from 'react'
import { X, RefreshCw, Phone, Activity, Music, Moon, TreePine, Utensils, Heart, Briefcase, Lightbulb, DollarSign, BookOpen, Palette } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { discoverHabitIdeas } from '../services/habitIdeas'
import { lockBodyScroll, unlockBodyScroll } from '../utils/scrollLock'

const THEME_COLOR = '#4c99e6'

const CATEGORY_ICONS = {
  fitness: Activity,
  health: Heart,
  productivity: Briefcase,
  mindfulness: Moon,
  learning: BookOpen,
  nutrition: Utensils,
  finance: DollarSign,
  relationships: Phone,
  career: Briefcase,
  creativity: Palette,
  wellness: TreePine,
}

const CATEGORY_LABELS = {
  fitness: 'ACTIVE',
  health: 'WELLNESS',
  productivity: 'PRODUCTIVITY',
  mindfulness: 'MINDFULNESS',
  learning: 'SKILLS',
  nutrition: 'NUTRITION',
  finance: 'FINANCE',
  relationships: 'SOCIAL',
  career: 'CAREER',
  creativity: 'CREATIVE',
  wellness: 'NATURE',
}

function getCategoryIcon(category) {
  const c = (category || '').toLowerCase()
  return CATEGORY_ICONS[c] || Lightbulb
}

function getCategoryLabel(category) {
  const c = (category || '').toLowerCase()
  return CATEGORY_LABELS[c] || (c ? c.toUpperCase() : 'HABIT')
}

const HabitSuggestionsModal = ({ isOpen, onClose, interests = [], onSelect, limit = 6, title = 'Habit Suggestions' }) => {
  const [suggestions, setSuggestions] = useState([])
  const [shuffleVersion, setShuffleVersion] = useState(0)

  useEffect(() => {
    if (!isOpen) return
    lockBodyScroll()
    return () => unlockBodyScroll()
  }, [isOpen])

  useEffect(() => {
    if (isOpen) {
      setSuggestions(discoverHabitIdeas(interests, limit))
    }
  }, [isOpen, interests, limit, shuffleVersion])

  const handleShuffle = () => {
    setShuffleVersion((v) => v + 1)
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[200] flex items-center justify-center p-4"
        style={{ fontFamily: 'Manrope, ui-sans-serif, system-ui' }}
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/50"
          onClick={onClose}
        />
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="relative bg-white dark:bg-gray-800 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col border border-gray-200 dark:border-gray-700 shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between flex-shrink-0">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Pick a habit idea and customize the details. You can always edit later.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleShuffle}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{ color: THEME_COLOR }}
              >
                <RefreshCw className="h-4 w-4" /> Shuffle
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Cards grid */}
          <div className="flex-1 overflow-y-auto px-6 py-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {suggestions.map((h, idx) => {
                const Icon = getCategoryIcon(h.category)
                const categoryLabel = getCategoryLabel(h.category)
                return (
                  <motion.div
                    key={`${h.name}-${idx}-${shuffleVersion}`}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: idx * 0.03 }}
                    className="bg-white dark:bg-gray-700/30 rounded-xl border border-gray-200 dark:border-gray-600 p-4 flex flex-col"
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: 'rgba(76, 153, 230, 0.15)' }}
                      >
                        <Icon className="h-5 w-5" style={{ color: THEME_COLOR }} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                          {categoryLabel}
                        </p>
                        <h3 className="font-bold text-gray-900 dark:text-white mt-0.5">{h.name}</h3>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 flex-1 mb-4">
                      {h.description}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        onSelect?.(h)
                        onClose?.()
                      }}
                      className="w-full py-2.5 rounded-lg text-white text-sm font-medium transition-opacity hover:opacity-90"
                      style={{ backgroundColor: THEME_COLOR }}
                    >
                      Use this habit
                    </button>
                  </motion.div>
                )
              })}
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 flex-shrink-0 text-center">
            <button
              type="button"
              onClick={onClose}
              className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            >
              View full catalog
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

export default HabitSuggestionsModal
