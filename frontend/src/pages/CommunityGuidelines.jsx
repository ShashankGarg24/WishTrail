import { useState } from 'react'
import { Users, Mail } from 'lucide-react'
import { Link } from 'react-router-dom'

const CommunityGuidelines = () => {
  const [activeSection, setActiveSection] = useState(null)

  const sections = [
    {
      id: 'core-values',
      title: 'Our Core Values',
      content: [
        {
          subtitle: 'Be Kind and Supportive',
          text: 'Celebrate others\' achievements, offer encouragement, and provide constructive feedback. We\'re all here to grow together.'
        },
        {
          subtitle: 'Respect Diversity',
          text: 'Welcome all backgrounds, perspectives, and experiences. Discrimination, hate speech, and intolerance have no place here.'
        },
        {
          subtitle: 'Keep It Safe',
          text: 'Protect your privacy and respect others\'. Never share personal information like addresses, phone numbers, or financial details.'
        },
        {
          subtitle: 'Be Authentic',
          text: 'Share genuine experiences and progress. Authenticity builds trust and creates meaningful connections.'
        }
      ]
    },
    {
      id: 'content-standards',
      title: 'Content Standards',
      content: [
        {
          subtitle: 'Appropriate Content',
          text: 'Share goals, progress updates, achievements, inspirational stories, tips, and motivational content. Keep posts relevant to personal development, goal achievement, and positive lifestyle changes.'
        },
        {
          subtitle: 'Quality Over Quantity',
          text: 'Post meaningful content that adds value to the community. Avoid spam, repetitive posts, or low-effort content that clutters feeds.'
        },
        {
          subtitle: 'Original Content',
          text: 'Share your own experiences and creations. When sharing others\' work, always give proper credit and ensure you have permission.'
        },
        {
          subtitle: 'Media Guidelines',
          text: 'Images and videos should be clear, appropriate, and relevant to your goals. No graphic violence, sexually explicit content, or disturbing imagery.'
        }
      ]
    },
    {
      id: 'interaction-guidelines',
      title: 'Interaction Guidelines',
      content: [
        {
          subtitle: 'Constructive Comments',
          text: 'Provide helpful feedback and encouragement. If offering criticism, make it constructive and kind. Avoid harsh or demeaning language.'
        },
        {
          subtitle: 'No Harassment',
          text: 'Don\'t bully, stalk, threaten, or intimidate others. This includes unwanted messages, offensive comments, or targeted attacks.'
        },
        {
          subtitle: 'Respectful Disagreements',
          text: 'It\'s okay to disagree, but do so respectfully. Focus on ideas, not personal attacks. Keep discussions civil and productive.'
        },
        {
          subtitle: 'No Trolling',
          text: 'Don\'t deliberately provoke, mock, or disrupt conversations. Engage in good faith and contribute positively.'
        }
      ]
    },
    {
      id: 'prohibited-content',
      title: 'Prohibited Content',
      content: [
        {
          subtitle: 'Hate Speech & Discrimination',
          text: 'No content that promotes hatred, violence, or discrimination based on race, ethnicity, religion, gender, sexual orientation, disability, or any other protected characteristic.'
        },
        {
          subtitle: 'Violence & Harm',
          text: 'No content depicting, promoting, or glorifying violence, self-harm, suicide, or dangerous activities. If you\'re struggling, please reach out to professional resources.'
        },
        {
          subtitle: 'Adult Content',
          text: 'No sexually explicit content, nudity, or sexual solicitation. Keep WishTrail safe for all ages (13+).'
        },
        {
          subtitle: 'Illegal Activities',
          text: 'No content promoting illegal activities, drug use, weapons, or anything that violates local, state, or federal laws.'
        },
        {
          subtitle: 'Misinformation',
          text: 'Don\'t spread false information, especially regarding health, safety, or current events. Verify facts before sharing.'
        },
        {
          subtitle: 'Spam & Scams',
          text: 'No unsolicited advertising, pyramid schemes, phishing attempts, or fraudulent content. Don\'t manipulate engagement (fake likes, followers, etc.).'
        },
        {
          subtitle: 'Impersonation',
          text: 'Don\'t pretend to be someone else, create fake accounts, or mislead others about your identity or affiliations.'
        },
        {
          subtitle: 'Private Information',
          text: 'Don\'t share others\' personal information (doxxing) without consent. This includes addresses, phone numbers, email addresses, or financial information.'
        }
      ]
    },
    {
      id: 'reporting-moderation',
      title: 'Reporting & Moderation',
      content: [
        {
          subtitle: 'How to Report',
          text: 'If you see content that violates these guidelines, use the report button on posts, comments, or profiles. Reports are reviewed promptly and kept confidential.'
        },
        {
          subtitle: 'What Happens Next',
          text: 'Our moderation team reviews all reports. Violators may receive warnings, temporary suspensions, or permanent bans depending on severity. Repeat offenders will be permanently removed.'
        },
        {
          subtitle: 'False Reports',
          text: 'Don\'t abuse the reporting system. Repeatedly filing false reports may result in action against your account.'
        },
        {
          subtitle: 'Appeals',
          text: 'If you believe your content was removed in error, you can appeal by contacting support@wishtrail.in with your username and details.'
        }
      ]
    },
    {
      id: 'privacy-data',
      title: 'Privacy & Data Protection',
      content: [
        {
          text: 'Be mindful of what you share publicly. Once posted, content may be seen by all WishTrail users. Use privacy settings to control who can see your goals, posts, and profile. Never share passwords, API keys, or sensitive credentials. For more details, review our Privacy Policy.'
        }
      ]
    },
    {
      id: 'intellectual-property',
      title: 'Intellectual Property',
      content: [
        {
          text: 'Respect copyrights and trademarks. Don\'t post content you don\'t own or have permission to use. If you\'re sharing quotes, articles, or images, provide proper attribution. For copyright concerns, see our Copyright Policy.'
        }
      ]
    },
    {
      id: 'commercial-activity',
      title: 'Commercial Activity',
      content: [
        {
          text: 'WishTrail is for personal development, not business promotion. Limited mentions of your work/projects are okay if relevant to your goals, but excessive advertising, affiliate links, or sales pitches are prohibited. Contact us for partnership opportunities.'
        }
      ]
    },
    {
      id: 'account-responsibility',
      title: 'Account Responsibility',
      content: [
        {
          text: 'You\'re responsible for all activity on your account. Keep your password secure and don\'t share your account. If you suspect unauthorized access, change your password immediately and contact support. You may not create multiple accounts to evade bans or manipulate features.'
        }
      ]
    },
    {
      id: 'enforcement',
      title: 'Enforcement & Consequences',
      content: [
        {
          subtitle: '1st Violation',
          text: 'Warning - Content removed with educational notice.'
        },
        {
          subtitle: '2nd Violation',
          text: 'Temporary Ban - 1-7 day suspension depending on severity.'
        },
        {
          subtitle: '3rd Violation',
          text: 'Extended Ban - 30-90 day suspension.'
        },
        {
          subtitle: 'Severe/Repeated',
          text: 'Permanent Ban - Account permanently removed.'
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
                <Users className="w-8 h-8 text-[#4c99e6]" />
              </div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-3">
                Community Guidelines
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
                      If you have questions about these guidelines or need to report a violation, please contact our community team.
                    </p>
                    <a
                      href="mailto:support@wishtrail.in"
                      className="inline-flex items-center gap-2 px-6 py-3 bg-[#4c99e6] hover:bg-[#3a7bc8] text-white font-medium rounded-lg transition-colors"
                    >
                      <Mail className="w-4 h-4" />
                      Contact Community Team
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

export default CommunityGuidelines
