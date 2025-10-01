import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Newspaper, BarChart3, Target, Users, Settings, ThumbsUp, MessageSquare } from 'lucide-react'
import api, { communitiesAPI } from '../services/api'
import CommunityDashboard from '../components/community/CommunityDashboard'
import CommunityItems from '../components/community/CommunityItems'
import CommunityMembers from '../components/community/CommunityMembers'
import CommunitySettings from '../components/community/CommunitySettings'
import DeleteCommunityModal from '../components/community/DeleteCommunityModal'
import io from 'socket.io-client'

const Tab = ({ active, label, Icon, onClick }) => (
  <button onClick={onClick} className={`px-4 py-2 rounded-lg text-sm font-medium inline-flex items-center gap-2 ${active ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200'}`}>
    <Icon className="h-4 w-4" /> {label}
  </button>
)

export default function CommunityDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState(null)
  const [tab, setTab] = useState('feed')
  const [feed, setFeed] = useState([])
  const [filter, setFilter] = useState('all') // all | updates | chat
  const [chatText, setChatText] = useState('')
  const [items, setItems] = useState([])
  const [itemProgress, setItemProgress] = useState({})
  const [members, setMembers] = useState([])
  const [dashboard, setDashboard] = useState(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [joinedItems, setJoinedItems] = useState(new Set())
  const socketRef = useRef(null)
  const seenIdsRef = useRef(new Set())

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

  // Ensure non-members don't land on Feed by default
  useEffect(() => {
    if (summary && summary.isMember === false && tab === 'feed') {
      setTab('dashboard')
    }
  }, [summary, tab])

  useEffect(() => {
    async function loadFeed() {
      const [f, i, m, d] = await Promise.all([
        communitiesAPI.feed(id, { limit: 30, filter }),
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
      // Load membership to toggle Join/Leave
      try {
        const mine = await communitiesAPI.listMyJoinedItems()
        const arr = mine?.data?.data || []
        const set = new Set(arr.filter(x => String(x.communityId) === String(id)).map(x => String(x._id)))
        setJoinedItems(set)
      } catch {}
    }
    loadFeed()
  }, [id, filter])

  // Socket.io connect & room join
  const ioUrl = useMemo(() => {
    try {
      const base = new URL(api.defaults.baseURL || window.location.origin)
      return base.origin
    } catch { return window.location.origin }
  }, [])

  useEffect(() => {
    const s = io(ioUrl, { transports: ['websocket'], withCredentials: true })
    socketRef.current = s
    s.emit('community:join', id)
    s.on('community:message:new', (msg) => {
      setFeed((curr) => {
        if (filter === 'updates') return curr
        const exists = curr.some(x => String(x._id) === String(msg._id)) || seenIdsRef.current.has(String(msg._id))
        if (!exists) {
          seenIdsRef.current.add(String(msg._id))
          return [{ kind: 'chat', ...msg }, ...curr]
        }
        return curr
      })
    })
    s.on('community:update:new', (upd) => {
      setFeed((curr) => {
        if (filter === 'chat') return curr
        const exists = curr.some(x => String(x._id) === String(upd._id)) || seenIdsRef.current.has(String(upd._id))
        if (!exists) {
          seenIdsRef.current.add(String(upd._id))
          return [{ kind: 'update', ...upd }, ...curr]
        }
        return curr
      })
    })
    s.on('community:message:deleted', ({ _id }) => {
      setFeed((curr) => curr.filter((x) => String(x._id) !== String(_id)))
    })
    s.on('community:reaction:changed', ({ targetType, targetId, reactions }) => {
      setFeed((curr) => curr.map((x) => (String(x._id) === String(targetId) && ((targetType === 'chat' && x.kind === 'chat') || (targetType === 'update' && x.kind === 'update')))
        ? { ...x, reactions }
        : x))
    })
    return () => { try { s.emit('community:leave', id); s.disconnect() } catch {} }
  }, [id, ioUrl, filter])

  const sendChat = async () => {
    const text = chatText.trim()
    if (!text) return
    try {
      const res = await communitiesAPI.sendChat(id, text)
      const msg = res?.data?.data
      if (msg && msg._id) {
        // Mark as seen so when socket echoes it back we don't duplicate
        seenIdsRef.current.add(String(msg._id))
      }
      setChatText('')
    } catch {}
  }

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

      <div className="mb-6 -mx-4 px-4 overflow-x-auto">
        <div className="flex gap-2 w-max">
          {isMember && (
            <Tab active={tab==='feed'} label="Feed" Icon={Newspaper} onClick={() => setTab('feed')} />
          )}
          <Tab active={tab==='dashboard'} label="Dashboard" Icon={BarChart3} onClick={() => setTab('dashboard')} />
          <Tab active={tab==='items'} label="Goals & Habits" Icon={Target} onClick={() => setTab('items')} />
          <Tab active={tab==='members'} label="Members" Icon={Users} onClick={() => setTab('members')} />
          {role === 'admin' && (
            <Tab active={tab==='settings'} label="Settings" Icon={Settings} onClick={() => setTab('settings')} />
          )}
        </div>
      </div>

      {tab === 'feed' && isMember && (
        <div className="relative min-h-[60vh] flex flex-col">
          <div className="space-y-3 flex-1 overflow-y-auto pr-1">
          <div className="flex items-center gap-2 mb-2">
            <select value={filter} onChange={e => setFilter(e.target.value)} className="px-2 py-1 rounded border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-sm">
              <option value="all">All</option>
              <option value="updates">Updates</option>
              <option value="chat">Chat</option>
            </select>
            <div className="flex-1" />
          </div>
          {feed.map(a => (
            <div key={a._id} className={`rounded-xl border border-gray-200 dark:border-gray-800 p-4 ${a.kind==='chat' ? 'bg-gray-50 dark:bg-gray-800/60' : 'bg-white dark:bg-gray-900'}`}>
              <div className="flex items-center gap-3">
                <img src={a.avatar || a.userId?.avatar} alt="User" className="h-8 w-8 rounded-full" />
                <div className="text-sm">
                  <span className="font-medium">{a.name || a.userId?.name}</span>
                  <span className="text-gray-500"> {a.kind==='chat' ? a.text : a.message}</span>
                </div>
                <div className="flex-1" />
                <div className="text-xs text-gray-500">{new Date(a.createdAt).toLocaleString()}</div>
              </div>
              <div className="mt-3 flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                {['👍','🎉','💯'].map(ej => (
                  <button key={ej} onClick={async () => { try { const r = await communitiesAPI.react(id, { targetType: a.kind, targetId: a._id, emoji: ej }); setFeed(curr => curr.map(x => x._id===a._id? { ...x, reactions: r?.data?.data?.reactions } : x)) } catch {} }} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                    <span>{ej}</span>
                    <span className="text-[11px] text-gray-500">{a?.reactions?.[ej]?.count || 0}</span>
                  </button>
                ))}
                {a.kind==='chat' && (['admin','moderator'].includes(role)) && (
                  <button onClick={async () => { if (confirm('Delete message?')) { try { await communitiesAPI.deleteChat(id, a._id); setFeed(curr => curr.filter(x => x._id!==a._id)) } catch {} } }} className="ml-2 inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-red-200 text-red-600">Delete</button>
                )}
              </div>
            </div>
          ))}
          {feed.length === 0 && <div className="text-sm text-gray-500">No activity yet.</div>}
          </div>
          <div className="sticky bottom-0 w-full px-0 pt-2 bg-gradient-to-t from-white/90 dark:from-gray-900/90 to-transparent">
            <div className="flex items-center gap-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-3 py-2 shadow-sm mx-0">
              <input value={chatText} onChange={e => setChatText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') sendChat() }} placeholder="Message…" className="flex-1 px-2 py-2 rounded-md outline-none bg-transparent text-sm" />
              <button onClick={sendChat} className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm">Send</button>
            </div>
          </div>
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
          joinedItems={joinedItems}
          onToggleJoin={(itemId, joined) => setJoinedItems(prev => { const next = new Set(prev); if (joined) next.add(String(itemId)); else next.delete(String(itemId)); return next; })}
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

