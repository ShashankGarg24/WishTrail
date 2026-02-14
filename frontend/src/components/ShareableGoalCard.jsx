import { forwardRef, useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { Share2, Camera, Twitter, Instagram, Link2, Download, Copy, Check } from 'lucide-react'
import html2canvas from 'html2canvas'

const ShareableGoalCard = forwardRef(({ goal, user, onClose }, ref) => {
  const [textOverlay, setTextOverlay] = useState(goal.completionNote || '')
  const [selectedImage, setSelectedImage] = useState(goal.completionAttachmentUrl || null)
  const [imageZoom, setImageZoom] = useState(100)
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const imageContainerRef = useRef(null)
  const cardRef = useRef(null)

  const formatDate = (dateString) => {
    if (!dateString) return null
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setSelectedImage(reader.result)
        setImageZoom(100)
        setImagePosition({ x: 0, y: 0 })
      }
      reader.readAsDataURL(file)
    }
  }

  const handleRemoveImage = () => {
    setSelectedImage(null)
    setImageZoom(100)
    setImagePosition({ x: 0, y: 0 })
  }

  const handleMouseDown = (e) => {
    if (!selectedImage || e.button !== 0) return
    e.preventDefault()
    setIsDragging(true)
  }

  const handleMouseMove = (e) => {
    if (!isDragging || !selectedImage) return
    
    setImagePosition(prev => ({
      x: prev.x + e.movementX,
      y: prev.y + e.movementY
    }))
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleDoubleClick = () => {
    if (!selectedImage) return
    setImageZoom(100)
    setImagePosition({ x: 0, y: 0 })
  }

  const generateImage = async () => {
    if (!cardRef.current) return null
    
    setIsGenerating(true)
    
    try {
      // Wait for all fonts to load
      await document.fonts.ready
      
      const cardElement = cardRef.current
      
      // Store original border radius
      const originalBorderRadius = cardElement.style.borderRadius
      
      // Ensure border radius is set for export
      cardElement.style.borderRadius = '24px'
      
      // Temporarily disable overflow-hidden for text
      const imageSection = cardElement.querySelector('.export-image-section')
      const textSection = cardElement.querySelector('.export-text-section')
      const badges = cardElement.querySelectorAll('.export-badge')
      
      // Store original styles
      const originalStyles = {
        achievedTextPadding: null
      }
      
      if (imageSection) {
        imageSection.style.overflow = 'visible'
      }
      if (textSection) {
        textSection.style.transform = 'none'
      }
      
      // Fix badge positions explicitly
      badges.forEach((badge, index) => {
        badge.style.position = 'absolute'
        badge.style.zIndex = '1000'
        if (index === 0) {
          badge.style.top = '16px'
          badge.style.left = '16px'
          // Add padding to achieved text
          const achievedText = badge.querySelector('.export-achieved-text')
          if (achievedText) {
            originalStyles.achievedTextPadding = achievedText.style.paddingBottom
            achievedText.style.paddingBottom = '12px'
          }
        } else {
          badge.style.top = '16px'
          badge.style.right = '16px'
        }
      })
      
      // Small delay to ensure styles are applied
      await new Promise(resolve => setTimeout(resolve, 150))
      
      const canvas = await html2canvas(cardElement, {
        backgroundColor: 'transparent',
        scale: 3,
        allowTaint: true,
        useCORS: true,
        logging: false,
        imageTimeout: 0,
        removeContainer: true
      })
      
      // Create a new canvas with rounded corners
      const roundedCanvas = document.createElement('canvas')
      const ctx = roundedCanvas.getContext('2d')
      roundedCanvas.width = canvas.width
      roundedCanvas.height = canvas.height
      
      // Draw rounded rectangle background
      const radius = 72 // 24px * 3 (scale)
      ctx.fillStyle = '#B5C4A0'
      ctx.beginPath()
      ctx.moveTo(radius, 0)
      ctx.lineTo(canvas.width - radius, 0)
      ctx.quadraticCurveTo(canvas.width, 0, canvas.width, radius)
      ctx.lineTo(canvas.width, canvas.height - radius)
      ctx.quadraticCurveTo(canvas.width, canvas.height, canvas.width - radius, canvas.height)
      ctx.lineTo(radius, canvas.height)
      ctx.quadraticCurveTo(0, canvas.height, 0, canvas.height - radius)
      ctx.lineTo(0, radius)
      ctx.quadraticCurveTo(0, 0, radius, 0)
      ctx.closePath()
      ctx.fill()
      
      // Clip to rounded rectangle and draw content
      ctx.beginPath()
      ctx.moveTo(radius, 0)
      ctx.lineTo(canvas.width - radius, 0)
      ctx.quadraticCurveTo(canvas.width, 0, canvas.width, radius)
      ctx.lineTo(canvas.width, canvas.height - radius)
      ctx.quadraticCurveTo(canvas.width, canvas.height, canvas.width - radius, canvas.height)
      ctx.lineTo(radius, canvas.height)
      ctx.quadraticCurveTo(0, canvas.height, 0, canvas.height - radius)
      ctx.lineTo(0, radius)
      ctx.quadraticCurveTo(0, 0, radius, 0)
      ctx.closePath()
      ctx.clip()
      
      ctx.drawImage(canvas, 0, 0)
      
      // Restore original styles
      cardElement.style.borderRadius = originalBorderRadius
      if (imageSection) {
        imageSection.style.overflow = 'hidden'
      }
      
      // Restore achieved text padding
      const achievedText = badges[0]?.querySelector('.export-achieved-text')
      if (achievedText) {
        achievedText.style.paddingBottom = originalStyles.achievedTextPadding || ''
      }
      
      return roundedCanvas.toDataURL('image/png')
    } catch (error) {
      console.error('Error generating image:', error)
      return null
    } finally {
      setIsGenerating(false)
    }
  }

  const handleDownload = async () => {
    const imageDataUrl = await generateImage()
    if (imageDataUrl) {
      const link = document.createElement('a')
      link.download = `wishtrail-${goal.title.replace(/\s+/g, '-').toLowerCase()}.png`
      link.href = imageDataUrl
      link.click()
    }
  }

  const handleCopyLink = async () => {
    const shareUrl = `${window.location.origin}/goal/${goal.id}`
    try {
      await navigator.clipboard.writeText(shareUrl)
    } catch (error) {
      console.error('Failed to copy link:', error)
    }
  }

  return (
    <div className="w-full max-w-6xl mx-auto bg-gray-50 dark:bg-gray-900 p-8 rounded-xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
          Highlight Your Success
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Choose how you want to showcase your completed milestone to the world.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Panel - Visual Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
            Visual Settings
          </h2>

          {/* Achievement Image */}
          <div className="mb-6">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
              Achievement Image
            </label>
            <div className="relative">
              {!selectedImage ? (
                <>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    id="achievement-image"
                  />
                  <label
                    htmlFor="achievement-image"
                    className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:border-blue-400 transition-colors"
                  >
                    <Camera className="h-8 w-8 text-gray-400 mb-2" />
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      Click to add photo
                    </span>
                  </label>
                </>
              ) : (
                <button
                  onClick={handleRemoveImage}
                  className="w-full flex flex-col items-center justify-center h-32 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:border-red-400 transition-colors"
                >
                  <Camera className="h-8 w-8 text-gray-400 mb-2" />
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    Click to remove
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* Image Instructions */}
          {selectedImage && (
            <div className="mb-6 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
              <p className="text-xs text-blue-800 dark:text-blue-300 leading-relaxed">
                <span className="font-semibold">Adjust image in preview:</span><br />
                • Click & drag to reposition<br />
                • Double-click to reset
              </p>
            </div>
          )}

          {/* Text Overlay */}
          <div className="mb-6">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
              Text Overlay
            </label>
            <input
              type="text"
              value={textOverlay}
              onChange={(e) => setTextOverlay(e.target.value)}
              placeholder="Document your recipes"
              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Right Panel - Live Preview */}
        <div>
          <div className="mb-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center">
            Live Preview
          </div>
          
          {/* Preview Card */}
          <div className="relative flex items-start gap-4">
            <div className="relative w-full max-w-md">
              <div ref={cardRef} className="bg-[#B5C4A0] rounded-3xl overflow-hidden shadow-xl">
              {/* Badge */}
              <div className="export-badge absolute top-4 left-4 z-10">
                <div className="bg-white rounded-full px-3 py-1.5 flex items-center gap-1.5 shadow-sm">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="export-achieved-text text-xs font-semibold text-gray-900 uppercase tracking-wide">
                    Achieved
                  </span>
                </div>
              </div>

              {/* Logo */}
              <div className="export-badge absolute top-4 right-4 z-10">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-sm">
                  <div className="w-4 h-4 bg-white rounded-sm"></div>
                </div>
              </div>

              {/* Image Section */}
              <div 
                ref={imageContainerRef}
                className="export-image-section relative h-64 bg-[#B5C4A0] flex items-center justify-center overflow-hidden touch-none"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onDoubleClick={handleDoubleClick}
                style={{ 
                  cursor: selectedImage ? (isDragging ? 'grabbing' : 'grab') : 'default',
                  userSelect: 'none',
                  WebkitUserSelect: 'none',
                  MozUserSelect: 'none',
                  msUserSelect: 'none'
                }}
              >
                {selectedImage ? (
                  <img
                    src={selectedImage}
                    alt="Achievement"
                    className="absolute select-none pointer-events-none"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                      transform: `scale(${imageZoom / 100}) translate(${imagePosition.x}px, ${imagePosition.y}px)`,
                      transition: isDragging ? 'none' : 'transform 0.1s ease-out'
                    }}
                    draggable={false}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="text-center">
                      {/* WishTrail Logo/Brand */}
                      {/* WishTrail Text */}
                      <div className="font-bold text-2xl tracking-wider mb-1" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>
                        WishTrail
                      </div>
                      <div className="text-sm font-medium" style={{ color: 'rgba(255, 255, 255, 0.2)' }}>
                        Your Journey to Success
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Info Section */}
              <div className="export-text-section bg-[#6B9BD1] p-6 pb-8">
                <h3 className="text-white text-xl font-semibold mb-2" style={{ lineHeight: '1.3' }}>
                  {textOverlay || goal.title}
                </h3>
                <div className="flex items-center justify-between text-white/90 text-sm" style={{ lineHeight: '1.4' }}>
                  <span>by {user.name}</span>
                  <span className="text-xs text-white/70">
                    {formatDate(goal.completedAt)}
                  </span>
                </div>
              </div>
              </div>

            {/* Social Share Icons */}
            <div className="flex items-center justify-center gap-3 mt-6">
              <button 
              onClick={handleCopyLink}
              className="w-10 h-10 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm">
                <Copy className="h-4 w-4 text-gray-600 dark:text-gray-400" />
              </button>
              <button 
              onClick={handleDownload}
              className="w-10 h-10 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm">
                <Download className="h-4 w-4 text-gray-600 dark:text-gray-400" />
              </button>
              <button className="w-10 h-10 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm">
                <Twitter className="h-4 w-4 text-gray-600 dark:text-gray-400" />
              </button>
              <button className="w-10 h-10 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm">
                <Instagram className="h-4 w-4 text-gray-600 dark:text-gray-400" />
              </button>
            </div>
          </div>

            {/* Vertical Zoom Slider */}
            {selectedImage && (
              <div className="flex flex-col items-center gap-3 pt-12">
                <div className="relative flex flex-col items-center">
                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                    {imageZoom}%
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="300"
                    value={imageZoom}
                    onChange={(e) => setImageZoom(parseInt(e.target.value))}
                    className="h-48 w-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500 slider-vertical"
                    orient="vertical"
                    style={{
                      writingMode: 'bt-lr',
                      WebkitAppearance: 'slider-vertical',
                      width: '8px'
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer Quote */}
          <p className="text-center text-gray-500 dark:text-gray-400 text-sm mt-8 italic">
            "Success is personal. Your trail, your milestones."
          </p>
        </div>
      </div>
    </div>
  )
})

ShareableGoalCard.displayName = 'ShareableGoalCard'

export default ShareableGoalCard