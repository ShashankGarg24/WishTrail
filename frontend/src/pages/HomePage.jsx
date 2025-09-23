import { motion } from 'framer-motion'
import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { Star, ArrowRight, Play, Users, Youtube, Instagram, Activity, BarChart3, Trophy, BookOpen, ChevronLeft, ChevronRight } from 'lucide-react'
import VideoEmbedGrid from '../components/VideoEmbedGrid'
import useApiStore from '../store/apiStore'

const HomePage = () => {

  const { isAuthenticated, isFeatureEnabled } = useApiStore();

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
      description: 'Track points, streaks, and progress at a glance.',
      to: isAuthenticated ? '/dashboard' : '/auth'
    },
    {
      icon: Activity,
      title: 'Social Feed',
      description: 'See goal updates from people you follow. Like and comment instantly.',
      to: isAuthenticated ? '/feed' : '/auth'
    },
    {
      icon: Users,
      title: 'Discover People & Goals',
      description: 'Find inspiring users and trending goals tailored to your interests.',
      to: isAuthenticated ? '/discover' : '/auth'
    },
    {
      icon: BookOpen,
      title: 'Daily Journal',
      description: 'Capture reflections, moods, and insights in seconds.',
      to: isAuthenticated ? '/profile?journal=1' : '/auth'
    },
    {
      icon: Trophy,
      title: 'Leaderboards',
      description: 'Climb rankings and celebrate achievements with the community.',
      to: isAuthenticated ? '/leaderboard' : '/auth'
    },
  ]
  .filter((f) => {
    if (f.title === 'Daily Journal') return isFeatureEnabled('journal');
    if (f.title === 'Leaderboards') return isFeatureEnabled('leaderboard');
    return true;
  })

  const stats = [
    { number: '1000+', label: 'Goals Achieved' },
    { number: '500+', label: 'Active Users' },
    { number: '50+', label: 'Success Stories' },
    { number: '24/7', label: 'Inspiration' }
  ]

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 sm:py-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="text-4xl sm:text-6xl lg:text-7xl font-bold text-gray-900 dark:text-white mb-6"
            >
              Dreams. Goals.{' '}
              <span className="text-gradient">Progress.</span>
            </motion.h1>
            
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-xl sm:text-2xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto"
            >
              Transform your aspirations into achievable goals. Track your progress, 
              get inspired, and make every year count with WishTrail.
            </motion.p>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="flex flex-col sm:flex-row gap-4 justify-center items-center"
            >
              <Link to={getRedirectUrl()} className="btn-primary">
                {!isAuthenticated ? "Start Your Journey" : "Discover Goal Ideas"}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
              <Link to="/inspiration" className="btn-secondary">
                Get Inspired
                <Play className="ml-2 h-5 w-5" />
              </Link>
            </motion.div>
          </div>
        </div>
        
        {/* Floating Stars */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, delay: i * 0.1 }}
              className="absolute"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
            >
              <Star className="h-4 w-4 text-primary-300 dark:text-primary-600" />
            </motion.div>
          ))}
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 glass-card-hover mx-4 sm:mx-6 lg:mx-8 rounded-2xl mb-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="text-center"
              >
                <div className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-2">
                  {stat.number}
                </div>
                <div className="text-gray-600 dark:text-gray-400">
                  {stat.label}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Why Choose <span className="text-gradient">WishTrail</span>?
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Everything you need to turn your dreams into reality
            </p>
          </motion.div>

          <div className="relative">
            <div ref={scrollerRef} className="flex overflow-x-auto snap-x snap-mandatory gap-5 -mx-4 px-4 pb-1">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="glass-card-hover p-0 rounded-xl text-center overflow-hidden shrink-0 basis-[92%] sm:basis-[62%] md:basis-1/2 lg:basis-[26%] snap-start"
              >
                <Link to={feature.to} className="block p-6">
                  <div className="bg-primary-500 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <feature.icon className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    {feature.description}
                  </p>
                </Link>
              </motion.div>
            ))}
            </div>
            <button
              type="button"
              aria-label="Scroll left"
              onClick={() => scrollByAmount(-1)}
              className="absolute left-1 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-white/80 dark:bg-gray-900/80 border border-gray-200 dark:border-gray-700 shadow hover:bg-white dark:hover:bg-gray-800 hidden sm:flex items-center justify-center backdrop-blur"
            >
              <ChevronLeft className="h-5 w-5 text-gray-700 dark:text-gray-200" />
            </button>
            <button
              type="button"
              aria-label="Scroll right"
              onClick={() => scrollByAmount(1)}
              className="absolute right-1 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-white/80 dark:bg-gray-900/80 border border-gray-200 dark:border-gray-700 shadow hover:bg-white dark:hover:bg-gray-800 hidden sm:flex items-center justify-center backdrop-blur"
            >
              <ChevronRight className="h-5 w-5 text-gray-700 dark:text-gray-200" />
            </button>
          </div>
        </div>
      </section>

      {/* Video Inspiration Section */}
      <section className="py-20 bg-gray-50 dark:bg-gray-800 theme-transition">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <div className="flex items-center justify-center space-x-3 mb-6">
              <Youtube className="h-8 w-8 text-red-500" />
              <Instagram className="h-8 w-8 text-pink-500" />
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Daily <span className="text-gradient">Inspiration</span>
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Watch motivational content from YouTube and Instagram to fuel your journey
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <VideoEmbedGrid />
          </motion.div>
        </div>
      </section>


      {/* CTA Section */}
      {!isAuthenticated && <section className="py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="glass-card-hover p-8 sm:p-12 rounded-2xl text-center"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Ready to Start Your Journey?
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
              Join thousands of others who are already achieving their goals with WishTrail
            </p>
            <Link to={getRedirectUrl()} className="btn-primary">
              Get Started Now
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </motion.div>
        </div>
      </section>
      }
    </div>
  )
}

export default HomePage 