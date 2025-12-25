# Home Page - Developer Guide

## 📁 File Structure

```
frontend/
├── src/
│   ├── pages/
│   │   └── HomePage.jsx         # Main home page component (800+ lines)
│   ├── components/
│   │   └── SEO.jsx              # SEO meta tags and structured data
│   ├── utils/
│   │   └── performance.js       # Performance optimization utilities
│   └── index.css                # Global styles with animations
├── public/
│   ├── sitemap.xml              # SEO sitemap
│   └── robots.txt               # Search engine directives
└── index.html                   # HTML with meta tags
```

## 🎨 Customization Guide

### Changing Colors

All gradients use Tailwind CSS classes. Main color schemes:

```jsx
// Hero gradient background
from-blue-50 via-purple-50 to-pink-50

// Text gradients
from-blue-600 via-purple-600 to-pink-600

// Feature card gradients
features = [
  { color: 'from-blue-500 to-cyan-500' },
  { color: 'from-purple-500 to-pink-500' },
  { color: 'from-orange-500 to-red-500' },
  { color: 'from-green-500 to-emerald-500' },
  { color: 'from-yellow-500 to-amber-500' }
]
```

### Updating Content

#### Stats Section
```jsx
const stats = [
  { number: '10K+', label: 'Goals Achieved', icon: Target },
  // Add/edit stats here
]
```

#### Features
```jsx
const features = [
  {
    icon: BarChart3,
    title: 'Your Feature',
    description: 'Feature description',
    color: 'from-color-500 to-color-500',
    to: '/your-route'
  }
]
```

#### Benefits
```jsx
const benefits = [
  {
    icon: CheckCircle2,
    title: 'Benefit Title',
    description: 'Benefit description'
  }
]
```

#### Testimonials
```jsx
const testimonials = [
  {
    name: 'John Doe',
    role: 'Job Title',
    content: 'Review text',
    avatar: '👨' // Emoji or image URL
  }
]
```

#### FAQs
```jsx
const faqs = [
  {
    question: 'Question here?',
    answer: 'Answer here.'
  }
]
```

### Adjusting Animations

#### Animation Variants (Framer Motion)

```jsx
// Existing variants
const fadeInUp = {
  hidden: { opacity: 0, y: 60 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
}

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
}

// Create custom variant
const yourVariant = {
  hidden: { /* initial state */ },
  visible: { /* animated state */ }
}
```

#### CSS Animations

Available in `index.css`:
- `.animate-blob` - Morphing blob (7s)
- `.animate-float` - Floating effect (3s)
- `.animate-pulse-glow` - Glowing pulse (2s)
- `.animate-gradient` - Gradient shift (3s)
- `.animate-shimmer` - Shimmer effect (2s)
- `.animate-scale-pulse` - Scale pulse (2s)
- `.animate-bounce-in` - Bounce entrance (0.6s)
- `.animate-fade-in-up` - Fade up entrance (0.6s)

Animation delays:
- `.animation-delay-100` to `.animation-delay-4000`

### Performance Optimization

#### Disable Animations on Low-End Devices

```jsx
import { shouldReduceAnimations } from '../utils/performance'

const HomePage = () => {
  const reduceAnimations = shouldReduceAnimations()
  
  return (
    <motion.div
      animate={reduceAnimations ? {} : { opacity: 1 }}
    >
      {/* content */}
    </motion.div>
  )
}
```

#### Lazy Load Components

```jsx
const YourComponent = lazy(() => import('../components/YourComponent'))

// Use with Suspense
<Suspense fallback={<LoadingSpinner />}>
  <YourComponent />
</Suspense>
```

#### Intersection Observer

```jsx
const AnimatedSection = ({ children }) => {
  const ref = useRef(null)
  const isInView = useInView(ref, { 
    once: true,        // Animate only once
    margin: "-100px"   // Trigger 100px before element enters viewport
  })

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
    >
      {children}
    </motion.div>
  )
}
```

## 🔧 Common Tasks

### Adding a New Section

```jsx
// 1. Create data if needed
const newSectionData = [...]

// 2. Add section to return statement
<section className="py-20">
  <div className="container mx-auto px-4 sm:px-6 lg:px-8">
    <AnimatedSection className="text-center mb-16">
      <h2 className="text-4xl font-bold">
        Your <span className="text-gradient">Title</span>
      </h2>
    </AnimatedSection>
    
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
    >
      {newSectionData.map((item, i) => (
        <motion.div key={i} variants={fadeInUp}>
          {/* Content */}
        </motion.div>
      ))}
    </motion.div>
  </div>
</section>
```

