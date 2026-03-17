import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import useApiStore from '../store/apiStore'

const WhatsNewModal = ({ isOpen, onClose }) => {
  const navigate = useNavigate()
  const { latestProductUpdate, markProductUpdateAsSeen } = useApiStore()
  const [isClosing, setIsClosing] = useState(false)

  useEffect(() => {
    const isModalVisible = isOpen && !isClosing && !!latestProductUpdate
    if (!isModalVisible) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [isOpen, isClosing, latestProductUpdate])

  if (!latestProductUpdate) {
    return null
  }

  const update = latestProductUpdate

  const handleDismiss = async () => {
    setIsClosing(true)
    try {
      await markProductUpdateAsSeen(update.version)
    } catch (err) {
      console.error('Failed to mark update as seen:', err)
    } finally {
      setIsClosing(false)
      onClose?.()
    }
  }

  const handleViewAll = async () => {
    setIsClosing(true)
    try {
      await markProductUpdateAsSeen(update.version)
    } catch (err) {
      console.error('Failed to mark update as seen:', err)
    } finally {
      setIsClosing(false)
      navigate('/whats-new')
      onClose?.()
    }
  }

  return (
    <AnimatePresence>
      {isOpen && !isClosing && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleDismiss}
            className="fixed inset-0 bg-black/50 z-40"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0"
          >
            <div className="relative w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden">
              <button
                onClick={handleDismiss}
                aria-label="Close"
                className="absolute top-4 right-4 h-10 w-10 rounded-full flex items-center justify-center text-2xl leading-none text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                ×
              </button>

              {/* Content */}
              <div className="p-8 sm:p-10">
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2 text-center">
                  🎉 What's New
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 text-center mb-6 font-medium">
                  v{update.version}
                </p>

                <h2 className="text-xl sm:text-xl mb-4 font-bold text-gray-900 dark:text-white">
                    {update.title}
                </h2>

                {/* Description */}
                <div className="max-h-56 overflow-y-auto mb-8 pr-1">
                  <p className="text-gray-700 dark:text-gray-300 text-left leading-relaxed whitespace-pre-line">
                    {update.description}
                  </p>
                </div>

                {/* Buttons */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="flex flex-col sm:flex-row gap-3"
                >
                  <button
                    onClick={handleDismiss}
                    className="flex-1 px-4 py-3 rounded-lg font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    Got it
                  </button>
                  <button
                    onClick={handleViewAll}
                    className="flex-1 px-4 py-3 rounded-lg font-medium text-white bg-[#4c99e6] hover:bg-[#3d7ec5] transition-colors shadow-lg hover:shadow-xl"
                  >
                    See all updates
                  </button>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

export default WhatsNewModal
