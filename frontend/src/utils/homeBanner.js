export function getHomeBanner(hour = new Date().getHours()) {
  const photo = hour >= 17 || hour < 5
    ? 'photo-1519681393784-d120267933ba'
    : hour < 12
      ? 'photo-1470252649378-9c29740c9fa8'
      : 'photo-1464822759023-fed622ff2c3b'
  return `https://images.unsplash.com/${photo}?auto=format&fit=crop&w=1600&q=75`
}

export function preloadHomeBanner() {
  if (!['/home', '/dashboard'].includes(window.location.pathname)) return
  const link = document.createElement('link')
  link.rel = 'preload'
  link.as = 'image'
  link.href = getHomeBanner()
  link.media = '(min-width: 768px)'
  link.fetchPriority = 'high'
  document.head.appendChild(link)
}
