import { X, Trash2, AlertTriangle, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useEffect } from 'react'

const DeleteConfirmModal = ({ isOpen, onClose, onConfirm, goalTitle, isDeleting = false, itemType = 'goal', parentGoals = [] }) => {

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => { document.body.style.overflow = 'unset' }
  }, [isOpen])

  if (!isOpen) return null

  const handleConfirm = async () => {
    await onConfirm()
  }

  const isHabit = itemType === 'habit'
  const itemLabel = isHabit ? 'Habit' : 'Goal'
  const itemLabelLower = itemLabel.toLowerCase()

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{ fontFamily: 'Manrope, ui-sans-serif, system-ui' }}>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/50"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden max-h-[90vh] flex flex-col border border-gray-200 dark:border-gray-700"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-lg font-bold">!</span>
                </div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Delete {itemLabel}
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500 transition-colors"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto flex-1 min-h-0">
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                Are you sure you want to permanently delete this {itemLabelLower}? This action cannot be undone.
              </p>

              {/* Habit: exact design - red warning box */}
              {isHabit && (
                <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm font-bold text-red-700 dark:text-red-300 uppercase tracking-wide mb-2">
                    The following will be deleted:
                  </p>
                  <ul className="text-sm text-red-700 dark:text-red-400 space-y-1 list-disc list-inside">
                    <li>Habit history and statistics</li>
                    <li>Daily logs and completion records</li>
                    <li>Scheduled reminders and alerts</li>
                  </ul>
                </div>
              )}

              {/* Goal: generic list */}
              {!isHabit && goalTitle && (
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg mb-4">
                  <p className="text-sm font-medium text-gray-900 dark:text-white line-clamp-1" title={goalTitle}>
                    &quot;{goalTitle}&quot;
                  </p>
                </div>
              )}

              {!isHabit && (
                <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <p className="text-sm font-medium text-red-900 dark:text-red-300 mb-2">
                    The following will be permanently deleted:
                  </p>
                  <ul className="text-sm text-red-700 dark:text-red-400 space-y-1 ml-4">
                    <li className="flex items-start"><span className="mr-2">•</span><span>The {itemLabelLower} and all its progress</span></li>
                    <li className="flex items-start"><span className="mr-2">•</span><span>All activities and posts related to this {itemLabelLower}</span></li>
                    <li className="flex items-start"><span className="mr-2">•</span><span>All likes and comments</span></li>
                    <li className="flex items-start"><span className="mr-2">•</span><span>Your completion record</span></li>
                  </ul>
                </div>
              )}

              {!isHabit && (
                <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-2">Will be preserved:</p>
                  <ul className="text-sm text-blue-700 dark:text-blue-400 space-y-1 ml-4">
                    <li className="flex items-start"><span className="mr-2">✓</span><span>Linked habits (unlinked only)</span></li>
                    <li className="flex items-start"><span className="mr-2">✓</span><span>Sub-goals (unlinked only)</span></li>
                  </ul>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
              <button
                type="button"
                onClick={onClose}
                disabled={isDeleting}
                className="px-5 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={isDeleting}
                className="px-5 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    <span>Delete {itemLabel}</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

export default DeleteConfirmModal
