# 🎨 WishTrail Home Page - Visual Design System

## Color Palette

### Primary Gradients
```
Hero Background (Light):  from-blue-50 → via-purple-50 → to-pink-50
Hero Background (Dark):   from-gray-900 → via-purple-900/20 → to-blue-900/20

Primary Text Gradient:    from-blue-600 → via-purple-600 → to-pink-600
Dark Mode Text Gradient:  from-blue-400 → via-purple-400 → to-pink-400

CTA Background:           from-blue-500 → to-purple-600
CTA Hover:                from-blue-600 → to-purple-700
```

### Feature Colors (Icon Backgrounds)
```
Dashboard:     from-blue-500 → to-cyan-500
Social Feed:   from-purple-500 → to-pink-500
Discover:      from-orange-500 → to-red-500
Journal:       from-green-500 → to-emerald-500
Leaderboard:   from-yellow-500 → to-amber-500
```

### Accent Colors
```
Purple:   #7c3aed (primary-600)
Blue:     #3b82f6 (blue-500)
Pink:     #ec4899 (pink-500)
Green:    #10b981 (emerald-500)
Yellow:   #f59e0b (amber-500)
```

## Typography

### Font Family
```css
font-family: 'Inter', sans-serif;
weights: 300, 400, 500, 600, 700, 800, 900
```

### Heading Sizes
```
Hero H1:        text-5xl sm:text-6xl lg:text-8xl (3rem → 6rem)
Section H2:     text-4xl sm:text-5xl (2.25rem → 3rem)
Card H3:        text-2xl (1.5rem)
Body (Large):   text-xl sm:text-2xl lg:text-3xl
Body (Regular): text-lg (1.125rem)
Body (Small):   text-sm (0.875rem)
```

## Spacing System

### Section Padding
```css
py-20        /* 5rem top/bottom for sections */
py-16        /* 4rem for smaller sections */

Container:
container mx-auto px-4 sm:px-6 lg:px-8
```

### Card Spacing
```css
p-8          /* Standard card padding */
p-6          /* Compact card padding */
gap-8        /* Grid gaps */
gap-6        /* Smaller gaps */
mb-16        /* Section title margin */
```

## Component Sizes

### Icons
```
Small:     h-4 w-4 (1rem)
Medium:    h-6 w-6 (1.5rem)
Large:     h-8 w-8 (2rem)
XL:        h-10 w-10 (2.5rem)
Hero Icon: h-12 w-12 (3rem)
Giant:     h-20 w-20 (5rem)
```

### Buttons
```css
Primary:
  px-8 py-4 text-lg      /* Hero buttons */
  px-6 py-3              /* Standard buttons */

Border Radius:
  rounded-lg    /* Buttons (0.5rem) */
  rounded-xl    /* Large buttons (0.75rem) */
  rounded-2xl   /* Cards (1rem) */
  rounded-full  /* Circular elements */
```

### Cards
```
Feature Card:     shrink-0 basis-[92%] sm:basis-[62%] lg:basis-[30%]
Stat Card:        Grid 2 cols → 4 cols
Benefit Card:     Grid 1 col → 2 cols → 3 cols
Testimonial:      Grid 1 col → 3 cols
```

## Animation Timings

### Entrance Animations
```
Fast:      0.3s - 0.4s  (small elements)
Medium:    0.5s - 0.8s  (cards, sections)
Slow:      1s - 1.5s    (hero elements)
```

### Hover Transitions
```css
transition-all duration-300    /* Standard hover */
transition-all duration-500    /* Smooth transitions */
```

### Stagger Delays
```
Initial delay:    0.1s - 0.3s
Between items:    0.1s
Total sequence:   0.1s × items count
```

### Infinite Animations
```
Blob:         7s ease infinite
Float:        3s ease-in-out infinite
Pulse Glow:   2s ease-in-out infinite
Gradient:     3s ease infinite
```

## Shadows & Depth

### Elevation Levels
```css
Level 1 (Subtle):
  shadow-lg
  0 10px 15px -3px rgba(0, 0, 0, 0.1)

Level 2 (Cards):
  shadow-xl
  0 20px 25px -5px rgba(0, 0, 0, 0.1)

Level 3 (Hover):
  shadow-2xl
  0 25px 50px -12px rgba(0, 0, 0, 0.25)

Button Shadows:
  0 4px 15px rgba(59, 130, 246, 0.3)
  0 8px 25px rgba(59, 130, 246, 0.4) [hover]
```

