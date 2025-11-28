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

  if (list.length === 0) return <div className="text-sm text-gray-500">No pending requests.</div>
  return (
    <div className="space-y-2">
      {list.map(m => (
        <div key={m._id} className="flex items-center gap-3 p-2 rounded-lg border border-gray-200 dark:border-gray-800">
          <img src={m.userId?.avatar}
            alt="User"
            className="h-8 w-8 rounded-full cursor-pointer"
            onClick={() => handleUserClick(m.userId?.username)}
          />
          <div className="text-sm flex-1 cursor-pointer"
            onClick={() => handleUserClick(m.userId?.username)}>{m.userId?.name}</div>
          <button onClick={() => decide(m.userId?._id, true)} className="px-2 py-1 rounded bg-green-600 text-white text-xs">Approve</button>
          <button onClick={() => decide(m.userId?._id, false)} className="px-2 py-1 rounded border border-gray-200 dark:border-gray-800 text-xs">Reject</button>
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
    <div className="space-y-4">
      {showPending && (
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-4 bg-white dark:bg-gray-900">
          <div className="text-sm font-semibold mb-2">Pending requests / invites</div>
          <PendingMembers communityId={id} />
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {members.map(m => (
          <div key={m._id} className="rounded-xl border border-gray-200 dark:border-gray-800 p-4 bg-white dark:bg-gray-900">
            <div className="flex items-center gap-3">
              <img src={m.user?.avatar}
                alt="User"
                className="h-10 w-10 rounded-full cursor-pointer"
                onClick={() => handleUserClick(m.user?.username)}
              />
              <div className="min-w-0">
                <div className="font-medium truncate cursor-pointer"
                  onClick={() => handleUserClick(m.user?.username)}>{m.user?.name}</div>
                <div className="text-xs text-gray-500">{m.role}</div>
              </div>
              <div className="ml-auto text-xs text-gray-500">Streak {m.currentStreak || 0}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}


