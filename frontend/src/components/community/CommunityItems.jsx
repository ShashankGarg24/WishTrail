import { useState, useEffect, lazy, Suspense, useMemo } from 'react'
import { communitiesAPI } from '../../services/api'
import useApiStore from '../../store/apiStore'
const CreateGoalWizard = lazy(() => import('../CreateGoalWizard'));
const CreateHabitModal = lazy(() => import('../CreateHabitModal'));
import { Link, Plus, TrendingUp, BarChart3, MoreVertical, LogOut, Trash2, Target, Zap, Loader2 } from 'lucide-react'

export function AddItemModal({ open, onClose, communityId }) {
  const [type, setType] = useState('goal')
  const [mode, setMode] = useState('link')
  const [sourceId, setSourceId] = useState('')
  const [title, setTitle] = useState('')
  const [showCreateGoalModal, setShowCreateGoalModal] = useState(false)
  const [showCreateHabitModal, setShowCreateHabitModal] = useState(false)
  const [myGoals, setMyGoals] = useState([])
  const [myHabits, setMyHabits] = useState([])
  const [filter, setFilter] = useState('')
  const [participationType, setParticipationType] = useState('individual') // goals only
  const { getGoals, loadHabits } = useApiStore()

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        if (mode === 'link') {
          if (type === 'goal') {
            const res = await getGoals({ page: 1, limit: 50 })
            if (!active) return
            setMyGoals(res?.goals || [])
          } else {
            const res = await loadHabits({ force: true })
            if (!active) return
            setMyHabits(res?.habits || res?.data || useApiStore.getState().habits || [])
          }
        }
      } catch {}
    }
    load()
    return () => { active = false }
  }, [open, mode, type, getGoals, loadHabits])

  if (!open) return null

  const submit = async () => {
    try {
      if (mode === 'link') {
        if (!sourceId) return
        await communitiesAPI.copyCommunityItem(communityId, { type, sourceId, ...(type === 'goal' ? { participationType } : {}) })
      } else {
        if (type === 'goal') {
          setShowCreateGoalModal(true)
          return
        } else {
          setShowCreateHabitModal(true)
          return
        }
      }
      onClose(true)
    } catch (_) { onClose(false) }
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="absolute inset-0 bg-black/60" onClick={() => onClose(false)} />
      <div className="relative z-10 w-full max-w-lg rounded-3xl bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-900/90 p-6 sm:p-8 shadow-2xl border-2 border-gray-200 dark:border-gray-700 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6 pb-4 border-b-2 border-gray-200 dark:border-gray-700">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">Add Goal/Habit</div>
          <button onClick={() => onClose(false)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-2xl leading-none">&times;</button>
        </div>
        <div className="space-y-5">
          <div>
            <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Select Type</div>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setType('goal')} className={`flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${type === 'goal' ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-2 border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600'}`}>
                <Target className="h-4 w-4" />
                Goal
              </button>
              <button type="button" onClick={() => setType('habit')} className={`flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${type === 'habit' ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-2 border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-600'}`}>
                <Zap className="h-4 w-4" />
                Habit
              </button>
            </div>
          </div>
          {type === 'goal' && (
            <div>
              <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Participation Type</div>
              <select value={participationType} onChange={e => setParticipationType(e.target.value)} className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-medium focus:outline-none focus:border-blue-500 dark:focus:border-blue-500">
                <option value="individual">Individual</option>
                <option value="collaborative">Collaborative</option>
              </select>
            </div>
          )}
          <div>
            <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Choose Mode</div>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setMode('link')} className={`flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${mode === 'link' ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-2 border-gray-200 dark:border-gray-700'}`}>
                <Link className="h-4 w-4" />
                Link Existing
              </button>
              <button type="button" onClick={() => { setMode('create'); if (type === 'goal') setShowCreateGoalModal(true); else setShowCreateHabitModal(true); }} className={`flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${mode === 'create' ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-2 border-gray-200 dark:border-gray-700'}`}>
                <Plus className="h-4 w-4" />
                Create New
              </button>
            </div>
          </div>
          {mode === 'link' && (
            <div className="space-y-3">
              <div>
                <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Search Your {type === 'goal' ? 'Goals' : 'Habits'}</div>
                <input placeholder={`Search...`} value={filter} onChange={e => setFilter(e.target.value)} className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 dark:focus:border-blue-500" />
              </div>
              <div className="max-h-64 overflow-auto rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                {(type === 'goal' ? myGoals : myHabits)
                  .filter(item => {
                    const q = filter.trim().toLowerCase()
                    if (!q) return true
                    const t = (type === 'goal' ? item.title : item.name) || ''
                    return t.toLowerCase().includes(q)
                  })
                  .map(item => (
                    <button key={item._id} onClick={() => setSourceId(item._id)} className={`w-full text-left px-4 py-3 text-sm font-medium border-b border-gray-200 dark:border-gray-700 transition-all duration-200 ${sourceId === item._id ? 'bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30 text-blue-700 dark:text-blue-300' : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white'}`}>
                      {(type === 'goal' ? item.title : item.name) || 'Untitled'}
                    </button>
                  ))}
                {((type === 'goal' ? myGoals : myHabits).length === 0) && (
                  <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">No {type === 'goal' ? 'goals' : 'habits'} found.</div>
                )}
              </div>
            </div>
          )}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button type="button" onClick={() => onClose(false)} className="px-5 py-2.5 rounded-xl text-sm font-semibold border-2 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-300">Cancel</button>
            <button type="button" onClick={submit} disabled={mode === 'link' && !sourceId} className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700 transition-all duration-300 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed">Submit</button>
          </div>
        </div>
      </div>
      {showCreateGoalModal && (
        <Suspense fallback={null}>
          <CreateGoalWizard
          isOpen={showCreateGoalModal}
          onClose={() => setShowCreateGoalModal(false)}
          year={new Date().getFullYear()}
          initialData={{}}
        />
        </Suspense>
      )}
      {showCreateHabitModal && (
        <Suspense fallback={null}>
          <CreateHabitModal
          isOpen={showCreateHabitModal}
          onClose={() => setShowCreateHabitModal(false)}
          onCreated={async (habit) => {
            try {
              if (habit?._id) {
                await communitiesAPI.copyCommunityItem(communityId, { type: 'habit', sourceId: habit._id })
              }
              onClose(true)
            } catch { onClose(false) }
          }}
        />
        </Suspense>
      )}
    </div>
  )
}

