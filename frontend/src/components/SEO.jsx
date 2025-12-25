import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

const SEO = ({ 
  title = 'WishTrail - Dreams. Goals. Progress.',
  description = 'Transform your aspirations into achievable goals. Track your progress, get inspired, and make every year count with WishTrail. Join 5000+ users achieving their dreams.',
  keywords = 'goals, goal tracking, goal sharing, communities, personal development, wishlist, dream tracking, habit tracker, productivity, self improvement, journal, mood tracking, achievement, progress tracking',
  ogImage = '/og-image.jpg',
  schema = null
}) => {
  const location = useLocation()
  const url = `https://wishtrail.in${location.pathname}`

  useEffect(() => {
    // Update document title
    document.title = title

    // Update or create meta tags
    const updateMetaTag = (name, content, type = 'name') => {
      let element = document.querySelector(`meta[${type}="${name}"]`)
      if (!element) {
        element = document.createElement('meta')
        element.setAttribute(type, name)
        document.head.appendChild(element)
      }
      element.setAttribute('content', content)
    }

    // Standard meta tags
    updateMetaTag('description', description)
    updateMetaTag('keywords', keywords)
    
    // Open Graph tags
    updateMetaTag('og:title', title, 'property')
    updateMetaTag('og:description', description, 'property')
    updateMetaTag('og:url', url, 'property')
    updateMetaTag('og:type', 'website', 'property')
    updateMetaTag('og:image', ogImage, 'property')
    updateMetaTag('og:site_name', 'WishTrail', 'property')
    
    // Twitter Card tags
    updateMetaTag('twitter:card', 'summary_large_image')
    updateMetaTag('twitter:title', title)
    updateMetaTag('twitter:description', description)
    updateMetaTag('twitter:image', ogImage)
    
    // Additional SEO tags
    updateMetaTag('robots', 'index, follow')
    updateMetaTag('author', 'WishTrail')
    updateMetaTag('viewport', 'width=device-width, initial-scale=1.0')

    // Add or update canonical link
    let canonical = document.querySelector('link[rel="canonical"]')
    if (!canonical) {
      canonical = document.createElement('link')
      canonical.setAttribute('rel', 'canonical')
      document.head.appendChild(canonical)
    }
    canonical.setAttribute('href', url)

    // Add structured data if provided
    if (schema) {
      let scriptTag = document.querySelector('script[type="application/ld+json"]')
      if (!scriptTag) {
        scriptTag = document.createElement('script')
        scriptTag.setAttribute('type', 'application/ld+json')
        document.head.appendChild(scriptTag)
      }
      scriptTag.textContent = JSON.stringify(schema)
    }

  }, [title, description, keywords, url, ogImage, schema])

  return null
}

// Pre-configured SEO for home page
export const HomePageSEO = () => {
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": "WishTrail",
    "url": "https://wishtrail.in",
    "description": "Transform your aspirations into achievable goals. Track your progress, get inspired, and make every year count.",
    "applicationCategory": "LifestyleApplication",
    "operatingSystem": "Web, iOS, Android",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.9",
      "ratingCount": "5000",
      "bestRating": "5",
      "worstRating": "1"
    },
    "author": {
      "@type": "Organization",
      "name": "WishTrail",
      "url": "https://wishtrail.in"
    },
    "featureList": [
      "Personal goal dashboard",
      "Progress tracking and analytics",
      "Social feed and community",
      "Daily journal",
      "Leaderboards and achievements",
      "Goal discovery"
    ]
  }

  return (
    <SEO
      title="WishTrail - Transform Your Dreams Into Reality | Goal Tracking App"
      description="The ultimate goal tracking platform. Set, track, and achieve your dreams with powerful analytics, community support, and daily inspiration. Join 5000+ users achieving their goals. Free forever!"
      keywords="goal tracking app, dream tracker, personal development, goal setting, habit tracker, productivity app, achievement tracker, progress tracking, self improvement, goal planner, life goals, goal achievement, motivation app, wish list, bucket list app"
      schema={schema}
    />
  )
}

export default SEO
