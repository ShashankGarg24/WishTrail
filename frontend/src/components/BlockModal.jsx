import { AnimatePresence, motion } from 'framer-motion'

const BlockModal = ({ isOpen, onClose, onConfirm, username = 'this user' }) => {
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
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Block @{username}?</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">They won’t be able to follow or interact with you. You can unblock them later.</p>
          </div>
          <div className="px-5 py-4 border-t border-gray-200 dark:border-gray-800 flex items-center justify-end gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 text-sm">Cancel</button>
            <button onClick={onConfirm} className="px-4 py-2 rounded-lg bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-sm">Block</button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export default BlockModal


