import { useEffect, useState, lazy, Suspense } from 'react'
import { communitiesAPI, moderationAPI } from '../../services/api'
import { useNavigate } from 'react-router-dom'
import { MoreVertical, Trash2, Ban, Flag, BarChart3, Loader2, Target, Zap } from 'lucide-react'
import useApiStore from '../../store/apiStore'
const ReportModal = lazy(() => import('../ReportModal'));
const BlockModal = lazy(() => import('../BlockModal'));

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

function RemoveMemberModal({ isOpen, onClose, onConfirm, userName = 'this member' }) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 shadow-xl border-2 border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="px-5 py-4 border-b-2 border-gray-200 dark:border-gray-800">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Remove {userName} from community?</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">This member will be removed from the community. They can rejoin if the community is public or if invited again.</p>
        </div>
        <div className="px-5 py-4 border-t-2 border-gray-200 dark:border-gray-800 flex items-center justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 text-sm font-medium transition-colors">Cancel</button>
          <button onClick={onConfirm} className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors">Remove</button>
        </div>
      </div>
    </div>
  )
}

function MemberAnalyticsModal({ open, onClose, analytics, userName }) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-900/90 shadow-2xl border-2 border-gray-200 dark:border-gray-700">
        {/* Close Button - Top Right */}
        <button onClick={onClose} className="absolute top-4 right-4 sm:top-6 sm:right-6 z-20 h-8 w-8 rounded-full flex items-center justify-center bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-all duration-300 text-2xl font-normal leading-none" aria-label="Close">&times;</button>
        
        {/* Header - Fixed */}
        <div className="flex-shrink-0 p-6 sm:p-8 pb-6 pr-14 sm:pr-16 border-b-2 border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <BarChart3 className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            <div>
              <div className="text-xl font-bold text-gray-900 dark:text-white">{userName}'s Analytics</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Community activity overview</div>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 sm:px-8 pb-12 sm:pb-16">
          {analytics ? (
            <div className="space-y-6 mt-6">
              {/* Goals Stats */}
              <div className="rounded-xl border-2 border-gray-200 dark:border-gray-700 p-6 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20">
                <div className="flex items-center gap-3 mb-4">
                  <Target className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">Goals</h3>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-900 dark:text-blue-100">{analytics.goals?.created || 0}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">Created</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-900 dark:text-green-100">{analytics.goals?.completed || 0}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">Completed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-orange-900 dark:text-orange-100">{analytics.goals?.inProgress || 0}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">In Progress</div>
                  </div>
                </div>
              </div>

              {/* Habits Stats */}
              <div className="rounded-xl border-2 border-gray-200 dark:border-gray-700 p-6 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20">
                <div className="flex items-center gap-3 mb-4">
                  <Zap className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">Habits</h3>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-purple-900 dark:text-purple-100">{analytics.habits?.created || 0}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">Created</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-900 dark:text-green-100">{analytics.habits?.completed || 0}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">Completed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-orange-900 dark:text-orange-100">{analytics.habits?.inProgress || 0}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">In Progress</div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center py-12">
              <div className="text-gray-500 dark:text-gray-400">No analytics data available</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function CommunityMembers({ id, role, community, members }) {
  const navigate = useNavigate()
  const currentUser = useApiStore(state => state.user)
  const vis = community.visibility
  const s = community.settings || {}
  const isPrivateOrInvite = vis === 'private' || vis === 'invite-only'
  const restrictAdd = s.onlyAdminsCanAddMembers !== false
  const showPending = isPrivateOrInvite && (restrictAdd ? role === 'admin' : true)
  const [openMenuId, setOpenMenuId] = useState(null)
  const [analyticsOpen, setAnalyticsOpen] = useState(false)
  const [analyticsData, setAnalyticsData] = useState(null)
  const [selectedMemberName, setSelectedMemberName] = useState('')
  const [loadingAnalytics, setLoadingAnalytics] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [reportTarget, setReportTarget] = useState({ userId: null, username: '' })
  const [blockOpen, setBlockOpen] = useState(false)
  const [blockUserId, setBlockUserId] = useState(null)
  const [blockUsername, setBlockUsername] = useState('')
  const [removeModalOpen, setRemoveModalOpen] = useState(false)
  const [removeMemberId, setRemoveMemberId] = useState(null)
  const [removeMemberName, setRemoveMemberName] = useState('')
  
  const handleUserClick = (userId) => {
    navigate(`/profile/@${userId}?tab=overview`);
  };

  const canRemoveMember = (member) => {
    // Admin can remove anyone except themselves
    if (role === 'admin') return String(member.user?._id) !== String(currentUser?._id)
    // If setting allows anyone to remove, then yes (except themselves)
    if (s.onlyAdminsCanRemoveMembers === false) return String(member.user?._id) !== String(currentUser?._id)
    return false
  }

  const handleRemoveMember = async () => {
    try {
      await communitiesAPI.removeMember(id, removeMemberId)
      setRemoveModalOpen(false)
      window.location.reload()
    } catch (err) {
      alert('Failed to remove member: ' + (err.response?.data?.message || err.message))
    }
  }

  const handleBlockUser = async () => {
    try {
      await moderationAPI.blockUser(blockUserId)
      setBlockOpen(false)
      alert('User blocked successfully')
    } catch (err) {
      alert('Failed to block user: ' + (err.response?.data?.message || err.message))
    }
  }

  const handleReportUser = async ({ reason, description }) => {
    try {
      await moderationAPI.report({
        targetType: 'user',
        targetId: reportTarget.userId,
        reason,
        description
      })
      setReportOpen(false)
      // Offer to block after reporting
      setBlockUserId(reportTarget.userId)
      setBlockUsername(reportTarget.username)
      setBlockOpen(true)
    } catch (err) {
      alert('Failed to submit report: ' + (err.response?.data?.message || err.message))
    }
  }

  const handleViewAnalytics = async (userId, userName) => {
    setLoadingAnalytics(true)
    setOpenMenuId(null)
    try {
      const resp = await communitiesAPI.memberAnalytics(id, userId)
      setAnalyticsData(resp?.data?.data || null)
      setSelectedMemberName(userName)
      setAnalyticsOpen(true)
    } catch (err) {
      alert('Failed to load analytics: ' + (err.response?.data?.message || err.message))
    } finally {
      setLoadingAnalytics(false)
    }
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
        {members.map(m => (
          <div key={m._id} className="rounded-xl border-2 border-gray-200 dark:border-gray-800 p-3 sm:p-4 bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-900/80 hover:shadow-xl hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-300 group relative">
            <div className="flex items-center gap-2 sm:gap-3">
              <img src={m.user?.avatar}
                alt="User"
                className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg cursor-pointer ring-2 ring-white dark:ring-gray-900 shadow-md group-hover:scale-110 transition-transform flex-shrink-0"
                onClick={() => handleUserClick(m.user?.username)}
              />
              <div className="min-w-0 flex-1">
                <div className="font-bold text-sm truncate cursor-pointer text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors"
                  onClick={() => handleUserClick(m.user?.username)}>{m.user?.name}</div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium">{m.role}</span>
                </div>
              </div>
              
              {/* Three-dot menu - show for all except yourself */}
              {String(m.user?._id) !== String(currentUser?._id) && (
                <div className="relative flex-shrink-0">
                  <button
                    onClick={() => setOpenMenuId(openMenuId === m._id ? null : m._id)}
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    aria-label="More options"
                  >
                    <MoreVertical className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                  </button>
                  
                  {/* Dropdown menu */}
                  {openMenuId === m._id && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} />
                      <div className="absolute right-0 top-10 z-20 w-48 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-xl py-1">
                        <button
                          onClick={() => handleViewAnalytics(m.user?._id, m.user?.name)}
                          className="w-full px-4 py-2.5 text-left text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-3"
                          disabled={loadingAnalytics}
                        >
                          {loadingAnalytics ? <Loader2 className="h-4 w-4 animate-spin" /> : <BarChart3 className="h-4 w-4" />}
                          Analytics
                        </button>
                        
                        <button
                          onClick={() => { 
                            setOpenMenuId(null); 
                            setBlockUserId(m.user?._id);
                            setBlockUsername(m.user?.username || m.user?.name || '');
                            setBlockOpen(true);
                          }}
                          className="w-full px-4 py-2.5 text-left text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-3"
                        >
                          <Ban className="h-4 w-4" />
                          Block
                        </button>
                        
                        <button
                          onClick={() => { 
                            setOpenMenuId(null); 
                            setReportTarget({ userId: m.user?._id, username: m.user?.username || m.user?.name || '' });
                            setReportOpen(true);
                          }}
                          className="w-full px-4 py-2.5 text-left text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-3"
                        >
                          <Flag className="h-4 w-4" />
                          Report
                        </button>
                        
                        {canRemoveMember(m) && (
                          <button
                            onClick={() => { 
                              setOpenMenuId(null); 
                              setRemoveMemberId(m.user?._id);
                              setRemoveMemberName(m.user?.name || '');
                              setRemoveModalOpen(true);
                            }}
                            className="w-full px-4 py-2.5 text-left text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-3 border-t border-gray-200 dark:border-gray-700"
                          >
                            <Trash2 className="h-4 w-4" />
                            Remove Member
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      
      {/* Loading overlay */}
      {loadingAnalytics && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="glass-card-hover rounded-2xl p-8 flex flex-col items-center gap-4">
            <Loader2 className="h-12 w-12 text-blue-500 animate-spin" />
            <div className="text-white font-semibold">Loading analytics...</div>
          </div>
        </div>
      )}
      
      <MemberAnalyticsModal 
        open={analyticsOpen} 
        onClose={() => setAnalyticsOpen(false)} 
        analytics={analyticsData}
        userName={selectedMemberName}
      />

      {/* Report & Block Modals */}
      <Suspense fallback={null}>
        <ReportModal
          isOpen={reportOpen}
          onClose={() => setReportOpen(false)}
          targetLabel={reportTarget.username ? `@${reportTarget.username}` : 'user'}
          onSubmit={handleReportUser}
          onReportAndBlock={async () => {
            if (reportTarget.userId) {
              await moderationAPI.blockUser(reportTarget.userId)
            }
          }}
        />
      </Suspense>

      <Suspense fallback={null}>
        <BlockModal
          isOpen={blockOpen}
          onClose={() => setBlockOpen(false)}
          username={blockUsername || ''}
          onConfirm={handleBlockUser}
        />
      </Suspense>

      <RemoveMemberModal
        isOpen={removeModalOpen}
        onClose={() => setRemoveModalOpen(false)}
        userName={removeMemberName}
        onConfirm={handleRemoveMember}
      />
    </div>
  )
}


