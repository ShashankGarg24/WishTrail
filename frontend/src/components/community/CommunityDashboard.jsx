function StatCard({ label, value, accent }) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-4 bg-white dark:bg-gray-900">
      <div className="text-xs text-gray-500 dark:text-gray-400">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${accent || ''}`}>{value}</div>
    </div>
  )
}

export default function CommunityDashboard({ dashboard, members }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard label="Members" value={dashboard?.stats?.memberCount ?? '—'} />
      <StatCard label="Community Points" value={dashboard?.stats?.totalPoints ?? '—'} />
      <StatCard label="Weekly Activity" value={dashboard?.stats?.weeklyActivityCount ?? '—'} />
      <StatCard label="Completion Rate" value={`${dashboard?.stats?.completionRate ?? 0}%`} accent="text-green-600" />
      <div className="sm:col-span-2 lg:col-span-4 rounded-xl border border-gray-200 dark:border-gray-800 p-4 bg-white dark:bg-gray-900">
        <div className="text-sm font-semibold mb-2">Weekly Activity (mock)</div>
        <div className="h-24 grid grid-cols-12 gap-2">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="bg-blue-500/20 rounded flex items-end">
              <div className="w-full bg-blue-600 rounded" style={{ height: `${10 + (i*7)%90}%` }} />
            </div>
          ))}
        </div>
      </div>
      <div className="sm:col-span-2 lg:col-span-4 rounded-xl border border-gray-200 dark:border-gray-800 p-4 bg-white dark:bg-gray-900">
        <div className="text-sm font-semibold mb-2">Leaderboard (mock)</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {members.slice(0,6).map((m, idx) => (
            <div key={m._id} className="p-3 rounded-lg border border-gray-200 dark:border-gray-800 flex items-center gap-3">
              <div className="text-xs w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center">{idx+1}</div>
              <img src={m.user?.avatar} alt="User" className="h-8 w-8 rounded-full" />
              <div className="text-sm truncate flex-1">{m.user?.name}</div>
              <div className="text-xs text-gray-500">{m.user?.totalPoints || 0} pts</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}


