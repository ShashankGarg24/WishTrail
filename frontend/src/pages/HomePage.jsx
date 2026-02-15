import { motion, useScroll, useTransform, useInView } from 'framer-motion'
import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { 
  Target, TrendingUp, Users, Play, ArrowRight, 
  Activity, BarChart3, MessageCircle, Sparkles,
  CheckCircle2, Calendar, Award, Heart, ThumbsUp,
  Plus, Edit3, Zap, LayoutDashboard
} from 'lucide-react'
import useApiStore from '../store/apiStore'
import { HomePageSEO } from '../components/SEO'

// Animation variants
const fadeInUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } 
  }
}

const fadeIn = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1, 
    transition: { duration: 0.8, ease: "easeOut" } 
  }
}

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { 
      staggerChildren: 0.15, 
      delayChildren: 0.2 
    }
  }
}

const scaleIn = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { 
    opacity: 1, 
    scale: 1, 
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } 
  }
}

// Animated Section Component
const AnimatedSection = ({ children, className = "", variants = fadeInUp }) => {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-80px" })

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={variants}
      className={className}
    >
      {children}
    </motion.div>
  )
}

const HomePage = () => {
  const { isAuthenticated } = useApiStore()
  const navigate = useNavigate()
  const heroRef = useRef(null)
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"]
  })
  
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0])
  const y = useTransform(scrollYProgress, [0, 1], [0, 150])

  const handleGetStarted = () => {
    if (isAuthenticated) {
      navigate('/dashboard')
    } else {
      navigate('/auth')
    }
  }

  const handleViewDemo = () => {
    // Scroll to demo section or open demo
    const demoSection = document.getElementById('how-it-works')
    if (demoSection) {
      demoSection.scrollIntoView({ behavior: 'smooth' })
    }
  }

  // Feature cards data
  const features = [
    {
      icon: Target,
      label: 'DISCOVERY',
      title: 'Personalized Goals',
      description: 'Define your path with clarity. Our smart suggestion engine helps you break down big dreams into actionable steps tailored to your pace.',
      color: 'text-blue-500',
      bgColor: 'bg-blue-50 dark:bg-blue-950/30',
      iconBg: 'bg-blue-100 dark:bg-blue-900/50'
    },
    {
      icon: TrendingUp,
      label: 'CONSISTENCY',
      title: 'Habit Building',
      description: 'Consistency is key. Track daily routines with minimalist design and feedback and streaks that motivate without the overwhelm.',
      color: 'text-purple-500',
      bgColor: 'bg-purple-50 dark:bg-purple-950/30',
      iconBg: 'bg-purple-100 dark:bg-purple-900/50'
    },
    {
      icon: Users,
      label: 'SHARED WISDOM',
      title: 'Community Support',
      description: 'You\'re not alone. Connect with like-minded explorers, share your progress, and find inspiration in shared journeys.',
      color: 'text-indigo-500',
      bgColor: 'bg-indigo-50 dark:bg-indigo-950/30',
      iconBg: 'bg-indigo-100 dark:bg-indigo-900/50'
    }
  ]

  // Stats data
  const stats = [
    { value: '12,000+', label: 'explorers' },
    { value: '94.2%', label: 'Consistency' },
    { value: '84.2%', label: 'Total Engagement' }
  ]

  // Activity heatmap mock data
  const generateHeatmapData = () => {
    const weeks = 7
    const daysPerWeek = 7
    const data = []
    
    for (let week = 0; week < weeks; week++) {
      for (let day = 0; day < daysPerWeek; day++) {
        const intensity = Math.floor(Math.random() * 5)
        data.push({ week, day, intensity })
      }
    }
    return data
  }

  const heatmapData = generateHeatmapData()

  return (
    <>
      <HomePageSEO />
      <div className="min-h-screen bg-white dark:bg-gray-900 font-manrope overflow-x-hidden">

        {/* Hero Section */}
        <section 
          ref={heroRef}
          className="relative pt-20 pb-12 sm:pt-24 sm:pb-16 md:pt-32 md:pb-24 lg:pt-40 lg:pb-32 px-4 sm:px-6 overflow-hidden bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-900"
        >
          {/* Background decoration */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-20 right-0 w-[300px] sm:w-[500px] h-[300px] sm:h-[500px] bg-blue-400/10 dark:bg-blue-500/5 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-[250px] sm:w-[400px] h-[250px] sm:h-[400px] bg-purple-400/10 dark:bg-purple-500/5 rounded-full blur-3xl" />
          </div>

          <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-8 sm:gap-12 items-center relative z-10">
            {/* Left Content */}
            <motion.div
              style={{ opacity, y }}
              className="space-y-8"
            >
              {/* Mobile Dashboard Preview - Above Heading */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="md:hidden w-full max-w-xl mx-auto mb-16"
                style={{ perspective: '1200px' }}
              >
                <motion.div
                  initial={{ opacity: 0, rotateY: -15, rotateX: 8, rotateZ: -3, scale: 0.96 }}
                  animate={{ opacity: 1, rotateY: -20, rotateX: 10, rotateZ: -3, scale: 1 }}
                  transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                  className="relative bg-gradient-to-br from-gray-50 via-white to-gray-50/50 dark:from-gray-800 dark:via-gray-900 dark:to-gray-800/50 rounded-[16px] shadow-[0_20px_70px_rgba(0,0,0,0.25)] dark:shadow-[0_20px_70px_rgba(0,0,0,0.7)] border border-gray-200/60 dark:border-gray-700/60 overflow-hidden"
                  style={{ transformStyle: 'preserve-3d' }}
                >
                  <div className="relative p-10">
                    {/* Sidebar Navigation Icons */}
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 space-y-2">
                      {/* Active Dashboard Icon */}
                      <motion.div
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5, delay: 0.4 }}
                        className="w-6 h-6 rounded-lg bg-[#4c99e6] flex items-center justify-center shadow-md"
                      >
                        <LayoutDashboard className="w-3.5 h-3.5 text-white" />
                      </motion.div>
                      
                      {/* Analytics Icon */}
                      <motion.div
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5, delay: 0.5 }}
                        className="w-6 h-6 rounded-lg bg-gray-200/80 dark:bg-gray-700/60 flex items-center justify-center"
                      >
                        <BarChart3 className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
                      </motion.div>
                      
                      {/* Feed Icon */}
                      <motion.div
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5, delay: 0.6 }}
                        className="w-6 h-6 rounded-lg bg-gray-200/80 dark:bg-gray-700/60 flex items-center justify-center"
                      >
                        <Activity className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
                      </motion.div>
                    </div>

                    {/* Main Content Area */}
                    <div className="ml-10">
                      {/* Top placeholder bars */}
                      <div className="space-y-1.5 mb-2.5">
                        <motion.div
                          initial={{ opacity: 0, scaleX: 0 }}
                          animate={{ opacity: 1, scaleX: 1 }}
                          transition={{ duration: 0.6, delay: 0.4 }}
                          className="h-1.5 bg-gray-300/40 dark:bg-gray-600/40 rounded-full w-2/3 origin-left"
                        />
                        <motion.div
                          initial={{ opacity: 0, scaleX: 0 }}
                          animate={{ opacity: 1, scaleX: 1 }}
                          transition={{ duration: 0.6, delay: 0.5 }}
                          className="h-1.5 bg-gray-300/30 dark:bg-gray-600/30 rounded-full w-1/3 origin-left"
                        />
                      </div>

                      {/* Goal Card */}
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ duration: 0.5, delay: 0.6 }}
                        className="bg-white dark:bg-gray-800 rounded-lg p-2 shadow-lg border border-gray-100 dark:border-gray-700"
                      >
                        <div className="flex items-start gap-1.5 mb-1.5">
                          {/* Green Mountain Icon */}
                          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center flex-shrink-0 shadow-sm">
                            <svg viewBox="0 0 24 24" fill="none" className="w-3 h-3">
                              <path d="M12 3L4 20h16L12 3z" fill="white" />
                            </svg>
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <h3 className="text-[10px] font-bold text-gray-900 dark:text-white mb-0.5 leading-tight">
                              Summit Everest Base
                            </h3>
                            <p className="text-[8px] text-emerald-600 dark:text-emerald-400 font-medium">
                              Active Milestone
                            </p>
                          </div>
                          
                          {/* Three dots menu */}
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.4, delay: 0.8 }}
                            className="w-4 h-4 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0"
                          >
                            <div className="flex flex-col gap-0.5">
                              <div className="w-0.5 h-0.5 rounded-full bg-gray-500 dark:bg-gray-400" />
                              <div className="w-0.5 h-0.5 rounded-full bg-gray-500 dark:bg-gray-400" />
                              <div className="w-0.5 h-0.5 rounded-full bg-gray-500 dark:bg-gray-400" />
                            </div>
                          </motion.div>
                        </div>

                        {/* Progress Section */}
                        <div className="space-y-0.5">
                          <div className="h-1 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: '65%' }}
                              transition={{ duration: 1.5, delay: 0.7, ease: [0.4, 0, 0.2, 1] }}
                              className="h-full bg-gradient-to-r from-emerald-400 to-green-500 rounded-full"
                            />
                          </div>
                          <p className="text-[7px] text-gray-500 dark:text-gray-400 font-medium tracking-wide">
                            65% REACHED
                          </p>
                        </div>
                      </motion.div>
                    </div>
                  </div>
                </motion.div>
              </motion.div>

              {/* Heading */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="space-y-4"
              >
                <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white leading-tight font-manrope">
                  Transform Your{' '}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-blue-600">
                    Wishes
                  </span>
                  {' '}into Trails of Success
                </h1>
                
                <p className="text-sm sm:text-base md:text-lg text-gray-600 dark:text-gray-400 leading-relaxed max-w-xl font-manrope">
                  The professional platform designed for personal growth. Map your ambitions, track your habits, and join a community of high-achievers turning dreams into reality.
                </p>
              </motion.div>

              {/* CTA Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4"
              >
                <button
                  onClick={handleGetStarted}
                  className="group px-6 sm:px-8 py-3 sm:py-4 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-semibold text-sm sm:text-base shadow-xl shadow-blue-500/30 hover:shadow-2xl hover:shadow-blue-500/40 transition-all duration-300 flex items-center justify-center gap-2"
                >
                  Get Started
                  <ArrowRight className="w-4 sm:w-5 h-4 sm:h-5 group-hover:translate-x-1 transition-transform" />
                </button>
                
                <button
                  onClick={handleViewDemo}
                  className="group px-6 sm:px-8 py-3 sm:py-4 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-xl font-semibold text-sm sm:text-base hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-300 flex items-center justify-center gap-2 shadow-lg"
                >
                  <Play className="w-4 sm:w-5 h-4 sm:h-5" />
                  See How it Works
                </button>
              </motion.div>

              {/* Social Proof */}
              {/* <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.6 }}
                className="flex items-center gap-4 pt-4"
              >
                <div className="flex -space-x-2">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 border-2 border-white dark:border-gray-900 flex items-center justify-center text-white font-semibold text-sm"
                    >
                      {String.fromCharCode(64 + i)}
                    </div>
                  ))}
                  <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 border-2 border-white dark:border-gray-900 flex items-center justify-center text-gray-600 dark:text-gray-400 font-semibold text-xs">
                    +12k
                  </div>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Joined by <span className="font-semibold text-gray-900 dark:text-white">12,000+ explorers</span>
                </p>
              </motion.div> */}
            </motion.div>

            {/* Right Content - Dashboard Preview */}
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="relative w-full max-w-14xl hidden md:block"
              style={{ perspective: '1200px' }}
            >
              {/* Main Card with 3D tilt */}
              <motion.div
                initial={{ opacity: 0, rotateY: -18, rotateX: 6, rotateZ: -2, scale: 0.96 }}
                animate={{ opacity: 1, rotateY: -28, rotateX: 12, rotateZ: -4, scale: 1 }}
                transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                className="relative bg-gradient-to-br from-gray-50 via-white to-gray-50/50 dark:from-gray-800 dark:via-gray-900 dark:to-gray-800/50 rounded-[20px] shadow-[0_25px_90px_rgba(0,0,0,0.2)] dark:shadow-[0_25px_90px_rgba(0,0,0,0.6)] border border-gray-200/60 dark:border-gray-700/60 overflow-hidden"
                style={{
                  transformStyle: 'preserve-3d',
                }}
              >
                <div className="relative p-20 lg:p-36">
                  {/* Sidebar Navigation Icons */}
                  <div className="absolute left-5 top-1/2 -translate-y-1/2 space-y-3">
                    {/* Active Dashboard Icon */}
                    <motion.div
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.5, delay: 0.6 }}
                      className="w-7 h-7 rounded-lg bg-[#4c99e6] flex items-center justify-center shadow-md"
                    >
                      <LayoutDashboard className="w-4 h-4 text-white" />
                    </motion.div>
                    
                    {/* Analytics Icon */}
                    <motion.div
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.5, delay: 0.7 }}
                      className="w-7 h-7 rounded-lg bg-gray-200/80 dark:bg-gray-700/60 flex items-center justify-center"
                    >
                      <BarChart3 className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    </motion.div>
                    
                    {/* Feed Icon */}
                    <motion.div
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.5, delay: 0.8 }}
                      className="w-7 h-7 rounded-lg bg-gray-200/80 dark:bg-gray-700/60 flex items-center justify-center"
                    >
                      <Activity className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    </motion.div>
                  </div>

                  {/* Main Content Area */}
                  <div className="ml-14">
                    {/* Top placeholder bars */}
                    <div className="space-y-3 mb-8">
                      <motion.div
                        initial={{ opacity: 0, scaleX: 0 }}
                        animate={{ opacity: 1, scaleX: 1 }}
                        transition={{ duration: 0.6, delay: 0.5 }}
                        className="h-4 bg-gray-300/40 dark:bg-gray-600/40 rounded-full w-2/3 origin-left"
                      />
                      <motion.div
                        initial={{ opacity: 0, scaleX: 0 }}
                        animate={{ opacity: 1, scaleX: 1 }}
                        transition={{ duration: 0.6, delay: 0.6 }}
                        className="h-4 bg-gray-300/30 dark:bg-gray-600/30 rounded-full w-1/3 origin-left"
                      />
                    </div>

                    {/* Goal Card */}
                    <motion.div
                      initial={{ opacity: 0, y: 20, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ duration: 0.5, delay: 0.7 }}
                      className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-lg border border-gray-100 dark:border-gray-700"
                    >
                      <div className="flex items-start gap-3 mb-3.5">
                        {/* Green Mountain Icon */}
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center flex-shrink-0 shadow-sm">
                          <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
                            <path d="M12 3L4 20h16L12 3z" fill="white" />
                          </svg>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-0.5 leading-tight">
                            Summit Everest Base
                          </h3>
                          <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                            Active Milestone
                          </p>
                        </div>
                        
                        {/* Three dots menu */}
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.4, delay: 1.1 }}
                          className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0"
                        >
                          <div className="flex flex-col gap-0.5">
                            <div className="w-1 h-1 rounded-full bg-gray-500 dark:bg-gray-400" />
                            <div className="w-1 h-1 rounded-full bg-gray-500 dark:bg-gray-400" />
                            <div className="w-1 h-1 rounded-full bg-gray-500 dark:bg-gray-400" />
                          </div>
                        </motion.div>
                      </div>

                      {/* Progress Section */}
                      <div className="space-y-1.5">
                        <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: '65%' }}
                            transition={{ duration: 1.5, delay: 0.9, ease: [0.4, 0, 0.2, 1] }}
                            className="h-full bg-gradient-to-r from-emerald-400 to-green-500 rounded-full"
                          />
                        </div>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium tracking-wide">
                          65% REACHED
                        </p>
                      </div>
                    </motion.div>
                  </div>
                </div>
              </motion.div>

            </motion.div>
          </div>
        </section>

        {/* Explore Our Features Section */}
        <section className="py-12 sm:py-16 md:py-20 lg:py-32 px-4 sm:px-6 bg-gradient-to-b from-gray-50 to-white dark:from-gray-800 dark:to-gray-900">
          <div className="max-w-7xl mx-auto">
            <AnimatedSection className="text-center mb-8 sm:mb-12 md:mb-16">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4 sm:mb-6 font-manrope">
                Built for Your Growth
              </h2>
              
              <p className="text-base text-gray-600 dark:text-gray-400 max-w-3xl mx-auto leading-relaxed font-manrope">
                WishTrail combines psychology and minimalist design to help you reach the milestones that matter most to you.
              </p>
            </AnimatedSection>

            {/* Features Grid with Horizontal Scroll */}
            <div className="relative">
              <div className="flex overflow-x-auto snap-x snap-mandatory gap-4 sm:gap-6 pb-6 sm:pb-8 scrollbar-hide -mx-4 px-4 md:px-0">
                {/* Feature 1: Personalized Goals */}
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.1 }}
                  className="flex-shrink-0 w-[85%] sm:w-[45%] lg:w-[30%] snap-start"
                >
                  <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 h-full shadow-lg border border-gray-100 dark:border-gray-700 hover:shadow-xl transition-all duration-300 group">
                    <div className="mb-6">
                      <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                        <Target className="w-7 h-7 text-blue-600 dark:text-blue-400" />
                      </div>
                    </div>
                    
                    <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-3 sm:mb-4 font-manrope">
                      Personalized Goals
                    </h3>
                    
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-4 sm:mb-6 font-manrope">
                      Define your path with clarity. Our smart suggestion engine helps you break down big dreams into actionable steps tailored to your pace.
                    </p>
                    
                    <div className="mt-auto pt-4 border-t border-gray-100 dark:border-gray-700">
                      <div className="flex items-center gap-2 text-sm font-semibold text-blue-600 dark:text-blue-400">
                        <span className="uppercase tracking-wider">DISCOVERY</span>
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Feature 2: Habit Building */}
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  className="flex-shrink-0 w-[85%] sm:w-[45%] lg:w-[30%] snap-start"
                >
                  <div className="bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl p-6 sm:p-8 h-full shadow-lg border border-gray-100 dark:border-gray-700 hover:shadow-xl transition-all duration-300 group">
                    <div className="mb-4 sm:mb-6">
                      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-purple-50 dark:bg-purple-950/50 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                        <Zap className="w-6 h-6 sm:w-7 sm:h-7 text-purple-600 dark:text-purple-400" />
                      </div>
                    </div>
                    
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 font-manrope">
                      Habit Building
                    </h3>
                    
                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-6 font-manrope">
                      Consistency is key. Track daily routines with minimalist feedback and streaks that motivate without the overwhelm.
                    </p>
                    
                    <div className="mt-auto pt-4 border-t border-gray-100 dark:border-gray-700">
                      <div className="flex items-center gap-2 text-sm font-semibold text-purple-600 dark:text-purple-400">
                        <span className="uppercase tracking-wider">CONSISTENCY</span>
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Feature 3: Community Support */}
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.3 }}
                  className="flex-shrink-0 w-[85%] sm:w-[45%] lg:w-[30%] snap-start"
                >
                  <div className="bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl p-6 sm:p-8 h-full shadow-lg border border-gray-100 dark:border-gray-700 hover:shadow-xl transition-all duration-300 group">
                    <div className="mb-4 sm:mb-6">
                      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                        <Users className="w-6 h-6 sm:w-7 sm:h-7 text-indigo-600 dark:text-indigo-400" />
                      </div>
                    </div>
                    
                    <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-3 sm:mb-4 font-manrope">
                      Community Support
                    </h3>
                    
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-4 sm:mb-6 font-manrope">
                      You're not alone. Connect with like-minded explorers, share your progress, and find inspiration in shared journeys.
                    </p>
                    
                    <div className="mt-auto pt-4 border-t border-gray-100 dark:border-gray-700">
                      <div className="flex items-center gap-2 text-sm font-semibold text-indigo-600 dark:text-indigo-400">
                        <span className="uppercase tracking-wider">SHARED WISDOM</span>
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Feature 4: Personal Dashboard */}
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.4 }}
                  className="flex-shrink-0 w-[85%] sm:w-[45%] lg:w-[30%] snap-start"
                >
                  <div className="bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl p-6 sm:p-8 h-full shadow-lg border border-gray-100 dark:border-gray-700 hover:shadow-xl transition-all duration-300 group">
                    <div className="mb-4 sm:mb-6">
                      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-cyan-50 dark:bg-cyan-950/50 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                        <BarChart3 className="w-6 h-6 sm:w-7 sm:h-7 text-cyan-600 dark:text-cyan-400" />
                      </div>
                    </div>
                    
                    <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-3 sm:mb-4 font-manrope">
                      Personal Dashboard
                    </h3>
                    
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-4 sm:mb-6 font-manrope">
                      Track streaks, goals, and progress at a glance with real-time analytics that reveal patterns and celebrate growth.
                    </p>
                    
                    <div className="mt-auto pt-4 border-t border-gray-100 dark:border-gray-700">
                      <div className="flex items-center gap-2 text-sm font-semibold text-cyan-600 dark:text-cyan-400">
                        <span className="uppercase tracking-wider">INSIGHTS</span>
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Feature 5: Social Feed */}
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.5 }}
                  className="flex-shrink-0 w-[85%] sm:w-[45%] lg:w-[30%] snap-start"
                >
                  <div className="bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl p-6 sm:p-8 h-full shadow-lg border border-gray-100 dark:border-gray-700 hover:shadow-xl transition-all duration-300 group">
                    <div className="mb-4 sm:mb-6">
                      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-pink-50 dark:bg-pink-950/50 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                        <Heart className="w-6 h-6 sm:w-7 sm:h-7 text-pink-600 dark:text-pink-400" />
                      </div>
                    </div>
                    
                    <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-3 sm:mb-4 font-manrope">
                      Social Feed
                    </h3>
                    
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-4 sm:mb-6 font-manrope">
                      See goal updates from people you follow. Like and comment instantly to build meaningful connections.
                    </p>
                    
                    <div className="mt-auto pt-4 border-t border-gray-100 dark:border-gray-700">
                      <div className="flex items-center gap-2 text-sm font-semibold text-pink-600 dark:text-pink-400">
                        <span className="uppercase tracking-wider">CONNECTION</span>
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Feature 6: Daily Journal */}
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.6 }}
                  className="flex-shrink-0 w-[85%] sm:w-[45%] lg:w-[30%] snap-start"
                >
                  <div className="bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl p-6 sm:p-8 h-full shadow-lg border border-gray-100 dark:border-gray-700 hover:shadow-xl transition-all duration-300 group">
                    <div className="mb-4 sm:mb-6">
                      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-green-50 dark:bg-green-950/50 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                        <Edit3 className="w-6 h-6 sm:w-7 sm:h-7 text-green-600 dark:text-green-400" />
                      </div>
                    </div>
                    
                    <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-3 sm:mb-4 font-manrope">
                      Daily Journal
                    </h3>
                    
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-4 sm:mb-6 font-manrope">
                      Capture reflections, moods, and insights in seconds. Your personal growth companion for mindful progress.
                    </p>
                    
                    <div className="mt-auto pt-4 border-t border-gray-100 dark:border-gray-700">
                      <div className="flex items-center gap-2 text-sm font-semibold text-green-600 dark:text-green-400">
                        <span className="uppercase tracking-wider">REFLECTION</span>
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Feature 7: Leaderboards */}
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.7 }}
                  className="flex-shrink-0 w-[85%] sm:w-[45%] lg:w-[30%] snap-start"
                >
                  <div className="bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl p-6 sm:p-8 h-full shadow-lg border border-gray-100 dark:border-gray-700 hover:shadow-xl transition-all duration-300 group">
                    <div className="mb-4 sm:mb-6">
                      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                        <Award className="w-6 h-6 sm:w-7 sm:h-7 text-amber-600 dark:text-amber-400" />
                      </div>
                    </div>
                    
                    <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-3 sm:mb-4 font-manrope">
                      Leaderboards
                    </h3>
                    
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-4 sm:mb-6 font-manrope">
                      Climb rankings and celebrate achievements with the community. Friendly competition that inspires excellence.
                    </p>
                    
                    <div className="mt-auto pt-4 border-t border-gray-100 dark:border-gray-700">
                      <div className="flex items-center gap-2 text-sm font-semibold text-amber-600 dark:text-amber-400">
                        <span className="uppercase tracking-wider">ACHIEVEMENT</span>
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Feature 8: Discover People & Goals */}
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.8 }}
                  className="flex-shrink-0 w-[85%] sm:w-[45%] lg:w-[30%] snap-start"
                >
                  <div className="bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl p-6 sm:p-8 h-full shadow-lg border border-gray-100 dark:border-gray-700 hover:shadow-xl transition-all duration-300 group">
                    <div className="mb-4 sm:mb-6">
                      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-orange-50 dark:bg-orange-950/50 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                        <TrendingUp className="w-6 h-6 sm:w-7 sm:h-7 text-orange-600 dark:text-orange-400" />
                      </div>
                    </div>
                    
                    <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-3 sm:mb-4 font-manrope">
                      Discover & Explore
                    </h3>
                    
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-4 sm:mb-6 font-manrope">
                      Find inspiring users and trending goals tailored to your interests. Your next big goal is just a discovery away.
                    </p>
                    
                    <div className="mt-auto pt-4 border-t border-gray-100 dark:border-gray-700">
                      <div className="flex items-center gap-2 text-sm font-semibold text-orange-600 dark:text-orange-400">
                        <span className="uppercase tracking-wider">EXPLORATION</span>
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Scroll Indicators */}
              <div className="flex justify-center gap-2 mt-8">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600" />
                ))}
              </div>
            </div>

            {/* Bottom CTA */}
            {/* <AnimatedSection className="text-center mt-16">
              <div className="inline-flex items-center gap-3 px-6 py-3 bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700">
                <div className="flex -space-x-2">
                  {[1, 2, 3].map((i) => (
                    <img
                      key={i}
                      src={`https://api.dicebear.com/7.x/avataaars/svg?seed=user${i}`}
                      alt={`User ${i}`}
                      className="w-8 h-8 rounded-full border-2 border-white dark:border-gray-800"
                    />
                  ))}
                  <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold border-2 border-white dark:border-gray-800">
                    +12k
                  </div>
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    Join 12,000+ others tracking their dreams.
                  </p>
                  <Link to="/auth" className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold flex items-center gap-1">
                    See how it works <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </AnimatedSection> */}
          </div>
        </section>

        {/* Section 1: Create Goals & Habits Dashboard */}
        <section className="py-12 sm:py-16 md:py-20 lg:py-32 px-4 sm:px-6 bg-white dark:bg-gray-900" id="create-goals">
          <div className="max-w-7xl mx-auto">
            <div className="grid md:grid-cols-2 gap-8 sm:gap-10 md:gap-12 lg:gap-16 items-center">
              {/* Left Content - Dashboard Animation */}
              <AnimatedSection>
                <div className="relative">
                  {/* Main Dashboard Card */}
                  <div className="relative bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-2xl p-4 sm:p-6 border border-gray-200 dark:border-gray-700">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4 sm:mb-6">
                      <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white font-manrope">Your Dashboard</h3>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleGetStarted}
                        className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-[#4c99e6] hover:bg-[#3d88d5] text-white rounded-lg transition-colors shadow-sm font-manrope font-medium text-xs sm:text-sm"
                      >
                        <Plus className="w-4 h-4" />
                        Add Goal
                      </motion.button>
                    </div>

                    {/* Animated Goal Creation */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.6, delay: 0.3 }}
                      className="space-y-4"
                    >
                      {/* Goal Card 1 */}
                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: 0.5 }}
                        className="bg-white dark:bg-gray-900/50 rounded-lg sm:rounded-xl p-3 sm:p-4 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all cursor-pointer"
                      >
                        <div className="flex items-start gap-2 sm:gap-3">
                          <div className="p-1.5 sm:p-2 bg-gray-50 dark:bg-gray-700 rounded-lg flex-shrink-0">
                            <Target className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-500 dark:text-gray-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-gray-900 dark:text-white text-xs sm:text-sm font-manrope mb-1">Learn Photography</h4>
                            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                              <span className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-[#4c99e6]"></span>
                                CREATIVITY
                              </span>
                              <span>90d</span>
                            </div>
                          </div>
                        </div>
                      </motion.div>

                      {/* Habit Card */}
                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: 0.7 }}
                        className="bg-white dark:bg-gray-900/50 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all cursor-pointer"
                      >
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-gray-50 dark:bg-gray-700 rounded-lg flex-shrink-0">
                            <Zap className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-gray-900 dark:text-white text-sm font-manrope mb-2">Morning Exercise</h4>
    
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <span className="text-xs font-bold text-[#4c99e6]">5🔥</span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">streak</span>
                          </div>
                        </div>
                      </motion.div>

                      {/* Goal Card 2 */}
                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: 0.9 }}
                        className="bg-white dark:bg-gray-900/50 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all cursor-pointer"
                      >
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-gray-50 dark:bg-gray-700 rounded-lg flex-shrink-0">
                            <Award className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-gray-900 dark:text-white text-sm font-manrope mb-1">Read 24 Books This Year</h4>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs text-gray-500 dark:text-gray-400">Progress</span>
                              <span className="text-xs font-semibold text-gray-900 dark:text-white">11/24</span>
                            </div>
                            <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                whileInView={{ width: '45%' }}
                                viewport={{ once: true }}
                                transition={{ duration: 1.2, delay: 1.1, ease: "easeOut" }}
                                className="h-full bg-[#4c99e6] rounded-full"
                              />
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    </motion.div>
                  </div>
                </div>
              </AnimatedSection>

              {/* Right Content */}
              <AnimatedSection className="space-y-4 sm:space-y-6 mt-8 md:mt-0">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 rounded-full"  id="how-it-works">
                  <span className="text-xs font-semibold text-blue-700 dark:text-blue-400 tracking-wide uppercase">
                    Start Your Journey
                  </span>
                </div>

                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 dark:text-white leading-tight font-manrope">
                  Create Goals & Build Habits
                </h2>

                <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed">
                  Define your path with clarity. Break down big dreams into actionable steps. Track daily routines with minimalist design and get instant feedback on your progress.
                </p>

                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-1">Smart Goal Setting</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">AI-powered suggestions to break down complex goals into achievable milestones</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckCircle2 className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-1">Habit Tracking</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Visual streak tracking that motivates without overwhelming</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-1">Progress Milestones</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Celebrate every step forward</p>
                    </div>
                  </div>
                </div>
              </AnimatedSection>
            </div>
          </div>
        </section>

        {/* Analytics Section - Visualize Your Progress */}
        <section className="py-12 sm:py-16 md:py-20 lg:py-32 px-4 sm:px-6 bg-gradient-to-b from-white to-gray-50 dark:from-gray-900 dark:to-gray-900">
          <div className="max-w-7xl mx-auto">
            <div className="grid md:grid-cols-2 gap-8 sm:gap-10 md:gap-12 lg:gap-16 items-center">
              {/* Left Content */}
              <AnimatedSection className="space-y-4 sm:space-y-6">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-purple-50 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-800 rounded-full">
                  <span className="text-xs font-semibold text-purple-700 dark:text-purple-400 tracking-wide uppercase">
                    Analytics & Insights
                  </span>
                </div>

                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 dark:text-white leading-tight font-manrope">
                  Visualize Your Progress
                </h2>

                <p className="text-sm sm:text-base md:text-lg text-gray-600 dark:text-gray-400 leading-relaxed">
                  Transform your daily efforts into meaningful data. Our intuitive dashboard helps you identify patterns, celebrate consistency, and stay on course.
                </p>

                {/* Motivation Tip */}
                <div className="bg-blue-50 dark:bg-blue-950/30 border-l-4 border-blue-500 rounded-lg p-4 sm:p-5">
                  <div className="flex items-start gap-3">
                    <div>
                      <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                        "Users who track progress daily are <span className="font-bold text-blue-700 dark:text-blue-400">3x more likely</span> to reach their 6-month milestones."
                      </p>
                    </div>
                  </div>
                </div>
              </AnimatedSection>

              {/* Right Content - Dashboard Preview */}
              <AnimatedSection className="mt-8 md:mt-0">
                <div className="relative bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-2xl p-4 sm:p-6 md:p-8 border border-gray-200 dark:border-gray-700">
                  {/* Growth Velocity Chart */}
                  <div className="mb-6 sm:mb-8">
                    <div className="flex items-center justify-between mb-4 sm:mb-6">
                      <div>
                        <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mb-1">
                          Growth Velocity
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Monthly habit completion rate
                        </p>
                      </div>
                      <div className="flex items-center gap-4 text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-blue-500" />
                          <span className="text-gray-600 dark:text-gray-400">This Year</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-gray-300 dark:bg-gray-600" />
                          <span className="text-gray-600 dark:text-gray-400">Average</span>
                        </div>
                      </div>
                    </div>

                    {/* Simple Line Chart Visualization */}
                    <div className="relative h-48">
                      <svg className="w-full h-full" viewBox="0 0 500 200" preserveAspectRatio="none">
                        {/* Grid lines */}
                        <line x1="0" y1="180" x2="500" y2="180" stroke="currentColor" className="text-gray-200 dark:text-gray-700" strokeWidth="1" />
                        <line x1="0" y1="120" x2="500" y2="120" stroke="currentColor" className="text-gray-200 dark:text-gray-700" strokeWidth="1" strokeDasharray="5,5" />
                        <line x1="0" y1="60" x2="500" y2="60" stroke="currentColor" className="text-gray-200 dark:text-gray-700" strokeWidth="1" strokeDasharray="5,5" />
                        
                        {/* Average line (flat) */}
                        <motion.path
                          d="M 0 130 L 500 130"
                          stroke="currentColor"
                          className="text-gray-300 dark:text-gray-600"
                          strokeWidth="2"
                          fill="none"
                          initial={{ pathLength: 0 }}
                          whileInView={{ pathLength: 1 }}
                          viewport={{ once: true }}
                          transition={{ duration: 1.5, delay: 0.3 }}
                        />
                        
                        {/* This year line (curved upward) */}
                        <motion.path
                          d="M 0 170 Q 80 165, 160 140 T 320 90 T 500 40"
                          stroke="currentColor"
                          className="text-blue-500"
                          strokeWidth="3"
                          fill="none"
                          strokeLinecap="round"
                          initial={{ pathLength: 0 }}
                          whileInView={{ pathLength: 1 }}
                          viewport={{ once: true }}
                          transition={{ duration: 2, delay: 0.5, ease: "easeOut" }}
                        />
                        
                        {/* Gradient fill under line */}
                        <defs>
                          <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="rgb(59, 130, 246)" stopOpacity="0.3" />
                            <stop offset="100%" stopColor="rgb(59, 130, 246)" stopOpacity="0" />
                          </linearGradient>
                        </defs>
                        <motion.path
                          d="M 0 170 Q 80 165, 160 140 T 320 90 T 500 40 L 500 200 L 0 200 Z"
                          fill="url(#chartGradient)"
                          initial={{ opacity: 0 }}
                          whileInView={{ opacity: 1 }}
                          viewport={{ once: true }}
                          transition={{ duration: 1, delay: 1 }}
                        />
                        
                        {/* Data points */}
                        {[
                          { x: 0, y: 170 },
                          { x: 160, y: 140 },
                          { x: 320, y: 90 },
                          { x: 500, y: 40 }
                        ].map((point, i) => (
                          <motion.circle
                            key={i}
                            cx={point.x}
                            cy={point.y}
                            r="5"
                            fill="rgb(59, 130, 246)"
                            initial={{ scale: 0 }}
                            whileInView={{ scale: 1 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.3, delay: 0.8 + i * 0.1 }}
                          />
                        ))}
                      </svg>

                      {/* X-axis labels */}
                      <div className="flex justify-between mt-3 px-2 text-xs text-gray-500 dark:text-gray-400">
                        <span>MAR</span>
                        <span>JUL</span>
                        <span>SEP</span>
                        <span>NOV</span>
                      </div>

                      {/* Smart Feedback Badge */}
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: 1.2 }}
                        className="absolute bottom-12 left-8 bg-white dark:bg-gray-800 rounded-lg shadow-xl p-3 border border-gray-200 dark:border-gray-700"
                      >
                        <div className="flex items-start gap-2 mb-1">
                          <Sparkles className="w-3 h-3 text-blue-500 flex-shrink-0 mt-0.5" />
                          <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide">
                            Smart Feedback
                          </p>
                        </div>
                        <p className="text-xs text-gray-700 dark:text-gray-300">
                          Your consistency peak is<br />
                          between <span className="font-bold">6 PM - 8 PM</span>.<br />
                          Schedule hard tasks then!
                        </p>
                      </motion.div>
                    </div>
                  </div>

                  {/* Activity Map */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                        Activity Map
                      </h3>
                      <div className="flex items-center gap-2 text-[10px] text-gray-500 dark:text-gray-400">
                        <span>LESS</span>
                        <div className="flex gap-0.5">
                          {[0, 1, 2, 3, 4].map((level) => (
                            <div
                              key={level}
                              className={`w-2 h-2 rounded-sm ${
                                level === 0 ? 'bg-gray-200 dark:bg-gray-700' :
                                level === 1 ? 'bg-blue-200 dark:bg-blue-900' :
                                level === 2 ? 'bg-blue-300 dark:bg-blue-700' :
                                level === 3 ? 'bg-blue-400 dark:bg-blue-600' :
                                'bg-blue-500 dark:bg-blue-500'
                              }`}
                            />
                          ))}
                        </div>
                        <span>MORE</span>
                      </div>
                    </div>

                    {/* Heatmap Grid */}
                    <div className="grid grid-cols-7 gap-1">
                      {heatmapData.map((cell, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, scale: 0.8 }}
                          whileInView={{ opacity: 1, scale: 1 }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.2, delay: 1.5 + index * 0.01 }}
                          className={`w-3 h-3 rounded-sm ${
                            cell.intensity === 0 ? 'bg-gray-200 dark:bg-gray-700' :
                            cell.intensity === 1 ? 'bg-blue-200 dark:bg-blue-900' :
                            cell.intensity === 2 ? 'bg-blue-300 dark:bg-blue-700' :
                            cell.intensity === 3 ? 'bg-blue-400 dark:bg-blue-600' :
                            'bg-blue-500 dark:bg-blue-500'
                          } hover:ring-1 hover:ring-blue-400 transition-all cursor-pointer`}
                          title={`Week ${cell.week + 1}, Day ${cell.day + 1}`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </AnimatedSection>
            </div>
          </div>
        </section>

        {/* Section 3: Community Feed */}
        <section className="py-12 sm:py-16 md:py-20 lg:py-32 px-4 sm:px-6 bg-white dark:bg-gray-900" id="community-feed">
          <div className="max-w-7xl mx-auto">
            <div className="grid md:grid-cols-2 gap-8 sm:gap-10 md:gap-12 lg:gap-16 items-center">
              {/* Left Content - Feed Animation */}
              <AnimatedSection>
                <div className="relative bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-2xl p-4 sm:p-6 border border-gray-200 dark:border-gray-700 max-h-[500px] sm:max-h-[650px] overflow-hidden">
                  {/* Feed Header */}
                  <div className="flex items-center justify-between mb-4 sm:mb-6">
                    <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white font-manrope">Growth Feed</h3>
                    <div className="flex gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-xs text-gray-500 dark:text-gray-400 font-manrope">Live</span>
                    </div>
                  </div>

                  {/* Feed Items */}
                  <div className="space-y-3 sm:space-y-4">
                    {/* Feed Post 1 */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: 0.2 }}
                      className="bg-white dark:bg-gray-900/50 rounded-lg sm:rounded-xl p-3 sm:p-4 shadow-sm border border-gray-100 dark:border-gray-700"
                    >
                      <div className="flex items-start gap-2 sm:gap-3">
                        <img
                          src="https://api.dicebear.com/7.x/avataaars/svg?seed=Alex"
                          alt="Alex Chen"
                          className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 sm:gap-2 mb-1">
                            <span className="font-semibold text-gray-900 dark:text-white text-xs sm:text-sm font-manrope truncate">Alex Chen</span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">completed a goal • 2m ago</span>
                          </div>
                          <p className="text-sm text-gray-700 dark:text-gray-300 mb-3 font-manrope">
                            <span className="font-semibold">Run 5K Marathon</span> 🎯
                          </p>
                          <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              className="flex items-center gap-1 hover:text-pink-500 transition-colors"
                            >
                              <Heart className="w-4 h-4" />
                              <span className="font-manrope">24</span>
                            </motion.button>
                            <button className="flex items-center gap-1 hover:text-[#4c99e6] transition-colors">
                              <MessageCircle className="w-4 h-4" />
                              <span className="font-manrope">8</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>

                    {/* Feed Post 2 */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: 0.4 }}
                      className="bg-white dark:bg-gray-900/50 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700"
                    >
                      <div className="flex items-start gap-3">
                        <img
                          src="https://api.dicebear.com/7.x/avataaars/svg?seed=Maria"
                          alt="Maria Silva"
                          className="w-10 h-10 rounded-full"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-gray-900 dark:text-white text-sm font-manrope">Maria Silva</span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">achieved milestone • 5m ago</span>
                          </div>
                          <p className="text-sm text-gray-700 dark:text-gray-300 mb-2 font-manrope">
                            📚 Read 12 books this year! Halfway to my goal of 24 🎉
                          </p>
                          <div className="mb-3">
                            <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                whileInView={{ width: '50%' }}
                                viewport={{ once: true }}
                                transition={{ duration: 1, delay: 0.6 }}
                                className="h-full bg-[#4c99e6] rounded-full"
                              />
                            </div>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              className="flex items-center gap-1 text-pink-500 transition-colors"
                            >
                              <Heart className="w-4 h-4 fill-pink-500" />
                              <span className="font-manrope">42</span>
                            </motion.button>
                            <button className="flex items-center gap-1 hover:text-[#4c99e6] transition-colors">
                              <MessageCircle className="w-4 h-4" />
                              <span className="font-manrope">15</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>

                    {/* Feed Post 3 */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: 0.6 }}
                      className="bg-white dark:bg-gray-900/50 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700"
                    >
                      <div className="flex items-start gap-3">
                        <img
                          src="https://api.dicebear.com/7.x/avataaars/svg?seed=Jordan"
                          alt="Jordan Lee"
                          className="w-10 h-10 rounded-full"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-gray-900 dark:text-white text-sm font-manrope">Jordan Lee</span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">streak update • 12m ago</span>
                          </div>
                          <p className="text-sm text-gray-700 dark:text-gray-300 mb-3 font-manrope">
                            🔥 30-day meditation streak! Feeling amazing ✨
                          </p>
                          <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              className="flex items-center gap-1 hover:text-pink-500 transition-colors"
                            >
                              <Heart className="w-4 h-4" />
                              <span className="font-manrope">18</span>
                            </motion.button>
                            <button className="flex items-center gap-1 hover:text-[#4c99e6] transition-colors">
                              <MessageCircle className="w-4 h-4" />
                              <span className="font-manrope">6</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>

                    {/* Feed Post 4 - Partial visible (scroll effect) */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 0.5, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: 0.8 }}
                      className="bg-white dark:bg-gray-900/50 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 opacity-50"
                    >
                      <div className="flex items-start gap-3">
                        <img
                          src="https://api.dicebear.com/7.x/avataaars/svg?seed=Sam"
                          alt="Sam Taylor"
                          className="w-10 h-10 rounded-full"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-gray-900 dark:text-white text-sm font-manrope">Sam Taylor</span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">started a goal • 20m ago</span>
                          </div>
                          <p className="text-sm text-gray-700 dark:text-gray-300 font-manrope">
                            🚀 New goal: Learn Spanish in 90 days
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  </div>

                  {/* Scroll Indicator */}
                  <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white dark:from-gray-800 to-transparent pointer-events-none" />
                </div>
              </AnimatedSection>

              {/* Right Content - Text */}
              <AnimatedSection className="space-y-4 sm:space-y-6 mt-8 md:mt-0">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 rounded-full">
                  <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-400 tracking-wide uppercase">
                    Community Powered
                  </span>
                </div>

                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 dark:text-white leading-tight font-manrope">
                  Get Inspired by Others
                </h2>

                <p className="text-sm sm:text-base md:text-lg text-gray-600 dark:text-gray-400 leading-relaxed">
                  Connect with like-minded explorers. See real-time updates, celebrate wins together, and find motivation in shared journeys. Your community is your greatest asset.
                </p>

                <div className="space-y-3 sm:space-y-4">
                  <div className="flex items-start gap-2 sm:gap-3">
                    <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-pink-100 dark:bg-pink-900/50 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Heart className="w-3 h-3 sm:w-4 sm:h-4 text-pink-600 dark:text-pink-400" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-1 text-sm sm:text-base">Real-time Updates</h4>
                      <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">See goal completions, milestones, and wins as they happen</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 sm:gap-3">
                    <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <MessageCircle className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-1 text-sm sm:text-base">Engage & Support</h4>
                      <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Like, comment, and encourage others on their journey</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 sm:gap-3">
                    <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Users className="w-3 h-3 sm:w-4 sm:h-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-1 text-sm sm:text-base">Find Your Tribe</h4>
                      <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Follow people with similar goals and stay motivated together</p>
                    </div>
                  </div>
                </div>

                <div className="pt-4">
                  <Link
                    to="/feed"
                    className="inline-flex items-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 bg-[#4c99e6] hover:bg-[#3d88d5] text-white rounded-xl font-semibold text-xs sm:text-sm shadow-sm transition-all hover:scale-105"
                  >
                    Explore Feed
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </AnimatedSection>
            </div>
          </div>
        </section>

        {/* CTA Section - Ready to Start Your Trail */}
        <section className="py-12 sm:py-16 md:py-20 lg:py-32 px-4 sm:px-6 bg-white dark:bg-gray-900">
          <AnimatedSection className="max-w-4xl mx-auto text-center space-y-6 sm:space-y-8">
            {/* Avatar group */}
            <div className="flex justify-center">
                <div className="flex -space-x-2">
                  {[1, 2, 3].map((i) => (
                    <img
                      key={i}
                      src={`https://api.dicebear.com/7.x/avataaars/svg?seed=user${i}`}
                      alt={`User ${i}`}
                      className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 border-white dark:border-gray-800"
                    />
                  ))}
                </div>
            </div>

            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 border border-gray-200 dark:border-gray-700 rounded-full">
              <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Join our fellow Explorers
              </span>
            </div>

            {/* Heading */}
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 dark:text-white leading-tight font-manrope">
              Ready to Start<br className="hidden sm:block" /><span className="sm:hidden"> </span>Your Trail?
            </h2>

            {/* Description */}
            <p className="text-sm sm:text-base md:text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed font-manrope px-4">
              Join thousands of explorers on their growth journey. Track your goals, build lasting habits, and discover your potential.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
              <button
                onClick={handleGetStarted}
                className="group px-8 sm:px-10 py-4 sm:py-5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-bold text-base sm:text-lg shadow-2xl shadow-blue-500/40 hover:shadow-blue-500/60 transition-all duration-300 flex items-center gap-2 sm:gap-3"
              >
                Join WishTrail
                <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </AnimatedSection>
        </section>
      </div>
    </>
  )
}

export default HomePage
