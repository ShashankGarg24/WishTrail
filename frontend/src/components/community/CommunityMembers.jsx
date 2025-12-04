import { useEffect, useState } from 'react'
import { communitiesAPI } from '../../services/api'
import { useNavigate } from 'react-router-dom'

export function PendingMembers({ communityId }) {
  const [list, setList] = useState([])
  const navigate = useNavigate()

  useEffect(() => {
    communitiesAPI.pendingMembers(communityId).then(r => setList(r?.data?.data || [])).catch(() => setList([]))
  }, [communityId])

  const handleUserClick = (userId) => {
    navigate(`/profile/@${userId}?tab=overview`);
  };

  const decide = async (userId, approve) => {
    await communitiesAPI.approveMember(communityId, userId, approve)
    setList(list.filter(m => String(m?.userId?._id || m?.userId) !== String(userId)))
  }

  if (list.length === 0) return <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">No pending requests.</div>
  return (
    <div className="space-y-3">
      {list.map(m => (
        <div key={m._id} className="flex items-center gap-4 p-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md transition-all duration-300 group">
          <img src={m.userId?.avatar}
            alt="User"
            className="h-11 w-11 rounded-full cursor-pointer ring-2 ring-white dark:ring-gray-900 shadow-sm group-hover:scale-110 transition-transform"
            onClick={() => handleUserClick(m.userId?.username)}
          />
          <div className="text-sm font-semibold flex-1 cursor-pointer text-gray-900 dark:text-white"
            onClick={() => handleUserClick(m.userId?.username)}>{m.userId?.name}</div>
          <button onClick={() => decide(m.userId?._id, true)} className="px-4 py-2 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white text-xs font-semibold hover:from-green-600 hover:to-emerald-700 transition-all duration-300 shadow-md">Approve</button>
          <button onClick={() => decide(m.userId?._id, false)} className="px-4 py-2 rounded-xl border-2 border-gray-200 dark:border-gray-700 text-xs font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">Reject</button>
        </div>
      ))}
    </div>
  )
}

export default function CommunityMembers({ id, role, community, members }) {
  const navigate = useNavigate()
  const vis = community.visibility
  const s = community.settings || {}
  const isPrivateOrInvite = vis === 'private' || vis === 'invite-only'
  const restrictAdd = s.onlyAdminsCanAddMembers !== false
  const showPending = isPrivateOrInvite && (restrictAdd ? role === 'admin' : true)
  const handleUserClick = (userId) => {
    navigate(`/profile/@${userId}?tab=overview`);
  };

  return (
    <div className="space-y-6">
      {showPending && (
        <div className="rounded-2xl border-2 border-gray-200 dark:border-gray-800 p-6 bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-900/80 shadow-lg">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white text-sm font-bold">⏳</div>
            <div className="text-lg font-bold text-gray-900 dark:text-white">Pending Requests / Invites</div>
          </div>
          <PendingMembers communityId={id} />
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {members.map(m => (
          <div key={m._id} className="rounded-2xl border-2 border-gray-200 dark:border-gray-800 p-5 bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-900/80 hover:shadow-xl hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-300 group">
            <div className="flex items-center gap-3">
              <img src={m.user?.avatar}
                alt="User"
                className="h-14 w-14 rounded-xl cursor-pointer ring-2 ring-white dark:ring-gray-900 shadow-md group-hover:scale-110 transition-transform"
                onClick={() => handleUserClick(m.user?.username)}
              />
              <div className="min-w-0 flex-1">
                <div className="font-bold text-base truncate cursor-pointer text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors"
                  onClick={() => handleUserClick(m.user?.username)}>{m.user?.name}</div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs px-2.5 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium">{m.role}</span>
                </div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Current Streak</span>
                <span className="font-bold text-orange-600 dark:text-orange-400 text-lg">{m.currentStreak || 0} 🔥</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}