### Glass Morphism
```css
.glass-card {
  background: rgba(255, 255, 255, 0.2)
  backdrop-filter: blur(16px)
  border: 1px solid rgba(255, 255, 255, 0.3)
  box-shadow: 0 8px 32px rgba(31, 38, 135, 0.37)
}
```

## Effects & Filters

### Backdrop Blur
```css
backdrop-blur-lg    /* 16px blur */
backdrop-blur-md    /* 12px blur */
```

### Gradient Overlays
```css
opacity-0 → opacity-10   /* Hover state */
```

### Transform Effects
```css
Hover Up:     hover:y(-8px) hover:scale(1.02)
Scale:        hover:scale(1.05)
Translate:    hover:translate-x-2
Icon Scale:   group-hover:scale-110
```

## Interactive States

### Button States
```css
Default:   bg-gradient-to-r from-blue-500 to-purple-600
Hover:     from-blue-600 to-purple-700 + scale(1.05)
Active:    scale(0.98)
Disabled:  opacity-50 cursor-not-allowed
Focus:     outline-purple-500 outline-2 outline-offset-2
```

### Card States
```css
Default:   glass-card-hover
Hover:     y(-10px) scale(1.02) + enhanced shadow
Active:    scale(0.98)
```

## Responsive Breakpoints

```css
/* Mobile First */
Base:       < 640px    (default styles)
sm:         640px+     (tablets)
md:         768px+     (small desktops)
lg:         1024px+    (large desktops)
xl:         1280px+    (extra large)
2xl:        1536px+    (ultra wide)
```

## Dark Mode Adjustments

### Background Colors
```
Light:  white / gray-50
Dark:   gray-900 / gray-800
```

### Text Colors
```
Light:  gray-900 / gray-600
Dark:   white / gray-300
```

### Border Colors
```
Light:  gray-200
Dark:   gray-700
```

### Glass Effect
```
Light:  bg-white/20
Dark:   bg-white/5
```

## Accessibility

### Focus Indicators
```css
:focus-visible {
  outline: 2px solid #7c3aed
  outline-offset: 2px
}
```

### Color Contrast Ratios
```
Body Text:        4.5:1 minimum
Large Text:       3:1 minimum
Buttons:          4.5:1 minimum
```

### Touch Targets
```
Minimum:  44px × 44px
Buttons:  48px × 48px (hero CTAs)
```

## Performance Guidelines

### Animation Properties (Hardware Accelerated)
```css
✅ transform
✅ opacity
✅ filter

❌ width/height
❌ top/left
❌ margin/padding
```

### Will-Change
```css
.will-change-transform {
  will-change: transform;
}
```

### Image Loading
```html
loading="lazy"
decoding="async"
```

## Layout Patterns

### Hero Section
```
Height:       min-h-[90vh]
Alignment:    flex items-center justify-center
Container:    max-w-5xl mx-auto
```

### Content Sections
```
Padding:      py-20
Container:    container mx-auto
Max Width:    max-w-4xl (text content)
```

### Grid Layouts
```css
Stats:        grid-cols-2 lg:grid-cols-4
Benefits:     md:grid-cols-2 lg:grid-cols-3
Features:     Horizontal scroll
Testimonials: md:grid-cols-3
```

## Component Hierarchy

```
HomePage
├── Hero Section (Parallax)
│   ├── Badge
│   ├── Heading (with animated underline)
│   ├── Description
│   ├── CTA Buttons
│   ├── Social Proof
│   └── Scroll Indicator
├── Stats Section (4 cards)
├── Benefits Section (6 cards)
├── Features Carousel (5 cards)
├── Testimonials (3 cards)
├── Video Inspiration
├── FAQ (Collapsible)
└── CTA Section (Gradient background)
```

## Animation Sequence

```
1. Hero Badge        → 0s
2. Hero H1          → 0.1s
3. Hero Description → 0.3s
4. Hero Buttons     → 0.5s
5. Social Proof     → 0.7s
6. Floating Stars   → 0-6s (staggered)
7. Sections         → On scroll (Intersection Observer)
```

## Print Styles

```css
@media print {
  Hide: Buttons, Navigation, Animations
  Show: Content, Text, Images
  Colors: Adjust to grayscale
}
```

---

**Design Version**: 2.0
**Last Updated**: December 25, 2025
**Status**: Production Ready ✅
