import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * PageTransition Component
 * Handles page transitions and preloading for optimal performance
 */
const PageTransition = ({ children }) => {
  const location = useLocation()

  useEffect(() => {
    // Scroll to top on route change
    window.scrollTo({ top: 0, behavior: 'instant' })

    // Prefetch common pages
    const pagesToPrefetch = [
      '/inspiration',
      '/discover',
      '/leaderboard',
      '/auth'
    ]

    // Prefetch after a short delay to not block initial render
    const prefetchTimeout = setTimeout(() => {
      pagesToPrefetch.forEach(page => {
        const link = document.createElement('link')
        link.rel = 'prefetch'
        link.href = page
        document.head.appendChild(link)
      })
    }, 2000)

    // Announce route change to screen readers
    const announcement = document.createElement('div')
    announcement.setAttribute('role', 'status')
    announcement.setAttribute('aria-live', 'polite')
    announcement.setAttribute('aria-atomic', 'true')
    announcement.className = 'sr-only'
    announcement.textContent = `Navigated to ${location.pathname}`
    document.body.appendChild(announcement)

    setTimeout(() => {
      document.body.removeChild(announcement)
    }, 1000)

    return () => {
      clearTimeout(prefetchTimeout)
    }
  }, [location.pathname])

  return children
}

/**
 * Preload critical resources on HomePage
 */
export const useHomePagePreload = () => {
  useEffect(() => {
    // Preload critical images (if you have them)
    const criticalImages = [
      // '/images/hero-bg.webp',
      // '/images/og-image.jpg',
    ]

    criticalImages.forEach(src => {
      const img = new Image()
      img.src = src
    })

    // Prefetch fonts if not already loaded
    if (document.fonts && document.fonts.check) {
      const fontsToLoad = [
        '700 48px Inter',
        '400 16px Inter',
        '600 24px Inter'
      ]

      fontsToLoad.forEach(font => {
        document.fonts.load(font).catch(() => {
          // Silently fail if font loading fails
        })
      })
    }

    // Log performance metrics in development
    if (import.meta.env.DEV) {
      setTimeout(() => {
        if (window.performance && window.performance.timing) {
          const timing = window.performance.timing
          const loadTime = timing.loadEventEnd - timing.navigationStart
          const domContentLoaded = timing.domContentLoadedEventEnd - timing.navigationStart
          const firstPaint = performance.getEntriesByType('paint')[0]?.startTime

          console.group('🚀 Performance Metrics')
          console.log('Total Load Time:', `${loadTime}ms`)
          console.log('DOM Content Loaded:', `${domContentLoaded}ms`)
          console.log('First Paint:', firstPaint ? `${Math.round(firstPaint)}ms` : 'N/A')
          console.groupEnd()
        }
      }, 0)
    }
  }, [])
}

/**
 * Service Worker registration for PWA
 */
export const registerServiceWorker = () => {
  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then(registration => {
          console.log('SW registered:', registration)
        })
        .catch(error => {
          console.log('SW registration failed:', error)
        })
    })
  }
}

/**
 * Detect slow connection and adjust experience
 */
export const useConnectionOptimization = () => {
  useEffect(() => {
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection
    
    if (connection) {
      const handleConnectionChange = () => {
        if (connection.saveData || connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') {
          document.documentElement.classList.add('reduced-animations')
          console.log('⚡ Reduced animations enabled for slow connection')
        } else {
          document.documentElement.classList.remove('reduced-animations')
        }
      }

      handleConnectionChange()
      connection.addEventListener('change', handleConnectionChange)

      return () => {
        connection.removeEventListener('change', handleConnectionChange)
      }
    }
  }, [])
}

/**
 * Visibility change handler - pause animations when tab is hidden
 */
export const useVisibilityOptimization = () => {
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        document.documentElement.classList.add('page-hidden')
      } else {
        document.documentElement.classList.remove('page-hidden')
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])
}

/**
 * Memory optimization - cleanup unused resources
 */
export const useMemoryOptimization = () => {
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      // Clear old localStorage items
      const now = Date.now()
      const maxAge = 7 * 24 * 60 * 60 * 1000 // 7 days

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key?.startsWith('cache_')) {
          try {
            const item = JSON.parse(localStorage.getItem(key) || '{}')
            if (item.timestamp && now - item.timestamp > maxAge) {
              localStorage.removeItem(key)
            }
          } catch (e) {
            // Invalid JSON, remove it
            localStorage.removeItem(key)
          }
        }
      }
    }, 60000) // Check every minute

    return () => clearInterval(cleanupInterval)
  }, [])
}

export default PageTransition
