import { motion } from 'framer-motion'
import { Heart, MessageCircle, Flag, Shield, Users, ThumbsUp, AlertTriangle, Ban, CheckCircle } from 'lucide-react'
import { Link } from 'react-router-dom'

const CommunityGuidelines = () => {
  const lastUpdated = "December 25, 2025"

  const coreValues = [
    {
      icon: Heart,
      title: "Be Kind and Supportive",
      description: "Celebrate others' achievements, offer encouragement, and provide constructive feedback. We're all here to grow together."
    },
    {
      icon: Users,
      title: "Respect Diversity",
      description: "Welcome all backgrounds, perspectives, and experiences. Discrimination, hate speech, and intolerance have no place here."
    },
    {
      icon: Shield,
      title: "Keep It Safe",
      description: "Protect your privacy and respect others'. Never share personal information like addresses, phone numbers, or financial details."
    },
    {
      icon: CheckCircle,
      title: "Be Authentic",
      description: "Share genuine experiences and progress. Authenticity builds trust and creates meaningful connections."
    }
  ]

  const guidelines = [
    {
      icon: ThumbsUp,
      title: "Content Standards",
      color: "text-green-600 dark:text-green-400",
      rules: [
        {
          subtitle: "Appropriate Content",
          text: "Share goals, progress updates, achievements, inspirational stories, tips, and motivational content. Keep posts relevant to personal development, goal achievement, and positive lifestyle changes."
        },
        {
          subtitle: "Quality Over Quantity",
          text: "Post meaningful content that adds value to the community. Avoid spam, repetitive posts, or low-effort content that clutters feeds."
        },
        {
          subtitle: "Original Content",
          text: "Share your own experiences and creations. When sharing others' work, always give proper credit and ensure you have permission."
        },
        {
          subtitle: "Media Guidelines",
          text: "Images and videos should be clear, appropriate, and relevant to your goals. No graphic violence, sexually explicit content, or disturbing imagery."
        }
      ]
    },
    {
      icon: MessageCircle,
      title: "Interaction Guidelines",
      color: "text-blue-600 dark:text-blue-400",
      rules: [
        {
          subtitle: "Constructive Comments",
          text: "Provide helpful feedback and encouragement. If offering criticism, make it constructive and kind. Avoid harsh or demeaning language."
        },
        {
          subtitle: "No Harassment",
          text: "Don't bully, stalk, threaten, or intimidate others. This includes unwanted messages, offensive comments, or targeted attacks."
        },
        {
          subtitle: "Respectful Disagreements",
          text: "It's okay to disagree, but do so respectfully. Focus on ideas, not personal attacks. Keep discussions civil and productive."
        },
        {
          subtitle: "No Trolling",
          text: "Don't deliberately provoke, mock, or disrupt conversations. Engage in good faith and contribute positively."
        }
      ]
    },
    {
      icon: Ban,
      title: "Prohibited Content",
      color: "text-red-600 dark:text-red-400",
      rules: [
        {
          subtitle: "Hate Speech & Discrimination",
          text: "No content that promotes hatred, violence, or discrimination based on race, ethnicity, religion, gender, sexual orientation, disability, or any other protected characteristic."
        },
        {
          subtitle: "Violence & Harm",
          text: "No content depicting, promoting, or glorifying violence, self-harm, suicide, or dangerous activities. If you're struggling, please reach out to professional resources."
        },
        {
          subtitle: "Adult Content",
          text: "No sexually explicit content, nudity, or sexual solicitation. Keep WishTrail safe for all ages (13+)."
        },
        {
          subtitle: "Illegal Activities",
          text: "No content promoting illegal activities, drug use, weapons, or anything that violates local, state, or federal laws."
        },
        {
          subtitle: "Misinformation",
          text: "Don't spread false information, especially regarding health, safety, or current events. Verify facts before sharing."
        },
        {
          subtitle: "Spam & Scams",
          text: "No unsolicited advertising, pyramid schemes, phishing attempts, or fraudulent content. Don't manipulate engagement (fake likes, followers, etc.)."
        },
        {
          subtitle: "Impersonation",
          text: "Don't pretend to be someone else, create fake accounts, or mislead others about your identity or affiliations."
        },
        {
          subtitle: "Private Information",
          text: "Don't share others' personal information (doxxing) without consent. This includes addresses, phone numbers, email addresses, or financial information."
        }
      ]
    },
    {
      icon: Flag,
      title: "Reporting & Moderation",
      color: "text-orange-600 dark:text-orange-400",
      rules: [
        {
          subtitle: "How to Report",
          text: "If you see content that violates these guidelines, use the report button on posts, comments, or profiles. Reports are reviewed promptly and kept confidential."
        },
        {
          subtitle: "What Happens Next",
          text: "Our moderation team reviews all reports. Violators may receive warnings, temporary suspensions, or permanent bans depending on severity. Repeat offenders will be permanently removed."
        },
        {
          subtitle: "False Reports",
          text: "Don't abuse the reporting system. Repeatedly filing false reports may result in action against your account."
        },
        {
          subtitle: "Appeals",
          text: "If you believe your content was removed in error, you can appeal by contacting support@wishtrail.in with your username and details."
        }
      ]
    }
  ]

  const specialSections = [
    {
      title: "Privacy & Data Protection",
      icon: Shield,
      content: "Be mindful of what you share publicly. Once posted, content may be seen by all WishTrail users. Use privacy settings to control who can see your goals, posts, and profile. Never share passwords, API keys, or sensitive credentials. For more details, review our Privacy Policy."
    },
    {
      title: "Intellectual Property",
      icon: AlertTriangle,
      content: "Respect copyrights and trademarks. Don't post content you don't own or have permission to use. If you're sharing quotes, articles, or images, provide proper attribution. For copyright concerns, see our Copyright Policy."
    },
    {
      title: "Commercial Activity",
      icon: Ban,
      content: "WishTrail is for personal development, not business promotion. Limited mentions of your work/projects are okay if relevant to your goals, but excessive advertising, affiliate links, or sales pitches are prohibited. Contact us for partnership opportunities."
    },
    {
      title: "Account Responsibility",
      icon: Users,
      content: "You're responsible for all activity on your account. Keep your password secure and don't share your account. If you suspect unauthorized access, change your password immediately and contact support. You may not create multiple accounts to evade bans or manipulate features."
    }
  ]

  const consequences = [
    {
      level: "1st Violation",
      action: "Warning",
      description: "Content removed + educational notice"
    },
    {
      level: "2nd Violation",
      action: "Temporary Ban",
      description: "1-7 day suspension depending on severity"
    },
    {
      level: "3rd Violation",
      action: "Extended Ban",
      description: "30-90 day suspension"
    },
    {
      level: "Severe/Repeated",
      action: "Permanent Ban",
      description: "Account permanently removed"
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
            <Users className="w-8 h-8 text-primary-600 dark:text-primary-400" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-3">
            Community Guidelines
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Last Updated: {lastUpdated}
          </p>
          <p className="mt-3 text-sm text-gray-700 dark:text-gray-300 max-w-2xl mx-auto">
            WishTrail is a supportive community dedicated to helping you achieve your goals. 
            These guidelines ensure a positive, safe, and inspiring environment for everyone.
          </p>
        </motion.div>

        {/* Core Values */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-12"
        >
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 text-center">
            Our Core Values
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            {coreValues.map((value, index) => (
              <motion.div
                key={value.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + index * 0.05 }}
                className="glass-card p-4 rounded-xl"
              >
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                    <value.icon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1.5">
                      {value.title}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {value.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Detailed Guidelines */}
        <div className="space-y-8">
          {guidelines.map((section, index) => (
            <motion.div
              key={section.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + index * 0.1 }}
              className="glass-card p-8 rounded-xl"
            >
              <div className="flex items-start space-x-4 mb-6">
                <div className={`flex-shrink-0 w-12 h-12 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center`}>
                  <section.icon className={`w-6 h-6 ${section.color}`} />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                    {section.title}
                  </h2>
                  <div className="space-y-6">
                    {section.rules.map((rule, idx) => (
                      <div key={idx}>
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">
                          {rule.subtitle}
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                          {rule.text}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Special Sections */}
        <div className="mt-8 space-y-6">
          {specialSections.map((section, index) => (
            <motion.div
              key={section.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 + index * 0.05 }}
              className="glass-card p-6 rounded-xl"
            >
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                  <section.icon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                    {section.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                    {section.content}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Consequences */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="mt-8 glass-card p-8 rounded-xl"
        >
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            Enforcement & Consequences
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            We take violations seriously. Here's what happens when guidelines are broken:
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {consequences.map((consequence, index) => (
              <div
                key={consequence.level}
                className="bg-white/50 dark:bg-gray-800/50 p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700"
              >
                <div className="text-sm font-semibold text-primary-600 dark:text-primary-400 mb-1">
                  {consequence.level}
                </div>
                <div className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                  {consequence.action}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {consequence.description}
                </div>
              </div>
            ))}
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-4 italic">
            Note: Severe violations (illegal content, threats, harassment) may result in immediate permanent ban and reporting to authorities.
          </p>
        </motion.div>

        {/* Contact */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="mt-8 glass-card p-8 rounded-xl bg-primary-50 dark:bg-primary-900/20"
        >
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Questions or Concerns?
          </h2>
          <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
            If you have questions about these guidelines or need to report a violation, 
            please contact us:
          </p>
          <div className="space-y-2 text-gray-700 dark:text-gray-300">
            <p><strong>Support:</strong> support@wishtrail.in</p>
          </div>
          <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
            Thank you for helping us maintain a positive, supportive community where everyone can thrive!
          </p>
        </motion.div>

        {/* Back to Home */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
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

export default CommunityGuidelines
