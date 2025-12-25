import { motion } from 'framer-motion'
import { Star, Youtube, Instagram } from 'lucide-react'
import useApiStore from '../store/apiStore'
import { Link } from 'react-router-dom'

const Footer = () => {
  const { isAuthenticated } = useApiStore()

  const socialLinks = [
    {
      name: 'YouTube',
      icon: Youtube,
      href: 'https://www.youtube.com/@wishtrail2025',
    },
    {
      name: 'Instagram',
      icon: Instagram,
      href: 'https://www.instagram.com/wishtrail2025/',
    },
  ]

  const quickLinks = [
    { name: 'Home', href: '/#', auth: false },
    { name: 'Inspiration', href: '/inspiration', auth: false },
    { name: 'Discover', href: '/discover', auth: true },
    { name: 'Dashboard', href: '/dashboard', auth: true },
    { name: 'Leaderboard', href: '/leaderboard', auth: true },
  ]

  return (
    <footer className="bg-gradient-to-b from-white via-gray-50 to-white dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 border-t border-gray-200/50 dark:border-gray-800/50 theme-transition mt-auto">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Footer Content */}
        <div className="py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 lg:gap-16 items-start">
            {/* Brand Section */}
            <div className="space-y-6">
              <Link to="/#" className="inline-flex items-center space-x-2 group">
                <motion.div
                  whileHover={{ rotate: 360, scale: 1.1 }}
                  transition={{ duration: 0.6, ease: "easeInOut" }}
                >
                  <Star className="h-9 w-9 text-purple-600 dark:text-purple-400 fill-purple-600 dark:fill-purple-400" />
                </motion.div>
                <span className="text-2xl font-bold bg-gradient-to-r from-purple-600 via-purple-500 to-blue-600 dark:from-purple-400 dark:via-purple-300 dark:to-blue-400 bg-clip-text text-transparent">
                  WishTrail
                </span>
              </Link>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed max-w-sm text-base">
                Transform your aspirations into reality. Track progress, build habits, and achieve your dreams with a supportive community.
              </p>
            </div>
            
            {/* Quick Links */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">
                Quick Links
              </h3>
              <ul className="space-y-3">
                {quickLinks.map((link) => (
                  (!link.auth || isAuthenticated) && (
                    <li key={link.name}>
                      <Link
                        to={link.href}
                        className="text-gray-600 hover:text-purple-600 dark:text-gray-400 dark:hover:text-purple-400 transition-colors duration-200 inline-flex items-center group text-[15px]"
                      >
                        <span>{link.name}</span>
                        <motion.span
                          initial={{ x: 0, opacity: 0 }}
                          whileHover={{ x: 4, opacity: 1 }}
                          transition={{ duration: 0.2 }}
                          className="ml-1"
                        >
                          →
                        </motion.span>
                      </Link>
                    </li>
                  )
                ))}
              </ul>
            </div>
            
            {/* Social & Connect */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">
                Connect With Us
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                Join our community for daily inspiration and updates
              </p>
              <div className="flex space-x-3">
                {socialLinks.map((link) => (
                  <motion.a
                    key={link.name}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    whileHover={{ scale: 1.1, y: -3 }}
                    whileTap={{ scale: 0.95 }}
                    className="p-3 rounded-xl bg-gradient-to-br from-gray-100 to-gray-50 hover:from-purple-50 hover:to-blue-50 dark:from-gray-800 dark:to-gray-800/50 dark:hover:from-purple-900/30 dark:hover:to-blue-900/30 text-gray-700 hover:text-purple-600 dark:text-gray-300 dark:hover:text-purple-400 transition-all duration-300 shadow-sm hover:shadow-md"
                    aria-label={link.name}
                  >
                    <link.icon className="h-5 w-5" />
                  </motion.a>
                ))}
              </div>
            </div>
          </div>
        </div>
        
        {/* Bottom Bar */}
        <div className="py-16 border-t border-gray-200/50 dark:border-gray-800/50">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
            <p className="text-xs text-gray-500 dark:text-gray-500 text-center sm:text-left">
              © {new Date().getFullYear()} WishTrail. Crafted with passion for dreamers and achievers.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2 text-center">
              <Link
                to="/privacy-policy"
                className="text-xs text-gray-500 hover:text-purple-600 dark:text-gray-500 dark:hover:text-purple-400 transition-colors duration-200"
              >
                Privacy Policy
              </Link>
              <span className="text-gray-300 dark:text-gray-700">•</span>
              <Link
                to="/terms-of-service"
                className="text-xs text-gray-500 hover:text-purple-600 dark:text-gray-500 dark:hover:text-purple-400 transition-colors duration-200"
              >
                Terms of Service
              </Link>
              <span className="text-gray-300 dark:text-gray-700">•</span>
              <Link
                to="/community-guidelines"
                className="text-xs text-gray-500 hover:text-purple-600 dark:text-gray-500 dark:hover:text-purple-400 transition-colors duration-200"
              >
                Guidelines
              </Link>
              <span className="text-gray-300 dark:text-gray-700">•</span>
              <Link
                to="/copyright-policy"
                className="text-xs text-gray-500 hover:text-purple-600 dark:text-gray-500 dark:hover:text-purple-400 transition-colors duration-200"
              >
                Copyright
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer 