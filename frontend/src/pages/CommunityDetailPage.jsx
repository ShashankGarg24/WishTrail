import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Newspaper, BarChart3, Target, Users, Settings, ThumbsUp, MessageSquare } from 'lucide-react'
import { communitiesAPI } from '../services/api'
import CommunityDashboard from '../components/community/CommunityDashboard'
import CommunityItems from '../components/community/CommunityItems'
import CommunityMembers from '../components/community/CommunityMembers'
import CommunitySettings from '../components/community/CommunitySettings'
import DeleteCommunityModal from '../components/community/DeleteCommunityModal'

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
  const [items, setItems] = useState([])
  const [itemProgress, setItemProgress] = useState({})
  const [members, setMembers] = useState([])
  const [dashboard, setDashboard] = useState(null)
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