### Updating SEO

#### Page-specific SEO

```jsx
import SEO from '../components/SEO'

<SEO
  title="Your Page Title"
  description="Your description"
  keywords="keyword1, keyword2"
  schema={yourSchemaData}
/>
```

#### Update Sitemap

Edit `public/sitemap.xml`:
```xml
<url>
  <loc>https://wishtrail.in/new-page</loc>
  <lastmod>2025-12-25</lastmod>
  <changefreq>weekly</changefreq>
  <priority>0.8</priority>
</url>
```

### Changing Hero Animation

```jsx
// Adjust parallax settings
const { scrollYProgress } = useScroll({
  target: heroRef,
  offset: ["start start", "end start"]
})

const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0])
const scale = useTransform(scrollYProgress, [0, 0.5], [1, 0.95])

// Apply to hero section
<motion.div style={{ opacity, scale }}>
  {/* Hero content */}
</motion.div>
```

### Adding Icons

Using Lucide React:
```jsx
import { YourIcon } from 'lucide-react'

<YourIcon className="h-6 w-6 text-purple-600" />
```

## 🐛 Troubleshooting

### Animation Not Working

1. Check if element is in viewport
2. Verify `initial` and `animate` props
3. Check if `useInView` hook is configured correctly
4. Ensure parent has `overflow: visible`

### Performance Issues

1. Check if too many animations running simultaneously
2. Use `once: true` in `useInView` hooks
3. Lazy load heavy components
4. Reduce particle count (floating stars)
5. Use `will-change` CSS property

### SEO Not Updating

1. Clear cache
2. Check if SEO component is rendered
3. Verify meta tags in browser dev tools
4. Test with Google's Rich Results Test
5. Submit updated sitemap to Google Search Console

## 📱 Responsive Breakpoints

```css
/* Mobile (default) */
text-4xl px-4

/* Tablet (640px+) */
sm:text-6xl sm:px-6

/* Desktop (768px+) */
md:basis-1/2 md:grid-cols-2

/* Large Desktop (1024px+) */
lg:text-8xl lg:grid-cols-4 lg:px-8
```

## 🎯 Best Practices

### Do's ✅
- Use semantic HTML (`<section>`, `<article>`, `<nav>`)
- Add `aria-label` to buttons
- Include `alt` text for images
- Test with keyboard navigation
- Support reduced motion preference
- Optimize images (WebP format)
- Lazy load below-the-fold content

### Don'ts ❌
- Don't animate too many elements at once
- Don't block user interactions during animations
- Don't use heavy images in hero section
- Don't forget mobile testing
- Don't skip accessibility testing
- Don't hardcode URLs (use environment variables)

## 🔍 Testing Checklist

- [ ] Desktop (Chrome, Firefox, Safari, Edge)
- [ ] Mobile (iOS Safari, Chrome Android)
- [ ] Tablet (iPad)
- [ ] Dark mode
- [ ] Reduced motion
- [ ] Screen readers
- [ ] Keyboard navigation
- [ ] Page load speed (<3s)
- [ ] Lighthouse audit (90+ scores)
- [ ] SEO validation

## 📊 Analytics to Track

```javascript
// Example analytics events
gtag('event', 'cta_click', {
  event_category: 'engagement',
  event_label: 'hero_cta'
});

gtag('event', 'scroll_depth', {
  event_category: 'engagement',
  event_label: '50%'
});

gtag('event', 'feature_click', {
  event_category: 'navigation',
  event_label: 'dashboard_feature'
});
```

## 🚀 Deployment

1. Build the project: `npm run build`
2. Test build locally: `npm run preview`
3. Deploy to Vercel/Netlify
4. Verify production URL
5. Submit sitemap to search engines
6. Monitor Core Web Vitals

## 📚 Resources

- [Framer Motion Docs](https://www.framer.com/motion/)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [Schema.org](https://schema.org)
- [Google Search Console](https://search.google.com/search-console)
- [Web.dev Performance](https://web.dev/performance/)
- [WCAG Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)

---

**Last Updated**: December 25, 2025
**Version**: 2.0.0
**Maintainer**: WishTrail Team
