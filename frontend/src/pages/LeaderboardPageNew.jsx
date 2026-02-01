import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Trophy, TrendingUp, Award, ChevronDown, Target } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const LeaderboardPageNew = () => {
  const [activeTab, setActiveTab] = useState('all-time')
  const [showMore, setShowMore] = useState(false)
  const navigate = useNavigate()

  // Mock top 3 data
  const topThree = [
    {
      rank: 2,
      name: 'Shashank G.',
      badge: 'SILVER ACHIEVER',
      goalsCompleted: 42,
      avatar: null
    },
    {
      rank: 1,
      name: 'Shrasti Shukla',
      badge: 'CHAMPION',
      goalsCompleted: 58,
      avatar: null
    },
    {
      rank: 3,
      name: 'TheWishTrail',
      badge: 'BRONZE EXPLORER',
      goalsCompleted: 35,
      avatar: null
    }
  ]

  // Mock rankings data
  const allRankings = [
    {
      rank: 4,
      name: 'Alex Rivers',
      isYou: true,
      consistency: 75,
      goalsCompleted: 32,
      avatar: null
    },
    {
      rank: 5,
      name: 'Marcus Chen',
      isYou: false,
      consistency: 65,
      goalsCompleted: 29,
      avatar: null
    },
    {
      rank: 6,
      name: 'Elena Rodriguez',
      isYou: false,
      consistency: 60,
      goalsCompleted: 27,
      avatar: null
    },
    {
      rank: 7,
      name: 'Jordan Smith',
      isYou: false,
      consistency: 55,
      goalsCompleted: 24,
      avatar: null
    },
    {
      rank: 8,
      name: 'Sarah Johnson',
      isYou: false,
      consistency: 50,
      goalsCompleted: 22,
      avatar: null
    },
    {
      rank: 9,
      name: 'Michael Brown',
      isYou: false,
      consistency: 48,
      goalsCompleted: 20,
      avatar: null
    },
    {
      rank: 10,
      name: 'Lisa Wang',
      isYou: false,
      consistency: 45,
      goalsCompleted: 19,
      avatar: null
    }
  ]

  const visibleRankings = showMore ? allRankings : allRankings.slice(0, 4)

  const getAvatarColor = (rank) => {
    const colors = [
      'from-yellow-400 to-orange-500',
      'from-gray-300 to-gray-400',
      'from-orange-400 to-amber-600',
      'from-orange-300 to-orange-500',
      'from-gray-400 to-gray-500',
      'from-yellow-300 to-yellow-500',
      'from-orange-400 to-yellow-500'
    ]
    return colors[rank % colors.length]
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-gray-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <div className="max-w-[1400px] mx-auto px-6 py-8">
        {/* Header with Trophy Icon */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full mb-4">
            <Trophy className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2 font-manrope">
            Leaderboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400 font-manrope">
            Celebrate the journey of achievers worldwide.
          </p>
        </motion.div>

        {/* Top 3 Podium */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex items-end justify-center gap-8 mb-16 max-w-4xl mx-auto"
        >
          {/* 2nd Place */}
          <div className="flex-1 max-w-[240px]">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700 text-center relative">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-gray-700 font-bold font-manrope text-sm">
                2
              </div>
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-gray-300 to-gray-400 mx-auto mb-4 flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-gray-200 dark:bg-gray-700"></div>
              </div>
              <h3 className="font-bold text-gray-900 dark:text-white font-manrope text-lg mb-1">
                {topThree[0].name}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-manrope uppercase tracking-wide mb-4">
                {topThree[0].badge}
              </p>
              <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                <div className="text-3xl font-bold text-gray-900 dark:text-white font-manrope mb-1">
                  {topThree[0].goalsCompleted}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 font-manrope uppercase tracking-wide">
                  Goals Completed
                </div>
              </div>
            </div>
          </div>

          {/* 1st Place - Larger */}
          <div className="flex-1 max-w-[280px]">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-xl border-2 border-[#4c99e6] text-center relative transform scale-105">
              <div className="absolute -top-5 left-1/2 transform -translate-x-1/2 w-10 h-10 bg-[#4c99e6] rounded-full flex items-center justify-center">
                <Award className="w-5 h-5 text-white" />
              </div>
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 mx-auto mb-4 flex items-center justify-center">
                <div className="w-20 h-20 rounded-full bg-gray-200 dark:bg-gray-700"></div>
              </div>
              <h3 className="font-bold text-gray-900 dark:text-white font-manrope text-xl mb-1">
                {topThree[1].name}
              </h3>
              <p className="text-xs text-[#4c99e6] font-manrope uppercase tracking-wide font-semibold mb-6 flex items-center justify-center gap-1">
                <Award className="w-3 h-3" />
                {topThree[1].badge}
              </p>
              <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                <div className="text-4xl font-bold text-gray-900 dark:text-white font-manrope mb-1">
                  {topThree[1].goalsCompleted}
                </div>
                <div className="text-xs text-[#4c99e6] font-manrope uppercase tracking-wide font-semibold">
                  Goals Completed
                </div>
              </div>
            </div>
          </div>

          {/* 3rd Place */}
          <div className="flex-1 max-w-[240px]">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700 text-center relative">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 w-8 h-8 bg-orange-400 rounded-full flex items-center justify-center text-white font-bold font-manrope text-sm">
                3
              </div>
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-400 to-amber-600 mx-auto mb-4 flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-gray-200 dark:bg-gray-700"></div>
              </div>
              <h3 className="font-bold text-gray-900 dark:text-white font-manrope text-lg mb-1">
                {topThree[2].name}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-manrope uppercase tracking-wide mb-4">
                {topThree[2].badge}
              </p>
              <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                <div className="text-3xl font-bold text-gray-900 dark:text-white font-manrope mb-1">
                  {topThree[2].goalsCompleted}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 font-manrope uppercase tracking-wide">
                  Goals Completed
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* All Rankings Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6 mb-8"
        >
          {/* Section Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#4c99e6]" />
              <h2 className="text-xl font-bold text-gray-900 dark:text-white font-manrope">
                All Rankings
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('this-month')}
                className={`px-4 py-2 rounded-lg font-medium font-manrope text-sm transition-all ${
                  activeTab === 'this-month'
                    ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                This Month
              </button>
              <button
                onClick={() => setActiveTab('all-time')}
                className={`px-4 py-2 rounded-lg font-medium font-manrope text-sm transition-all ${
                  activeTab === 'all-time'
                    ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                All Time
              </button>
            </div>
          </div>

          {/* Table Header */}
          <div className="grid grid-cols-12 gap-4 px-4 py-3 border-b border-gray-100 dark:border-gray-700 mb-2">
            <div className="col-span-1 text-xs text-gray-500 dark:text-gray-400 font-manrope uppercase tracking-wide">
              Rank
            </div>
            <div className="col-span-8 text-xs text-gray-500 dark:text-gray-400 font-manrope uppercase tracking-wide">
              User
            </div>
            <div className="col-span-3 text-xs text-gray-500 dark:text-gray-400 font-manrope uppercase tracking-wide text-right">
              Goals Completed
            </div>
          </div>

          {/* Rankings List */}
          <div className="space-y-2">
            {visibleRankings.map((user, index) => (
              <motion.div
                key={user.rank}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + index * 0.05 }}
                className="grid grid-cols-12 gap-4 px-4 py-4 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors items-center"
              >
                {/* Rank */}
                <div className="col-span-1">
                  <span className="font-semibold text-gray-900 dark:text-white font-manrope">
                    {user.rank}
                  </span>
                </div>

                {/* User */}
                <div className="col-span-8 flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${getAvatarColor(user.rank)} flex items-center justify-center text-white font-bold font-manrope text-sm`}>
                    {user.name.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900 dark:text-white font-manrope">
                        {user.name}
                      </span>
                      {user.isYou && (
                        <span className="px-2 py-0.5 bg-[#4c99e6] text-white text-xs font-medium rounded font-manrope">
                          YOU
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Goals Completed */}
                <div className="col-span-3 text-right">
                  <span className="text-lg font-bold text-gray-900 dark:text-white font-manrope">
                    {user.goalsCompleted}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Load More Button */}
          {!showMore && allRankings.length > 4 && (
            <div className="mt-6 text-center">
              <button
                onClick={() => setShowMore(true)}
                className="inline-flex items-center gap-2 text-[#4c99e6] hover:text-[#3d88d5] font-medium font-manrope text-sm transition-colors"
              >
                Load More Rankings
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          )}
        </motion.div>

        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-blue-100 dark:bg-gray-800 rounded-3xl p-12 text-center mb-8"
        >
          <div className="inline-flex items-center gap-2 text-[#4c99e6] text-sm font-medium font-manrope mb-4">
            <TrendingUp className="w-4 h-4" />
            ACHIEVE MORE
          </div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white font-manrope mb-4">
            Ready to Climb Higher?
          </h2>
          <p className="text-gray-600 dark:text-gray-400 font-manrope mb-8 max-w-2xl mx-auto">
            Complete more goals and compete with achievers worldwide to reach the top!
          </p>
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-100 text-white dark:text-gray-900 rounded-lg transition-colors font-manrope font-medium"
            >
              <Target className="w-4 h-4" />
              Go to Dashboard
            </button>
            <button
              onClick={() => navigate('/discover')}
              className="inline-flex items-center gap-2 px-6 py-3 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white rounded-lg transition-colors font-manrope font-medium border border-gray-200 dark:border-gray-700"
            >
              <Target className="w-4 h-4" />
              Discover Goals
            </button>
          </div>
        </motion.div>

        {/* Pagination Dots */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex items-center justify-center gap-2 mb-8"
        >
          <div className="w-2 h-2 rounded-full bg-[#4c99e6]"></div>
          <div className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600"></div>
        </motion.div>

        {/* Inspirational Quote */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center"
        >
          <p className="text-gray-500 dark:text-gray-400 font-manrope italic text-sm">
            "Success is a journey, not a destination."
          </p>
        </motion.div>
      </div>
    </div>
  )
}

export default LeaderboardPageNew
