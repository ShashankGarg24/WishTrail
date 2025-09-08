import { useState, useRef, useEffect } from 'react'
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
import ShareableGoalCard from './ShareableGoalCard'
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

  ✨ ${shareableData.goal.category} • ${shareableData.goal.priority} priority
  📅 Completed: ${new Date(shareableData.goal.completedAt).toLocaleDateString()}
  ${shareableData.goal.pointsEarned ? `⭐ ${shareableData.goal.pointsEarned} points earned` : ''}

  Track your goals with WishTrail! 🚀` : `🎉 Just achieved my goal: "${goal.title}"!`

  const shareUrl = shareableData?.shareUrl || `${window.location.origin}/goal/${goal._id}`

  const generateImage = async () => {
    if (!cardRef.current) return null
    
    setIsGenerating(true)
    
    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: '#ffffff',
        width: 600,
        height: 800,
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
      color: 'bg-blue-500 hover:bg-blue-600',
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
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4"
      style={{ zIndex: 10002 }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        style={{ zIndex: 10003 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Share Your Achievement
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6">
          {/* Shareable Card */}
          <div className="mb-6 flex justify-center">
            <div className="scale-75 origin-top">
              <ShareableGoalCard
                ref={cardRef}
                goal={goal}
                user={user}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-4">
            {/* Primary Actions */}
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={handleNativeShare}
                disabled={isGenerating}
                className="flex items-center justify-center space-x-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Share2 className="h-5 w-5" />
                <span>{isGenerating ? 'Generating...' : 'Share'}</span>
              </button>
              
              <button
                onClick={downloadImage}
                disabled={isGenerating}
                className="flex items-center justify-center space-x-2 bg-green-500 hover:bg-green-600 text-white px-4 py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="h-5 w-5" />
                <span>{isGenerating ? 'Generating...' : 'Download'}</span>
              </button>
            </div>

            {/* Copy Text */}
            <button
              onClick={copyToClipboard}
              className="w-full flex items-center justify-center space-x-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 px-4 py-3 rounded-lg transition-colors"
            >
              {copied ? (
                <>
                  <Check className="h-5 w-5 text-green-500" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="h-5 w-5" />
                  <span>Copy Text</span>
                </>
              )}
            </button>

            {/* Social Media Options */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Share to social media:
              </h3>
              <div className="grid grid-cols-5 gap-3">
                {sharingOptions.map((option) => (
                  <button
                    key={option.name}
                    onClick={option.action}
                    disabled={isGenerating}
                    className={`flex flex-col items-center justify-center space-y-2 p-3 rounded-lg text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${option.color}`}
                  >
                    <option.icon className="h-6 w-6" />
                    <span className="text-xs font-medium">{option.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  )
}

export default ShareModal