export function readThemeMode() {
  try {
    const state = JSON.parse(localStorage.getItem('wishtrail-api-store') || '{}').state || {}
    if (['light', 'dark', 'system'].includes(state.themeMode)) return state.themeMode
    if (typeof state.isDarkMode === 'boolean') return state.isDarkMode ? 'dark' : 'light'
  } catch { /* Unavailable storage still follows the device. */ }
  return 'system'
}
export function resolveDarkMode(mode) {
  return mode === 'dark' || (mode === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches)
}
export function applyTheme(isDark) {
  if (typeof document === 'undefined') return
  document.documentElement.classList.toggle('dark', isDark)
  document.documentElement.style.colorScheme = isDark ? 'dark' : 'light'
  document.documentElement.style.backgroundColor = ''
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', isDark ? '#0B1220' : '#f7f9fc')
  window.ReactNativeWebView?.postMessage(JSON.stringify({ type: 'WT_THEME', theme: isDark ? 'dark' : 'light' }))
}

// Shared by the generated SVG compositions; no filters are applied to user photos.
export const darkHeroPalette = { deep: '#0b1220', base: '#102a43', mid: '#244866', light: '#39739b', glow: '#58a6f2' }