function ItemAnalyticsModal({ open, onClose, analytics }) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null
  const rows = Array.isArray(analytics?.participants) ? analytics.participants : []
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative z-10 w-full max-w-4xl max-h-[90vh] flex flex-col rounded-3xl bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-900/90 shadow-2xl border-2 border-gray-200 dark:border-gray-700">
        {/* Close Button - Top Right */}
        <button onClick={onClose} className="absolute top-4 right-4 sm:top-6 sm:right-6 z-20 h-8 w-8 rounded-full flex items-center justify-center bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-all duration-300 text-2xl font-normal leading-none" aria-label="Close">&times;</button>
        
        {/* Header - Fixed */}
        <div className="flex-shrink-0 p-6 sm:p-8 pb-6 pr-14 sm:pr-16 border-b-2 border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div>
              <div className="text-xl font-bold text-gray-900 dark:text-white">{analytics?.item?.title || 'Analytics'}</div>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  analytics?.item?.type === 'goal'
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                    : 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                }`}>{analytics?.item?.type}</span>
                {analytics?.item?.participationType && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">{analytics.item.participationType}</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 sm:px-8 pb-12 sm:pb-16">
          {/* Stats Summary Cards */}
          {analytics && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="rounded-xl border-2 border-gray-200 dark:border-gray-700 p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20">
                <div className="text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wide mb-1">Participants</div>
                <div className="text-3xl font-bold text-blue-900 dark:text-blue-100">{analytics.totals?.participants || 0}</div>
              </div>
              <div className="rounded-xl border-2 border-gray-200 dark:border-gray-700 p-4 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20">
                <div className="text-xs font-semibold text-green-700 dark:text-green-300 uppercase tracking-wide mb-1">Avg Progress</div>
                <div className="text-3xl font-bold text-green-900 dark:text-green-100">{Math.round(analytics.totals?.averagePercent || 0)}%</div>
              </div>
              <div className="rounded-xl border-2 border-gray-200 dark:border-gray-700 p-4 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20">
                <div className="text-xs font-semibold text-purple-700 dark:text-purple-300 uppercase tracking-wide mb-1">Completed</div>
                <div className="text-3xl font-bold text-purple-900 dark:text-purple-100">{analytics.totals?.completedCount || 0}</div>
              </div>
            </div>
          )}
          {/* Participants Table */}
          <div className="rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead className="sticky top-0 z-10">
                <tr className="bg-gradient-to-r from-gray-100 to-gray-50 dark:from-gray-800 dark:to-gray-900 text-gray-700 dark:text-gray-200 font-semibold">
                  <th className="text-left px-3 sm:px-4 py-3 border-b-2 border-gray-200 dark:border-gray-700 whitespace-nowrap">User</th>
                  <th className="text-left px-3 sm:px-4 py-3 border-b-2 border-gray-200 dark:border-gray-700 whitespace-nowrap">Status</th>
                  <th className="text-left px-3 sm:px-4 py-3 border-b-2 border-gray-200 dark:border-gray-700 whitespace-nowrap">Progress</th>
                  <th className="text-left px-3 sm:px-4 py-3 border-b-2 border-gray-200 dark:border-gray-700 whitespace-nowrap">Details</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, idx) => (
                  <tr key={idx} className="border-t border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                    <td className="px-3 sm:px-4 py-3">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <img src={r.user?.avatar || '/api/placeholder/32/32'} alt={r.user?.name || 'User'} className="h-8 w-8 sm:h-10 sm:w-10 rounded-full border-2 border-gray-200 dark:border-gray-700 flex-shrink-0" />
                        <div className="min-w-0">
                          <div className="font-semibold text-gray-900 dark:text-white truncate text-xs sm:text-sm">{r.user?.name || 'User'}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 truncate">@{r.user?.username || r.userId?.slice(-6)}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 sm:px-4 py-3">
                    <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                      r.status === 'active' 
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                    }`}>{r.status}</span>
                  </td>
                  <td className="px-3 sm:px-4 py-3">
                    <div className="flex items-center gap-1 sm:gap-2">
                      <div className="flex-1 h-2 sm:h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden min-w-[60px]">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${
                            (r.progressPercent || 0) >= 100 
                              ? 'bg-gradient-to-r from-green-500 to-emerald-600' 
                              : (r.progressPercent || 0) > 0
                                ? 'bg-gradient-to-r from-blue-500 to-purple-600'
                                : 'bg-gray-400'
                          }`}
                          style={{ width: `${Math.min(r.progressPercent || 0, 100)}%` }} 
                        />
                      </div>
                      <span className="text-xs font-bold text-gray-700 dark:text-gray-300 min-w-[2.5rem] text-right">{Math.round(r.progressPercent || 0)}%</span>
                    </div>
                  </td>
                  <td className="px-3 sm:px-4 py-3 text-xs">
                    {analytics?.item?.type === 'habit' ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500 dark:text-gray-400">🔥 Streak:</span>
                          <span className="px-2 py-0.5 rounded-md bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 font-bold">{r?.habit?.currentStreak || 0}</span>
                          <span className="text-gray-400">/</span>
                          <span className="text-gray-600 dark:text-gray-300">Best: <span className="font-semibold">{r?.habit?.longestStreak || 0}</span></span>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          {r?.goal?.completed ? (
                            <span className="px-2 py-1 rounded-md bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 font-semibold">✓ Completed</span>
                          ) : (
                            <span className="px-2 py-1 rounded-md bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-semibold">⚡ In Progress</span>
                          )}
                          {typeof r?.goal?.percent === 'number' && (
                            <span className="text-gray-600 dark:text-gray-300 font-semibold">{Math.round(r.goal.percent)}%</span>
                          )}
                        </div>
                        {Array.isArray(r?.goal?.breakdown?.subGoals) && r.goal.breakdown.subGoals.length > 0 && (
                          <div className="text-gray-600 dark:text-gray-300">
                            <span className="text-gray-500 dark:text-gray-400">Sub-goals:</span>
                            <span className="ml-2 font-semibold">{r.goal.breakdown.subGoals.filter(s => s.completed).length}/{r.goal.breakdown.subGoals.length}</span>
                          </div>
                        )}
                        {analytics?.item?.participationType === 'collaborative' && typeof r?.contributionPercent === 'number' && (
                          <div className="text-gray-600 dark:text-gray-300">
                            <span className="text-gray-500 dark:text-gray-400">Contribution:</span>
                            <span className="ml-2 px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 font-semibold">{Math.round(r.contributionPercent)}%</span>
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td className="px-3 py-3 text-sm text-gray-500" colSpan={4}>No participants yet.</td>
                </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        </div>
      </div>
    </div>
  )
}

export default function CommunityItems({ id, role, settings, items, itemProgress, onRefreshProgress, joinedItems = new Set(), onToggleJoin }) {
  // Check if any member can add goals OR habits (either being allowed means show Add button)
  const canAddGoals = (settings?.onlyAdminsCanAddGoals === false) || ['admin', 'moderator'].includes(role)
  const canAddHabits = (settings?.onlyAdminsCanAddHabits === false) || ['admin', 'moderator'].includes(role)
  const allowAnyMemberToAdd = canAddGoals || canAddHabits
  const onlyAdmins = !allowAnyMemberToAdd
  const [showAddModal, setShowAddModal] = useState(false)
  const [showSuggestModal, setShowSuggestModal] = useState(false)
  const [analyticsOpen, setAnalyticsOpen] = useState(false)
  const [analyticsData, setAnalyticsData] = useState(null)
  const [openMenuId, setOpenMenuId] = useState(null)
  const [filterType, setFilterType] = useState('all') // 'all', 'goal', 'habit'
  const [loadingAnalytics, setLoadingAnalytics] = useState(false)
  const [leaveModalOpen, setLeaveModalOpen] = useState(false)
  const [leaveItemData, setLeaveItemData] = useState(null)
  const [removeModalOpen, setRemoveModalOpen] = useState(false)
  const [removeItemData, setRemoveItemData] = useState(null)

  // Filter and sort items: show ongoing first, then completed
  const filteredAndSortedItems = useMemo(() => {
    // Filter by type
    let filtered = items
    if (filterType === 'goal') {
      filtered = items.filter(item => item.type === 'goal')
    } else if (filterType === 'habit') {
      filtered = items.filter(item => item.type === 'habit')
    }

    // Sort: ongoing (progress > 0 && < 100) first, then not started, then completed (>= 100)
    return filtered.sort((a, b) => {
      const progressA = itemProgress[a._id]?.personal || 0
      const progressB = itemProgress[b._id]?.personal || 0
      
      const isOngoingA = progressA > 0 && progressA < 100
      const isOngoingB = progressB > 0 && progressB < 100
      const isCompletedA = progressA >= 100
      const isCompletedB = progressB >= 100
      
      // Ongoing items first
      if (isOngoingA && !isOngoingB) return -1
      if (!isOngoingA && isOngoingB) return 1
      
      // Completed items last
      if (isCompletedA && !isCompletedB) return 1
      if (!isCompletedA && isCompletedB) return -1
      
      // Within same category, sort by progress descending
      return progressB - progressA
    })
  }, [items, filterType, itemProgress])

  return (
    <div className="space-y-6">
      {onlyAdmins ? (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 sm:p-5 rounded-2xl border-2 border-dashed border-blue-300 dark:border-blue-700 bg-blue-50/30 dark:bg-blue-900/10">
          <div className="flex items-center gap-3">
            <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">Add goals/habits to the community</div>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {['admin','moderator'].includes(role) ? (
              <button className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 text-white text-sm font-semibold hover:from-blue-600 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl whitespace-nowrap" onClick={() => setShowAddModal(true)}>Add</button>
            ) : (
              <button className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl border-2 border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors whitespace-nowrap" onClick={() => setShowSuggestModal(true)}>Suggest</button>
            )}
            <a href="/dashboard" title="Go to your dashboard to update progress for your goals and habits" aria-label="Go to your dashboard to update progress for your goals and habits" className="inline-flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-pink-600 text-white text-sm font-semibold hover:from-orange-600 hover:to-pink-700 transition-all duration-300 shadow-lg hover:shadow-xl whitespace-nowrap">
              <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="hidden xs:inline">Update Progress</span>
              <span className="xs:hidden">Update</span>
            </a>
          </div>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 sm:p-5 rounded-2xl border-2 border-dashed border-blue-300 dark:border-blue-700 bg-blue-50/30 dark:bg-blue-900/10">
          <div className="flex items-center gap-3">
            <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">Add goals/habits to the community</div>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <button className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 text-white text-sm font-semibold hover:from-blue-600 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl whitespace-nowrap" onClick={() => setShowAddModal(true)}>Add</button>
            <a href="/dashboard" title="Go to your dashboard to update progress for your goals and habits" aria-label="Go to your dashboard to update progress for your goals and habits" className="inline-flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-pink-600 text-white text-sm font-semibold hover:from-orange-600 hover:to-pink-700 transition-all duration-300 shadow-lg hover:shadow-xl whitespace-nowrap">
              <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="hidden xs:inline">Update Progress</span>
              <span className="xs:hidden">Update</span>
            </a>
          </div>
        </div>
      )}

      {/* Filter toggles for Goals/Habits */}
      {items.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 border-2 border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setFilterType('all')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300 ${
              filterType === 'all'
                ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-2 border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600'
            }`}
          >
            All ({items.length})
          </button>
          <button
            onClick={() => setFilterType('goal')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300 ${
              filterType === 'goal'
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-2 border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600'
            }`}
          >
            Goals ({items.filter(i => i.type === 'goal').length})
          </button>
          <button
            onClick={() => setFilterType('habit')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300 ${
              filterType === 'habit'
                ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-2 border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-600'
            }`}
          >
            Habits ({items.filter(i => i.type === 'habit').length})
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
        {filteredAndSortedItems.map(it => (
          <div key={it._id} className="rounded-2xl border-2 border-gray-200 dark:border-gray-800 p-4 sm:p-5 bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-900/80 hover:shadow-xl hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-300 group relative">
            <div className="space-y-4">
              {/* Header with icon, title, and menu */}
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-base font-bold text-gray-900 dark:text-white line-clamp-2" title={it.title}>{it.title}</div>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <span className={`px-2 py-0.5 rounded-full font-medium text-xs ${
                      it.type === 'goal' 
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' 
                        : 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                    }`}>{it.type}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{it.stats?.participantCount || 0} joined</span>
                    {(() => {
                      const progress = itemProgress[it._id]?.personal || 0
                      if (progress >= 100) {
                        return <span className="px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 font-medium text-xs">✓ Completed</span>
                      } else if (progress > 0) {
                        return <span className="px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 font-medium text-xs">⚡ Ongoing</span>
                      }
                      return null
                    })()}
                  </div>
                </div>
                
                {/* Three-dot menu */}
                <div className="relative flex-shrink-0">
                  <button
                    onClick={() => setOpenMenuId(openMenuId === it._id ? null : it._id)}
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    aria-label="More options"
                  >
                    <MoreVertical className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                  </button>
                  
                  {/* Dropdown menu */}
                  {openMenuId === it._id && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} />
                      <div className="absolute right-0 top-10 z-20 w-48 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-xl py-1">
                        <button
                          onClick={async () => {
                            setOpenMenuId(null);
                            setLoadingAnalytics(true)
                            try {
                              const resp = await communitiesAPI.itemAnalytics(id, it._id)
                              setAnalyticsData(resp?.data?.data || null)
                              setAnalyticsOpen(true)
                            } catch {
                            } finally {
                              setLoadingAnalytics(false)
                            }
                          }}
                          className="w-full px-4 py-2.5 text-left text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-3"
                          disabled={loadingAnalytics}
                        >
                          {loadingAnalytics ? <Loader2 className="h-4 w-4 animate-spin" /> : <BarChart3 className="h-4 w-4" />}
                          Analytics
                        </button>
                        
                        {joinedItems.has(String(it._id)) && (
                          <button
                            onClick={() => {
                              setOpenMenuId(null);
                              setLeaveItemData(it);
                              setLeaveModalOpen(true);
                            }}
                            className="w-full px-4 py-2.5 text-left text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-3"
                          >
                            <LogOut className="h-4 w-4" />
                            Leave
                          </button>
                        )}
                        
                        {(['admin'].includes(role) || String(it.createdBy?._id || it.createdBy) === String(useApiStore.getState().user?._id)) && (
                          <button
                            onClick={() => {
                              setOpenMenuId(null);
                              setRemoveItemData(it);
                              setRemoveModalOpen(true);
                            }}
                            className="w-full px-4 py-2.5 text-left text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-3 border-t border-gray-200 dark:border-gray-700"
                          >
                            <Trash2 className="h-4 w-4" />
                            Remove from Community
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Actions - Only show Join button for non-joined items */}
              {!joinedItems.has(String(it._id)) && (
                <div className="pt-2">
                  <button 
                    onClick={async () => { 
                      try {
                        const result = await communitiesAPI.joinItem(id, it._id)
                        
                        // Immediately update UI state based on result
                        if (result?.data?.success && result?.data?.joined) {
                          onToggleJoin?.(it._id, true)
                          const r = await communitiesAPI.itemProgress(id, it._id)
                          onRefreshProgress?.(it._id, r?.data?.data)
                          
                          // If joined a habit, refresh habits list to show personal copy
                          if (it.type === 'habit') {
                            try {
                              await useApiStore.getState().loadHabits({ force: true })
                            } catch (err) {
                              console.error('Error refreshing habits after join:', err)
                            }
                          }
                          
                          // If joined a goal, refresh goals list to show personal copy  
                          if (it.type === 'goal') {
                            try {
                              await useApiStore.getState().getGoals({ force: true })
                            } catch (err) {
                              console.error('Error refreshing goals after join:', err)
                            }
                          }
                        }
                      } catch {
                        // On error, refresh to get current state
                        try {
                          const mine = await communitiesAPI.listMyJoinedItems()
                          const arr = mine?.data?.data || []
                          const set = new Set(arr.filter(x => String(x.communityId) === String(id)).map(x => String(x._id)))
                          onToggleJoin?.(it._id, set.has(String(it._id)))
                        } catch {}
                      }
                    }} 
                    className="w-full px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 text-white text-sm font-semibold hover:from-blue-600 hover:to-purple-700 transition-all duration-300 shadow-lg"
                  >
                    Join
                  </button>
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
      <ItemAnalyticsModal open={analyticsOpen} onClose={() => setAnalyticsOpen(false)} analytics={analyticsData} />
      {filteredAndSortedItems.length === 0 && items.length > 0 && (
        <div className="glass-card-hover rounded-2xl p-10 text-center">
          <div className="text-gray-500 dark:text-gray-400 text-sm">No {filterType === 'all' ? 'items' : filterType + 's'} found in this category.</div>
        </div>
      )}
      {items.length === 0 && <div className="glass-card-hover rounded-2xl p-10 text-center"><div className="text-gray-500 dark:text-gray-400 text-sm">No shared goals or habits yet. Add some to get started!</div></div>}
      <AddItemModal open={showAddModal} onClose={(refresh) => { setShowAddModal(false); if (refresh) window.location.reload(); }} communityId={id} />
      
      {/* Leave Item Confirmation Modal */}
      {leaveModalOpen && leaveItemData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="absolute inset-0 bg-black/60" onClick={() => setLeaveModalOpen(false)} />
          <div className="relative z-10 w-full max-w-md rounded-3xl bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-900/90 p-6 sm:p-8 shadow-2xl border-2 border-gray-200 dark:border-gray-700">
            <button onClick={() => setLeaveModalOpen(false)} className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-2xl leading-none">&times;</button>
            
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">Leave Community {leaveItemData.type === 'goal' ? 'Goal' : 'Habit'}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">What happens to your personal copy?</p>
                </div>
              </div>
              
              <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-6">
                <p className="text-sm font-semibold text-gray-900 dark:text-white mb-2">"{leaveItemData.title}"</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">You're about to leave this community {leaveItemData.type}. Choose what to do with your personal progress and data.</p>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={async () => {
                  try {
                    const result = await communitiesAPI.leaveItem(id, leaveItemData._id, {
                      deletePersonalCopy: false,
                      transferToPersonal: true
                    })
                    if (result?.data?.success) {
                      onToggleJoin?.(leaveItemData._id, false)
                      const r = await communitiesAPI.itemProgress(id, leaveItemData._id)
                      onRefreshProgress?.(leaveItemData._id, r?.data?.data)
                    }
                  } catch {
                    try {
                      const mine = await communitiesAPI.listMyJoinedItems()
                      const arr = mine?.data?.data || []
                      const set = new Set(arr.filter(x => String(x.communityId) === String(id)).map(x => String(x._id)))
                      onToggleJoin?.(leaveItemData._id, set.has(String(leaveItemData._id)))
                    } catch {}
                  }
                  setLeaveModalOpen(false)
                }}
                className="w-full px-5 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white text-sm font-semibold hover:from-blue-600 hover:to-blue-700 transition-all duration-300 shadow-lg flex items-center justify-center gap-2"
              >
                <span>Keep as Personal {leaveItemData.type === 'goal' ? 'Goal' : 'Habit'}</span>
              </button>
              
              <button
                onClick={async () => {
                  try {
                    const result = await communitiesAPI.leaveItem(id, leaveItemData._id, {
                      deletePersonalCopy: true,
                      transferToPersonal: false
                    })
                    if (result?.data?.success) {
                      onToggleJoin?.(leaveItemData._id, false)
                      const r = await communitiesAPI.itemProgress(id, leaveItemData._id)
                      onRefreshProgress?.(leaveItemData._id, r?.data?.data)
                    }
                  } catch {
                    try {
                      const mine = await communitiesAPI.listMyJoinedItems()
                      const arr = mine?.data?.data || []
                      const set = new Set(arr.filter(x => String(x.communityId) === String(id)).map(x => String(x._id)))
                      onToggleJoin?.(leaveItemData._id, set.has(String(leaveItemData._id)))
                    } catch {}
                  }
                  setLeaveModalOpen(false)
                }}
                className="w-full px-5 py-3 rounded-xl bg-gradient-to-r from-red-500 to-red-600 text-white text-sm font-semibold hover:from-red-600 hover:to-red-700 transition-all duration-300 shadow-lg flex items-center justify-center gap-2"
              >
                <span>Delete Everything</span>
              </button>
              
              <button
                onClick={() => setLeaveModalOpen(false)}
                className="w-full px-5 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Remove Item Confirmation Modal */}
      {removeModalOpen && removeItemData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="absolute inset-0 bg-black/60" onClick={() => setRemoveModalOpen(false)} />
          <div className="relative z-10 w-full max-w-md rounded-3xl bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-900/90 p-6 sm:p-8 shadow-2xl border-2 border-gray-200 dark:border-gray-700">
            <button onClick={() => setRemoveModalOpen(false)} className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-2xl leading-none">&times;</button>
            
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center text-2xl">
                  <Trash2 className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">Remove {removeItemData.type === 'goal' ? 'Goal' : 'Habit'} from Community?</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">⚠️ This action cannot be undone</p>
                </div>
              </div>
              
              <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-xl p-4 mb-6">
                <p className="text-sm font-semibold text-gray-900 dark:text-white mb-3">"{removeItemData.title}"</p>
                <div className="space-y-2 text-xs text-gray-600 dark:text-gray-400">
                  <p className="flex items-start gap-2">
                    <span className="text-red-600 dark:text-red-400 font-bold">•</span>
                    <span>This {removeItemData.type} will be removed from the community for <strong>all members</strong></span>
                  </p>
                  <p className="flex items-start gap-2">
                    <span className="text-red-600 dark:text-red-400 font-bold">•</span>
                    <span>Everyone's linked copies will be converted to personal {removeItemData.type}s</span>
                  </p>
                  <p className="flex items-start gap-2">
                    <span className="text-red-600 dark:text-red-400 font-bold">•</span>
                    <span>Individual progress will be preserved but community tracking ends</span>
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={async () => {
                  await communitiesAPI.removeItem(id, removeItemData._id)
                  try {
                    const goalsRes = await useApiStore.getState().getGoals({ page: 1, limit: 100 })
                    const maybe = (goalsRes?.goals || []).find(g => String(g.title).trim().toLowerCase() === String(removeItemData.title || '').trim().toLowerCase())
                    if (maybe?._id && maybe.category === 'Community') {
                      await useApiStore.getState().updateGoal(maybe._id, { category: 'Other' })
                    }
                  } catch {}
                  setRemoveModalOpen(false)
                  window.location.reload()
                }}
                className="w-full px-5 py-3 rounded-xl bg-gradient-to-r from-red-500 to-red-600 text-white text-sm font-semibold hover:from-red-600 hover:to-red-700 transition-all duration-300 shadow-lg flex items-center justify-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                <span>Yes, Remove {removeItemData.type === 'goal' ? 'Goal' : 'Habit'} from Community</span>
              </button>
              
              <button
                onClick={() => setRemoveModalOpen(false)}
                className="w-full px-5 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


