import { motion } from 'framer-motion'
import { Star, Youtube, Instagram, ExternalLink } from 'lucide-react'

const Footer = () => {
  const currentYear = new Date().getFullYear()
  
  const socialLinks = [
    {
      name: 'YouTube',
      href: 'https://youtube.com/@yourhandle',
      icon: Youtube,
      color: 'hover:text-red-500'
    },
    {
      name: 'Instagram',
      href: 'https://instagram.com/yourhandle',
      icon: Instagram,
      color: 'hover:text-pink-500'
    },
    {
      name: 'Blog',
      href: 'https://blooggerr.netlify.app/',
      icon: ExternalLink,
      color: 'hover:text-blue-500'
    }
  ]

  return (
    <footer className="relative mt-20 glass-card border-t border-white/10">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Star className="h-8 w-8 text-primary-500" />
              <span className="text-xl font-bold text-gradient">
                WishTrail
              </span>
            </div>
            <p className="text-gray-600 dark:text-gray-400 max-w-md">
              Transform your dreams into achievable goals. Track your progress, 
              get inspired, and make every year count.
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Quick Links
            </h3>
            <ul className="space-y-2">
              {['Home', 'Dashboard', 'Inspiration', 'Profile'].map((link) => (
                <li key={link}>
                  <a
                    href={`/${link.toLowerCase() === 'home' ? '' : link.toLowerCase()}`}
                    className="text-gray-600 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400 transition-colors"
                  >
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Social Links */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Follow Us
            </h3>
            <div className="flex space-x-4">
              {socialLinks.map((social) => (
                <motion.a
                  key={social.name}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className={`p-3 rounded-full bg-white/10 hover:bg-white/20 transition-all ${social.color}`}
                >
                  <social.icon className="h-5 w-5" />
                </motion.a>
              ))}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Get daily inspiration and tips for achieving your goals
            </p>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-white/10">
          <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              © {currentYear} WishTrail. All rights reserved.
            </p>
            <div className="flex items-center space-x-6">
              <a href="#" className="text-sm text-gray-600 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400 transition-colors">
                Privacy Policy
              </a>
              <a href="#" className="text-sm text-gray-600 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400 transition-colors">
                Terms of Service
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer 