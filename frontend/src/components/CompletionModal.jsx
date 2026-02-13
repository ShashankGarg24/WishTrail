import { useState, useEffect, lazy, Suspense } from 'react'
import { motion } from 'framer-motion'
import { X, CheckCircle, AlertCircle, FileText, Share2, Lock, Globe, Image as ImageIcon, Smile, Meh, Frown } from 'lucide-react'
import useApiStore from '../store/apiStore'
const CelebrationModal = lazy(() => import('./CelebrationModal'));
import { lockBodyScroll, unlockBodyScroll } from '../utils/scrollLock'

const THEME_COLOR = '#4c99e6'

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
      style={{ zIndex: 9999, fontFamily: 'Manrope' }}
      onClick={handleClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white dark:bg-gray-900 p-6 rounded-2xl max-w-md w-full max-h-[85vh] overflow-y-auto scrollbar-hide relative shadow-2xl border border-gray-200 dark:border-gray-800"
        onClick={(e) => e.stopPropagation()}
        style={{ zIndex: 10000, fontFamily: 'Manrope' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg" style={{ backgroundColor: `${THEME_COLOR}20` }}>
              <CheckCircle className="h-6 w-6" style={{ color: THEME_COLOR }} />
            </div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white" style={{ fontFamily: 'Manrope' }}>
              {isEditMode ? 'Edit Completion' : 'Goal Progress'}
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-400"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Goal Title - Current Goal Section */}
        <div className="mb-6 p-4 rounded-xl" style={{ backgroundColor: `${THEME_COLOR}10`, border: `1px solid ${THEME_COLOR}30` }}>
          <div className="text-xs text-gray-600 dark:text-gray-400 mb-2 font-semibold" style={{ fontFamily: 'Manrope' }}>CURRENT GOAL</div>
          <h3 className="text-base font-bold text-gray-900 dark:text-white break-anywhere line-clamp-2" style={{ fontFamily: 'Manrope' }}>
            "{goalTitle}"
          </h3>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* What did you achieve */}
          <div>
            <label htmlFor="completionNote" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" style={{ fontFamily: 'Manrope' }}>
              What did you achieve today?
            </label>
            <textarea
              id="completionNote"
              value={completionNote}
              onChange={(e) => setCompletionNote(e.target.value)}
              placeholder="Describe your progress..."
              className="w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-primary-500/20 bg-white dark:bg-gray-800 dark:text-white text-gray-900 placeholder-gray-500 dark:placeholder-gray-400 resize-none transition-colors border-gray-300 dark:border-gray-700"
              style={{ fontFamily: 'Manrope', borderColor: THEME_COLOR + '4d' }}
              rows={4}
              maxLength={MAX_NOTE_CHARS}
            />
            <div className="flex items-center justify-end mt-2 text-xs" style={{ fontFamily: 'Manrope' }}>
              <span className="text-gray-500 dark:text-gray-400">
                {charCount}/{MAX_NOTE_CHARS} chars
              </span>
            </div>
          </div>

          {/* How did it feel */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3" style={{ fontFamily: 'Manrope' }}>
              How did it feel?
            </label>
            <div className="space-y-3">
              <div className="relative px-1">
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
                  className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                  style={{ accentColor: THEME_COLOR }}
                />
              </div>
              
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize" style={{ fontFamily: 'Manrope' }}>
                    {completionFeeling}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Visual progress */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" style={{ fontFamily: 'Manrope' }}>
              Visual progress <span className="text-gray-500 text-xs">(optional)</span>
            </label>
            <label className="flex items-center gap-3 px-4 py-3 border-2 border-dashed rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors border-gray-300 dark:border-gray-700" style={{ fontFamily: 'Manrope' }}>
              <ImageIcon className="h-5 w-5 text-gray-400" />
              <span className="text-sm text-gray-700 dark:text-gray-300">{attachmentFile ? attachmentFile.name : 'Choose JPG/PNG (max 1 MB)'}</span>
              <input type="file" accept="image/png, image/jpeg, image/jpg" onChange={handleFileChange} className="hidden" />
            </label>
            {attachmentPreview && (
              <div className="relative inline-block mt-3">
                <img src={attachmentPreview} alt="Attachment preview" className="w-24 h-24 object-cover rounded-lg border border-gray-200 dark:border-gray-700" />
                <button type="button" onClick={removeAttachment} className="absolute -top-2 -right-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-full p-1 shadow hover:bg-gray-50">
                  <X className="h-3 w-3 text-gray-600" />
                </button>
              </div>
            )}
            {attachmentError && (
              <div className="text-xs text-red-600 dark:text-red-400 mt-2 flex items-center gap-1" style={{ fontFamily: 'Manrope' }}>
                <AlertCircle className="h-3 w-3" />
                <span>{attachmentError}</span>
              </div>
            )}
          </div>

          {/* Sharing Toggle */}
          <div className="p-4 rounded-xl" style={{ backgroundColor: '#f0f9ff', border: `1px solid ${THEME_COLOR}30` }}>
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  {isPublic ? (
                    <Globe className="h-4 w-4" style={{ color: THEME_COLOR }} />
                  ) : (
                    <Lock className="h-4 w-4 text-gray-400" />
                  )}
                  <label className="text-sm font-medium text-gray-900 dark:text-white" style={{ fontFamily: 'Manrope' }}>
                    Share with followers
                  </label>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPublic(!isPublic)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2`}
                style={{ backgroundColor: isPublic ? THEME_COLOR : '#d1d5db' }}
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
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 py-3 px-4 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors font-medium"
              style={{ fontFamily: 'Manrope' }}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-3 px-4 text-white rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
              style={{ backgroundColor: THEME_COLOR, fontFamily: 'Manrope' }}
              disabled={charCount > MAX_NOTE_CHARS || loading}
            >
              {loading ? (isEditMode ? 'Updating...' : 'Completing...') : (isEditMode ? 'Update' : 'Complete')}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}

export default CompletionModal 