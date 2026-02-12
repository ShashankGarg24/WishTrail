import { useState } from 'react'
import { Shield, Mail } from 'lucide-react'
import { Link } from 'react-router-dom'

const PrivacyPolicy = () => {
  const [activeSection, setActiveSection] = useState(null)

  const sections = [
    {
      id: 'information-we-collect',
      title: 'Information We Collect',
      content: [
        {
          subtitle: 'Account Information',
          text: 'When you create an account, we collect your email address, username, full name, and password (stored securely using bcrypt hashing). If you sign up via Google SSO, we collect your Google profile information including your name, email, and profile picture.'
        },
        {
          subtitle: 'Profile Data',
          text: 'You may optionally provide additional information such as a profile photo, bio, quote, timezone, language preferences, and premium status.'
        },
        {
          subtitle: 'Goals and Activities',
          text: 'We collect information about your goals, habits, journal entries, milestones, completion times, progress notes, and other activity data you create within the app.'
        },
        {
          subtitle: 'Social Features',
          text: 'When you interact with the community, we collect data about your posts, comments, likes, follows, and other social interactions.'
        },
        {
          subtitle: 'Media Uploads',
          text: 'Images and videos you upload (e.g., profile pictures, goal completion photos) are stored securely on Cloudinary\'s servers. We collect metadata about these files including file type, size, and upload timestamp.'
        },
        {
          subtitle: 'Usage Data',
          text: 'We automatically collect information about how you use WishTrail, including login times, device information (device type, OS, browser), IP address, and feature usage patterns.'
        },
        {
          subtitle: 'Notification Preferences',
          text: 'We collect your preferences for email, web push, and mobile push notifications. We use Firebase Cloud Messaging (FCM) to deliver push notifications. FCM tokens are stored to enable this functionality.'
        },
        {
          subtitle: 'Cookies and Local Storage',
          text: 'We use cookies and browser local storage to maintain your session, remember preferences, and improve user experience. Authentication tokens are stored securely.'
        }
      ]
    },
    {
      id: 'how-we-use',
      title: 'How We Use Your Information',
      content: [
        {
          subtitle: 'Provide and Improve the Service',
          text: 'We use your information to operate WishTrail, including creating and managing your account, storing your goals and habits, processing your activity, personalizing your experience, and improving features.'
        },
        {
          subtitle: 'Communication',
          text: 'We send transactional emails (password resets, account confirmations), push notifications (goal reminders, community updates), and occasional product updates. You can manage notification preferences in settings.'
        },
        {
          subtitle: 'Security and Fraud Prevention',
          text: 'We monitor activity to detect and prevent fraud, abuse, or security threats. This includes analyzing usage patterns and implementing rate limiting.'
        },
        {
          subtitle: 'Analytics and Research',
          text: 'We analyze aggregated, anonymized usage data to understand user behavior, improve our product, and develop new features.'
        },
        {
          subtitle: 'Legal Compliance',
          text: 'We may use your information to comply with legal obligations, enforce our Terms of Service, or respond to lawful requests from authorities.'
        }
      ]
    },
    {
      id: 'data-security',
      title: 'Data Security',
      content: [
        {
          subtitle: 'Encryption',
          text: 'All data transmitted between your device and our servers is encrypted using HTTPS/TLS. Passwords are hashed using bcrypt before storage.'
        },
        {
          subtitle: 'Access Controls',
          text: 'Access to your personal data is restricted to authorized personnel who need it to operate and maintain the service.'
        },
        {
          subtitle: 'Infrastructure Security',
          text: 'Our infrastructure is hosted on secure, enterprise-grade platforms (Vercel, Supabase) with regular security updates and monitoring.'
        },
        {
          subtitle: 'Incident Response',
          text: 'In the event of a data breach, we will notify affected users promptly and take immediate action to mitigate damage.'
        }
      ]
    },
    {
      id: 'information-sharing',
      title: 'Information Sharing and Disclosure',
      content: [
        {
          subtitle: 'Public Content',
          text: 'Content you choose to make public (e.g., public goals, community posts) is visible to other WishTrail users and may appear in feeds, search results, and public profiles.'
        },
        {
          subtitle: 'Third-Party Services',
          text: 'We use trusted third-party service providers including Vercel (hosting), Google OAuth (authentication), Firebase Cloud Messaging (push notifications), and Cloudinary (media storage). These providers are contractually obligated to protect your data and only process it as instructed.'
        },
        {
          subtitle: 'Legal Requirements',
          text: 'We may disclose your information if required by law, court order, or government request, or to protect the rights, property, or safety of WishTrail, our users, or others.'
        },
        {
          subtitle: 'Business Transfers',
          text: 'If WishTrail is acquired or merged with another company, your information may be transferred to the new owners, who will continue to honor this privacy policy.'
        },
        {
          subtitle: 'With Your Consent',
          text: 'We will share your information with third parties only when you explicitly provide consent.'
        }
      ]
    },
    {
      id: 'your-rights',
      title: 'Your Rights and Choices',
      content: [
        {
          subtitle: 'Access and Portability',
          text: 'You can access, download, and export your personal data at any time through your account settings.'
        },
        {
          subtitle: 'Correction and Update',
          text: 'You can update your profile information, email, and other personal details directly in your account settings.'
        },
        {
          subtitle: 'Deletion',
          text: 'You have the right to delete your account and all associated data. Upon deletion, your personal information will be permanently removed from our systems within 30 days.'
        },
        {
          subtitle: 'Privacy Settings',
          text: 'You can control who sees your content by adjusting privacy settings for individual goals and your profile. Options include public, followers-only, and private.'
        },
        {
          subtitle: 'Communication Preferences',
          text: 'You can manage notification preferences and opt out of promotional emails through your account settings.'
        },
        {
          subtitle: 'Cookie Management',
          text: 'You can control cookies through your browser settings, though some features may not function properly if cookies are disabled.'
        }
      ]
    },
    {
      id: 'cookies-tracking',
      title: 'Cookies and Tracking Technologies',
      content: [
        {
          text: 'WishTrail uses cookies and similar technologies to provide functionality, improve performance, and analyze usage. Essential cookies are required for authentication and security. Analytics cookies help us understand how users interact with our platform. You can manage cookie preferences through your browser settings. Note that cookies apply to the web version; the mobile app uses similar technologies for session management.'
        }
      ]
    },
    {
      id: 'media-uploads',
      title: 'Media Uploads and Storage',
      content: [
        {
          text: 'When you upload images or videos (such as profile pictures, goal completion photos, or community content), these files are stored securely on Cloudinary\'s servers. We limit file sizes (typically 500KB-1MB for images, larger for videos) and accept only common image formats (JPEG, PNG, WebP). Media you mark as public will be accessible to other users as part of your shared content.'
        }
      ]
    },
    {
      id: 'data-retention',
      title: 'Data Retention',
      content: [
        {
          text: 'We retain your personal information for as long as your account is active or as needed to provide services. Account data is deleted within 30 days of account deletion. We may retain certain information for longer periods if required by law or for legitimate business purposes (e.g., fraud prevention, legal disputes).'
        }
      ]
    },
    {
      id: 'childrens-privacy',
      title: 'Children\'s Privacy',
      content: [
        {
          text: 'WishTrail is not intended for users under the age of 13. We do not knowingly collect personal information from children under 13. If we become aware that a child under 13 has provided us with personal information, we will delete it immediately. Users between 13 and 18 should use WishTrail with parental supervision.'
        }
      ]
    },
    {
      id: 'international-transfers',
      title: 'International Data Transfers',
      content: [
        {
          text: 'WishTrail is operated from and hosted in the United States. If you access WishTrail from outside the U.S., your information may be transferred to, stored, and processed in the U.S. or other countries. We ensure appropriate safeguards are in place for international data transfers in compliance with applicable laws.'
        }
      ]
    },
    {
      id: 'third-party-links',
      title: 'Third-Party Links',
      content: [
        {
          text: 'WishTrail may contain links to third-party websites, services, or content. We are not responsible for the privacy practices of these external sites. We encourage you to read their privacy policies before providing any personal information.'
        }
      ]
    },
    {
      id: 'policy-changes',
      title: 'Changes to This Policy',
      content: [
        {
          text: 'We may update this Privacy Policy from time to time to reflect changes in our practices, technology, legal requirements, or other factors. We will notify users of significant changes via email or through a prominent notice on our platform. Continued use of WishTrail after changes constitutes acceptance of the updated policy.'
        }
      ]
    },
    {
      id: 'california-rights',
      title: 'California Privacy Rights (CCPA)',
      content: [
        {
          text: 'California residents have additional rights under the California Consumer Privacy Act, including the right to know what personal information is collected, the right to delete personal information, and the right to opt-out of the sale of personal information. WishTrail does not sell personal information. To exercise your CCPA rights, contact us at support@wishtrail.in.'
        }
      ]
    },
    {
      id: 'european-rights',
      title: 'European Privacy Rights (GDPR)',
      content: [
        {
          text: 'If you are located in the European Economic Area (EEA), you have rights under the General Data Protection Regulation (GDPR), including rights to access, rectification, erasure, data portability, and objection to processing. You also have the right to lodge a complaint with a supervisory authority. To exercise your GDPR rights, contact us at support@wishtrail.in.'
        }
      ]
    }
  ]

  const scrollToSection = (id) => {
    setActiveSection(id)
    const element = document.getElementById(id)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
      <div className="flex">
        {/* Sidebar Navigation */}
        <aside className="hidden lg:block w-64 fixed left-0 top-0 h-screen bg-gray-50 dark:bg-gray-800/50 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
          <div className="p-6 sticky top-0 bg-gray-50 dark:bg-gray-800/50">
            <Link to="/" className="text-sm text-[#4c99e6] hover:text-[#3a7bc8] transition-colors">
              ← Back to Home
            </Link>
          </div>
          <nav className="px-4 pb-6">
            <ul className="space-y-1">
              {sections.map((section, index) => (
                <li key={section.id}>
                  <button
                    onClick={() => scrollToSection(section.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                      activeSection === section.id
                        ? 'bg-[#4c99e6]/10 text-[#4c99e6] font-medium'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50'
                    }`}
                  >
                    {section.title}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 lg:ml-64">
          <div className="max-w-4xl mx-auto px-6 py-12">
            {/* Header */}
            <div className="mb-12">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#4c99e6]/10 mb-6">
                <Shield className="w-8 h-8 text-[#4c99e6]" />
              </div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-3">
                Privacy Policy
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Last updated: January 2026
              </p>
            </div>

            {/* Sections */}
            <div className="space-y-12">
              {sections.map((section, index) => (
                <section key={section.id} id={section.id} className="scroll-mt-6">
                  <div className="flex items-start gap-4 mb-6">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#e3f2fd] dark:bg-[#4c99e6]/20 flex items-center justify-center">
                      <span className="text-lg font-bold text-[#4c99e6]">{index + 1}</span>
                    </div>
                    <div className="flex-1">
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                        {section.title}
                      </h2>
                    </div>
                  </div>
                  
                  <div className="ml-14 space-y-6">
                    {section.content.map((item, idx) => (
                      <div key={idx}>
                        {item.subtitle && (
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                            {item.subtitle}
                          </h3>
                        )}
                        <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                          {item.text}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>
              ))}

              {/* Contact Section */}
              <section className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-8 border border-gray-200 dark:border-gray-700">
                <div className="flex items-start gap-4 mb-6">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-[#4c99e6]/10 flex items-center justify-center">
                    <Mail className="w-6 h-6 text-[#4c99e6]" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                      Questions or Concerns?
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                      If you have any questions about this Privacy Policy or our data practices, please contact us:
                    </p>
                    <a
                      href="mailto:support@wishtrail.in"
                      className="text-[#4c99e6] hover:text-[#3a7bc8] font-medium transition-colors"
                    >
                      support@wishtrail.in
                    </a>
                  </div>
                </div>
              </section>
            </div>

            {/* Mobile Back Link */}
            <div className="mt-12 lg:hidden text-center">
              <Link
                to="/"
                className="inline-flex items-center text-[#4c99e6] hover:text-[#3a7bc8] transition-colors"
              >
                ← Back to Home
              </Link>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export default PrivacyPolicy
