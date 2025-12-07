function StatCard({ label, value, accent, icon: Icon, gradient }) {
  return (
    <div className={`rounded-2xl border-2 border-gray-200 dark:border-gray-800 p-6 bg-gradient-to-br ${gradient || 'from-white to-gray-50 dark:from-gray-900 dark:to-gray-900/80'} hover:shadow-lg transition-all duration-300 hover:scale-[1.02]`}>
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-semibold text-gray-600 dark:text-gray-400">{label}</div>
        {Icon && <Icon className="h-5 w-5 text-blue-500 opacity-70" />}
      </div>
      <div className={`text-3xl font-bold ${accent || 'text-gray-900 dark:text-white'}`}>{value}</div>
    </div>
  )
}

export default function CommunityDashboard({ dashboard, members, analytics, items = [], itemProgress = {} }) {
  // Calculate goal/habit statistics from real data
  const totalGoals = items.filter(item => item.type === 'goal').length
  const totalHabits = items.filter(item => item.type === 'habit').length
  const totalItems = items.length
  
  // Calculate active goals (with progress > 0 and < 100)
  const activeGoals = items.filter(item => {
    const progress = itemProgress[item._id]?.community || 0
    return item.type === 'goal' && progress > 0 && progress < 100
  }).length
  
  // Calculate completed goals (progress = 100)
  const completedGoals = items.filter(item => {
    const progress = itemProgress[item._id]?.community || 0
    return item.type === 'goal' && progress >= 100
  }).length

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard 
          label="Members" 
          value={dashboard?.stats?.memberCount ?? '—'} 
          gradient="from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-900/10"
        />
        <StatCard 
          label="Community Points" 
          value={dashboard?.stats?.totalPoints ?? '—'} 
          gradient="from-purple-50 to-purple-100/50 dark:from-purple-900/20 dark:to-purple-900/10"
        />
        <StatCard 
          label="Weekly Activity" 
          value={dashboard?.stats?.weeklyActivityCount ?? '—'} 
          gradient="from-pink-50 to-pink-100/50 dark:from-pink-900/20 dark:to-pink-900/10"
        />
        <StatCard 
          label="Completion Rate" 
          value={`${dashboard?.stats?.completionRate ?? 0}%`} 
          accent="text-green-600 dark:text-green-400"
          gradient="from-green-50 to-green-100/50 dark:from-green-900/20 dark:to-green-900/10"
        />
      </div>
      
      {/* Goals & Habits Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard 
          label="Total Goals" 
          value={totalGoals} 
          gradient="from-cyan-50 to-cyan-100/50 dark:from-cyan-900/20 dark:to-cyan-900/10"
        />
        <StatCard 
          label="Total Habits" 
          value={totalHabits} 
          gradient="from-indigo-50 to-indigo-100/50 dark:from-indigo-900/20 dark:to-indigo-900/10"
        />
        <StatCard 
          label="Active Goals" 
          value={activeGoals} 
          accent="text-orange-600 dark:text-orange-400"
          gradient="from-orange-50 to-orange-100/50 dark:from-orange-900/20 dark:to-orange-900/10"
        />
        <StatCard 
          label="Completed Goals" 
          value={completedGoals} 
          accent="text-emerald-600 dark:text-emerald-400"
          gradient="from-emerald-50 to-emerald-100/50 dark:from-emerald-900/20 dark:to-emerald-900/10"
        />
      </div>
      <div className="rounded-2xl border-2 border-gray-200 dark:border-gray-800 p-6 bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-900/80 shadow-lg">
        <div className="flex items-center gap-2 mb-4">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold">📊</div>
          <div className="text-lg font-bold text-gray-900 dark:text-white">Weekly Activity</div>
        </div>
        <div className="h-32 grid grid-cols-12 gap-2.5">
          {(analytics?.series?.weeklyActivity || []).slice(-12).map((b, i) => {
            const max = Math.max(1, ...(analytics?.series?.weeklyActivity || []).map(x => x.count || 0))
            const h = Math.min(100, Math.round(((b.count || 0) / max) * 100))
            return (
              <div key={b.weekStart || i} className="bg-gradient-to-t from-blue-200 to-blue-100 dark:from-blue-800 dark:to-blue-900 rounded-lg flex items-end group hover:scale-110 transition-transform cursor-pointer" title={`${b.weekStart}: ${b.count || 0}`}>
                <div className="w-full bg-gradient-to-t from-blue-600 to-blue-500 rounded-lg group-hover:from-blue-500 group-hover:to-blue-400 transition-colors" style={{ height: `${h}%` }} />
              </div>
            )
          })}
          {(!analytics?.series?.weeklyActivity || analytics.series.weeklyActivity.length === 0) && (
            Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="bg-gradient-to-t from-gray-200 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-lg flex items-end">
                <div className="w-full bg-gradient-to-t from-gray-400 to-gray-300 dark:from-gray-600 dark:to-gray-500 rounded-lg" style={{ height: `${5 + (i*3)%60}%` }} />
              </div>
            ))
          )}
        </div>
      </div>
      <div className="rounded-2xl border-2 border-gray-200 dark:border-gray-800 p-6 bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-900/80 shadow-lg">
        <div className="flex items-center gap-2 mb-5">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-white text-sm font-bold">🏆</div>
          <div className="text-lg font-bold text-gray-900 dark:text-white">Top Contributors</div>
          <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto">(last 12 weeks)</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(analytics?.leaderboard?.topContributors || []).slice(0,6).map((m, idx) => (
            <div key={m.userId || idx} className="p-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md transition-all duration-300 flex items-center gap-3 group">
              <div className={`text-xs w-7 h-7 rounded-full flex items-center justify-center font-bold ${idx === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-white' : idx === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-400 text-gray-700' : idx === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>{idx+1}</div>
              <img src={m.user?.avatar} alt="User" className="h-10 w-10 rounded-full ring-2 ring-white dark:ring-gray-900 shadow-sm group-hover:scale-110 transition-transform" />
              <div className="text-sm font-semibold truncate flex-1 text-gray-900 dark:text-white">{m.user?.name || 'User'}</div>
              <div className="text-xs font-bold text-blue-600 dark:text-blue-400">{m.points || 0} pts</div>
            </div>
          ))}
          {(!analytics?.leaderboard?.topContributors || analytics.leaderboard.topContributors.length === 0) && members.slice(0,6).map((m, idx) => (
            <div key={m._id} className="p-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md transition-all duration-300 flex items-center gap-3 group">
              <div className={`text-xs w-7 h-7 rounded-full flex items-center justify-center font-bold ${idx === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-white' : idx === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-400 text-gray-700' : idx === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>{idx+1}</div>
              <img src={m.user?.avatar} alt="User" className="h-10 w-10 rounded-full ring-2 ring-white dark:ring-gray-900 shadow-sm group-hover:scale-110 transition-transform" />
              <div className="text-sm font-semibold truncate flex-1 text-gray-900 dark:text-white">{m.user?.name}</div>
              <div className="text-xs font-bold text-blue-600 dark:text-blue-400">{m.user?.totalPoints || 0} pts</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}


