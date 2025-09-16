    import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Tag, Lightbulb, RefreshCw, Calendar } from 'lucide-react'
import { discoverHabitIdeas } from '../services/habitIdeas'

// variant: 'empty' | 'inline'
const HabitSuggestions = ({ interests = [], onSelect, variant = 'inline', limit = 6, forceExpanded = false, showHeader = true, titleOverride, containerClassName = 'mt-10', innerContainerClassName = 'max-w-5xl mx-auto' }) => {
  const [expanded, setExpanded] = useState(forceExpanded || variant === 'empty')
  const [suggestions, setSuggestions] = useState([])

  const regenerate = () => {
    setSuggestions(discoverHabitIdeas(interests, limit))
  }

  useEffect(() => {
    regenerate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(interests), limit])

  if (!forceExpanded && variant === 'inline' && !expanded) {
    return (
      <div id="suggested-habits" className={containerClassName}>
        <div className="glass-card-hover border border-gray-200 dark:border-gray-700 rounded-2xl p-6 flex items-center justify-between">
          <div className="flex items-start space-x-3">
            <div className="bg-primary-500/10 text-primary-600 dark:text-primary-400 rounded-full p-2 mt-1">
              <Lightbulb className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <Sparkles className="h-4 w-4 text-primary-500" />
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Discover habit ideas</h4>
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                Get simple, high-impact habits {interests?.length ? 'in your favorite areas' : 'across popular categories'} to kickstart consistency.
              </p>
            </div>
          </div>
          <button onClick={() => setExpanded(true)} className="btn-primary px-4 py-2 text-sm">Explore Suggestions</button>
        </div>
      </div>
    )
  }

  return (
    <div id="suggested-habits" className={containerClassName}>
      <div className={innerContainerClassName}>
      {showHeader && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Sparkles className="h-5 w-5 text-primary-500 mr-2" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              {titleOverride || (variant === 'empty' ? 'Suggested Habits to Get You Started' : 'Habit Suggestions')}
            </h3>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={regenerate} className="text-sm text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 inline-flex items-center gap-1">
              <RefreshCw className="h-4 w-4" /> Shuffle
            </button>
            {!forceExpanded && variant === 'inline' && (
              <button onClick={() => setExpanded(false)} className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200">
                Hide
              </button>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 gap-4">
        <AnimatePresence initial={false}>
          {suggestions.map((h, idx) => (
            <motion.div
              key={`${h.name}-${idx}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25, delay: Math.min(idx * 0.04, 0.25) }}
              className="glass-card-hover p-4 rounded-xl border border-gray-200 dark:border-gray-700"
            >
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 flex items-center">
                <Tag className="h-3 w-3 mr-1" /> Habit
              </div>
              <div className="font-semibold text-gray-900 dark:text-white">{h.name}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">{h.description}</div>
              <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                <Calendar className="h-3 w-3" /> {h.frequency === 'weekly' ? 'Weekly' : 'Daily'}
                {Array.isArray(h.daysOfWeek) && h.daysOfWeek.length > 0 && (
                  <span>(days: {h.daysOfWeek.join(',')})</span>
                )}
              </div>
              <div className="mt-3">
                <button onClick={() => onSelect?.(h)} className="btn-primary text-sm px-3 py-1">Use this habit</button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {variant === 'empty' && (
        <div className="mt-6 text-sm text-gray-600 dark:text-gray-400">
          Not sure where to start? Pick any idea and customize it. You can always edit or add more habits later.
        </div>
      )}
    </div>
  </div>
  )
}

export default HabitSuggestions
