import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Newspaper, BarChart3, Target, Users, Settings, ThumbsUp, MessageSquare } from 'lucide-react'
import { communitiesAPI, habitsAPI } from '../services/api'
import CommunityDashboard from '../components/community/CommunityDashboard'
import CommunityItems from '../components/community/CommunityItems'
import CommunityMembers from '../components/community/CommunityMembers'
import CommunitySettings from '../components/community/CommunitySettings'
import DeleteCommunityModal from '../components/community/DeleteCommunityModal'
import useApiStore from '../store/apiStore'
import CreateWishModal from '../components/CreateWishModal'
import CreateHabitModal from '../components/CreateHabitModal'

const Tab = ({ active, label, Icon, onClick }) => (
  <button onClick={onClick} className={`px-4 py-2 rounded-lg text-sm font-medium inline-flex items-center gap-2 ${active ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200'}`}>
    <Icon className="h-4 w-4" /> {label}
  </button>
)

function AddItemModal({ open, onClose, communityId }) {
  const [type, setType] = useState('goal') // 'goal' | 'habit'
  const [mode, setMode] = useState('link')
  const [sourceId, setSourceId] = useState('')
  const [title, setTitle] = useState('')
  const [showCreateGoalModal, setShowCreateGoalModal] = useState(false)
  const [showCreateHabitModal, setShowCreateHabitModal] = useState(false)
  const [myGoals, setMyGoals] = useState([])
  const [myHabits, setMyHabits] = useState([])
  const [filter, setFilter] = useState('')
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
        await communitiesAPI.copyCommunityItem(communityId, { type, sourceId })
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
          <div className="pt-2 flex items-center justify-end gap-2">
            <button onClick={() => setMode('link')} className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg ${mode==='link'?'bg-gray-200 dark:bg-gray-700':'bg-gray-100 dark:bg-gray-800'} text-gray-800 dark:text-gray-200`}><Link className="h-4 w-4" />Link</button>
            <button onClick={() => setMode('create')} className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg ${mode==='create'?'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800':'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-800'}`}><Plus className="h-4 w-4" />Add New</button>
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
          ) : (
            <input placeholder={`Enter ${type === 'goal' ? 'goal title' : 'habit name'}`} value={title} onChange={e => setTitle(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900" />
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => onClose(false)} className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-800">Cancel</button>
            <button onClick={submit} className="px-3 py-2 rounded-lg bg-blue-600 text-white">Submit</button>
          </div>
        </div>
      </div>
      {/* Use existing Create Goal modal; on save, first create personal goal then publish community copy */}
      {showCreateGoalModal && (
        <CreateWishModal
          isOpen={showCreateGoalModal}
          onClose={() => setShowCreateGoalModal(false)}
          onSave={async (goalData) => {
            try {
              const res = await goalsAPI.createGoal(goalData)
              const created = res?.data?.data?.goal
              if (created?._id) {
                await communitiesAPI.copyCommunityItem(communityId, { type: 'goal', sourceId: created._id })
              }
              onClose(true)
              return { success: true }
            } catch (e) {
              return { success: false }
            }
          }}
          year={new Date().getFullYear()}
        />
      )}
      {showCreateHabitModal && (
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
      )}
    </div>
  )
}

function SuggestItemModal({ open, onClose, communityId }) {
  const [type, setType] = useState('goal')
  const [sourceId, setSourceId] = useState('')
  const [title, setTitle] = useState('')
  const [note, setNote] = useState('')
  if (!open) return null
  const submit = async () => {
    try {
      await communitiesAPI.suggestItem(communityId, { type, sourceId, title, note })
      onClose(true)
    } catch (_) {
      onClose(false)
    }
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={() => onClose(false)} />
      <div className="relative z-10 w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 p-6 shadow-xl border border-gray-200 dark:border-gray-800">
        <div className="text-lg font-semibold mb-4">Suggest Goal/Habit</div>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <label className="text-sm">Type</label>
            <select value={type} onChange={e => setType(e.target.value)} className="px-2 py-1 rounded border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
              <option value="goal">Goal</option>
              <option value="habit">Habit</option>
            </select>
          </div>
          <input placeholder={`Enter ${type} ID (optional)`} value={sourceId} onChange={e => setSourceId(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900" />
          <input placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900" />
          <textarea placeholder="Why should we add this?" value={note} onChange={e => setNote(e.target.value)} rows={3} className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900" />
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => onClose(false)} className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-800">Cancel</button>
            <button onClick={submit} className="px-3 py-2 rounded-lg bg-blue-600 text-white">Submit</button>
          </div>
        </div>
      </div>
    </div>
  )
}
function InterestsMultiSelect({ community }) {
  const { interestsCatalog, loadInterests } = useApiStore();
  const [selected, setSelected] = useState(Array.isArray(community.interests) ? community.interests : []);
  useEffect(() => { if (!interestsCatalog || interestsCatalog.length === 0) loadInterests().catch(() => {}) }, []);
  const list = (interestsCatalog && interestsCatalog.length > 0)
    ? interestsCatalog.map(x => x.interest)
    : ['fitness','health','travel','education','career','finance','hobbies','relationships','personal_growth','creativity','technology','business','lifestyle','spirituality','sports','music','art','reading','cooking','gaming','nature','volunteering'];
  const toggle = async (val) => {
    const active = selected.includes(val);
    const next = active ? selected.filter(i => i !== val) : [...selected, val];
    setSelected(next);
    try { await communitiesAPI.update(community._id, { interests: next }); } catch {}
  };
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {list.map((i) => {
          const active = selected.includes(i);
          const label = i.replace(/_/g,' ');
          return (
            <button key={i} onClick={() => toggle(i)} className={`px-2.5 py-1.5 rounded-full text-xs border ${active ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700'}`}>{label}</button>
          );
        })}
      </div>
      {selected.length > 0 && (
        <div className="text-xs text-gray-500">{selected.length} selected</div>
      )}
    </div>
  );
}

