import { motion } from 'framer-motion'
import { FileText, AlertCircle, Scale, Users, Shield, Ban } from 'lucide-react'
import { Link } from 'react-router-dom'

const TermsOfService = () => {
  const lastUpdated = "December 24, 2025"

  const sections = [
    {
      icon: FileText,
      title: "Acceptance of Terms",
      content: "By accessing or using WishTrail ('the Service'), you agree to be bound by these Terms of Service ('Terms'). If you do not agree to these Terms, you may not use the Service. These Terms apply to all users, including visitors, registered users, and contributors. Your continued use of the Service constitutes acceptance of any modifications to these Terms."
    },
    {
      icon: Users,
      title: "User Accounts",
      subsections: [
        {
          subtitle: "Account Creation",
          text: "To access certain features, you must create an account by providing accurate, complete, and current information. You may register using email and password or through Google SSO. You are responsible for maintaining the confidentiality of your account credentials."
        },
        {
          subtitle: "Account Responsibilities",
          text: "You are solely responsible for all activities that occur under your account. You must notify us immediately of any unauthorized use of your account or any security breach. You must be at least 13 years old to create an account."
        },
        {
          subtitle: "Account Termination",
          text: "We reserve the right to suspend or terminate your account at any time for violation of these Terms, fraudulent activity, or any other reason we deem appropriate. You may delete your account at any time through account settings."
        }
      ]
    },
    {
      icon: Scale,
      title: "Acceptable Use",
      subsections: [
        {
          subtitle: "Permitted Use",
          text: "WishTrail is designed to help you track goals, build habits, connect with like-minded individuals, and achieve personal growth. You may use the Service (via web browser or mobile app) for lawful purposes in accordance with these Terms."
        },
        {
          subtitle: "Prohibited Activities",
          text: "You agree NOT to: (1) Violate any laws or regulations; (2) Infringe on intellectual property rights; (3) Transmit harmful code, viruses, or malware; (4) Harass, abuse, or harm other users; (5) Impersonate any person or entity; (6) Collect user data without consent; (7) Interfere with the Service's operation; (8) Create fake accounts or automate access; (9) Post spam, advertising, or promotional content without authorization; (10) Engage in any activity that could damage WishTrail's reputation or operations."
        }
      ]
    },
    {
      icon: FileText,
      title: "User Content",
      subsections: [
        {
          subtitle: "Your Content",
          text: "You retain ownership of all content you create, post, or upload to WishTrail, including goals, journal entries, posts, comments, images, and videos ('User Content'). You are responsible for ensuring you have the right to share any content you post. Media uploads are subject to file size limits (typically 500KB-1MB for images) and must be in accepted formats (JPEG, PNG, WebP, MP4)."
        },
        {
          subtitle: "License to WishTrail",
          text: "By posting User Content, you grant WishTrail a worldwide, non-exclusive, royalty-free license to use, reproduce, modify, adapt, publish, and display your content solely for the purpose of operating and improving the Service. This license ends when you delete your content or account, except for content that has been shared with other users."
        },
        {
          subtitle: "Content Standards",
          text: "User Content must not contain: (1) Illegal, harmful, or offensive material; (2) Hate speech, discrimination, or harassment; (3) Sexually explicit or violent content; (4) Personal information of others without consent; (5) Spam or misleading information; (6) Copyright or trademark violations. We reserve the right to remove any content that violates these standards."
        },
        {
          subtitle: "Content Monitoring",
          text: "While we do not pre-screen User Content, we reserve the right to monitor, review, and remove content at our discretion. We may use automated tools and community reports to identify violations."
        }
      ]
    },
    {
      icon: Shield,
      title: "Intellectual Property",
      subsections: [
        {
          subtitle: "WishTrail's Property",
          text: "The Service, including its design, features, functionality, code, graphics, logos, and content (excluding User Content), is owned by WishTrail and protected by copyright, trademark, and other intellectual property laws. You may not copy, modify, distribute, or create derivative works without our express written permission."
        },
        {
          subtitle: "Trademarks",
          text: "WishTrail, the WishTrail logo, and other marks used on the Service are trademarks of WishTrail. You may not use these trademarks without our prior written consent."
        },
        {
          subtitle: "Copyright Infringement",
          text: "We respect intellectual property rights. If you believe your copyrighted work has been infringed, contact us at support@wishtrail.in with: (1) Description of the copyrighted work; (2) Location of the infringing material; (3) Your contact information; (4) A statement of good faith belief; (5) A statement under penalty of perjury that the information is accurate."
        }
      ]
    },
    {
      icon: Ban,
      title: "Disclaimers and Limitations",
      subsections: [
        {
          subtitle: "Service 'As Is'",
          text: "WishTrail is provided 'as is' and 'as available' without warranties of any kind, either express or implied, including but not limited to warranties of merchantability, fitness for a particular purpose, or non-infringement. We do not guarantee that the Service will be uninterrupted, secure, or error-free."
        },
        {
          subtitle: "No Professional Advice",
          text: "WishTrail is a goal-tracking and personal development platform. Content on the Service does not constitute professional advice (medical, legal, financial, or otherwise). Always seek professional guidance for important decisions."
        },
        {
          subtitle: "Third-Party Content",
          text: "WishTrail may contain links to third-party websites or services. We are not responsible for the content, accuracy, or practices of these external sites. Your use of third-party services is at your own risk."
        },
        {
          subtitle: "Limitation of Liability",
          text: "To the fullest extent permitted by law, WishTrail and its officers, directors, employees, and agents shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of profits, data, or goodwill, arising from your use of the Service, even if we have been advised of the possibility of such damages. In jurisdictions where liability cannot be excluded, our liability is limited to the amount you paid us in the past 12 months, or $100, whichever is greater."
        }
      ]
    },
    {
      icon: AlertCircle,
      title: "Indemnification",
      content: "You agree to indemnify, defend, and hold harmless WishTrail and its affiliates, officers, directors, employees, and agents from any claims, damages, losses, liabilities, and expenses (including legal fees) arising from: (1) Your use of the Service; (2) Your violation of these Terms; (3) Your User Content; (4) Your violation of any rights of another party. This indemnification obligation survives termination of these Terms."
    }
  ]

  const additionalSections = [
    {
      title: "Platform Availability",
      content: "WishTrail is available as a web application and mobile app (iOS/Android). Features may vary slightly between platforms. We use Firebase Cloud Messaging for push notifications on both web and mobile. By enabling notifications, you consent to receive alerts about your goals, community activity, and other relevant updates. You can manage notification preferences in your settings at any time."
    },
    {
      title: "Privacy",
      content: "Your privacy is important to us. Please review our Privacy Policy to understand how we collect, use, and protect your personal information. By using the Service, you consent to our privacy practices as described in the Privacy Policy."
    },
    {
      title: "Modifications to the Service",
      content: "We reserve the right to modify, suspend, or discontinue the Service (or any part thereof) at any time, with or without notice. We may also impose limits on certain features or restrict access to parts of the Service. We shall not be liable to you or any third party for any modification, suspension, or discontinuation of the Service."
    },
    {
      title: "Changes to Terms",
      content: "We may update these Terms from time to time. Material changes will be communicated via email or through a prominent notice on the Service. Your continued use of WishTrail after changes take effect constitutes acceptance of the modified Terms. If you do not agree to the changes, you must stop using the Service and delete your account."
    },
    {
      title: "Governing Law and Dispute Resolution",
      content: "These Terms are governed by and construed in accordance with the laws of the United States, without regard to conflict of law principles. Any disputes arising from these Terms or your use of the Service shall be resolved through binding arbitration in accordance with the rules of the American Arbitration Association, except where prohibited by law. You waive any right to a jury trial or to participate in a class action lawsuit."
    },
    {
      title: "Severability",
      content: "If any provision of these Terms is found to be invalid or unenforceable by a court of competent jurisdiction, the remaining provisions shall continue in full force and effect. The invalid or unenforceable provision shall be replaced with a valid provision that most closely matches the intent of the original provision."
    },
    {
      title: "Entire Agreement",
      content: "These Terms, together with our Privacy Policy and any other legal notices or agreements published on the Service, constitute the entire agreement between you and WishTrail regarding your use of the Service and supersede all prior agreements and understandings."
    },
    {
      title: "Waiver",
      content: "Our failure to enforce any right or provision of these Terms shall not be deemed a waiver of such right or provision. No waiver of any term shall be deemed a further or continuing waiver of such term or any other term."
    },
    {
      title: "Assignment",
      content: "You may not assign or transfer these Terms or your account without our prior written consent. We may assign our rights and obligations under these Terms without restriction. Any attempted assignment in violation of this section shall be void."
    },
    {
      title: "Force Majeure",
      content: "WishTrail shall not be liable for any failure or delay in performance due to circumstances beyond our reasonable control, including but not limited to acts of God, natural disasters, war, terrorism, riots, embargoes, acts of civil or military authorities, fire, floods, accidents, pandemics, strikes, or shortages of transportation, facilities, fuel, energy, labor, or materials."
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
            <Scale className="w-8 h-8 text-primary-600 dark:text-primary-400" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-3">
            Terms of Service
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Last Updated: {lastUpdated}
          </p>
          <p className="mt-3 text-sm text-gray-700 dark:text-gray-300 max-w-2xl mx-auto">
            Please read these Terms of Service carefully before using WishTrail. 
            By using our service, you agree to these terms.
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
              className="glass-card p-6 rounded-xl"
            >
              <div className="flex items-start space-x-3 mb-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                  <section.icon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-3">
                    {section.title}
                  </h2>
                  {section.content && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                      {section.content}
                    </p>
                  )}
                  {section.subsections && (
                    <div className="space-y-4">
                      {section.subsections.map((item, idx) => (
                        <div key={idx}>
                          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1.5">
                            {item.subtitle}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                            {item.text}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
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
              className="glass-card p-6 rounded-xl"
            >
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-3">
                {section.title}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
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
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Contact Us
            </h2>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
              If you have questions about these Terms of Service, please contact us:
            </p>
            <div className="space-y-2 text-gray-700 dark:text-gray-300">
              <p><strong>Support:</strong> support@wishtrail.in</p>
              <p><strong>Website:</strong> <a href="https://wishtrail.in" className="text-primary-600 dark:text-primary-400 hover:underline">wishtrail.in</a></p>
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

export default TermsOfService
