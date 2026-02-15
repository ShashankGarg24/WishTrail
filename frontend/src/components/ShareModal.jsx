import { useState, useRef, useEffect, lazy, Suspense } from 'react'
import { motion } from 'framer-motion'
import { 
  X, 
  Share2, 
  Download, 
  Copy, 
  Check,
  Instagram,
  Facebook,
  Twitter,
  Linkedin,
  MessageCircle,
  Link
} from 'lucide-react'
import { createPortal } from 'react-dom'
import html2canvas from 'html2canvas'
const ShareableGoalCard = lazy(() => import('./ShareableGoalCard'));
import useApiStore from '../store/apiStore'
import { lockBodyScroll, unlockBodyScroll } from '../utils/scrollLock'

const ShareModal = ({ isOpen, onClose, goal, user }) => {
  const [isGenerating, setIsGenerating] = useState(false)
  const [copied, setCopied] = useState(false)
  const [shareableData, setShareableData] = useState(null)
  const cardRef = useRef(null)
  const { getShareableGoal, getOGImageUrl } = useApiStore()

  // Load shareable data when modal opens
  useEffect(() => {
    if (isOpen && goal._id) {
      loadShareableData()
    }
  }, [isOpen, goal._id])

  const loadShareableData = async () => {
    try {
      const result = await getShareableGoal(goal._id)
      if (result.success) {
        setShareableData(result.data)
      }
    } catch (error) {
      console.error('Error loading shareable data:', error)
    }
  }

  const shareText = shareableData ? `🎉 Just achieved my goal: "${shareableData.goal.title}"! 

  ✨ ${shareableData.goal.category}
  📅 Completed: ${new Date(shareableData.goal.completedAt).toLocaleDateString()}
  ${shareableData.goal.completedAt ? `✅ Completed ${new Date(shareableData.goal.completedAt).toLocaleDateString()}` : ''}

  Track your goals with WishTrail! 🚀` : `🎉 Just achieved my goal: "${goal.title}"!`

  const shareUrl = shareableData?.shareUrl || `${window.location.origin}/goal/${goal._id}`

  const generateImage = async () => {
    if (!cardRef.current) return null
    
    setIsGenerating(true)
    
    try {
      const rect = cardRef.current.getBoundingClientRect()
      const targetWidth = Math.round(rect.width || cardRef.current.offsetWidth || 600)
      const targetHeight = Math.round(rect.height || cardRef.current.offsetHeight || 800)

      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: '#ffffff',
        width: targetWidth,
        height: targetHeight,
        scale: 2,
        allowTaint: true,
        useCORS: true,
        logging: false
      })
      
      return canvas.toDataURL('image/png')
    } catch (error) {
      console.error('Error generating image:', error)
      return null
    } finally {
      setIsGenerating(false)
    }
  }

  const downloadImage = async () => {
    const imageDataUrl = await generateImage()
    if (imageDataUrl) {
      const link = document.createElement('a')
      link.download = `wishtrail-goal-${goal.title.replace(/\s+/g, '-').toLowerCase()}.png`
      link.href = imageDataUrl
      link.click()
    }
  }

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareText)
      setCopied(true)
      try { window.dispatchEvent(new CustomEvent('wt_toast', { detail: { message: 'Copied to clipboard', type: 'success', duration: 2000 } })); } catch {}
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
    }
  }

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        const imageDataUrl = await generateImage()
        
        if (imageDataUrl) {
          // Convert data URL to blob
          const response = await fetch(imageDataUrl)
          const blob = await response.blob()
          const file = new File([blob], `wishtrail-goal-${goal.title.replace(/\s+/g, '-').toLowerCase()}.png`, { type: 'image/png' })
          
          await navigator.share({
            title: 'Goal Achievement - WishTrail',
            text: shareText,
            url: shareUrl,
            files: [file]
          })
        } else {
          await navigator.share({
            title: 'Goal Achievement - WishTrail',
            text: shareText,
            url: shareUrl
          })
        }
      } catch (error) {
        console.error('Error sharing:', error)
        copyToClipboard()
      }
    } else {
      copyToClipboard()
    }
  }

  const shareToWhatsApp = () => {
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText + '\n' + shareUrl)}`
    window.open(whatsappUrl, '_blank')
  }

  const shareToInstagram = async () => {
    const imageDataUrl = await generateImage()
    if (imageDataUrl) {
      // For Instagram, we'll download the image and show instructions
      const link = document.createElement('a')
      link.download = `wishtrail-goal-${goal.title.replace(/\s+/g, '-').toLowerCase()}.png`
      link.href = imageDataUrl
      link.click()
      
      alert('Image downloaded! You can now upload it to Instagram Stories or Posts.')
    }
  }

  const shareToTwitter = () => {
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`
    window.open(twitterUrl, '_blank')
  }

  const shareToFacebook = () => {
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareText)}`
    window.open(facebookUrl, '_blank')
  }

  const shareToLinkedIn = () => {
    const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}&summary=${encodeURIComponent(shareText)}`
    window.open(linkedinUrl, '_blank')
  }

  const sharingOptions = [
    {
      name: 'WhatsApp',
      icon: MessageCircle,
      color: 'bg-green-500 hover:bg-green-600',
      action: shareToWhatsApp
    },
    {
      name: 'Instagram',
      icon: Instagram,
      color: 'bg-pink-500 hover:bg-pink-600',
      action: shareToInstagram
    },
    {
      name: 'Twitter',
      icon: Twitter,
      color: 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700',
      action: shareToTwitter
    },
    {
      name: 'Facebook',
      icon: Facebook,
      color: 'bg-blue-700 hover:bg-blue-800',
      action: shareToFacebook
    },
    {
      name: 'LinkedIn',
      icon: Linkedin,
      color: 'bg-blue-600 hover:bg-blue-700',
      action: shareToLinkedIn
    }
  ]

  if (!isOpen) return null

  useEffect(() => { lockBodyScroll(); return () => unlockBodyScroll(); }, [])

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 md:p-8"
      style={{ zIndex: 10002 }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="bg-gray-50 dark:bg-gray-900 rounded-xl sm:rounded-2xl max-w-7xl w-full max-h-[90vh] sm:h-[85vh] overflow-y-auto scrollbar-hide shadow-2xl relative flex flex-col"
        onClick={(e) => e.stopPropagation()}
        style={{ zIndex: 10003 }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 sm:top-4 sm:right-4 md:top-6 md:right-6 z-50 p-1.5 sm:p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
        >
          <X className="h-5 w-5 sm:h-6 sm:w-6 text-gray-500 dark:text-gray-400" />
        </button>

        {/* Content */}
        <div className="p-3 sm:p-4 md:p-6 lg:p-8 flex-1 overflow-y-auto scrollbar-hide">
          <Suspense fallback={
            <div className="flex items-center justify-center h-96">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
          }>
            <ShareableGoalCard
              ref={cardRef}
              goal={goal}
              user={user}
            />
          </Suspense>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  )
}

export default ShareModal