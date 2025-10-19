import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
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
  const location = useLocation()
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState(null)
  const [tab, setTab] = useState('feed')
  const [headerImages, setHeaderImages] = useState({ avatarUrl: '', bannerUrl: '' })
  const [feed, setFeed] = useState([])
  const [filter, setFilter] = useState('all') // removed UI; always fetch all
  const [chatText, setChatText] = useState('')
  const [items, setItems] = useState([])
  const [itemProgress, setItemProgress] = useState({})
  const [members, setMembers] = useState([])
  const [analytics, setAnalytics] = useState(null)
  const [dashboard, setDashboard] = useState(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [joinedItems, setJoinedItems] = useState(new Set())
  const [loaded, setLoaded] = useState({ feed: false, items: false, members: false, dashboard: false, joinedItems: false })
  
  const loadJoinedItems = async () => {
    try {
      const mine = await communitiesAPI.listMyJoinedItems()
      const arr = mine?.data?.data || []
      const set = new Set(arr.filter(x => String(x.communityId) === String(id)).map(x => String(x._id)))
      setJoinedItems(set)
      setLoaded(prev => ({ ...prev, joinedItems: true }))
      return set
    } catch {
      return new Set()
    }
  }
  const [isSocketConnected, setIsSocketConnected] = useState(false)
  const socketRef = useRef(null)
  const seenIdsRef = useRef(new Set())
  const feedScrollRef = useRef(null)
  const chatInputRef = useRef(null)

  useEffect(() => {
    let active = true
    async function load() {
      try {
        setLoading(true)
        const res = await communitiesAPI.get(id)
        if (!active) return
        const sm = res?.data?.data || null
        setSummary(sm)
        if (sm?.community) {
          setHeaderImages({
            avatarUrl: sm.community.avatarUrl || '',
            bannerUrl: sm.community.bannerUrl || ''
          })
        }
      } finally { setLoading(false) }
    }
    load()
    return () => { active = false }
  }, [id])

  // Sync tab with URL (?tab=) and enforce visibility rules
  useEffect(() => {
    if (!summary) return
    const params = new URLSearchParams(location.search)
    let next = params.get('tab') || (summary.isMember ? 'feed' : 'dashboard')
    const allowed = ['feed','dashboard','items','members','settings']
    if (!allowed.includes(next)) next = summary.isMember ? 'feed' : 'dashboard'
    if (!summary.isMember && next === 'feed') next = 'dashboard'
    if (summary.role !== 'admin' && next === 'settings') next = summary.isMember ? 'feed' : 'dashboard'
    if (tab !== next) setTab(next)
  }, [location.search, summary])

  // Navigate helper to update URL with active tab
  const switchTab = (next) => {
    const params = new URLSearchParams(location.search)
    params.set('tab', next)
    navigate({ pathname: `/communities/${id}`, search: `?${params.toString()}` })
  }

  // Helper: scroll to message box and focus input
  const scrollToMessageBox = () => {
    try {
      if (feedScrollRef.current) {
        feedScrollRef.current.scrollTop = feedScrollRef.current.scrollHeight
      }
      if (chatInputRef.current) {
        chatInputRef.current.focus({ preventScroll: false })
        try { chatInputRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' }) } catch {}
      }
    } catch {}
  }

  // When feed tab becomes active, auto-scroll to input
  useEffect(() => {
    if (tab === 'feed') {
      setTimeout(scrollToMessageBox, 0)
    }
  }, [tab])

  // Time formatter: 1m ago, 1h ago, 1d ago
  const formatRelativeTime = (iso) => {
    try {
      const now = Date.now()
      const then = new Date(iso).getTime()
      const diff = Math.max(0, now - then)
      const sec = Math.floor(diff / 1000)
      if (sec < 60) return `${sec || 1}s ago`
      const min = Math.floor(sec / 60)
      if (min < 60) return `${min}m ago`
      const hr = Math.floor(min / 60)
      if (hr < 24) return `${hr}h ago`
      const day = Math.floor(hr / 24)
      if (day < 7) return `${day}d ago`
      const wk = Math.floor(day / 7)
      return `${wk}w ago`
    } catch { return '' }
  }

  // Lazy load data per active tab
  useEffect(() => {
    let cancelled = false
    async function loadForTab() {
      try {
        if (tab === 'feed' && summary?.isMember && !loaded.feed) {
          const f = await communitiesAPI.feed(id, { limit: 100 })
          if (cancelled) return
          setFeed(f?.data?.data || [])
          setLoaded(prev => ({ ...prev, feed: true }))
        }
        if (tab === 'dashboard' && !loaded.dashboard) {
          const d = await communitiesAPI.dashboard(id)
          if (cancelled) return
          setDashboard(d?.data?.data || null)
          setLoaded(prev => ({ ...prev, dashboard: true }))
          try {
            const a = await communitiesAPI.analytics(id, { weeks: 12 })
            if (!cancelled) setAnalytics(a?.data?.data || null)
          } catch {}
          if (!loaded.members) {
            try {
              const m = await communitiesAPI.members(id)
              if (cancelled) return
              setMembers(m?.data?.data || [])
              setLoaded(prev => ({ ...prev, members: true }))
            } catch {}
          }
        }
        if (tab === 'items' && !loaded.items) {
          const i = await communitiesAPI.items(id)
          const list = i?.data?.data || []
          if (cancelled) return
          setItems(list)
          try {
            const progressPairs = await Promise.all(list.map(it => communitiesAPI.itemProgress(id, it._id).then(r => [it._id, r?.data?.data]).catch(() => [it._id, { personal: 0, community: 0 }])))
            const map = {}
            for (const [key, val] of progressPairs) map[key] = val
            if (!cancelled) setItemProgress(map)
          } catch {}
          setLoaded(prev => ({ ...prev, items: true }))
          // Load joined items to toggle Join/Leave
          await loadJoinedItems()
        }
        if (tab === 'members' && !loaded.members) {
          const m = await communitiesAPI.members(id)
          if (cancelled) return
          setMembers(m?.data?.data || [])
          setLoaded(prev => ({ ...prev, members: true }))
        }
      } catch {}
    }
    loadForTab()
    return () => { cancelled = true }
  }, [tab, id, summary, loaded])

  // Refresh joined items when user comes back to the page (for visibility changes)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && tab === 'items' && loaded.items) {
        loadJoinedItems()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [tab, loaded.items])

  // Socket.io connect & room join
  const ioUrl = useMemo(() => {
    try {
      const base = new URL(api.defaults.baseURL || '/', window.location.origin)
      return base.origin
    } catch { return window.location.origin }
  }, [])

  useEffect(() => {
    if (tab !== 'feed' || !summary?.isMember) return
    const s = io(ioUrl, { withCredentials: true })
    socketRef.current = s
    try {
      s.on('connect', () => { try { console.debug('[socket] connected to', ioUrl); } catch {} ; setIsSocketConnected(true); try { s.emit('community:join', id) } catch {} })
      s.on('connect_error', (err) => { try { console.warn('[socket] connect_error', err?.message || err); } catch {} })
      s.on('error', (err) => { try { console.warn('[socket] error', err?.message || err); } catch {} })
      s.on('disconnect', () => { setIsSocketConnected(false) })
    } catch {}
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
    return () => { try { s.emit('community:leave', id); s.disconnect(); setIsSocketConnected(false) } catch {} }
  }, [id, ioUrl, filter, tab, summary])

  // Polling fallback when socket is not connected
  useEffect(() => {
    if (tab !== 'feed' || !summary?.isMember) return
    let timer = null
    let cancelled = false
    const poll = async () => {
      try {
        if (isSocketConnected) return
        const f = await communitiesAPI.feed(id, { limit: 100 })
        if (cancelled) return
        setFeed(f?.data?.data || [])
      } catch {}
      finally {
        if (!cancelled && !isSocketConnected) timer = setTimeout(poll, 10000)
      }
    }
    if (!isSocketConnected) poll()
    return () => { cancelled = true; if (timer) clearTimeout(timer) }
  }, [tab, summary, isSocketConnected, id])

  const sendChat = async () => {
    const text = chatText.trim()
    if (!text) return
    try {
      const res = await communitiesAPI.sendChat(id, text)
      const msg = res?.data?.data
      if (msg && msg._id) {
        // Mark as seen so when socket echoes it back we don't duplicate
        seenIdsRef.current.add(String(msg._id))
        // Show immediately in UI even if socket echo is delayed/unavailable
        setFeed(curr => [{ kind: 'chat', ...msg }, ...curr])
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
        <div className="h-28 sm:h-36 bg-gradient-to-r from-blue-500/20 to-purple-500/20 relative">
          {headerImages.bannerUrl ? (
            <img src={headerImages.bannerUrl} alt="Community banner" className="absolute inset-0 h-full w-full object-cover" />
          ) : null}
        </div>
        <div className="p-4 sm:p-6 -mt-8">
          <div className="flex items-center gap-3">
            {headerImages.avatarUrl ? (
              <img src={headerImages.avatarUrl} alt="Community avatar" className="h-14 w-14 rounded-full border object-cover" />
            ) : (
              <div className="h-14 w-14 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 text-white flex items-center justify-center text-lg font-bold">
                {community.name?.slice(0,2).toUpperCase()}
              </div>
            )}
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
            <Tab active={tab==='feed'} label="Feed" Icon={Newspaper} onClick={() => { switchTab('feed'); setTimeout(scrollToMessageBox, 0) }} />
          )}
          <Tab active={tab==='dashboard'} label="Dashboard" Icon={BarChart3} onClick={() => switchTab('dashboard')} />
          <Tab active={tab==='items'} label="Goals & Habits" Icon={Target} onClick={() => switchTab('items')} />
          <Tab active={tab==='members'} label="Members" Icon={Users} onClick={() => switchTab('members')} />
          {role === 'admin' && (
            <Tab active={tab==='settings'} label="Settings" Icon={Settings} onClick={() => switchTab('settings')} />
          )}
        </div>
      </div>

      {tab === 'feed' && isMember && (
        <div className="relative min-h-[60vh] flex flex-col">
          <div ref={feedScrollRef} className="space-y-3 flex-1 overflow-y-auto pr-1">
          <div className="h-1" />
          {feed
            .slice() // clone so we can sort safely
            .sort((a,b) => new Date(a.createdAt) - new Date(b.createdAt))
            // always show all (messages + updates)
            .map(a => (
            <div key={a._id} className="px-2">
              {a.kind==='chat' ? (
                <div className="flex items-end gap-2 mb-2">
                  <img src={a.avatar || a.userId?.avatar} alt="User" className="h-7 w-7 rounded-full" />
                  <div className="max-w-[75%] rounded-2xl px-3 py-2 bg-gray-100 dark:bg-gray-800 text-sm">
                  <div className="text-xs text-gray-500 mb-0.5">{a.name || a.userId?.name} • <span title={new Date(a.createdAt).toLocaleString()}>{formatRelativeTime(a.createdAt)}</span></div>
                    <div className="whitespace-pre-wrap text-gray-800 dark:text-gray-200">{a.text}</div>
                    {(['admin','moderator'].includes(role)) && (
                      <div className="mt-1">
                        <button onClick={async () => { if (confirm('Delete message?')) { try { await communitiesAPI.deleteChat(id, a._id); setFeed(curr => curr.filter(x => x._id!==a._id)) } catch {} } }} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border border-red-200 text-red-600 text-[11px]">Delete</button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex justify-center my-3">
                  <div className="text-[13px] text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 px-3 py-1.5 rounded-full text-center">
                    <span className="font-medium mr-1">{a.name || a.userId?.name}</span>
                    <span className="opacity-70">{(() => {
                      const t = a?.type;
                      if (t === 'goal_created') return `created a goal: "${a?.data?.goalTitle || ''}"`;
                      if (t === 'goal_completed') return `completed a goal: "${a?.data?.goalTitle || ''}"`;
                      if (t === 'goal_joined') return `joined a goal/habit: "${a?.data?.goalTitle || a?.data?.metadata?.habitName || ''}"`;
                      if (t === 'streak_milestone') {
                        const nm = a?.data?.metadata?.habitName;
                        return `streak in habit${nm ? `: "${nm}"` : ''} — ${a?.data?.streakCount}-day streak`;
                      }
                      if (t === 'community_member_joined') return 'joined the community';
                      if (t === 'community_member_left') return 'left the community';
                      if (t === 'community_item_added') {
                        const t1 = a?.data?.goalTitle || a?.data?.metadata?.habitName || '';
                        return t1 ? `added a community item: "${t1}"` : 'added a community item';
                      }
                      return a.message || '';
                    })()}</span>
                    <span className="ml-2 text-[11px] opacity-60" title={new Date(a.createdAt).toLocaleString()}>{formatRelativeTime(a.createdAt)}</span>
                    {/* reactions (allowed subset only) */}
                    {(() => {
                      const allowed = new Set(['goal_completed','community_item_added','goal_joined','streak_milestone']);
                      if (!allowed.has(String(a?.type))) return null;
                      return (
                        <span className="ml-2">
                          {['👍','🎉','💯'].map(ej => (
                            <button key={ej} onClick={async () => { try { const r = await communitiesAPI.react(id, { targetType: 'update', targetId: a._id, emoji: ej }); setFeed(curr => curr.map(x => x._id===a._id? { ...x, reactions: r?.data?.data?.reactions } : x)) } catch {} }} className="inline-flex items-center gap-1 px-1 py-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
                              <span>{ej}</span>
                              <span className="text-[10px] opacity-70">{a?.reactions?.[ej]?.count || 0}</span>
                            </button>
                          ))}
                        </span>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>
          ))}
          {feed.length === 0 && <div className="text-sm text-gray-500">No activity yet.</div>}
          </div>
          <div className="sticky bottom-[72px] md:bottom-0 w-full px-0 pt-2 bg-gradient-to-t from-white/90 dark:from-gray-900/90 to-transparent">
            <div className="flex items-center gap-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-3 py-2 shadow-sm mx-0">
              <input ref={chatInputRef} value={chatText} onChange={e => setChatText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') sendChat() }} placeholder="Message…" className="flex-1 px-2 py-2 rounded-md outline-none bg-transparent text-sm" />
              <button onClick={sendChat} className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm">Send</button>
            </div>
          </div>
        </div>
      )}

      {tab === 'dashboard' && (
        <CommunityDashboard dashboard={dashboard} members={members} analytics={analytics} />
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
          onToggleJoin={(itemId, joined) => {
            setJoinedItems(prev => { 
              const next = new Set(prev); 
              if (joined) next.add(String(itemId)); 
              else next.delete(String(itemId)); 
              return next; 
            })
            // Also refresh items list if join status changed
            if (loaded.items) {
              setTimeout(() => loadJoinedItems(), 100)
            }
          }}
        />
      )}

      {tab === 'members' && (
        <CommunityMembers id={id} role={role} community={community} members={members} />
      )}

      {tab === 'settings' && (
        <CommunitySettings
          community={{ ...community, ...headerImages }}
          role={role}
          showDeleteModal={showDeleteModal}
          setShowDeleteModal={setShowDeleteModal}
          onCommunityChange={(changes) => setHeaderImages(prev => ({ ...prev, ...changes }))}
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

