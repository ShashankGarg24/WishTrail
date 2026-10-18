import { useEffect, useState } from 'react'
import api from '../services/api'
import PromotionCard from './PromotionCard'
import { dismissPromotion, fetchPromotion, isPromotionDismissed } from '../utils/promotion'

export default function ActivePromotion({ userId }) {
  const [result, setResult] = useState(null)
  const [dismissedId, setDismissedId] = useState(null)
  useEffect(() => {
    if (!userId) return
    const controller = new AbortController()
    let pending = false
    const refresh = async () => {
      if (pending || document.visibilityState === 'hidden') return
      pending = true
      const promotion = await fetchPromotion(api, controller.signal)
      pending = false
      if (!controller.signal.aborted) setResult({ userId, promotion })
    }
    refresh()
    // Bound staleness for enable/disable, time windows and subscription changes.
    const timer = window.setInterval(refresh, 60000)
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      controller.abort()
      window.clearInterval(timer)
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [userId])
  const promotion = result?.userId === userId ? result.promotion : null
  let storage
  try { storage = window.localStorage } catch { /* Storage can be unavailable. */ }
  if (!promotion || dismissedId === promotion.id || isPromotionDismissed(promotion.id, storage)) return null
  return <div className="mb-4"><PromotionCard promotion={promotion} onDismiss={() => {
    dismissPromotion(promotion.id, storage)
    setDismissedId(promotion.id)
  }} /></div>
}
