import { Link } from 'react-router-dom'
import { Star, Youtube, Instagram } from 'lucide-react'
import useApiStore from '../store/apiStore'

const FooterNew = () => {
  const { isAuthenticated } = useApiStore()

  const quickLinks = [
    { name: 'Home', href: '/' },
    { name: 'Inspiration', href: '/inspiration' },
    { name: 'Discover', href: '/discover-new' },
    { name: 'Dashboard', href: '/dashboard-new' },
    { name: 'Leaderboard', href: '/leaderboard-new' },
  ]

  const legalLinks = [
    { name: 'Privacy Policy', href: '/privacy-policy' },
    { name: 'Terms of Service', href: '/terms-of-service' },
    { name: 'Guidelines', href: '/community-guidelines' },
  ]

  return (
    <footer className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 mt-auto">
      <div className="max-w-[1400px] mx-auto px-6 py-12">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-8">
          {/* Brand Section */}
          <div className="space-y-4">
            <Link to="/" className="flex items-center gap-2">
              <Star className="w-6 h-6 text-[#4c99e6] fill-[#4c99e6]" />
              <span className="text-xl font-bold text-gray-900 dark:text-white font-manrope">
                WishTrail
              </span>
            </Link>
            <p className="text-gray-600 dark:text-gray-400 text-sm font-manrope leading-relaxed">
              Empowering achievers through precision tracking and community-driven milestones. Build the future you've always envisioned, one step at a time.
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white font-manrope uppercase tracking-wider">
              Quick Links
            </h3>
            <ul className="space-y-2">
              {quickLinks.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    className="text-gray-600 hover:text-[#4c99e6] dark:text-gray-400 dark:hover:text-[#4c99e6] transition-colors text-sm font-manrope"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Connect With Us */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white font-manrope uppercase tracking-wider">
              Connect With Us
            </h3>
            <div className="flex items-center gap-3">
              <a
                href="https://youtube.com/thewishtrail"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg bg-gray-100 hover:bg-[#FF6B6B] dark:bg-gray-800 dark:hover:bg-[#FF6B6B] text-gray-600 hover:text-white dark:text-gray-400 dark:hover:text-white transition-all"
                aria-label="YouTube"
              >
                <Youtube className="w-5 h-5" />
              </a>
              <a
                href="https://www.instagram.com/thewishtrail/"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg bg-gray-100 hover:bg-[#F07A8F] dark:bg-gray-800 dark:hover:bg-[#F07A8F] text-gray-600 hover:text-white dark:text-gray-400 dark:hover:text-white transition-all"
                aria-label="Instagram"
              >
                <Instagram className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-gray-200 dark:border-gray-800">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-600 dark:text-gray-400 font-manrope text-center md:text-left">
              © {new Date().getFullYear()} WishTrail. Crafted for dreamers and achievers
            </p>
            <div className="flex items-center gap-4">
              {legalLinks.map((link, index) => (
                <span key={link.name} className="flex items-center gap-4">
                  <Link
                    to={link.href}
                    className="text-sm text-gray-600 hover:text-[#4c99e6] dark:text-gray-400 dark:hover:text-[#4c99e6] transition-colors font-manrope"
                  >
                    {link.name}
                  </Link>
                  {index < legalLinks.length - 1 && (
                    <span className="text-gray-300 dark:text-gray-700">|</span>
                  )}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default FooterNew
