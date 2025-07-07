import { motion } from 'framer-motion'
import { ExternalLink, BookOpen, ArrowRight } from 'lucide-react'

const BlogBanner = () => {
  const blogUrl = 'https://blooggerr.netlify.app/'
  
  const blogPosts = [
    {
      title: '5 Steps to Effective Goal Setting',
      excerpt: 'Learn the proven framework for setting and achieving your biggest goals',
      readTime: '5 min read'
    },
    {
      title: 'The Power of Visualization',
      excerpt: 'How mental imagery can accelerate your path to success',
      readTime: '7 min read'
    },
    {
      title: 'Building Consistent Habits',
      excerpt: 'Small daily actions that lead to massive results',
      readTime: '4 min read'
    }
  ]

  return (
    <section className="py-20 bg-gray-50 dark:bg-gray-800">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-12"
        >
          <div className="flex items-center justify-center space-x-2 mb-4">
            <BookOpen className="h-8 w-8 text-primary-500" />
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
              Latest from Our Blog
            </h2>
          </div>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Dive deeper into personal development with our comprehensive guides and insights
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {blogPosts.map((post, index) => (
            <motion.div
              key={post.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="glass-card p-6 rounded-xl hover:scale-105 transition-transform duration-300"
            >
              <div className="h-32 bg-gray-100 dark:bg-gray-700 rounded-lg mb-4 flex items-center justify-center">
                <BookOpen className="h-12 w-12 text-primary-500 opacity-50" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {post.title}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                {post.excerpt}
              </p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 dark:text-gray-500">
                  {post.readTime}
                </span>
                <ArrowRight className="h-4 w-4 text-primary-500" />
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="text-center"
        >
          <div className="glass-card p-8 rounded-2xl max-w-2xl mx-auto">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Ready for More Insights?
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Explore our full collection of articles, guides, and resources to accelerate your personal growth journey
            </p>
            <a
              href={blogUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary inline-flex items-center space-x-2"
            >
              <span>Visit Our Blog</span>
              <ExternalLink className="h-5 w-5" />
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

export default BlogBanner 