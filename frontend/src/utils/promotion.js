export const dismissalKey = id => `wt_promotion_dismissed:${id}`

export function isPromotionDismissed(id, storage) {
  try { return storage.getItem(dismissalKey(id)) === '1' } catch { return false }
}

export function dismissPromotion(id, storage) {
  try { storage.setItem(dismissalKey(id), '1') } catch { /* Still dismiss for this mount. */ }
}

// Keep server-validated owned destinations in this router, including in WebView.
export function promotionDestination(url) {
  const destination = new URL(url, 'https://wishtrail.in')
  if (!['http:', 'https:'].includes(destination.protocol)) throw new Error('Invalid promotion destination')
  return `/${destination.pathname.replace(/^\/+/, '')}${destination.search}${destination.hash}`
}

export async function fetchPromotion(client, signal) {
  try {
    const response = await client.get('/config/active-promotion', { signal, timeout: 5000 })
    const promotion = response.data?.data?.promotion
    if (!promotion?.id || promotion.surface !== 'announcement_card') return null
    return { ...promotion, ctaUrl: promotionDestination(promotion.ctaUrl) }
  } catch {
    return null
  }
}
