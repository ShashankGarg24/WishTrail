import { motion } from 'framer-motion'
import { Shield, Lock, Eye, Database, Globe, Mail, FileText } from 'lucide-react'
import { Link } from 'react-router-dom'

const PrivacyPolicy = () => {
  const lastUpdated = "December 24, 2025"

  const sections = [
    {
      icon: Database,
      title: "Information We Collect",
      content: [
        {
          subtitle: "Account Information",
          text: "When you create an account, we collect your name, email address, username, and password (encrypted). If you sign up using Google SSO, we collect your name, email, and profile picture from your Google account."
        },
        {
          subtitle: "Profile Information",
          text: "You may choose to provide additional information such as your bio, profile picture, location, and social media links. This information is optional and helps personalize your experience."
        },
        {
          subtitle: "Goal and Activity Data",
          text: "We collect information about your goals, wishes, habits, journal entries, and progress tracking. This includes titles, descriptions, categories, milestones, completion status, and associated media (images, videos)."
        },
        {
          subtitle: "Community Interactions",
          text: "When you participate in the WishTrail community, we collect data about your posts, comments, likes, follows, and other social interactions."
        },
        {
          subtitle: "Usage Information",
          text: "We automatically collect information about how you use WishTrail, including pages visited, features used, search queries, and interaction patterns. This helps us improve our service."
        },
        {
          subtitle: "Device and Technical Data",
          text: "We collect device information such as IP address, browser type, operating system, device identifiers, cookie data, and push notification tokens (via Firebase Cloud Messaging) to ensure security, deliver notifications, and optimize your experience across web and mobile platforms."
        }
      ]
    },
    {
      icon: Eye,
      title: "How We Use Your Information",
      content: [
        {
          subtitle: "Service Delivery",
          text: "We use your information to provide, maintain, and improve WishTrail's features, including goal tracking, progress analytics, community features, and personalized recommendations."
        },
        {
          subtitle: "Communication",
          text: "We may send you service-related notifications, updates about your goals and habits, community activity alerts, and promotional content (which you can opt out of at any time)."
        },
        {
          subtitle: "Personalization",
          text: "Your data helps us customize your experience, provide relevant inspiration, suggest goals, and show content from users with similar interests."
        },
        {
          subtitle: "Analytics and Improvement",
          text: "We analyze usage patterns to understand how users interact with WishTrail, identify areas for improvement, and develop new features."
        },
        {
          subtitle: "Security and Fraud Prevention",
          text: "We use your information to detect and prevent fraud, abuse, security incidents, and other harmful activities."
        },
        {
          subtitle: "Legal Compliance",
          text: "We may use your information to comply with legal obligations, respond to legal requests, and enforce our terms of service."
        }
      ]
    },
    {
      icon: Lock,
      title: "Data Security",
      content: [
        {
          subtitle: "Encryption",
          text: "All data transmitted between your device and our servers is encrypted using industry-standard SSL/TLS protocols. Passwords are hashed using bcrypt before storage."
        },
        {
          subtitle: "Access Controls",
          text: "We implement strict access controls to ensure that only authorized personnel can access user data, and only when necessary for service operations."
        },
        {
          subtitle: "Regular Security Audits",
          text: "We regularly review and update our security practices, conduct vulnerability assessments, and implement security patches promptly."
        },
        {
          subtitle: "Data Breach Protocol",
          text: "In the unlikely event of a data breach, we will notify affected users within 72 hours and take immediate steps to secure the system."
        }
      ]
    },
    {
      icon: Globe,
      title: "Information Sharing",
      content: [
        {
          subtitle: "Public Content",
          text: "Content you choose to make public (such as public goals, posts, and profile information) will be visible to other WishTrail users and may appear in search results."
        },
        {
          subtitle: "Third-Party Services",
          text: "We use trusted third-party service providers including Vercel (hosting), Google OAuth (authentication), Firebase Cloud Messaging (push notifications), and Cloudinary (media storage for images and videos). These providers are contractually obligated to protect your data and only process it as instructed."
        },
        {
          subtitle: "Legal Requirements",
          text: "We may disclose your information if required by law, court order, or government request, or to protect the rights, property, or safety of WishTrail, our users, or others."
        },
        {
          subtitle: "Business Transfers",
          text: "If WishTrail is acquired or merged with another company, your information may be transferred to the new owners, who will continue to honor this privacy policy."
        },
        {
          subtitle: "With Your Consent",
          text: "We will share your information with third parties only when you explicitly provide consent."
        }
      ]
    },
    {
      icon: FileText,
      title: "Your Rights and Choices",
      content: [
        {
          subtitle: "Access and Portability",
          text: "You can access, download, and export your personal data at any time through your account settings."
        },
        {
          subtitle: "Correction and Update",
          text: "You can update your profile information, email, and other personal details directly in your account settings."
        },
        {
          subtitle: "Deletion",
          text: "You have the right to delete your account and all associated data. Upon deletion, your personal information will be permanently removed from our systems within 30 days."
        },
        {
          subtitle: "Privacy Settings",
          text: "You can control who sees your content by adjusting privacy settings for individual goals and your profile. Options include public, followers-only, and private."
        },
        {
          subtitle: "Communication Preferences",
          text: "You can manage notification preferences and opt out of promotional emails through your account settings."
        },
        {
          subtitle: "Cookie Management",
          text: "You can control cookies through your browser settings, though some features may not function properly if cookies are disabled."
        }
      ]
    }
  ]

  const additionalSections = [
    {
      title: "Cookies and Tracking Technologies",
      content: "WishTrail uses cookies and similar technologies to provide functionality, improve performance, and analyze usage. Essential cookies are required for authentication and security. Analytics cookies help us understand how users interact with our platform. You can manage cookie preferences through your browser settings. Note that cookies apply to the web version; the mobile app uses similar technologies for session management."
    },
    {
      title: "Media Uploads and Storage",
      content: "When you upload images or videos (such as profile pictures, goal completion photos, or community content), these files are stored securely on Cloudinary's servers. We limit file sizes (typically 500KB-1MB for images, larger for videos) and accept only common image formats (JPEG, PNG, WebP). Media you mark as public will be accessible to other users as part of your shared content."
    },
    {
      title: "Data Retention",
      content: "We retain your personal information for as long as your account is active or as needed to provide services. Account data is deleted within 30 days of account deletion. We may retain certain information for longer periods if required by law or for legitimate business purposes (e.g., fraud prevention, legal disputes)."
    },
    {
      title: "Children's Privacy",
      content: "WishTrail is not intended for users under the age of 13. We do not knowingly collect personal information from children under 13. If we become aware that a child under 13 has provided us with personal information, we will delete it immediately. Users between 13 and 18 should use WishTrail with parental supervision."
    },
    {
      title: "International Data Transfers",
      content: "WishTrail is operated from and hosted in the United States. If you access WishTrail from outside the U.S., your information may be transferred to, stored, and processed in the U.S. or other countries. We ensure appropriate safeguards are in place for international data transfers in compliance with applicable laws."
    },
    {
      title: "Third-Party Links",
      content: "WishTrail may contain links to third-party websites, services, or content. We are not responsible for the privacy practices of these external sites. We encourage you to read their privacy policies before providing any personal information."
    },
    {
      title: "Changes to This Policy",
      content: "We may update this Privacy Policy from time to time to reflect changes in our practices, technology, legal requirements, or other factors. We will notify users of significant changes via email or through a prominent notice on our platform. Continued use of WishTrail after changes constitutes acceptance of the updated policy."
    },
    {
      title: "California Privacy Rights (CCPA)",
      content: "California residents have additional rights under the California Consumer Privacy Act, including the right to know what personal information is collected, the right to delete personal information, and the right to opt-out of the sale of personal information. WishTrail does not sell personal information. To exercise your CCPA rights, contact us at privacy@wishtrail.com."
    },
    {
      title: "European Privacy Rights (GDPR)",
      content: "If you are located in the European Economic Area (EEA), you have rights under the General Data Protection Regulation (GDPR), including rights to access, rectification, erasure, data portability, and objection to processing. You also have the right to lodge a complaint with a supervisory authority. To exercise your GDPR rights, contact us at privacy@wishtrail.com."
    }
  ]

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
            <Shield className="w-8 h-8 text-primary-600 dark:text-primary-400" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            Privacy Policy
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Last Updated: {lastUpdated}
          </p>
          <p className="mt-4 text-gray-700 dark:text-gray-300 max-w-2xl mx-auto">
            At WishTrail, we take your privacy seriously. This policy describes how we collect, 
            use, and protect your personal information when you use our service.
          </p>
        </motion.div>

        {/* Main Sections */}
        <div className="space-y-8">
          {sections.map((section, index) => (
            <motion.div
              key={section.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="glass-card p-8 rounded-xl"
            >
              <div className="flex items-start space-x-4 mb-6">
                <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                  <section.icon className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                    {section.title}
                  </h2>
                  <div className="space-y-6">
                    {section.content.map((item, idx) => (
                      <div key={idx}>
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">
                          {item.subtitle}
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                          {item.text}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}

          {/* Additional Sections */}
          {additionalSections.map((section, index) => (
            <motion.div
              key={section.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: (sections.length + index) * 0.1 }}
              className="glass-card p-8 rounded-xl"
            >
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                {section.title}
              </h2>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                {section.content}
              </p>
            </motion.div>
          ))}

          {/* Contact Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: (sections.length + additionalSections.length) * 0.1 }}
            className="glass-card p-8 rounded-xl bg-primary-50 dark:bg-primary-900/20"
          >
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                <Mail className="w-6 h-6 text-primary-600 dark:text-primary-400" />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                  Contact Us
                </h2>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                  If you have any questions, concerns, or requests regarding this Privacy Policy 
                  or our data practices, please contact us:
                </p>
                <div className="space-y-2 text-gray-700 dark:text-gray-300">
                  <p><strong>Email:</strong> privacy@wishtrail.com</p>
                  <p><strong>Support:</strong> support@wishtrail.com</p>
                  <p><strong>Website:</strong> <a href="https://wishtrail.com" className="text-primary-600 dark:text-primary-400 hover:underline">wishtrail.com</a></p>
                </div>
                <p className="mt-4 text-gray-600 dark:text-gray-400">
                  We are committed to protecting your privacy and will respond to your inquiry within 30 days.
                </p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Back to Home */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
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

export default PrivacyPolicy
