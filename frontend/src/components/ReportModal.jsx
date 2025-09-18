import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { lockBodyScroll, unlockBodyScroll } from '../utils/scrollLock'

const REASONS = [
  { value: 'spam', label: 'Spam' },
  { value: 'harassment', label: 'Harassment' },
  { value: 'nudity', label: 'Nudity or sexual content' },
  { value: 'hate', label: 'Hate speech' },
  { value: 'violence', label: 'Violence or dangerous acts' },
  { value: 'self-harm', label: 'Self-harm or suicide' },
  { value: 'misinformation', label: 'Misinformation' },
  { value: 'other', label: 'Other' },
]

const ReportModal = ({ isOpen, onClose, onSubmit, targetLabel = 'content', onReportAndBlock }) => {
  const [reason, setReason] = useState('spam')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!reason) return
    setSubmitting(true)
    try {
      await onSubmit({ reason, description })
      if (onReportAndBlock) {
        // Ask if they also want to block
        if (confirmBlock) {
          await onReportAndBlock()
        }
      }
      onClose()
      setReason('spam')
      setDescription('')
    } finally {
      setSubmitting(false)
    }
  }

  useEffect(() => { if (isOpen) { lockBodyScroll(); return () => unlockBodyScroll(); } return undefined }, [isOpen])
  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[300] bg-black/60 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.98, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.98, opacity: 0 }}
          className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Report {targetLabel}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Tell us what’s wrong. We’ll review your report.</p>
          </div>

          <div className="px-5 py-4 space-y-4">
            <div className="space-y-2">
              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">Reason</div>
              <div className="grid grid-cols-1 gap-2">
                {REASONS.map((r) => (
                  <label key={r.value} className="flex items-center gap-2 text-sm text-gray-800 dark:text-gray-200">
                    <input
                      type="radio"
                      name="report-reason"
                      value={r.value}
                      checked={reason === r.value}
                      onChange={(e) => setReason(e.target.value)}
                      className="h-4 w-4"
                    />
                    {r.label}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">Description (optional)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={`Add any details to help us review this ${targetLabel}.`}
              />
            </div>
          </div>

          <div className="px-5 py-4 border-t border-gray-200 dark:border-gray-800 flex items-center justify-end gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 text-sm">Cancel</button>
            <button onClick={handleSubmit} disabled={submitting} className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm disabled:opacity-60">
              {submitting ? 'Submitting...' : 'Submit report'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export default ReportModal


