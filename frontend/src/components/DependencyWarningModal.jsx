import { X, AlertTriangle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useEffect } from 'react'

const DependencyWarningModal = ({ isOpen, onClose, onContinue, itemTitle, itemType = 'goal', parentGoals = [] }) => {
  // Prevent background scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  if (!isOpen) return null

  const isHabit = itemType === 'habit'
  const itemLabel = isHabit ? 'Habit' : 'Goal'
  const itemLabelLower = itemLabel.toLowerCase()

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-md max-h-[85vh] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-full">
                  <AlertTriangle className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Dependency Warning
                </h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
              >
                <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto flex-1 min-h-0">
              {itemTitle && (
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg mb-4">
                  <p className="text-sm font-medium text-gray-900 dark:text-white line-clamp-1" title={itemTitle}>
                    "{itemTitle}"
                  </p>
                </div>
              )}
              
              {/* Parent Goals Warning */}
              <div className="mb-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border-2 border-yellow-200 dark:border-yellow-800">
                <p className="text-sm font-semibold text-yellow-900 dark:text-yellow-300 mb-2 flex items-center">
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  This {itemLabelLower} is linked to other goals
                </p>
                <p className="text-sm text-yellow-800 dark:text-yellow-400 mb-2">
                  This {itemLabelLower} is currently part of the following goal{parentGoals.length > 1 ? 's' : ''}:
                </p>
                <ul className="text-sm text-yellow-700 dark:text-yellow-400 space-y-1 ml-4 mb-3">
                  {parentGoals.map(parent => (
                    <li key={parent.id} className="flex items-start">
                      <span className="mr-2 flex-shrink-0">→</span>
                      <span className="font-medium line-clamp-1" title={parent.title}>{parent.title}</span>
                    </li>
                  ))}
                </ul>
                <p className="text-sm font-medium text-yellow-900 dark:text-yellow-300">
                  Deleting this will remove it from {parentGoals.length > 1 ? 'these goals' : 'this goal'} and automatically adjust the remaining contributions.
                </p>
              </div>

              <p className="text-sm text-gray-600 dark:text-gray-400">
                Do you want to proceed with deletion?
              </p>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end space-x-3 p-6 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={onContinue}
                className="px-4 py-2 text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700 rounded-lg transition-colors"
              >
                Continue to Delete
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

export default DependencyWarningModal
