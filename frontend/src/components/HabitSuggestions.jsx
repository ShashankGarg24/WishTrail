    import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Tag, Lightbulb, RefreshCw, Calendar, Activity, BookOpen, Compass, Code, Heart } from 'lucide-react'
import { discoverHabitIdeas } from '../services/habitIdeas'

const THEME_COLOR = '#4c99e6'

// variant: 'empty' | 'inline'
const HabitSuggestions = ({ interests = [], onSelect, onCreate, variant = 'inline', limit = 6, forceExpanded = false, showHeader = true, titleOverride, containerClassName = 'mt-10', innerContainerClassName = 'max-w-5xl mx-auto' }) => {
  const [expanded, setExpanded] = useState(forceExpanded || variant === 'empty')
  const [suggestions, setSuggestions] = useState([])
  const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  const getCategoryIcon = (category) => {
    const iconMap = {
      'Health & Fitness': <Activity className="h-5 w-5" />,
      'Education & Learning': <BookOpen className="h-5 w-5" />,
      'Travel & Adventure': <Compass className="h-5 w-5" />,
      'Career & Business': <Code className="h-5 w-5" />,
      'Relationships': <Heart className="h-5 w-5" />,
      'Creative Projects': <Lightbulb className="h-5 w-5" />,
    }
    return iconMap[category] || <Lightbulb className="h-5 w-5" />
  }

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
        <div className="border border-gray-200 dark:border-gray-700 rounded-2xl p-6 flex items-center justify-between bg-white dark:bg-gray-800/50 hover:shadow-lg transition-all">
          <div className="flex items-start space-x-3">
            <div className="rounded-full p-2 mt-1" style={{ backgroundColor: `${THEME_COLOR}15` }}>
              <Lightbulb className="h-5 w-5" style={{ color: THEME_COLOR }} />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <Sparkles className="h-4 w-4" style={{ color: THEME_COLOR }} />
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white" style={{ fontFamily: 'Manrope' }}>Discover habit ideas</h4>
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-sm mt-1" style={{ fontFamily: 'Manrope' }}>
                Get simple, high-impact habits {interests?.length ? 'in your favorite areas' : 'across popular categories'} to kickstart consistency.
              </p>
            </div>
          </div>
          <button onClick={() => setExpanded(true)} className="px-4 py-2 text-sm font-medium text-white rounded-lg hover:opacity-90 transition-all" style={{ backgroundColor: THEME_COLOR, fontFamily: 'Manrope' }}>Explore Suggestions</button>
        </div>
      </div>
    )
  }

  return (
    <div id="suggested-habits" className={containerClassName}>
      <div className={`${innerContainerClassName} flex flex-col h-full`}>
      {showHeader && (
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Sparkles className="h-5 w-5 mr-2" style={{ color: THEME_COLOR }} />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white" style={{ fontFamily: 'Manrope' }}>
              {titleOverride || (variant === 'empty' ? 'Suggested Habits to Get You Started' : 'Habit Suggestions')}
            </h3>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={regenerate} className="text-sm font-medium inline-flex items-center gap-2 px-3 py-2 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-700" style={{ color: THEME_COLOR, fontFamily: 'Manrope' }}>
              <RefreshCw className="h-4 w-4" /> Shuffle
            </button>
            {!forceExpanded && variant === 'inline' && (
              <button onClick={() => setExpanded(false)} className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200" style={{ fontFamily: 'Manrope' }}>
                Hide
              </button>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 flex-1">
        <AnimatePresence initial={false}>
          {suggestions.map((h, idx) => (
            <motion.div
              key={`${h.name}-${idx}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25, delay: Math.min(idx * 0.04, 0.25) }}
              className="bg-white dark:bg-gray-700/30 rounded-xl border border-gray-200 dark:border-gray-600 p-4 flex flex-col hover:shadow-lg transition-all"
            >
              <div className="flex items-start gap-3 mb-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${THEME_COLOR}15` }}
                >
                  <div style={{ color: THEME_COLOR }}>
                    {getCategoryIcon(h.category)}
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide" style={{ fontFamily: 'Manrope' }}>
                    {h.frequency === 'weekly' ? 'Weekly' : 'Daily'}
                  </p>
                  <h3 className="font-bold text-gray-900 dark:text-white mt-0.5" style={{ fontFamily: 'Manrope' }}>{h.name}</h3>
                </div>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 flex-1 mb-4" style={{ fontFamily: 'Manrope' }}>
                {h.description}
              </p>
              <button 
                onClick={() => onSelect?.(h)} 
                className="w-full py-2.5 rounded-lg text-white text-sm font-medium transition-opacity hover:opacity-90"
                style={{ backgroundColor: THEME_COLOR, fontFamily: 'Manrope' }}
              >
                Use this habit
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  </div>
  )
}
export default HabitSuggestions
