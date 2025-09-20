import { useRef, useState } from 'react'
import { Copy, Share2, Facebook, Instagram, Twitter, MessageCircle } from 'lucide-react'

export default function ShareSheet({ isOpen, onClose, url, title = 'WishTrail' }) {
  const [dragY, setDragY] = useState(0)
  const startYRef = useRef(0)
  const sheetRef = useRef(null)

  if (!isOpen) return null

  const openNew = (href) => {
    try { window.open(href, '_blank', 'noopener,noreferrer') } catch {}
  }

  const handleShareNative = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({ title, url })
        onClose?.()
        return
      }
    } catch {}
    try {
      await navigator.clipboard.writeText(url)
      window.dispatchEvent(new CustomEvent('wt_toast', { detail: { message: 'Link copied to clipboard', type: 'success', duration: 2000 } }))
    } catch {}
    onClose?.()
  }

  const handleWhatsApp = () => {
    const text = encodeURIComponent(`${title}\n${url}`)
    openNew(`https://wa.me/?text=${text}`)
    onClose?.()
  }

  const handleTwitter = () => {
    const u = encodeURIComponent(url)
    const t = encodeURIComponent(title)
    openNew(`https://twitter.com/intent/tweet?url=${u}&text=${t}`)
    onClose?.()
  }

  const handleFacebook = () => {
    const u = encodeURIComponent(url)
    openNew(`https://www.facebook.com/sharer/sharer.php?u=${u}`)
    onClose?.()
  }

  const handleInstagram = async () => {
    try {
      await navigator.clipboard.writeText(url)
      window.dispatchEvent(new CustomEvent('wt_toast', { detail: { message: 'Link copied. Open Instagram to paste.', type: 'success', duration: 2500 } }))
    } catch {}
    try { window.location.href = 'instagram://app' } catch {}
    setTimeout(() => { try { openNew('https://www.instagram.com/') } catch {} }, 600)
    onClose?.()
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      window.dispatchEvent(new CustomEvent('wt_toast', { detail: { message: 'Link copied to clipboard', type: 'success', duration: 2000 } }))
    } catch {}
    onClose?.()
  }

  const onTouchStart = (e) => {
    try { startYRef.current = e.touches?.[0]?.clientY || 0 } catch { startYRef.current = 0 }
    setDragY(0)
  }
  const onTouchMove = (e) => {
    const y = e.touches?.[0]?.clientY || 0
    const dy = Math.max(0, y - startYRef.current)
    setDragY(Math.min(dy, 140))
  }
  const onTouchEnd = () => {
    if (dragY > 80) {
      onClose?.()
    } else {
      setDragY(0)
    }
  }

  return (
    <div className="fixed inset-0 z-[100]">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div
        ref={sheetRef}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        className="absolute left-0 right-0 bottom-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 rounded-t-2xl p-4 shadow-2xl"
        style={{ transform: `translateY(${dragY}px)`, transition: dragY === 0 ? 'transform 180ms ease-out' : 'none' }}
      >
        <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-700 rounded-full mx-auto mb-4" />
        <div className="flex items-center gap-4 overflow-x-auto no-scrollbar pb-1">
          <button onClick={handleShareNative} className="flex flex-col items-center min-w-[72px]">
            <div className="h-12 w-12 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-800 dark:text-gray-200">
              <Share2 className="h-6 w-6" />
            </div>
            <div className="mt-1 text-xs text-gray-700 dark:text-gray-300">Share</div>
          </button>
          <button onClick={handleCopy} className="flex flex-col items-center min-w-[72px]">
            <div className="h-12 w-12 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-800 dark:text-gray-200">
              <Copy className="h-6 w-6" />
            </div>
            <div className="mt-1 text-xs text-gray-700 dark:text-gray-300">Copy</div>
          </button>
          <button onClick={handleWhatsApp} className="flex flex-col items-center min-w-[72px]">
            <div className="h-12 w-12 rounded-2xl bg-[#25D366]/10 text-[#25D366] flex items-center justify-center border border-[#25D366]/30">
              <MessageCircle className="h-6 w-6" />
            </div>
            <div className="mt-1 text-xs text-gray-700 dark:text-gray-300">WhatsApp</div>
          </button>
          <button onClick={handleInstagram} className="flex flex-col items-center min-w-[72px]">
            <div className="h-12 w-12 rounded-2xl bg-pink-500/10 text-pink-600 flex items-center justify-center border border-pink-400/40">
              <Instagram className="h-6 w-6" />
            </div>
            <div className="mt-1 text-xs text-gray-700 dark:text-gray-300">Instagram</div>
          </button>
          <button onClick={handleTwitter} className="flex flex-col items-center min-w-[72px]">
            <div className="h-12 w-12 rounded-2xl bg-[#1DA1F2]/10 text-[#1DA1F2] flex items-center justify-center border border-[#1DA1F2]/30">
              <Twitter className="h-6 w-6" />
            </div>
            <div className="mt-1 text-xs text-gray-700 dark:text-gray-300">Twitter</div>
          </button>
          <button onClick={handleFacebook} className="flex flex-col items-center min-w-[72px]">
            <div className="h-12 w-12 rounded-2xl bg-[#1877F2]/10 text-[#1877F2] flex items-center justify-center border border-[#1877F2]/30">
              <Facebook className="h-6 w-6" />
            </div>
            <div className="mt-1 text-xs text-gray-700 dark:text-gray-300">Facebook</div>
          </button>
        </div>
      </div>
    </div>
  )
}


