import { useEffect, useMemo, useState } from 'react'
import { Plus, Users, Compass, Search } from 'lucide-react'
import { communitiesAPI } from '../services/api'
import useApiStore from '../store/apiStore'

const CommunityCard = ({ community, onClick }) => (
  <button onClick={onClick} className="group relative overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:shadow-lg transition-all">
    <div className="h-24 bg-gradient-to-r from-blue-500/20 to-purple-500/20" />
    <div className="p-4 text-left">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 text-white flex items-center justify-center text-sm font-semibold">
          {community.name?.slice(0,2).toUpperCase()}
        </div>
        <div className="min-w-0">
          <div className="font-semibold truncate">{community.name}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{community.description || '—'}</div>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
        <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" />{community.stats?.memberCount || 0} members</span>
        {community.visibility && <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">{community.visibility}</span>}
      </div>
    </div>
  </button>
)

export default function CommunitiesPage() {
  const { isAuthenticated } = useApiStore()
  const [loading, setLoading] = useState(true)
  const [mine, setMine] = useState([])
  const [discover, setDiscover] = useState([])
  const [query, setQuery] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', visibility: 'public' })

  useEffect(() => {
    let active = true
    async function load() {
      try {
        setLoading(true)
        const [a, b] = await Promise.all([
          communitiesAPI.listMine(),
          communitiesAPI.discover({})
        ])
        if (!active) return
        setMine(a?.data?.data || [])
        setDiscover(b?.data?.data || [])
      } finally { setLoading(false) }
    }
    if (isAuthenticated) load()
    return () => { active = false }
  }, [isAuthenticated])

  const filteredDiscover = useMemo(() => {
    if (!query) return discover
    const q = query.toLowerCase()
    return discover.filter(c => c.name?.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q))
  }, [discover, query])

  const handleCreate = async () => {
    if (!form.name.trim()) return
    const res = await communitiesAPI.create(form)
    const created = res?.data?.data
    if (created) {
      setMine(prev => [created, ...prev])
      setShowCreate(false)
      setForm({ name: '', description: '', visibility: 'public' })
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4">
      <div className="flex items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold">Communities</h1>
        <button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-500 active:scale-[.99]">
          <Plus className="h-4 w-4" /> Create
        </button>
      </div>

      <div className="mb-8">
        <h2 className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-3">My Communities</h2>
        {loading && mine.length === 0 ? (
          <div className="text-sm text-gray-500">Loading…</div>
        ) : mine.length === 0 ? (
          <div className="text-sm text-gray-500">You haven’t joined any communities yet.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {mine.map(c => (
              <CommunityCard key={c._id} community={c} onClick={() => (window.location.href = `/communities/${c._id}`)} />
            ))}
          </div>
        )}
      </div>

      <div className="mb-4 flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search communities" className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900" />
        </div>
      </div>

      <div className="mb-8">
        <h2 className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-3">Discover</h2>
        {loading && discover.length === 0 ? (
          <div className="text-sm text-gray-500">Loading…</div>
        ) : filteredDiscover.length === 0 ? (
          <div className="text-sm text-gray-500">No communities found.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDiscover.map(c => (
              <CommunityCard key={c._id} community={c} onClick={() => (window.location.href = `/communities/${c._id}`)} />
            ))}
          </div>
        )}
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowCreate(false)} />
          <div className="relative z-10 w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 p-6 shadow-xl border border-gray-200 dark:border-gray-800">
            <h3 className="text-lg font-semibold mb-4">Create Community</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1">Name</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Description</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Visibility</label>
                <select value={form.visibility} onChange={e => setForm({ ...form, visibility: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
                  <option value="public">Public</option>
                  <option value="private">Private</option>
                  <option value="invite-only">Invite-only</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setShowCreate(false)} className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-800">Cancel</button>
                <button onClick={handleCreate} className="px-3 py-2 rounded-lg bg-blue-600 text-white">Create</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


