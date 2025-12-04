import { useState, useEffect, lazy } from 'react'
import { communitiesAPI } from '../../services/api'
import useApiStore from '../../store/apiStore'
const CreateGoalWizard = lazy(() => import('../CreateGoalWizard'));
const CreateHabitModal = lazy(() => import('../CreateHabitModal'));
import { Link, Plus, TrendingUp, BarChart3, MoreVertical, LogOut, Trash2 } from 'lucide-react'

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={() => onClose(false)} />
      <div className="relative z-10 w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 p-6 shadow-xl border border-gray-200 dark:border-gray-800">
        <div className="text-lg font-semibold mb-4">Add Goal/Habit</div>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <label className="text-sm">Type</label>
            <select value={type} onChange={e => setType(e.target.value)} className="px-2 py-1 rounded border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
              <option value="goal">Goal</option>
              <option value="habit">Habit</option>
            </select>
          </div>
          {type === 'goal' && (
            <div className="flex items-center gap-2">
              <label className="text-sm">Participation</label>
              <select value={participationType} onChange={e => setParticipationType(e.target.value)} className="px-2 py-1 rounded border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
                <option value="individual">Individual</option>
                <option value="collaborative">Collaborative</option>
              </select>
            </div>
          )}
          <div className="pt-2 flex items-center justify-end gap-2">
            <button onClick={() => setMode('link')} className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg ${mode==='link'?'bg-gray-200 dark:bg-gray-700':'bg-gray-100 dark:bg-gray-800'} text-gray-800 dark:text-gray-200`}><Link className="h-4 w-4" />Clone/Copy</button>
            <button onClick={() => { if (type === 'goal') setShowCreateGoalModal(true); else setShowCreateHabitModal(true); }} className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-800`}><Plus className="h-4 w-4" />Add New</button>
          </div>
          {mode === 'link' ? (
            <div className="space-y-2">
              <input placeholder={`Search my ${type === 'goal' ? 'goals' : 'habits'}`} value={filter} onChange={e => setFilter(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900" />
              <div className="max-h-56 overflow-auto rounded-lg border border-gray-200 dark:border-gray-800">
                {(type === 'goal' ? myGoals : myHabits)
                  .filter(item => {
                    const q = filter.trim().toLowerCase()
                    if (!q) return true
                    const t = (type === 'goal' ? item.title : item.name) || ''
                    return t.toLowerCase().includes(q)
                  })
                  .map(item => (
                    <button key={item._id} onClick={() => setSourceId(item._id)} className={`w-full text-left px-3 py-2 text-sm border-b border-gray-100 dark:border-gray-800 ${sourceId === item._id ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                      {(type === 'goal' ? item.title : item.name) || 'Untitled'}
                    </button>
                  ))}
                {((type === 'goal' ? myGoals : myHabits).length === 0) && (
                  <div className="px-3 py-2 text-xs text-gray-500">No items found.</div>
                )}
              </div>
            </div>
          ) : null}
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => onClose(false)} className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-800">Cancel</button>
            <button onClick={submit} className="px-3 py-2 rounded-lg bg-blue-600 text-white">Submit</button>
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
  if (!open) return null
  const rows = Array.isArray(analytics?.participants) ? analytics.participants : []
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl rounded-2xl bg-white dark:bg-gray-900 p-6 shadow-xl border border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between mb-3">
          <div className="text-lg font-semibold">Item analytics</div>
          <button onClick={onClose} className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-800 text-sm">Close</button>
        </div>
        {analytics && (
          <div className="mb-4 text-sm text-gray-700 dark:text-gray-300">
            <div className="font-medium">{analytics.item?.title} <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800">{analytics.item?.type} • {analytics.item?.participationType}</span></div>
            <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">Participants: {analytics.totals?.participants || 0} • Avg: {analytics.totals?.averagePercent || 0}% • Completed: {analytics.totals?.completedCount || 0}</div>
          </div>
        )}
        <div className="max-h-[60vh] overflow-auto rounded-lg border border-gray-200 dark:border-gray-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-300">
                <th className="text-left px-3 py-2">User</th>
                <th className="text-left px-3 py-2">Status</th>
                <th className="text-left px-3 py-2">Progress</th>
                <th className="text-left px-3 py-2">Details</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => (
                <tr key={idx} className="border-t border-gray-100 dark:border-gray-800">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <img src={r.user?.avatar || '/api/placeholder/32/32'} alt={r.user?.name || 'User'} className="h-7 w-7 rounded-full" />
                      <div className="min-w-0">
                        <div className="font-medium text-gray-900 dark:text-white truncate">{r.user?.name || 'User'}</div>
                        <div className="text-xs text-gray-500">@{r.user?.username || r.userId?.slice(-6)}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800">{r.status}</span>
                  </td>
                  <td className="px-3 py-2 w-[30%]">
                    <div className="h-2 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-600" style={{ width: `${r.progressPercent || 0}%` }} />
                    </div>
                  </td>
                  <td className="px-3 py-2 text-xs w-[40%]">
                    {analytics?.item?.type === 'habit' ? (
                      <div className="space-y-1">
                        <div className="text-gray-600 dark:text-gray-300">Streak: <span className="font-medium">{r?.habit?.currentStreak || 0}</span> / Best <span className="font-medium">{r?.habit?.longestStreak || 0}</span></div>
                        <div className="text-gray-600 dark:text-gray-300">Last {analytics?.windowDays || 30}d — Done <span className="font-medium">{r?.habit?.totals?.done || 0}</span>, Missed <span className="font-medium">{r?.habit?.totals?.missed || 0}</span>, Skipped <span className="font-medium">{r?.habit?.totals?.skipped || 0}</span></div>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <div className="text-gray-600 dark:text-gray-300">{r?.goal?.completed ? 'Completed' : 'In progress'}{typeof r?.goal?.percent === 'number' ? ` • ${Math.round(r.goal.percent)}%` : ''}</div>
                        {Array.isArray(r?.goal?.breakdown?.subGoals) && r.goal.breakdown.subGoals.length > 0 && (
                          <div className="text-gray-500">Sub-goals: {r.goal.breakdown.subGoals.filter(s => s.completed).length}/{r.goal.breakdown.subGoals.length}</div>
                        )}
                        {analytics?.item?.participationType === 'collaborative' && typeof r?.contributionPercent === 'number' && (
                          <div className="text-gray-600 dark:text-gray-300">Contribution: <span className="font-medium">{Math.round(r.contributionPercent)}%</span></div>
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
  )
}

export default function CommunityItems({ id, role, settings, items, itemProgress, onRefreshProgress, joinedItems = new Set(), onToggleJoin }) {
  const allowAnyMemberToAdd = (settings?.onlyAdminsCanAddItems === false) || (settings?.onlyAdminsCanAddGoals === false) || (settings?.onlyAdminsCanAddHabits === false)
  const onlyAdmins = !allowAnyMemberToAdd
  const [showAddModal, setShowAddModal] = useState(false)
  const [showSuggestModal, setShowSuggestModal] = useState(false)
  const [analyticsOpen, setAnalyticsOpen] = useState(false)
  const [analyticsData, setAnalyticsData] = useState(null)
  const [openMenuId, setOpenMenuId] = useState(null)

  return (
    <div className="space-y-6">
      {onlyAdmins ? (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 sm:p-5 rounded-2xl border-2 border-dashed border-blue-300 dark:border-blue-700 bg-blue-50/30 dark:bg-blue-900/10">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 flex-shrink-0 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white">
              <Plus className="h-5 w-5" />
            </div>
            <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">Add goals/habits to the community</div>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {['admin','moderator'].includes(role) ? (
              <button className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 text-white text-sm font-semibold hover:from-blue-600 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl whitespace-nowrap" onClick={() => setShowAddModal(true)}>Add</button>
            ) : (
              <button className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl border-2 border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors whitespace-nowrap" onClick={() => setShowSuggestModal(true)}>Suggest</button>
            )}
            <a href="/dashboard" title="Go to your dashboard to update progress for your goals and habits" aria-label="Go to your dashboard to update progress for your goals and habits" className="inline-flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white text-sm font-semibold hover:from-green-600 hover:to-emerald-700 transition-all duration-300 shadow-lg hover:shadow-xl whitespace-nowrap">
              <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="hidden xs:inline">Update Progress</span>
              <span className="xs:hidden">Update</span>
            </a>
          </div>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 sm:p-5 rounded-2xl border-2 border-dashed border-blue-300 dark:border-blue-700 bg-blue-50/30 dark:bg-blue-900/10">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 flex-shrink-0 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white">
              <Plus className="h-5 w-5" />
            </div>
            <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">Add goals/habits to the community</div>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <button className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 text-white text-sm font-semibold hover:from-blue-600 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl whitespace-nowrap" onClick={() => setShowAddModal(true)}>Add</button>
            <a href="/dashboard" title="Go to your dashboard to update progress for your goals and habits" aria-label="Go to your dashboard to update progress for your goals and habits" className="inline-flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white text-sm font-semibold hover:from-green-600 hover:to-emerald-700 transition-all duration-300 shadow-lg hover:shadow-xl whitespace-nowrap">
              <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="hidden xs:inline">Update Progress</span>
              <span className="xs:hidden">Update</span>
            </a>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
        {items.map(it => (
          <div key={it._id} className="rounded-2xl border-2 border-gray-200 dark:border-gray-800 p-4 sm:p-5 bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-900/80 hover:shadow-xl hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-300 group relative">
            <div className="space-y-4">
              {/* Header with icon, title, and menu */}
              <div className="flex items-start gap-3">
                <div className={`h-10 w-10 flex-shrink-0 rounded-lg flex items-center justify-center text-xl ${it.type === 'goal' ? 'bg-gradient-to-br from-blue-500 to-blue-600' : 'bg-gradient-to-br from-purple-500 to-purple-600'}`}>
                  {it.type === 'goal' ? '🎯' : '⚡'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-base font-bold text-gray-900 dark:text-white line-clamp-2" title={it.title}>{it.title}</div>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium text-xs">{it.type}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{it.stats?.participantCount || 0} joined</span>
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
                            try {
                              const resp = await communitiesAPI.itemAnalytics(id, it._id)
                              setAnalyticsData(resp?.data?.data || null)
                              setAnalyticsOpen(true)
                            } catch {}
                          }}
                          className="w-full px-4 py-2.5 text-left text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-3"
                        >
                          <BarChart3 className="h-4 w-4" />
                          View Analytics
                        </button>
                        
                        {joinedItems.has(String(it._id)) && (
                          <button
                            onClick={async () => {
                              setOpenMenuId(null);
                              try {
                                const confirmed = window.confirm('Leave this community goal/habit?')
                                if (!confirmed) return
                                
                                const choice = window.confirm(
                                  'What would you like to do with your personal copy?\n\n' +
                                  'OK = Delete from your dashboard completely\n' +
                                  'Cancel = Keep as a personal goal/habit'
                                )
                                
                                const result = await communitiesAPI.leaveItem(id, it._id, {
                                  deletePersonalCopy: choice,
                                  transferToPersonal: !choice
                                })
                                
                                if (result?.data?.success) {
                                  onToggleJoin?.(it._id, false)
                                  const r = await communitiesAPI.itemProgress(id, it._id)
                                  onRefreshProgress?.(it._id, r?.data?.data)
                                }
                              } catch {
                                try {
                                  const mine = await communitiesAPI.listMyJoinedItems()
                                  const arr = mine?.data?.data || []
                                  const set = new Set(arr.filter(x => String(x.communityId) === String(id)).map(x => String(x._id)))
                                  onToggleJoin?.(it._id, set.has(String(it._id)))
                                } catch {}
                              }
                            }}
                            className="w-full px-4 py-2.5 text-left text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-3"
                          >
                            <LogOut className="h-4 w-4" />
                            Leave Item
                          </button>
                        )}
                        
                        {(['admin'].includes(role) || String(it.createdBy?._id || it.createdBy) === String(useApiStore.getState().user?._id)) && (
                          <button
                            onClick={async () => {
                              setOpenMenuId(null);
                              if (!confirm('Remove this item from the community?')) return
                              await communitiesAPI.removeItem(id, it._id)
                              try {
                                const goalsRes = await useApiStore.getState().getGoals({ page: 1, limit: 100 })
                                const maybe = (goalsRes?.goals || []).find(g => String(g.title).trim().toLowerCase() === String(it.title || '').trim().toLowerCase())
                                if (maybe?._id && maybe.category === 'Community') {
                                  await useApiStore.getState().updateGoal(maybe._id, { category: 'Other' })
                                }
                              } catch {}
                              window.location.reload()
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

              {/* Progress bars */}
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="text-xs font-semibold text-gray-600 dark:text-gray-400">Your Progress</div>
                    <div className="text-xs font-bold text-blue-600 dark:text-blue-400">{itemProgress[it._id]?.personal || 0}%</div>
                  </div>
                  <div className="h-2 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500" style={{ width: `${itemProgress[it._id]?.personal || 0}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="text-xs font-semibold text-gray-600 dark:text-gray-400">Community Avg</div>
                    <div className="text-xs font-bold text-green-600 dark:text-green-400">{itemProgress[it._id]?.community || 0}%</div>
                  </div>
                  <div className="h-2 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-green-500 to-green-600 rounded-full transition-all duration-500" style={{ width: `${itemProgress[it._id]?.community || 0}%` }} />
                  </div>
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
      <ItemAnalyticsModal open={analyticsOpen} onClose={() => setAnalyticsOpen(false)} analytics={analyticsData} />
      {items.length === 0 && <div className="glass-card-hover rounded-2xl p-10 text-center"><div className="text-gray-500 dark:text-gray-400 text-sm">No shared goals or habits yet. Add some to get started!</div></div>}
      <AddItemModal open={showAddModal} onClose={(refresh) => { setShowAddModal(false); if (refresh) window.location.reload(); }} communityId={id} />
      {/* Suggest modal stays in page for brevity; can extract similarly if needed */}
    </div>
  )
}


