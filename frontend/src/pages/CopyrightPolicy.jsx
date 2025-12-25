import { motion } from 'framer-motion'
import { Copyright, FileText, Mail, AlertCircle, Scale, Ban, CheckCircle } from 'lucide-react'
import { Link } from 'react-router-dom'

const CopyrightPolicy = () => {
  const lastUpdated = "December 25, 2025"

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-100 dark:bg-primary-900/30 mb-4">
            <Copyright className="w-8 h-8 text-primary-600 dark:text-primary-400" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-3">
            Copyright & DMCA Policy
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Last Updated: {lastUpdated}
          </p>
          <p className="mt-3 text-sm text-gray-700 dark:text-gray-300 max-w-2xl mx-auto">
            WishTrail respects the intellectual property rights of others and expects our users to do the same. 
            This policy outlines how we handle copyright infringement claims.
          </p>
        </motion.div>

        {/* Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-6 rounded-xl mb-6"
        >
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-3">
            Overview
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-3">
            WishTrail complies with the Digital Millennium Copyright Act (DMCA) and other applicable copyright laws. 
            We respond promptly to valid copyright infringement notices and will remove or disable access to 
            infringing material when properly notified.
          </p>
          <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
            Users who repeatedly infringe on copyrights may have their accounts suspended or terminated.
          </p>
        </motion.div>

        {/* User Responsibilities */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card p-6 rounded-xl mb-6"
        >
          <div className="flex items-start space-x-3 mb-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-3">
                User Responsibilities
              </h2>
              <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
                <p>
                  <strong className="text-gray-800 dark:text-gray-200">Own Your Content:</strong> Only upload content that you own or have permission to use. This includes images, videos, text, music, and other creative works.
                </p>
                <p>
                  <strong className="text-gray-800 dark:text-gray-200">Give Credit:</strong> When sharing others' work (with permission), always provide proper attribution including the creator's name and source.
                </p>
                <p>
                  <strong className="text-gray-800 dark:text-gray-200">Fair Use:</strong> While fair use allows limited use of copyrighted material for purposes like commentary or education, it's a complex legal doctrine. When in doubt, seek permission or don't use the material.
                </p>
                <p>
                  <strong className="text-gray-800 dark:text-gray-200">Public Domain & Creative Commons:</strong> Content in the public domain or under Creative Commons licenses may be used, but you must comply with any license requirements (such as attribution).
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Filing a DMCA Notice */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card p-6 rounded-xl mb-6"
        >
          <div className="flex items-start space-x-3 mb-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-3">
                Filing a DMCA Takedown Notice
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                If you believe your copyrighted work has been infringed on WishTrail, you may submit a DMCA takedown notice. 
                To be valid, your notice must include all of the following:
              </p>
              
              <div className="space-y-4">
                <div className="bg-white/50 dark:bg-gray-800/50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                    1. Identification of Copyrighted Work
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Describe the copyrighted work you claim has been infringed. If multiple works are covered by a single notification, 
                    provide a representative list.
                  </p>
                </div>

                <div className="bg-white/50 dark:bg-gray-800/50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                    2. Identification of Infringing Material
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Provide the specific URL(s) or location of the allegedly infringing material on WishTrail. 
                    Be as specific as possible (e.g., user profile URL, post URL, goal ID).
                  </p>
                </div>

                <div className="bg-white/50 dark:bg-gray-800/50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                    3. Your Contact Information
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Include your full name, mailing address, telephone number, and email address.
                  </p>
                </div>

                <div className="bg-white/50 dark:bg-gray-800/50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                    4. Good Faith Statement
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Include the following statement: "I have a good faith belief that use of the material in the manner 
                    complained of is not authorized by the copyright owner, its agent, or the law."
                  </p>
                </div>

                <div className="bg-white/50 dark:bg-gray-800/50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                    5. Accuracy Statement
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Include the following statement: "I swear, under penalty of perjury, that the information in this 
                    notification is accurate and that I am the copyright owner or am authorized to act on behalf of 
                    the owner of an exclusive right that is allegedly infringed."
                  </p>
                </div>

                <div className="bg-white/50 dark:bg-gray-800/50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                    6. Physical or Electronic Signature
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Provide a physical or electronic signature of the copyright owner or person authorized to act 
                    on their behalf.
                  </p>
                </div>
              </div>

              <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 rounded">
                <p className="text-sm text-yellow-800 dark:text-yellow-300">
                  <strong>Important:</strong> Filing a false DMCA notice may result in legal consequences, including 
                  liability for damages. Only submit a notice if you have a good faith belief that the material is 
                  infringing.
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Where to Send */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-card p-8 rounded-xl mb-8 bg-primary-50 dark:bg-primary-900/20"
        >
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
              <Mail className="w-6 h-6 text-primary-600 dark:text-primary-400" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Submit Your DMCA Notice
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Send your complete DMCA takedown notice to our designated Copyright Agent:
              </p>
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg space-y-2">
                <p className="text-gray-900 dark:text-white font-semibold">WishTrail Copyright Agent</p>
                <p className="text-gray-700 dark:text-gray-300"><strong>Email:</strong> support@wishtrail.in</p>
                <p className="text-gray-700 dark:text-gray-300"><strong>Subject Line:</strong> "DMCA Takedown Notice"</p>
              </div>
              <p className="mt-4 text-sm text-gray-500 dark:text-gray-500">
                We will respond to valid notices within 24-48 hours. Incomplete notices will be returned for clarification.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Counter-Notification */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="glass-card p-8 rounded-xl mb-8"
        >
          <div className="flex items-start space-x-4 mb-6">
            <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
              <Scale className="w-6 h-6 text-primary-600 dark:text-primary-400" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Filing a Counter-Notification
              </h2>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-6">
                If your content was removed due to a DMCA notice and you believe it was removed in error or that you have 
                the right to use the material, you may file a counter-notification. Your counter-notification must include:
              </p>
              
              <div className="space-y-3">
                <div className="flex items-start space-x-2">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center mt-0.5">
                    <span className="text-xs font-bold text-primary-600 dark:text-primary-400">1</span>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400">Your name, address, phone number, and email address</p>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center mt-0.5">
                    <span className="text-xs font-bold text-primary-600 dark:text-primary-400">2</span>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400">Identification of the material that was removed and where it appeared</p>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center mt-0.5">
                    <span className="text-xs font-bold text-primary-600 dark:text-primary-400">3</span>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400">A statement under penalty of perjury that you have a good faith belief the material was removed due to mistake or misidentification</p>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center mt-0.5">
                    <span className="text-xs font-bold text-primary-600 dark:text-primary-400">4</span>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400">A statement consenting to jurisdiction of the Federal District Court for your district (or where WishTrail is located if outside the U.S.)</p>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center mt-0.5">
                    <span className="text-xs font-bold text-primary-600 dark:text-primary-400">5</span>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400">A statement that you will accept service of process from the person who filed the original DMCA notice</p>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center mt-0.5">
                    <span className="text-xs font-bold text-primary-600 dark:text-primary-400">6</span>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400">Your physical or electronic signature</p>
                </div>
              </div>

              <p className="mt-6 text-gray-600 dark:text-gray-400">
                Send counter-notifications to: <strong className="text-primary-600 dark:text-primary-400">support@wishtrail.in</strong>
              </p>

              <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-400 rounded">
                <p className="text-sm text-blue-800 dark:text-blue-300">
                  Upon receiving a valid counter-notification, we will forward it to the original complainant. 
                  If they do not file a court action within 10-14 business days, we may restore the removed content.
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Repeat Infringers */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="glass-card p-8 rounded-xl mb-8"
        >
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <Ban className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Repeat Infringer Policy
              </h2>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                WishTrail maintains a policy of terminating accounts of users who are repeat copyright infringers. 
                We track copyright violations and take the following actions:
              </p>
              <ul className="space-y-2 text-gray-600 dark:text-gray-400">
                <li className="flex items-start space-x-2">
                  <span className="text-primary-600 dark:text-primary-400 font-bold">•</span>
                  <span><strong>1st Violation:</strong> Warning and content removal</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-primary-600 dark:text-primary-400 font-bold">•</span>
                  <span><strong>2nd Violation:</strong> Temporary account suspension (7-30 days)</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-primary-600 dark:text-primary-400 font-bold">•</span>
                  <span><strong>3rd Violation:</strong> Permanent account termination</span>
                </li>
              </ul>
              <p className="mt-4 text-sm text-gray-500 dark:text-gray-500">
                Egregious violations may result in immediate termination without prior warning.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Additional Information */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="glass-card p-8 rounded-xl mb-8"
        >
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Additional Information
          </h2>
          <div className="space-y-4 text-gray-600 dark:text-gray-400">
            <div>
              <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">Trademark Complaints</h3>
              <p>
                For trademark infringement complaints, please contact us at <strong>support@wishtrail.in</strong> with 
                details of your trademark registration and the allegedly infringing content.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">Other Intellectual Property Issues</h3>
              <p>
                For patent, trade secret, or other intellectual property concerns not covered by DMCA, 
                contact <strong>support@wishtrail.in</strong> with relevant details.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">Questions</h3>
              <p>
                If you have questions about this policy or copyright issues in general, 
                contact <strong>support@wishtrail.in</strong>.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Related Policies */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="glass-card p-6 rounded-xl"
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Related Policies
          </h3>
          <div className="flex flex-wrap gap-4">
            <Link 
              to="/terms-of-service"
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 hover:bg-primary-200 dark:hover:bg-primary-900/50 transition-colors"
            >
              <FileText className="w-4 h-4" />
              <span>Terms of Service</span>
            </Link>
            <Link 
              to="/community-guidelines"
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 hover:bg-primary-200 dark:hover:bg-primary-900/50 transition-colors"
            >
              <FileText className="w-4 h-4" />
              <span>Community Guidelines</span>
            </Link>
            <Link 
              to="/privacy-policy"
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 hover:bg-primary-200 dark:hover:bg-primary-900/50 transition-colors"
            >
              <FileText className="w-4 h-4" />
              <span>Privacy Policy</span>
            </Link>
          </div>
        </motion.div>

        {/* Back to Home */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="mt-12 text-center"
        >
          <Link
            to="/"
            className="inline-flex items-center space-x-2 text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
          >
            <span>← Back to Home</span>
          </Link>
        </motion.div>
      </div>
    </div>
  )
}

export default CopyrightPolicy
