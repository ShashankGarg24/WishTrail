import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import useApiStore from '../store/apiStore'

const WhatsNewPage = () => {
  const navigate = useNavigate()
  const { isAuthenticated } = useApiStore()
  const [updates, setUpdates] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/auth')
      return
    }

    const fetchUpdates = async () => {
      try {
        setLoading(true)
        const response = await useApiStore.getState().getAllProductUpdates({ limit: 100, page: 1 })
        if (response.success) {
          setUpdates(response.updates || [])
        } else {
          setError(response.error || 'Failed to fetch updates')
        }
      } catch (err) {
        setError(err.message || 'Failed to fetch updates')
      } finally {
        setLoading(false)
      }
    }

    fetchUpdates()
  }, [isAuthenticated, navigate])

  // Group updates by month
  const groupedUpdates = updates.reduce((acc, update) => {
    const date = new Date(update.createdAt)
    const key = date.toLocaleString('en-US', { month: 'long', year: 'numeric' })
    if (!acc[key]) {
      acc[key] = []
    }
    acc[key].push(update)
    return acc
  }, {})

  // Sort months in reverse chronological order
  const sortedMonths = Object.keys(groupedUpdates).sort((a, b) => {
    const dateA = new Date(a)
    const dateB = new Date(b)
    return dateB - dateA
  })

  const typeBadgeColors = {
    feature: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-100',
    enhancement: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-100',
    bug_fix: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-100'
  }

  const releaseBadgeColors = {
    major: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-100',
    minor: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200'
  }

  const formatUpdateDate = (value) => {
    if (!value) return ''
    return new Date(value).toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  const formatTypeLabel = (type) => {
    if (!type) return 'Feature'
    return type
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ')
  }

  return (
    <div className="min-h-screen bg-[#f5f5f5] dark:bg-gray-900 transition-colors">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Header */}
        <div className="mb-12 text-center">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <div className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900 mb-4">
              <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-200" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
              What’s New on WishTrail
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Follow our journey as we build the best tools for your personal growth.
            </p>
          </motion.div>

        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4c99e6]"></div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center"
          >
            <p className="text-red-600 dark:text-red-400 font-medium">{error}</p>
          </motion.div>
        )}

        {/* Updates Timeline */}
        {!loading && !error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="space-y-12"
          >
            {sortedMonths.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 dark:text-gray-400 text-lg">
                  No updates yet. Check back soon!
                </p>
              </div>
            ) : (
              sortedMonths.map((month, monthIdx) => {
                const monthUpdates = groupedUpdates[month]
                if (monthUpdates.length === 0) return null

                return (
                  <motion.div
                    key={month}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: monthIdx * 0.1 }}
                    className="relative pl-7"
                  >
                    <div className="absolute left-0 top-2 bottom-0 w-px bg-gray-200 dark:bg-gray-700" />
                    <div className="absolute left-[-4px] top-2 w-2 h-2 rounded-full bg-[#4c99e6]" />

                    {/* Month Label */}
                    <div className="mb-5">
                      <h2 className="text-[11px] sm:text-xs font-semibold tracking-[0.14em] uppercase text-[#4c99e6] dark:text-blue-300">
                        {month}
                      </h2>
                    </div>

                    {/* Updates for this month */}
                    <div className="space-y-5">
                      {monthUpdates.map((update, idx) => (
                        <motion.div
                          key={update.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          className="group bg-white dark:bg-gray-800 rounded-2xl p-5 sm:p-6 border border-gray-200 dark:border-gray-700"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                  {update.title}
                                </h3>
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                                    update.isMajor ? releaseBadgeColors.major : releaseBadgeColors.minor
                                  }`}
                                >
                                  {update.isMajor ? 'Major' : 'Minor'}
                                </span>
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                                    typeBadgeColors[update.type] || typeBadgeColors.feature
                                  }`}
                                >
                                  {formatTypeLabel(update.type)}
                                </span>
                              </div>

                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {formatUpdateDate(update.createdAt)}
                              </p>
                            </div>

                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                              v{update.version}
                            </p>

                            <p className="text-gray-700 dark:text-gray-300 text-sm leading-7 whitespace-pre-line">
                              {update.description}
                            </p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )
              })
            )}
          </motion.div>
        )}
      </div>
    </div>
  )
}

export default WhatsNewPage
