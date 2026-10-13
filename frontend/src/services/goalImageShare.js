import html2canvas from 'html2canvas'

export async function renderGoalImage(element) {
  if (!element) throw new Error('Preview is not ready')
  await document.fonts.ready
  const clone = element.cloneNode(true)
  Object.assign(clone.style, { position: 'fixed', left: '-10000px', top: '0', transform: 'none', margin: '0' })
  clone.setAttribute('aria-hidden', 'true')
  document.body.appendChild(clone)
  try {
    for (const svg of clone.querySelectorAll('svg')) {
      const color = getComputedStyle(svg).color
      for (const node of [svg, ...svg.querySelectorAll('*')]) for (const attribute of ['stroke', 'fill']) {
        if (node.getAttribute(attribute) === 'currentColor') node.setAttribute(attribute, color)
      }
    }
    await Promise.all([...clone.querySelectorAll('img')].map(img => new Promise((resolve, reject) => {
      const timer = setTimeout(() => { cleanup(); reject(new Error('Photo could not load. Choose another template or retry.')) }, 15000)
      const cleanup = () => { clearTimeout(timer); img.onload = null; img.onerror = null }
      img.onload = () => { cleanup(); resolve() }
      img.onerror = () => { cleanup(); reject(new Error('Photo could not load. Choose another template or retry.')) }
      if (img.complete) img.naturalWidth ? img.onload() : img.onerror()
    })))
    const canvas = await html2canvas(clone, { scale: 3, width: 360, height: element.offsetHeight, backgroundColor: '#edf6ff', useCORS: true, allowTaint: false, logging: false })
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'))
    if (!blob) throw new Error('Image could not be generated. Please retry.')
    return new File([blob], 'wishtrail-journey.png', { type: 'image/png' })
  } finally { clone.remove() }
}

export function downloadGoalImage(file) {
  const url = URL.createObjectURL(file)
  const link = document.createElement('a')
  link.href = url; link.download = file.name; link.click()
  setTimeout(() => URL.revokeObjectURL(url), 30000)
}

export async function shareGoalImage(file) {
  if (window.ReactNativeWebView) {
    const base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result.split(',')[1])
      reader.onerror = () => reject(new Error('Unable to read the image'))
      reader.readAsDataURL(file)
    })
    const requestId = `share-${Date.now()}-${Math.random().toString(36).slice(2)}`
    return new Promise((resolve, reject) => {
      const cleanup = () => { clearTimeout(timer); window.removeEventListener('message', onMessage) }
      const onMessage = event => {
        let data
        try { data = JSON.parse(event.data) } catch { return }
        if (data.type !== 'WT_SHARE_IMAGE_RESULT' || data.requestId !== requestId) return
        cleanup()
        if (data.error) reject(new Error(data.error))
        else resolve('native')
      }
      const timer = setTimeout(() => { cleanup(); reject(new Error('Sharing did not respond. Update the app or try again.')) }, 120000)
      window.addEventListener('message', onMessage)
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'WT_SHARE_IMAGE', requestId, base64 }))
    })
  }
  if (navigator.canShare?.({ files: [file] })) {
    // File is prepared before this user gesture, preserving browser activation.
    await navigator.share({ files: [file] })
    return 'browser'
  }
  downloadGoalImage(file)
  return 'download'
}
