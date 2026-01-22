import { useState, useEffect, lazy, Suspense } from 'react'
import { motion } from 'framer-motion'
import { X, CheckCircle, AlertCircle, FileText, Share2, Lock, Globe, Image as ImageIcon } from 'lucide-react'
import useApiStore from '../store/apiStore'
const CelebrationModal = lazy(() => import('./CelebrationModal'));
import { lockBodyScroll, unlockBodyScroll } from '../utils/scrollLock'

const CompletionModal = ({ isOpen, onClose, onComplete, goalTitle, goal, isEditMode = false, existingData = null }) => {
  const MAX_NOTE_CHARS = 1000
  const [completionNote, setCompletionNote] = useState(existingData?.completionNote || '')
  const [showCelebration, setShowCelebration] = useState(false)
  const [attachmentFile, setAttachmentFile] = useState(null)
  const [attachmentError, setAttachmentError] = useState('')
  const [attachmentPreview, setAttachmentPreview] = useState(existingData?.completionAttachmentUrl || '')
  const [existingAttachmentUrl, setExistingAttachmentUrl] = useState(existingData?.completionAttachmentUrl || '')
  const [removeExistingImage, setRemoveExistingImage] = useState(false)
  const [completionFeeling, setCompletionFeeling] = useState(existingData?.completionFeeling || 'neutral')
  const { loading } = useApiStore()
  
  // Allow user to change isPublic flag during completion
  const [isPublic, setIsPublic] = useState(goal?.isPublic ?? true)
  
  // Update state when existingData changes
  useEffect(() => {
    if (isEditMode && existingData) {
      setCompletionNote(existingData.completionNote || '')
      setCompletionFeeling(existingData.completionFeeling || 'neutral')
      setExistingAttachmentUrl(existingData.completionAttachmentUrl || '')
      setAttachmentPreview(existingData.completionAttachmentUrl || '')
      setIsPublic(goal?.isPublic ?? true)
    }
  }, [isEditMode, existingData, goal])

  const validateNote = (note) => {
    const wordCount = note.trim().split(/\s+/).filter(word => word.length > 0).length
    return wordCount >= 10
  }

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    setAttachmentError('')
    if (!file) {
      if (attachmentPreview) URL.revokeObjectURL(attachmentPreview)
      setAttachmentPreview('')
      setAttachmentFile(null)
      return
    }
    const allowed = ['image/png', 'image/jpeg', 'image/jpg']
    if (!allowed.includes(file.type)) {
      setAttachmentError('Only JPG/JPEG/PNG images are allowed')
      if (attachmentPreview) URL.revokeObjectURL(attachmentPreview)
      setAttachmentPreview('')
      setAttachmentFile(null)
      return
    }
    if (file.size > 1024 * 1024) {
      setAttachmentError('Max image size is 1 MB')
      if (attachmentPreview) URL.revokeObjectURL(attachmentPreview)
      setAttachmentPreview('')
      setAttachmentFile(null)
      return
    }
    if (attachmentPreview) URL.revokeObjectURL(attachmentPreview)
    setAttachmentPreview(URL.createObjectURL(file))
    setAttachmentFile(file)
  }

  const removeAttachment = () => {
    if (attachmentPreview && !existingAttachmentUrl) {
      URL.revokeObjectURL(attachmentPreview)
    }
    setAttachmentPreview('')
    setAttachmentFile(null)
    setAttachmentError('')
    if (isEditMode && existingAttachmentUrl) {
      setRemoveExistingImage(true)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (completionNote.trim().length > MAX_NOTE_CHARS) {
      window.dispatchEvent(new CustomEvent('wt_toast', {
        detail: { message: 'Completion note must be 1000 characters or less', type: 'error' }
      }));
      return
    }

    if (attachmentError) {
      window.dispatchEvent(new CustomEvent('wt_toast', {
        detail: { message: 'Please resolve the attachment issue before completing the goal', type: 'error' }
      }));
      return
    }

    try {
      // Build FormData for multipart
      const form = new FormData()
      form.append('completionNote', completionNote.trim())
      form.append('isPublic', String(isPublic))
      form.append('completionFeeling', completionFeeling)
      
      // Handle image update logic
      if (attachmentFile) {
        // New file uploaded
        form.append('attachment', attachmentFile)
      } else if (isEditMode && removeExistingImage) {
        // Remove existing image
        form.append('attachmentUrl', '')
      } else if (isEditMode && existingAttachmentUrl) {
        // Keep existing image
        form.append('attachmentUrl', existingAttachmentUrl)
      }

      const result = await onComplete(form)

      if (result.success) {
        setCompletionNote('')
        setIsPublic(goal?.isPublic ?? true)
        setCompletionFeeling('neutral')
        setAttachmentFile(null)
        setAttachmentError('')
        if (attachmentPreview && !existingAttachmentUrl) URL.revokeObjectURL(attachmentPreview)
        setAttachmentPreview('')
        setExistingAttachmentUrl('')
        setRemoveExistingImage(false)
        
        if (!isEditMode) {
          setTimeout(() => {
            setShowCelebration(true)
          }, 500)
        } else {
          window.dispatchEvent(new CustomEvent('wt_toast', {
            detail: { message: 'Goal completion updated successfully', type: 'success' }
          }));
          onClose()
        }
      } else {
        window.dispatchEvent(new CustomEvent('wt_toast', {
          detail: { message: result?.data?.message || `Failed to ${isEditMode ? 'update' : 'complete'} goal. Please try again.`, type: 'error' }
        }));
      }
    } catch (err) {
      window.dispatchEvent(new CustomEvent('wt_toast', {
        detail: { message: err?.response?.data?.message || `Failed to ${isEditMode ? 'update' : 'complete'} goal. Please try again.`, type: 'error' }
      }));
    }
  }

  const handleClose = () => {
    setCompletionNote('')
    setIsPublic(goal?.isPublic ?? true)
    setCompletionFeeling('neutral')
    setAttachmentFile(null)
    setAttachmentError('')
    if (attachmentPreview) URL.revokeObjectURL(attachmentPreview)
    setAttachmentPreview('')
    setShowCelebration(false)
    onClose()
  }

  const handleCelebrationClose = () => {
    setShowCelebration(false)
    onClose()
  }

  const wordCount = completionNote.trim().split(/\s+/).filter(word => word.length > 0).length
  const charCount = completionNote.trim().length

  if (!isOpen) return null

  useEffect(() => { lockBodyScroll(); return () => unlockBodyScroll(); }, [])

  // Show celebration modal after completion
  if (showCelebration) {
    return (
      <Suspense fallback={null}>
        <CelebrationModal
        wish={goal}
        isOpen={showCelebration}
        onClose={handleCelebrationClose}
        goalTitle={goalTitle}
      />
      </Suspense>
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
        className="bg-white dark:bg-gray-800 p-6 rounded-2xl max-w-md w-full max-h-[85vh] overflow-y-auto scrollbar-hide relative shadow-2xl border border-gray-200 dark:border-gray-700"
        onClick={(e) => e.stopPropagation()}
        style={{ zIndex: 10000 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-6 w-6 text-green-500" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {isEditMode ? 'Edit Completion' : 'Complete Goal'}
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
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 break-anywhere line-clamp-2">
            "{goalTitle}"
          </h3>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Congratulations! Tell us what you did to achieve this goal.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Completion Note */}
          <div>
            <label htmlFor="completionNote" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              What did you do?
            </label>
            <textarea
              id="completionNote"
              value={completionNote}
              onChange={(e) => setCompletionNote(e.target.value)}
              placeholder="Describe what you did to achieve this goal..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white resize-none"
              rows={4}
              maxLength={MAX_NOTE_CHARS}
            />
            <div className="flex items-center justify-end mt-2 text-xs">
              <span className="text-gray-500 dark:text-gray-400">
                {charCount}/{MAX_NOTE_CHARS} chars
              </span>
            </div>
          </div>

          {/* Completion Feeling */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              How did you feel completing this?
            </label>
            <div className="space-y-2">
              <div className="relative px-1">
                {/* Dividers */}
                <div className="absolute top-1 left-0 right-0 flex justify-between px-1">
                  {Array.from({ length: 8 }).map((_, idx) => (
                    <div key={idx} className="w-px h-3 bg-gray-300 dark:bg-gray-600"></div>
                  ))}
                </div>
                
                {/* Slider */}
                <input
                  type="range"
                  min="0"
                  max="7"
                  step="1"
                  value={[
                    'neutral',
                    'relieved',
                    'satisfied',
                    'happy',
                    'proud',
                    'accomplished',
                    'grateful',
                    'excited'
                  ].indexOf(completionFeeling)}
                  onChange={(e) => {
                    const feelings = ['neutral', 'relieved', 'satisfied', 'happy', 'proud', 'accomplished', 'grateful', 'excited'];
                    setCompletionFeeling(feelings[parseInt(e.target.value)]);
                  }}
                  className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary-500"
                />
              </div>
              
              <div className="text-center">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">
                  {completionFeeling}
                </span>
              </div>
            </div>
          </div>

          {/* Attachment */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Attach an image (optional)
            </label>
            <label className="flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 border-gray-300 dark:border-gray-600">
              <ImageIcon className="h-4 w-4" />
              <span className="text-sm">{attachmentFile ? attachmentFile.name : 'Choose JPG/PNG (max 1 MB)'}</span>
              <input type="file" accept="image/png, image/jpeg, image/jpg" onChange={handleFileChange} className="hidden" />
            </label>
            {attachmentPreview && (
              <div className="relative inline-block mt-3">
                <img src={attachmentPreview} alt="Attachment preview" className="w-24 h-24 object-cover rounded border border-gray-200 dark:border-gray-700" />
                <button type="button" onClick={removeAttachment} className="absolute -top-2 -right-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-full p-1 shadow hover:bg-gray-50">
                  <X className="h-3 w-3 text-gray-600" />
                </button>
              </div>
            )}
            {attachmentError && (
              <div className="text-xs text-red-500 mt-1 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                <span>{attachmentError}</span>
              </div>
            )}
          </div>

          {/* Sharing Toggle */}
          <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  {isPublic ? (
                    <Globe className="h-5 w-5 text-green-500" />
                  ) : (
                    <Lock className="h-5 w-5 text-gray-500" />
                  )}
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Share completion with followers
                    </label>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {isPublic
                        ? 'Your followers will see your completion note and image in their feed'
                        : 'Keep it private; nothing will be posted to your followers'}
                    </p>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPublic(!isPublic)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                  isPublic ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-600'
                }`}
              >
                <span className="sr-only">
                  {isPublic ? 'Make private' : 'Make public'}
                </span>
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200 ${
                    isPublic ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

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
              disabled={charCount > MAX_NOTE_CHARS || loading}
            >
              {loading ? (isEditMode ? 'Updating...' : 'Completing...') : (isEditMode ? 'Update' : 'Complete Goal')}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}

export default CompletionModal 