export default function CommunityDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState(null)
  const [tab, setTab] = useState('feed')
  const [feed, setFeed] = useState([])
  const [items, setItems] = useState([])
  const [itemProgress, setItemProgress] = useState({})
  const [members, setMembers] = useState([])
  const [dashboard, setDashboard] = useState(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showSuggestModal, setShowSuggestModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  useEffect(() => {
    let active = true
    async function load() {
      try {
        setLoading(true)
        const res = await communitiesAPI.get(id)
        if (!active) return
        setSummary(res?.data?.data || null)
      } finally { setLoading(false) }
    }
    load()
    return () => { active = false }
  }, [id])

  useEffect(() => {
    async function loadFeed() {
      const [f, i, m, d] = await Promise.all([
        communitiesAPI.feed(id, { limit: 20 }),
        communitiesAPI.items(id),
        communitiesAPI.members(id),
        communitiesAPI.dashboard(id)
      ])
      setFeed(f?.data?.data || [])
      const list = i?.data?.data || []
      setItems(list)
      // fetch progress in parallel
      const progressPairs = await Promise.all(list.map(it => communitiesAPI.itemProgress(id, it._id).then(r => [it._id, r?.data?.data]).catch(() => [it._id, { personal: 0, community: 0 }])));
      const map = {}
      for (const [key, val] of progressPairs) map[key] = val
      setItemProgress(map)
      setMembers(m?.data?.data || [])
      setDashboard(d?.data?.data || null)
    }
    loadFeed()
  }, [id])

  if (!summary) return (
    <div className="mx-auto max-w-5xl px-4">
      <div className="py-10 text-sm text-gray-500">{loading ? 'Loading…' : 'Not found'}</div>
    </div>
  )

  const { community, role, isMember } = summary

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="relative overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800 mb-6">
        <div className="h-28 sm:h-36 bg-gradient-to-r from-blue-500/20 to-purple-500/20" />
        <div className="p-4 sm:p-6 -mt-8">
          <div className="flex items-center gap-3">
            <div className="h-14 w-14 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 text-white flex items-center justify-center text-lg font-bold">
              {community.name?.slice(0,2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="font-bold text-xl truncate">{community.name}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">{community.stats?.memberCount || 0} members • {community.visibility}</div>
            </div>
            <div className="flex-1" />
            {!isMember ? (
              <button onClick={async () => { await communitiesAPI.join(community._id); window.location.reload(); }} className="px-3 py-2 rounded-lg bg-blue-600 text-white">Join</button>
            ) : (
              <button onClick={async () => { await communitiesAPI.leave(community._id); navigate('/communities'); }} className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-800">Leave</button>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        <Tab active={tab==='feed'} label="Feed" Icon={Newspaper} onClick={() => setTab('feed')} />
        <Tab active={tab==='dashboard'} label="Dashboard" Icon={BarChart3} onClick={() => setTab('dashboard')} />
        <Tab active={tab==='items'} label="Goals & Habits" Icon={Target} onClick={() => setTab('items')} />
        <Tab active={tab==='members'} label="Members" Icon={Users} onClick={() => setTab('members')} />
        {role === 'admin' && (
          <Tab active={tab==='settings'} label="Settings" Icon={Settings} onClick={() => setTab('settings')} />
        )}
      </div>

      {tab === 'feed' && (
        <div className="space-y-3">
          {feed.map(a => (
            <div key={a._id} className="rounded-xl border border-gray-200 dark:border-gray-800 p-4 bg-white dark:bg-gray-900">
              <div className="flex items-center gap-3">
                <img src={a.userId?.avatar} alt="User" className="h-8 w-8 rounded-full" />
                <div className="text-sm"><span className="font-medium">{a.userId?.name}</span> <span className="text-gray-500">{a.message}</span></div>
                <div className="flex-1" />
                <div className="text-xs text-gray-500">{new Date(a.createdAt).toLocaleString()}</div>
              </div>
              <div className="mt-3 flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
                <button className="inline-flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"><ThumbsUp className="h-4 w-4" />Like</button>
                <button className="inline-flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"><MessageSquare className="h-4 w-4" />Comment</button>
              </div>
            </div>
          ))}
          {feed.length === 0 && <div className="text-sm text-gray-500">No activity yet.</div>}
        </div>
      )}

      {tab === 'dashboard' && (
        <CommunityDashboard dashboard={dashboard} members={members} />
      )}

      {tab === 'items' && (
        <CommunityItems
          id={id}
          role={role}
          settings={summary?.community?.settings}
          items={items}
          itemProgress={itemProgress}
          onRefreshProgress={(itemId, data) => setItemProgress(p => ({ ...p, [itemId]: data }))}
        />
      )}

      {tab === 'members' && (
        <CommunityMembers id={id} role={role} community={community} members={members} />
      )}

      {tab === 'settings' && (
        <CommunitySettings
          community={community}
          role={role}
          showDeleteModal={showDeleteModal}
          setShowDeleteModal={setShowDeleteModal}
          DeleteModal={(
            <DeleteCommunityModal
              open={showDeleteModal}
              onClose={() => setShowDeleteModal(false)}
              onConfirm={async () => { try { await communitiesAPI.remove(community._id); window.location.assign('/communities'); } finally { setShowDeleteModal(false); } }}
            />
          )}
        />
      )}
    </div>
  )
}

function PendingMembers({ communityId }) {
  const [list, setList] = useState([])
  useEffect(() => {
    communitiesAPI.pendingMembers(communityId).then(r => setList(r?.data?.data || [])).catch(() => setList([]))
  }, [communityId])
  const decide = async (userId, approve) => {
    await communitiesAPI.approveMember(communityId, userId, approve)
    setList(list.filter(m => String(m?.userId?._id || m?.userId) !== String(userId)))
  }
  if (list.length === 0) return <div className="text-sm text-gray-500">No pending requests.</div>
  return (
    <div className="space-y-2">
      {list.map(m => (
        <div key={m._id} className="flex items-center gap-3 p-2 rounded-lg border border-gray-200 dark:border-gray-800">
          <img src={m.userId?.avatar} alt="User" className="h-8 w-8 rounded-full" />
          <div className="text-sm flex-1">{m.userId?.name}</div>
          <button onClick={() => decide(m.userId?._id, true)} className="px-2 py-1 rounded bg-green-600 text-white text-xs">Approve</button>
          <button onClick={() => decide(m.userId?._id, false)} className="px-2 py-1 rounded border border-gray-200 dark:border-gray-800 text-xs">Reject</button>
        </div>
      ))}
    </div>
  )
}

function PendingSuggestions({ communityId }) {
  const [list, setList] = useState([])
  useEffect(() => {
    communitiesAPI.pendingItems(communityId).then(r => setList(r?.data?.data || [])).catch(() => setList([]))
  }, [communityId])
  if (list.length === 0) return <div className="text-sm text-gray-500">No pending suggestions.</div>
  return (
    <div className="space-y-2">
      {list.map(s => (
        <div key={s._id} className="p-2 rounded-lg border border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <img src={s.createdBy?.avatar} alt="User" className="h-8 w-8 rounded-full" />
            <div className="min-w-0">
              <div className="text-sm font-medium truncate">{s.title}</div>
              <div className="text-xs text-gray-500">{s.type} • Suggested by {s.createdBy?.name}</div>
            </div>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <button onClick={async () => { await communitiesAPI.approveItem(communityId, s._id, true); setList(prev => prev.filter(x => x._id !== s._id)) }} className="px-2 py-1 rounded bg-green-600 text-white text-xs">Approve</button>
            <button onClick={async () => { await communitiesAPI.approveItem(communityId, s._id, false); setList(prev => prev.filter(x => x._id !== s._id)) }} className="px-2 py-1 rounded border border-gray-200 dark:border-gray-800 text-xs">Reject</button>
          </div>
        </div>
      ))}
    </div>
  )
}


