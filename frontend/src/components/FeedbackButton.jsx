import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageSquarePlus, X, Image } from 'lucide-react'
import useApiStore from '../store/apiStore'
import { feedbackAPI } from '../services/api'
import { lockBodyScroll, unlockBodyScroll } from '../utils/scrollLock';

const ScrollLockGuard = () => {
  useEffect(() => { lockBodyScroll(); return () => unlockBodyScroll(); }, [])
  return null
}

const FeedbackButton = ({ isOpen: controlledOpen, onClose }) => {
  const { isAuthenticated } = useApiStore()
  if (!isAuthenticated) return null


  const [internalOpen, setInternalOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('') // optional
  const [screenshotFile, setScreenshotFile] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [sizeWarning, setSizeWarning] = useState('')
  const [previewUrl, setPreviewUrl] = useState('')
  const MAX_WORDS = 200
  const MAX_TITLE_WORDS = 20

  const isControlled = typeof controlledOpen === 'boolean'
  const open = isControlled ? controlledOpen : internalOpen

  const openModal = () => {
    try { if (previewUrl) URL.revokeObjectURL(previewUrl) } catch {}
    setTitle('')
    setDescription('')
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

  useEffect(() => {
    if (open) {
      lockBodyScroll();
      return () => unlockBodyScroll();
    }
    return undefined;
  }, [open]);

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

    if (!title.trim()) {
      setSubmitting(false)
      setError('Title is required')
      return
    }

    if (countWords(title) > MAX_TITLE_WORDS) {
      setSubmitting(false)
      setError(`Title must be at most ${MAX_TITLE_WORDS} words`)
      return
    }

    if (description && countWords(description) > MAX_WORDS) {
      setSubmitting(false)
      setError(`Description must be at most ${MAX_WORDS} words`)
      return
    }

    try {
      const formData = new FormData()
      formData.append('title', title)
      if (description) formData.append('description', description)
      formData.append('status', 'To Do')
      if (screenshotFile) formData.append('screenshot', screenshotFile)

      const res = await feedbackAPI.submit(formData)

      if (res.data?.success) {
        setSuccess("Thanks for your feedback — we appreciate you!\nWe'll review it and keep improving WishTrail. You’ll see the results in upcoming updates.")
        setTitle('')
        setDescription('')
        if (previewUrl) URL.revokeObjectURL(previewUrl)
        setPreviewUrl('')
        setScreenshotFile(null)
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
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
            onClick={handleClose}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-lg p-6 border border-gray-200 dark:border-gray-700 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* lock scroll while this feedback modal is mounted */}
              <ScrollLockGuard />
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Send Feedback</h3>
                <button onClick={handleClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>
              <div className="text-sm text-gray-500 mb-6">
                You're part of WishTrail's journey — share your ideas and help make it better.
              </div>

              {!success && (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Subject <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    placeholder="Brief summary"
                  />
                  <div className="text-xs text-gray-500 mt-1">{countWords(title)} / {MAX_TITLE_WORDS} words</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description (optional)</label>
                  <textarea
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    placeholder="Details of the bug or improvement"
                  />
                  <div className="text-xs text-gray-500 mt-1">{countWords(description)} / {MAX_WORDS} words</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Attachment (optional)</label>
                  <label className="flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
                    <Image className="h-4 w-4" />
                    <span className="text-sm">{screenshotFile ? screenshotFile.name : 'Choose image (max 1 MB)'} </span>
                    <input type="file" accept="image/png, image/jpeg, image/jpg" onChange={handleFileChange} className="hidden" />
                  </label>
                  {previewUrl && (
                    <div className="relative inline-block mt-3">
                      <img src={previewUrl} alt="Attachment preview" className="w-24 h-24 object-cover rounded border border-gray-200 dark:border-gray-700" />
                      <button type="button" onClick={removeImage} className="absolute -top-2 -right-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-full p-1 shadow hover:bg-gray-50">
                        <X className="h-3 w-3 text-gray-600" />
                      </button>
                    </div>
                  )}
                  {sizeWarning && <div className="text-xs text-amber-600 mt-1">{sizeWarning}</div>}
                </div>

                {error && <div className="text-sm text-red-500">{error}</div>}
                {success && <div className="text-sm text-green-600">{success}</div>}

                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={handleClose} className="px-4 py-2 border rounded-lg">Cancel</button>
                  <button type="submit" disabled={submitting} className="btn-primary disabled:opacity-60">
                    {submitting ? 'Submitting...' : 'Submit Feedback'}
                  </button>
                </div>
              </form>
              )}

              {success && (
                <div className="py-6 text-center">
                  <div className="text-3xl mb-2">🎉</div>
                  <div className="text-green-700 dark:text-green-300 whitespace-pre-line text-sm">
                    {success}
                  </div>
                  <div className="mt-4 flex items-center justify-center gap-3">
                    <button onClick={() => { setSuccess(''); setError(''); setTitle(''); setDescription(''); setScreenshotFile(null); try{ if (previewUrl) URL.revokeObjectURL(previewUrl) } catch {}; setPreviewUrl(''); }} className="btn-primary">Submit another</button>
                  </div>
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