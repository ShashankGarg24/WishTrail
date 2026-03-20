import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle } from 'lucide-react'
import { lockBodyScroll, unlockBodyScroll } from '../utils/scrollLock'

const ConfirmActionModal = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm action',
  message = 'Are you sure you want to continue?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isLoading = false
}) => {
  useEffect(() => {
    if (isOpen) {
      lockBodyScroll()
      return () => unlockBodyScroll()
    }
    return undefined
  }, [isOpen])

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[12000] bg-black/60 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.98, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.98, opacity: 0 }}
          className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 overflow-hidden"
          style={{ fontFamily: 'Manrope, ui-sans-serif, system-ui' }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-[#4c99e6]/15 text-[#4c99e6] flex items-center justify-center">
                <AlertTriangle className="h-4 w-4" />
              </span>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{message}</p>
          </div>

          <div className="px-5 py-4 border-t border-gray-200 dark:border-gray-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {cancelText}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isLoading}
              className="px-4 py-2 rounded-lg bg-[#4c99e6] text-white text-sm hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Please wait...' : confirmText}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export default ConfirmActionModal
