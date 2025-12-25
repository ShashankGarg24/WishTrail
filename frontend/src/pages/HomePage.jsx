import { motion, useScroll, useTransform, useInView } from 'framer-motion'
import { lazy, Suspense, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { 
  Star, ArrowRight, Play, Users, Youtube, Instagram, Activity, BarChart3, 
  Trophy, BookOpen, ChevronLeft, ChevronRight, Newspaper, Search, 
  CheckCircle2, Zap, Shield, Sparkles, TrendingUp, Heart, Target,
  MessageCircle, Calendar, Award, Rocket
} from 'lucide-react'
const VideoEmbedGrid = lazy(() => import('../components/VideoEmbedGrid'));
import useApiStore from '../store/apiStore'
import { HomePageSEO } from '../components/SEO'
import { useHomePagePreload, useConnectionOptimization, useVisibilityOptimization } from '../components/PageTransition'

// Animation variants
const fadeInUp = {
  hidden: { opacity: 0, y: 60 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
}

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.3 }
  }
}

const scaleIn = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.5 } }
}

// Animated Section Component
const AnimatedSection = ({ children, className = "" }) => {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={fadeInUp}
      className={className}
    >
      {children}
    </motion.div>
  )
}

const HomePage = () => {
  const { isAuthenticated } = useApiStore()
  const heroRef = useRef(null)
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"]
  })
  
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0])
  const scale = useTransform(scrollYProgress, [0, 0.5], [1, 0.95])
  const y = useTransform(scrollYProgress, [0, 1], [0, 200])

  // Performance optimizations
  useHomePagePreload()
  useConnectionOptimization()
  useVisibilityOptimization()

  const getRedirectUrl = () => {
    if (!isAuthenticated) return '/auth';
    return '/dashboard';
  }

  const scrollerRef = useRef(null)

  const scrollByAmount = (dir) => {
    try {
      const el = scrollerRef.current
      if (!el) return
      const amount = Math.max(240, Math.floor(el.clientWidth * 0.9))
      el.scrollBy({ left: dir * amount, behavior: 'smooth' })
    } catch {}
  }

  const features = [
    {
      icon: BarChart3,
      title: 'Personal Dashboard',
      description: 'Track streaks, goals, and progress at a glance with real-time analytics.',
      color: 'from-blue-500 to-cyan-500',
      to: isAuthenticated ? '/dashboard' : '/auth'
    },
    {
      icon: Newspaper,
      title: 'Social Feed',
      description: 'See goal updates from people you follow. Like and comment instantly.',
      color: 'from-purple-500 to-pink-500',
      to: isAuthenticated ? '/feed' : '/auth'
    },
    {
      icon: Search,
      title: 'Discover People & Goals',
      description: 'Find inspiring users and trending goals tailored to your interests.',
      color: 'from-orange-500 to-red-500',
      to: isAuthenticated ? '/discover' : '/auth'
    },
    {
      icon: BookOpen,
      title: 'Daily Journal',
      description: 'Capture reflections, moods, and insights in seconds.',
      color: 'from-green-500 to-emerald-500',
      to: isAuthenticated ? '/profile?journal=1' : '/auth'
    },
    {
      icon: Trophy,
      title: 'Leaderboards',
      description: 'Climb rankings and celebrate achievements with the community.',
      color: 'from-yellow-500 to-amber-500',
      to: isAuthenticated ? '/leaderboard' : '/auth'
    },
  ]

  const benefits = [
    {
      icon: CheckCircle2,
      title: 'Easy Goal Setting',
      description: 'Create and organize your goals in minutes with our intuitive interface.'
    },
    {
      icon: TrendingUp,
      title: 'Track Progress',
      description: 'Visual analytics and insights help you stay motivated and on track.'
    },
    {
      icon: Users,
      title: 'Community Support',
      description: 'Connect with like-minded achievers and share your journey.'
    },
    {
      icon: Shield,
      title: 'Privacy First',
      description: 'Your data is secure and you control what you share with others.'
    },
    {
      icon: Sparkles,
      title: 'Smart Suggestions',
      description: 'Get personalized goal recommendations based on your interests.'
    },
    {
      icon: Award,
      title: 'Achievements & Rewards',
      description: 'Earn badges and celebrate milestones as you complete your goals.'
    }
  ]

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 overflow-hidden">
      <HomePageSEO />
      
      {/* Hero Section with Parallax */}
      <section ref={heroRef} className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
        {/* Animated Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-blue-900/20" />
        
        {/* Animated Mesh Gradient */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-300 dark:bg-purple-500 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-xl animate-blob" />
          <div className="absolute top-0 -right-4 w-72 h-72 bg-yellow-300 dark:bg-yellow-500 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-xl animate-blob animation-delay-2000" />
          <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-300 dark:bg-pink-500 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-xl animate-blob animation-delay-4000" />
        </div>

        {/* Floating Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(30)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0, x: Math.random() * window.innerWidth, y: Math.random() * window.innerHeight }}
              animate={{ 
                opacity: [0, 1, 0],
                scale: [0, 1, 0],
                y: [0, -100, -200]
              }}
              transition={{
                duration: 3 + Math.random() * 2,
                delay: i * 0.2,
                repeat: Infinity,
                repeatDelay: Math.random() * 5
              }}
              className="absolute"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
            >
              <Star className="h-3 w-3 text-purple-400 dark:text-purple-500" fill="currentColor" />
            </motion.div>
          ))}
        </div>

        <motion.div 
          style={{ opacity, scale }}
          className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10"
        >
          <div className="text-center max-w-5xl mx-auto">
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border border-purple-200 dark:border-purple-700 mb-8 shadow-lg"
            >
              <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Your Journey Starts Here</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1 }}
              className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white mb-6 leading-tight"
            >
              Turn Your Dreams Into
              <br />
              <span className="relative inline-block mt-2">
                <span className="text-gradient bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 dark:from-blue-400 dark:via-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
                  Reality
                </span>
                <motion.svg
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 1.5, delay: 1, ease: "easeInOut" }}
                  className="absolute -bottom-2 left-0 w-full"
                  height="12"
                  viewBox="0 0 300 12"
                  fill="none"
                >
                  <motion.path
                    d="M5 7 Q 150 2, 295 7"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    className="text-purple-600 dark:text-purple-400"
                  />
                </motion.svg>
              </span>
            </motion.h1>
            
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="text-lg sm:text-xl lg:text-2xl text-gray-600 dark:text-gray-300 mb-10 max-w-4xl mx-auto leading-relaxed"
            >
              The ultimate platform to set, track, and achieve your goals. 
              Join thousands who are already making progress every day.
            </motion.p>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5 }}
              className="flex flex-col sm:flex-row gap-4 justify-center items-center"
            >
              <Link to={getRedirectUrl()} className="group btn-primary text-base px-6 py-3">
                {!isAuthenticated ? "Start Free Today" : "Go to Dashboard"}
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link to="/inspiration" className="btn-secondary text-base px-6 py-3">
                <Play className="mr-2 h-5 w-5" />
                See How It Works
              </Link>
            </motion.div>
          </div>
        </motion.div>

        {/* Scroll Indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="w-6 h-10 border-2 border-gray-400 dark:border-gray-600 rounded-full flex justify-center pt-2"
          >
            <div className="w-1 h-2 bg-gray-400 dark:bg-gray-600 rounded-full" />
          </motion.div>
        </motion.div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 relative">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Simple. <span className="text-gradient bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">Powerful.</span> Effective.
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Start achieving your goals in three easy steps
            </p>
          </AnimatedSection>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto"
          >
            {[
              {
                step: '1',
                icon: Target,
                title: 'Set Your Goals',
                description: 'Define what you want to achieve. Break down big dreams into actionable goals.'
              },
              {
                step: '2',
                icon: TrendingUp,
                title: 'Track Progress',
                description: 'Update your progress regularly and watch your achievements grow over time.'
              },
              {
                step: '3',
                icon: Rocket,
                title: 'Achieve Success',
                description: 'Celebrate milestones, stay motivated, and make your dreams a reality.'
              }
            ].map((item, index) => (
              <motion.div
                key={item.step}
                variants={scaleIn}
                className="relative"
              >
                <div className="text-center">
                  <div className="relative inline-block mb-6">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mx-auto shadow-xl">
                      <item.icon className="h-8 w-8 text-white" />
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                    {item.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-800 dark:to-gray-900">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Everything You Need to <span className="text-gradient bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">Succeed</span>
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Powerful features designed to help you achieve your goals faster
            </p>
          </AnimatedSection>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            {benefits.map((benefit, index) => (
              <motion.div
                key={benefit.title}
                variants={fadeInUp}
                whileHover={{ y: -8, transition: { duration: 0.2 } }}
                className="group"
              >
                <div className="glass-card-hover p-8 rounded-2xl h-full">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                    <benefit.icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                    {benefit.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                    {benefit.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Explore Our <span className="text-gradient bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400 bg-clip-text text-transparent">Features</span>
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Discover all the tools you need to stay motivated and achieve your dreams
            </p>
          </AnimatedSection>

          <div className="relative">
            <div ref={scrollerRef} className="flex overflow-x-auto snap-x snap-mandatory gap-6 -mx-4 px-4 pb-4 scrollbar-hide">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, x: 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ y: -10, scale: 1.02 }}
                className="shrink-0 basis-[92%] sm:basis-[62%] md:basis-[45%] lg:basis-[30%] snap-start group"
              >
                <Link to={feature.to} className="block h-full">
                  <div className="glass-card-hover p-8 rounded-2xl h-full relative overflow-hidden">
                    {/* Gradient Background */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />
                    
                    <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                      <feature.icon className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                      {feature.title}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                      {feature.description}
                    </p>
                    <div className="mt-4 flex items-center text-purple-600 dark:text-purple-400 font-semibold group-hover:translate-x-2 transition-transform">
                      Learn more <ArrowRight className="ml-2 h-4 w-4" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
            </div>
            
            {/* Navigation Buttons */}
            <button
              type="button"
              aria-label="Scroll left"
              onClick={() => scrollByAmount(-1)}
              className="absolute left-1 top-1/2 -translate-y-1/2 z-10 h-12 w-12 rounded-full bg-white dark:bg-gray-800 border-2 border-purple-200 dark:border-purple-700 shadow-lg hover:shadow-xl hover:scale-110 hidden sm:flex items-center justify-center backdrop-blur transition-all duration-300"
            >
              <ChevronLeft className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </button>
            <button
              type="button"
              aria-label="Scroll right"
              onClick={() => scrollByAmount(1)}
              className="absolute right-1 top-1/2 -translate-y-1/2 z-10 h-12 w-12 rounded-full bg-white dark:bg-gray-800 border-2 border-purple-200 dark:border-purple-700 shadow-lg hover:shadow-xl hover:scale-110 hidden sm:flex items-center justify-center backdrop-blur transition-all duration-300"
            >
              <ChevronRight className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </button>
          </div>
        </div>
      </section>

      {/* Video Inspiration Section */}
      <section className="py-20 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Daily <span className="text-gradient bg-gradient-to-r from-orange-600 to-red-600 dark:from-orange-400 dark:to-red-400 bg-clip-text text-transparent">Inspiration</span>
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Watch motivational content to fuel your journey and stay inspired
            </p>
          </AnimatedSection>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <Suspense fallback={<div className="h-64 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div></div>}>
              <VideoEmbedGrid />
            </Suspense>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      {!isAuthenticated && (
        <section className="py-20 relative overflow-hidden">
          {/* Background Effects */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600" />
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMzLjMxNCAwIDYgMi42ODYgNiA2cy0yLjY4NiA2LTYgNi02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNnoiIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLW9wYWNpdHk9Ii4xIi8+PC9nPjwvc3ZnPg==')] opacity-30" />
          
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="text-center max-w-4xl mx-auto"
            >
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                className="inline-block mb-6"
              >
                <Rocket className="h-16 w-16 text-white" />
              </motion.div>
              
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
                Ready to Achieve Your Goals?
              </h2>
              <p className="text-lg sm:text-xl text-white/90 mb-10 max-w-2xl mx-auto">
                Start turning your dreams into reality. Create your first goal in less than 60 seconds!
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Link 
                  to={getRedirectUrl()} 
                  className="group bg-white text-purple-600 font-bold text-base px-8 py-4 rounded-xl hover:bg-gray-100 transition-all duration-300 transform hover:scale-105 shadow-2xl flex items-center"
                >
                  Get Started Free
                  <ArrowRight className="ml-2 h-6 w-6 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link 
                  to="/inspiration" 
                  className="group bg-white/20 backdrop-blur-md border-2 border-white/50 text-white font-bold text-base px-8 py-4 rounded-xl hover:bg-white/30 transition-all duration-300 shadow-2xl flex items-center"
                >
                  <Play className="mr-2 h-6 w-6" />
                  Watch Demo
                </Link>
              </div>

              <motion.p
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.5 }}
                className="mt-8 text-white/80 text-sm"
              >
                ✨ No credit card required • Free forever • Join in 30 seconds
              </motion.p>
            </motion.div>
          </div>
        </section>
      )}
    </div>
  )
}

export default HomePage 