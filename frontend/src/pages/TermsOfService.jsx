import { useState } from 'react'
import { Scale, Mail } from 'lucide-react'
import { Link } from 'react-router-dom'

const TermsOfService = () => {
  const [activeSection, setActiveSection] = useState(null)

  const sections = [
    {
      id: 'acceptance',
      title: 'Acceptance of Terms',
      content: [
        {
          text: 'By accessing or using WishTrail (\'the Service\'), you agree to be bound by these Terms of Service (\'Terms\'). If you do not agree to these Terms, you may not use the Service. These Terms apply to all users, including visitors, registered users, and contributors. Your continued use of the Service constitutes acceptance of any modifications to these Terms.'
        }
      ]
    },
    {
      id: 'user-accounts',
      title: 'User Accounts',
      content: [
        {
          subtitle: 'Account Creation',
          text: 'To access certain features, you must create an account by providing accurate, complete, and current information. You may register using email and password or through Google SSO. You are responsible for maintaining the confidentiality of your account credentials.'
        },
        {
          subtitle: 'Account Responsibilities',
          text: 'You are solely responsible for all activities that occur under your account. You must notify us immediately of any unauthorized use of your account or any security breach. You must be at least 13 years old to create an account.'
        },
        {
          subtitle: 'Account Termination',
          text: 'We reserve the right to suspend or terminate your account at any time for violation of these Terms, fraudulent activity, or any other reason we deem appropriate. You may delete your account at any time through account settings.'
        }
      ]
    },
    {
      id: 'acceptable-use',
      title: 'Acceptable Use',
      content: [
        {
          subtitle: 'Permitted Use',
          text: 'WishTrail is designed to help you track goals, build habits, connect with like-minded individuals, and achieve personal growth. You may use the Service (via web browser or mobile app) for lawful purposes in accordance with these Terms.'
        },
        {
          subtitle: 'Prohibited Activities',
          text: 'You agree NOT to: (1) Violate any laws or regulations; (2) Infringe on intellectual property rights; (3) Transmit harmful code, viruses, or malware; (4) Harass, abuse, or harm other users; (5) Impersonate any person or entity; (6) Collect user data without consent; (7) Interfere with the Service\'s operation; (8) Create fake accounts or automate access; (9) Post spam, advertising, or promotional content without authorization; (10) Engage in any activity that could damage WishTrail\'s reputation or operations.'
        }
      ]
    },
    {
      id: 'user-content',
      title: 'User Content',
      content: [
        {
          subtitle: 'Your Content',
          text: 'You retain ownership of all content you create, post, or upload to WishTrail, including goals, journal entries, posts, comments, images, and videos (\'User Content\'). You are responsible for ensuring you have the right to share any content you post. Media uploads are subject to file size limits (typically 500KB-1MB for images) and must be in accepted formats (JPEG, PNG, WebP, MP4).'
        },
        {
          subtitle: 'License to WishTrail',
          text: 'By posting User Content, you grant WishTrail a worldwide, non-exclusive, royalty-free license to use, reproduce, modify, adapt, publish, and display your content solely for the purpose of operating and improving the Service. This license ends when you delete your content or account, except for content that has been shared with other users.'
        },
        {
          subtitle: 'Content Standards',
          text: 'User Content must not contain: (1) Illegal, harmful, or offensive material; (2) Hate speech, discrimination, or harassment; (3) Sexually explicit or violent content; (4) Personal information of others without consent; (5) Spam or misleading information; (6) Copyright or trademark violations. We reserve the right to remove any content that violates these standards.'
        },
        {
          subtitle: 'Content Monitoring',
          text: 'While we do not pre-screen User Content, we reserve the right to monitor, review, and remove content at our discretion. We may use automated tools and community reports to identify violations.'
        }
      ]
    },
    {
      id: 'intellectual-property',
      title: 'Intellectual Property',
      content: [
        {
          subtitle: 'WishTrail\'s Property',
          text: 'The Service, including its design, features, functionality, code, graphics, logos, and content (excluding User Content), is owned by WishTrail and protected by copyright, trademark, and other intellectual property laws. You may not copy, modify, distribute, or create derivative works without our express written permission.'
        },
        {
          subtitle: 'Trademarks',
          text: 'WishTrail, the WishTrail logo, and other marks used on the Service are trademarks of WishTrail. You may not use these trademarks without our prior written consent.'
        },
        {
          subtitle: 'Copyright Infringement',
          text: 'We respect intellectual property rights. If you believe your copyrighted work has been infringed, contact us at support@wishtrail.in with: (1) Description of the copyrighted work; (2) Location of the infringing material; (3) Your contact information; (4) A statement of good faith belief; (5) A statement under penalty of perjury that the information is accurate.'
        }
      ]
    },
    {
      id: 'disclaimers',
      title: 'Disclaimers and Limitations',
      content: [
        {
          subtitle: 'Service \'As Is\'',
          text: 'WishTrail is provided \'as is\' and \'as available\' without warranties of any kind, either express or implied, including but not limited to warranties of merchantability, fitness for a particular purpose, or non-infringement. We do not guarantee that the Service will be uninterrupted, secure, or error-free.'
        },
        {
          subtitle: 'No Professional Advice',
          text: 'WishTrail is a goal-tracking and personal development platform. Content on the Service does not constitute professional advice (medical, legal, financial, or otherwise). Always seek professional guidance for important decisions.'
        },
        {
          subtitle: 'Third-Party Content',
          text: 'WishTrail may contain links to third-party websites or services. We are not responsible for the content, accuracy, or practices of these external sites. Your use of third-party services is at your own risk.'
        },
        {
          subtitle: 'Limitation of Liability',
          text: 'To the fullest extent permitted by law, WishTrail and its officers, directors, employees, and agents shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of profits, data, or goodwill, arising from your use of the Service, even if we have been advised of the possibility of such damages.'
        }
      ]
    },
    {
      id: 'indemnification',
      title: 'Indemnification',
      content: [
        {
          text: 'You agree to indemnify, defend, and hold harmless WishTrail and its affiliates, officers, directors, employees, and agents from any claims, damages, losses, liabilities, and expenses (including legal fees) arising from: (1) Your use of the Service; (2) Your violation of these Terms; (3) Your User Content; (4) Your violation of any rights of another party. This indemnification obligation survives termination of these Terms.'
        }
      ]
    },
    {
      id: 'platform-availability',
      title: 'Platform Availability',
      content: [
        {
          text: 'WishTrail is available as a web application and mobile app (iOS/Android). Features may vary slightly between platforms. We use Firebase Cloud Messaging for push notifications on both web and mobile. By enabling notifications, you consent to receive alerts about your goals, community activity, and other relevant updates. You can manage notification preferences in your settings at any time.'
        }
      ]
    },
    {
      id: 'privacy',
      title: 'Privacy',
      content: [
        {
          text: 'Your privacy is important to us. Please review our Privacy Policy to understand how we collect, use, and protect your personal information. By using the Service, you consent to our privacy practices as described in the Privacy Policy.'
        }
      ]
    },
    {
      id: 'modifications',
      title: 'Modifications to the Service',
      content: [
        {
          text: 'We reserve the right to modify, suspend, or discontinue the Service (or any part thereof) at any time, with or without notice. We may also impose limits on certain features or restrict access to parts of the Service. We shall not be liable to you or any third party for any modification, suspension, or discontinuation of the Service.'
        }
      ]
    },
    {
      id: 'changes-to-terms',
      title: 'Changes to Terms',
      content: [
        {
          text: 'We may update these Terms from time to time. Material changes will be communicated via email or through a prominent notice on the Service. Your continued use of WishTrail after changes take effect constitutes acceptance of the modified Terms. If you do not agree to the changes, you must stop using the Service and delete your account.'
        }
      ]
    },
    {
      id: 'governing-law',
      title: 'Governing Law and Dispute Resolution',
      content: [
        {
          text: 'These Terms are governed by and construed in accordance with the laws of the United States, without regard to conflict of law principles. Any disputes arising from these Terms or your use of the Service shall be resolved through binding arbitration in accordance with the rules of the American Arbitration Association, except where prohibited by law.'
        }
      ]
    },
    {
      id: 'severability',
      title: 'Severability',
      content: [
        {
          text: 'If any provision of these Terms is found to be invalid or unenforceable by a court of competent jurisdiction, the remaining provisions shall continue in full force and effect. The invalid or unenforceable provision shall be replaced with a valid provision that most closely matches the intent of the original provision.'
        }
      ]
    },
    {
      id: 'entire-agreement',
      title: 'Entire Agreement',
      content: [
        {
          text: 'These Terms, together with our Privacy Policy and any other legal notices or agreements published on the Service, constitute the entire agreement between you and WishTrail regarding your use of the Service and supersede all prior agreements and understandings.'
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
              {sections.map((section) => (
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
                <Scale className="w-8 h-8 text-[#4c99e6]" />
              </div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-3">
                Terms of Service
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
                      If you have any questions about these Terms of Service, please contact our legal team.
                    </p>
                    <a
                      href="mailto:support@wishtrail.in"
                      className="inline-flex items-center gap-2 px-6 py-3 bg-[#4c99e6] hover:bg-[#3a7bc8] text-white font-medium rounded-lg transition-colors"
                    >
                      <Mail className="w-4 h-4" />
                      Contact Legal Team
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

export default TermsOfService
