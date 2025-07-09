import { motion } from 'framer-motion'
import { Trophy, Target, MapPin } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const ActivityFeed = ({ activities, title = "Recent Activities", showEmpty = true }) => {
  const navigate = useNavigate()
  if (activities.length === 0 && showEmpty) {
    return (
      <div className="glass-card p-6 rounded-xl">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {title}
        </h3>
        <div className="text-center py-8">
          <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">
            No recent activities to show.
          </p>
        </div>
      </div>
    )
  }

  if (activities.length === 0) {
    return null
  }

  return (
    <div className="glass-card p-6 rounded-xl">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        {title}
      </h3>
      <div className="space-y-4">
        {activities.map((activity, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            className="flex items-center space-x-4 p-4 bg-white/50 dark:bg-gray-800/50 rounded-lg hover:bg-white/80 dark:hover:bg-gray-800/80 transition-colors"
          >
            <div className="flex-shrink-0">
              <img
                src={activity.userAvatar}
                alt={activity.user}
                className="w-10 h-10 rounded-full border-2 border-primary-500 object-cover cursor-pointer hover:ring-2 hover:ring-primary-300 transition-all"
                onClick={() => activity.userId && navigate(`/profile/${activity.userId}`)}
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <span 
                  className="font-medium text-gray-900 dark:text-white text-sm cursor-pointer hover:text-primary-500 transition-colors"
                  onClick={() => activity.userId && navigate(`/profile/${activity.userId}`)}
                >
                  {activity.user}
                </span>
                <span className="text-xs px-2 py-1 bg-primary-100 dark:bg-primary-900 text-primary-800 dark:text-primary-200 rounded-full">
                  {activity.category}
                </span>
              </div>
              <p className="text-gray-700 dark:text-gray-300 text-sm font-medium truncate">
                {activity.goal}
              </p>
              <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400 mt-1">
                <span>{activity.completedAt}</span>
                <span>•</span>
                <div className="flex items-center space-x-1">
                  <Trophy className="h-3 w-3 text-yellow-500" />
                  <span>Goal completed</span>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

export default ActivityFeed 