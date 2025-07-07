import { useState } from 'react'
import { motion } from 'framer-motion'
import { X, CheckCircle, AlertCircle, FileText } from 'lucide-react'
import useApiStore from '../store/apiStore'
import CelebrationModal from './CelebrationModal'

const CompletionModal = ({ isOpen, onClose, onComplete, goalTitle, goal }) => {
  const [completionNote, setCompletionNote] = useState('')
  const [error, setError] = useState('')
  const [showCelebration, setShowCelebration] = useState(false)
  const { loading } = useApiStore()

  const validateNote = (note) => {
    const wordCount = note.trim().split(/\s+/).filter(word => word.length > 0).length
    return wordCount >= 10
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateNote(completionNote)) {
      setError('Please add at least 10 words describing what you actually did')
      return
    }

    try {
      await onComplete(completionNote.trim())
      setCompletionNote('')
      setError('')
      
      // Show celebration instead of closing immediately
      setShowCelebration(true)
    } catch (err) {
      setError('Failed to complete goal. Please try again.')
    }
  }

  const handleClose = () => {
    setCompletionNote('')
    setError('')
    setShowCelebration(false)
    onClose()
  }

  const handleCelebrationClose = () => {
    setShowCelebration(false)
    onClose()
  }

  const wordCount = completionNote.trim().split(/\s+/).filter(word => word.length > 0).length

  if (!isOpen) return null

  // Show celebration modal after completion
  if (showCelebration) {
    return (
      <CelebrationModal
        isOpen={showCelebration}
        onClose={handleCelebrationClose}
        goalTitle={goalTitle}
        pointsEarned={goal?.points || 0}
      />
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4"
      style={{ zIndex: 9999 }}
      onClick={handleClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white dark:bg-gray-800 p-6 rounded-2xl max-w-md w-full max-h-[85vh] overflow-y-auto relative shadow-2xl border border-gray-200 dark:border-gray-700"
        onClick={(e) => e.stopPropagation()}
        style={{ zIndex: 10000 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-6 w-6 text-green-500" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Complete Goal
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Goal Title */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            "{goalTitle}"
          </h3>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Congratulations! Tell us what you actually did to achieve this goal.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Completion Note */}
          <div>
            <label htmlFor="completionNote" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              What did you do? <span className="text-red-500">*</span>
            </label>
            <textarea
              id="completionNote"
              value={completionNote}
              onChange={(e) => setCompletionNote(e.target.value)}
              placeholder="Describe what you actually did to achieve this goal..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white resize-none"
              rows={4}
              required
            />
            <div className="flex items-center justify-between mt-2 text-xs">
              <span className={`${
                wordCount >= 10 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'
              }`}>
                {wordCount >= 10 ? (
                  <span className="flex items-center">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Looks good!
                  </span>
                ) : (
                  <span className="flex items-center">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    At least 10 words required
                  </span>
                )}
              </span>
              <span className="text-gray-500 dark:text-gray-400">
                {wordCount} words
              </span>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center space-x-2 text-red-600 dark:text-red-400 text-sm">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 py-2 px-4 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2 px-4 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              disabled={!validateNote(completionNote) || loading}
            >
              {loading ? 'Completing...' : 'Complete Goal'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}

export default CompletionModal 