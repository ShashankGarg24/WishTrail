import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Trophy, TrendingUp, Award, ChevronDown, Target } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import useApiStore from '../store/apiStore'

const LeaderboardPageNew = () => {
  const [currentPage, setCurrentPage] = useState(1)
  const [leaderboardData, setLeaderboardData] = useState([])
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const { getGlobalLeaderboard, user, isAuthenticated } = useApiStore()

  const ITEMS_PER_PAGE = 20

  // Fetch leaderboard data
  useEffect(() => {
    (async () => {
      setLoading(true)
      const data = await getGlobalLeaderboard({ page: currentPage, limit: ITEMS_PER_PAGE })
      setLeaderboardData(Array.isArray(data) ? data : [])
      // Estimate total pages (you may need to adjust based on API response)
      setTotalPages(data.length < ITEMS_PER_PAGE ? currentPage : currentPage + 1)
      setLoading(false)
    })()
  }, [getGlobalLeaderboard, currentPage])

  const handleUserClick = (username) => {
    if (username) {
      navigate(`/profile/@${username}`)
    }
  }

  // Get top 3 from leaderboard
  const topThree = leaderboardData.slice(0, 3).map((item, index) => ({
    rank: index + 1,
    name: item.name || item.displayName || item.username || 'Anonymous',
    badge: index === 0 ? 'CHAMPION' : index === 1 ? 'SILVER ACHIEVER' : 'BRONZE EXPLORER',
    goalsCompleted: item.completedGoals || 0,
    avatar: item.avatar || null,
    username: item.username
  }))

  // Reorder for podium display (2nd, 1st, 3rd)
  const podiumOrder = topThree.length >= 3 ? [topThree[1], topThree[0], topThree[2]] : topThree

  // Get remaining rankings (4+)
  const allRankings = leaderboardData.slice(3).map((item, index) => ({
    rank: (currentPage - 1) * ITEMS_PER_PAGE + index + 4,
    name: item.name || item.displayName || item.username || 'Anonymous',
    isYou: isAuthenticated && user && (item.username === user.username),
    goalsCompleted: item.completedGoals || 0, 
    avatar: item.avatar || null,
    username: item.username
  }))

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
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Header with Trophy Icon */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8 sm:mb-12"
        >
          <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full mb-3 sm:mb-4">
            <Trophy className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2 font-manrope">
            Leaderboard
          </h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 font-manrope">
            Celebrate the journey of achievers worldwide.
          </p>
        </motion.div>

        {/* Top 3 Podium */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex items-end justify-center gap-2 sm:gap-4 md:gap-8 mb-8 sm:mb-12 md:mb-16 max-w-4xl mx-auto"
        >
          {/* 2nd Place */}
          {podiumOrder[0] && (
            <div className="flex-1 max-w-[200px] sm:max-w-[240px]">
              <div 
                onClick={() => handleUserClick(podiumOrder[0].username)}
                className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl p-3 sm:p-4 md:p-6 shadow-lg border border-gray-100 dark:border-gray-700 text-center relative cursor-pointer hover:shadow-xl transition-all">
                <div className="absolute -top-3 sm:-top-4 left-1/2 transform -translate-x-1/2 w-6 h-6 sm:w-8 sm:h-8 bg-gray-300 rounded-full flex items-center justify-center text-gray-700 font-bold font-manrope text-xs sm:text-sm">
                  2
                </div>
                <div className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-full bg-gradient-to-br from-gray-300 to-gray-400 mx-auto mb-2 sm:mb-3 md:mb-4 flex items-center justify-center">
                  {podiumOrder[0].avatar ? (
                    <img src={podiumOrder[0].avatar} alt={podiumOrder[0].name} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-400 font-bold text-base sm:text-lg md:text-xl">
                      {podiumOrder[0].name.charAt(0)}
                    </div>
                  )}
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white font-manrope text-xs sm:text-sm md:text-lg mb-1 truncate">
                  {podiumOrder[0].name}
                </h3>
                <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 font-manrope uppercase tracking-wide mb-2 sm:mb-3 md:mb-4">
                  {podiumOrder[0].badge}
                </p>
                <div className="pt-2 sm:pt-3 md:pt-4 border-t border-gray-100 dark:border-gray-700">
                  <div className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-white font-manrope mb-1">
                    {podiumOrder[0].goalsCompleted}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 font-manrope uppercase tracking-wide">
                    Goals Completed
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 1st Place - Larger */}
          {podiumOrder[1] && (
            <div className="flex-1 max-w-[220px] sm:max-w-[260px] md:max-w-[280px]">
              <div 
                onClick={() => handleUserClick(podiumOrder[1].username)}
                className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 shadow-xl border-2 border-[#4c99e6] text-center relative transform scale-105 cursor-pointer hover:shadow-2xl transition-all">
                <div className="absolute -top-4 sm:-top-5 left-1/2 transform -translate-x-1/2 w-8 h-8 sm:w-10 sm:h-10 bg-[#4c99e6] rounded-full flex items-center justify-center">
                  <Award className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 mx-auto mb-2 sm:mb-3 md:mb-4 flex items-center justify-center">
                  {podiumOrder[1].avatar ? (
                    <img src={podiumOrder[1].avatar} alt={podiumOrder[1].name} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <div className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-400 font-bold text-lg sm:text-xl md:text-2xl">
                      {podiumOrder[1].name.charAt(0)}
                    </div>
                  )}
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white font-manrope text-sm sm:text-lg md:text-xl mb-1 truncate">
                  {podiumOrder[1].name}
                </h3>
                <p className="text-[10px] sm:text-xs text-[#4c99e6] font-manrope uppercase tracking-wide font-semibold mb-3 sm:mb-4 md:mb-6 flex items-center justify-center gap-1">
                  <Award className="w-3 h-3" />
                  {podiumOrder[1].badge}
                </p>
                <div className="pt-2 sm:pt-3 md:pt-4 border-t border-gray-100 dark:border-gray-700">
                  <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 dark:text-white font-manrope mb-1">
                    {podiumOrder[1].goalsCompleted}
                  </div>
                  <div className="text-xs text-[#4c99e6] font-manrope uppercase tracking-wide font-semibold">
                    Goals Completed
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 3rd Place */}
          {podiumOrder[2] && (
            <div className="flex-1 max-w-[200px] sm:max-w-[240px]">
              <div 
                onClick={() => handleUserClick(podiumOrder[2].username)}
                className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl p-3 sm:p-4 md:p-6 shadow-lg border border-gray-100 dark:border-gray-700 text-center relative cursor-pointer hover:shadow-xl transition-all">
                <div className="absolute -top-3 sm:-top-4 left-1/2 transform -translate-x-1/2 w-6 h-6 sm:w-8 sm:h-8 bg-orange-400 rounded-full flex items-center justify-center text-white font-bold font-manrope text-xs sm:text-sm">
                  3
                </div>
                <div className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-full bg-gradient-to-br from-orange-400 to-amber-600 mx-auto mb-2 sm:mb-3 md:mb-4 flex items-center justify-center">
                  {podiumOrder[2].avatar ? (
                    <img src={podiumOrder[2].avatar} alt={podiumOrder[2].name} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-400 font-bold text-base sm:text-lg md:text-xl">
                      {podiumOrder[2].name.charAt(0)}
                    </div>
                  )}
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white font-manrope text-xs sm:text-sm md:text-lg mb-1 truncate">
                  {podiumOrder[2].name}
                </h3>
                <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 font-manrope uppercase tracking-wide mb-2 sm:mb-3 md:mb-4">
                  {podiumOrder[2].badge}
                </p>
                <div className="pt-2 sm:pt-3 md:pt-4 border-t border-gray-100 dark:border-gray-700">
                  <div className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-white font-manrope mb-1">
                    {podiumOrder[2].goalsCompleted}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 font-manrope uppercase tracking-wide">
                    Goals Completed
                  </div>
                </div>
              </div>
            </div>
          )}
        </motion.div>

        {/* All Rankings Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-4 sm:p-6 mb-6 sm:mb-8"
        >
          {/* Section Header */}
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-[#4c99e6]" />
              <h2 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 dark:text-white font-manrope">
                All Time Rankings
              </h2>
            </div>
          </div>

          {/* Table Header */}
          <div className="hidden sm:grid grid-cols-12 gap-4 px-4 py-3 border-b border-gray-100 dark:border-gray-700 mb-2">
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
            {allRankings.map((user, index) => (
              <motion.div
                key={user.rank}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + index * 0.05 }}
                onClick={() => handleUserClick(user.username)}
                className="grid grid-cols-12 gap-2 sm:gap-4 px-3 sm:px-4 py-3 sm:py-4 rounded-lg sm:rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors items-center cursor-pointer"
              >
                {/* Rank */}
                <div className="col-span-2 sm:col-span-1">
                  <span className="font-semibold text-gray-900 dark:text-white font-manrope text-sm sm:text-base">
                    {user.rank}
                  </span>
                </div>

                {/* User */}
                <div className="col-span-7 sm:col-span-8 flex items-center gap-2 sm:gap-3">
                  <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br ${getAvatarColor(user.rank)} flex items-center justify-center text-white font-bold font-manrope text-xs sm:text-sm flex-shrink-0`}>
                    {user.avatar ? (
                      <img src={user.avatar} alt={user.name} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      user.name.charAt(0)
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1 sm:gap-2">
                      <span className="font-semibold text-gray-900 dark:text-white font-manrope text-xs sm:text-sm md:text-base truncate">
                        {user.name}
                      </span>
                      {user.isYou && (
                        <span className="px-1.5 sm:px-2 py-0.5 bg-[#4c99e6] text-white text-[10px] sm:text-xs font-medium rounded font-manrope flex-shrink-0">
                          YOU
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Goals Completed */}
                <div className="col-span-3 text-right">
                  <span className="text-sm sm:text-base md:text-lg font-bold text-gray-900 dark:text-white font-manrope">
                    {user.goalsCompleted}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 sm:mt-8 flex items-center justify-center gap-1 sm:gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1 || loading}
                className="px-3 sm:px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed font-manrope font-medium text-xs sm:text-sm transition-colors"
              >
                Previous
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      disabled={loading}
                      className={`w-10 h-10 rounded-lg font-manrope font-medium text-sm transition-colors ${
                        currentPage === pageNum
                          ? 'bg-[#4c99e6] text-white'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                      } disabled:opacity-50`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => setCurrentPage(p => p + 1)}
                disabled={currentPage >= totalPages || loading}
                className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed font-manrope font-medium text-sm transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </motion.div>

        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-blue-100 dark:bg-gray-800 rounded-2xl sm:rounded-3xl p-6 sm:p-8 md:p-12 text-center mb-6 sm:mb-8"
        >
          <div className="inline-flex items-center gap-2 text-[#4c99e6] text-xs sm:text-sm font-medium font-manrope mb-3 sm:mb-4">
            <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4" />
            ACHIEVE MORE
          </div>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-white font-manrope mb-3 sm:mb-4">
            Ready to Climb Higher?
          </h2>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 font-manrope mb-6 sm:mb-8 max-w-2xl mx-auto">
            Complete more goals and compete with achievers worldwide to reach the top!
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 bg-gray-900 dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-100 text-white dark:text-gray-900 rounded-lg transition-colors font-manrope font-medium text-sm sm:text-base"
            >
              <Target className="w-4 h-4" />
              Go to Dashboard
            </button>
            <button
              onClick={() => navigate('/discover')}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white rounded-lg transition-colors font-manrope font-medium border border-gray-200 dark:border-gray-700 text-sm sm:text-base"
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
