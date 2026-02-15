import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Image, ArrowRight } from 'lucide-react'
import useApiStore from '../store/apiStore'
import { feedbackAPI } from '../services/api'
import { lockBodyScroll, unlockBodyScroll } from '../utils/scrollLock';

const ScrollLockGuard = () => {
  useEffect(() => { lockBodyScroll(); return () => unlockBodyScroll(); }, [])
  return null
}

const emotions = [
  { value: 'poor', label: 'POOR', emoji: '😞' },
  { value: 'fair', label: 'FAIR', emoji: '😐' },
  { value: 'good', label: 'GOOD', emoji: '🙂' },
  { value: 'great', label: 'GREAT', emoji: '😊' },
  { value: 'excellent', label: 'EXCELLENT', emoji: '😄' }
]

const MAX_MESSAGE_CHARS = 500

const FeedbackButton = ({ isOpen: controlledOpen, onClose }) => {
  const { isAuthenticated } = useApiStore()

  const [internalOpen, setInternalOpen] = useState(false)
  const [emotion, setEmotion] = useState('')
  const [message, setMessage] = useState('') // optional
  const [screenshotFile, setScreenshotFile] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [sizeWarning, setSizeWarning] = useState('')
  const [previewUrl, setPreviewUrl] = useState('')

  const isControlled = typeof controlledOpen === 'boolean'
  const open = isControlled ? controlledOpen : internalOpen

  useEffect(() => {
    if (open) {
      lockBodyScroll();
      return () => unlockBodyScroll();
    }
    return undefined;
  }, [open]);

  // Listen for custom event to open feedback modal
  useEffect(() => {
    const handleOpenFeedback = () => {
      if (!isControlled) {
        openModal()
      }
    }
    window.addEventListener('wt_open_feedback', handleOpenFeedback)
    return () => window.removeEventListener('wt_open_feedback', handleOpenFeedback)
  }, [isControlled])

  if (!isAuthenticated) return null

  const openModal = () => {
    try { if (previewUrl) URL.revokeObjectURL(previewUrl) } catch {}
    setEmotion('')
    setMessage('')
    setScreenshotFile(null)
    setPreviewUrl('')
    setSizeWarning('')
    setError('')
    setSuccess('')
    if (isControlled) {
      try { window.dispatchEvent(new CustomEvent('wt_open_feedback')) } catch {}
    } else {
      setInternalOpen(true)
    }
  }

  const handleClose = () => {
    if (isControlled) { try { onClose && onClose() } catch {} }
    else { setInternalOpen(false) }
    setSuccess('')
    setError('')
  }

  const countWords = (text) => (text || '').trim().split(/\s+/).filter(Boolean).length

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (file && file.size > 1024 * 1024) {
      setSizeWarning('Max image size is 1 MB')
      if (previewUrl) URL.revokeObjectURL(previewUrl)
      setPreviewUrl('')
      setScreenshotFile(null)
    } else {
      setSizeWarning('')
      if (previewUrl) URL.revokeObjectURL(previewUrl)
      if (file) setPreviewUrl(URL.createObjectURL(file))
      setScreenshotFile(file || null)
    }
  }

  const removeImage = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl('')
    setScreenshotFile(null)
    setSizeWarning('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    setSuccess('')

    if (!emotion) {
      setSubmitting(false)
      setError('Please select how we are doing')
      return
    }

    if (message.trim() && message.trim().length > MAX_MESSAGE_CHARS) {
      setSubmitting(false)
      setError(`Message must be ${MAX_MESSAGE_CHARS} characters or less`)
      return
    }

    try {
      const formData = new FormData()
      formData.append('emotion', emotion)
      if (message.trim()) formData.append('message', message.trim())
      
      if (screenshotFile) formData.append('screenshot', screenshotFile)

      const res = await feedbackAPI.submit(formData)

      if (res.data?.success) {
        setSuccess("Thanks for your feedback — we appreciate you!\nWe'll review it and keep improving WishTrail.")
        setEmotion('')
        setMessage('')
        if (previewUrl) URL.revokeObjectURL(previewUrl)
        setPreviewUrl('')
        setScreenshotFile(null)
        
        setTimeout(() => {
          handleClose()
        }, 2500)
      } else {
        setError(res.data?.message || 'Failed to submit feedback')
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to submit feedback')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[200]"
            onClick={handleClose}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* lock scroll while this feedback modal is mounted */}
              <ScrollLockGuard />
              
              {!success ? (
                <form onSubmit={handleSubmit} className="p-6">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-1">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white font-manrope">
                        Share Your Feedback
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 font-manrope">
                        Your insights help us craft a better experience.
                      </p>
                    </div>
                    <button 
                      type="button"
                      onClick={handleClose} 
                      className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors -mr-1"
                    >
                      <X className="h-5 w-5 text-gray-400" />
                    </button>
                  </div>

                  {/* Emotion Selection */}
                  <div className="mt-6">
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-3 tracking-wider uppercase">
                      How are we doing?
                    </label>
                    <div className="flex justify-between gap-2">
                      {emotions.map((item) => (
                        <button
                          key={item.value}
                          type="button"
                          onClick={() => setEmotion(item.value)}
                          className={`flex flex-col items-center gap-1.5 p-2 rounded-lg transition-all ${
                            emotion === item.value
                              ? 'bg-blue-50 dark:bg-blue-900/20'
                              : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                          }`}
                        >
                          <span className="text-3xl">{item.emoji}</span>
                          <span className="text-[10px] font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                            {item.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Message Input */}
                  <div className="mt-6">
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 tracking-wider uppercase">
                        Your Message
                      </label>
                      <span className="text-xs text-gray-400 uppercase tracking-wider">
                        Optional
                      </span>
                    </div>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={4}
                      maxLength={MAX_MESSAGE_CHARS}
                      className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm font-manrope resize-none"
                      placeholder="Your thoughts help us grow..."
                    />
                    <div className="text-xs text-gray-400 dark:text-gray-500 mt-1.5 text-right">
                      {message.length}/{MAX_MESSAGE_CHARS} characters
                    </div>
                  </div>

                  {/* Screenshot Attachment */}
                  <div className="mt-4">
                    <label className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <Image className="h-4 w-4 text-blue-500" />
                      <span className="text-sm text-blue-500 font-medium font-manrope">
                        Attach a screenshot (max 1 MB)
                      </span>
                      <input 
                        type="file" 
                        accept="image/png, image/jpeg, image/jpg" 
                        onChange={handleFileChange} 
                        className="hidden" 
                      />
                    </label>
                    {previewUrl && (
                      <div className="relative inline-block mt-3">
                        <img 
                          src={previewUrl} 
                          alt="Screenshot preview" 
                          className="w-20 h-20 object-cover rounded-lg border-2 border-gray-200 dark:border-gray-600" 
                        />
                        <button 
                          type="button" 
                          onClick={removeImage} 
                          className="absolute -top-2 -right-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-full p-1 shadow-md hover:bg-gray-50 dark:hover:bg-gray-600"
                        >
                          <X className="h-3 w-3 text-gray-600 dark:text-gray-400" />
                        </button>
                      </div>
                    )}
                    {sizeWarning && (
                      <div className="text-xs text-amber-600 mt-2">{sizeWarning}</div>
                    )}
                  </div>

                  {/* Error Message */}
                  {error && (
                    <div className="mt-4 text-sm text-red-600 dark:text-red-400 font-manrope">
                      {error}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center justify-end gap-3 mt-6">
                    <button 
                      type="button" 
                      onClick={handleClose} 
                      className="px-5 py-2.5 text-sm text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors font-manrope"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      disabled={submitting}
                      className="px-5 py-2.5 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-manrope text-sm"
                    >
                      {submitting ? 'Submitting...' : (
                        <>
                          Submit
                        </>
                      )}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="p-8 flex flex-col items-center justify-center text-center">
                  <div className="text-5xl mb-4">🎉</div>
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white font-manrope mb-2">
                    Thank You!
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-line font-manrope">
                    {success}
                  </p>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

export default FeedbackButton 
