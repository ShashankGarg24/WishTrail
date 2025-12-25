import { useEffect, useMemo, useState } from 'react'
import { Plus, Users, Compass, Search, Users2, Loader2 } from 'lucide-react'
import { communitiesAPI } from '../services/api'
import useApiStore from '../store/apiStore'

const CommunityCard = ({ community, onClick }) => (
  <button onClick={onClick} className="group relative overflow-hidden rounded-2xl border-2 border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:shadow-2xl hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-300 hover:scale-[1.02]">
    {/* Banner Image */}
    <div className="h-32 relative overflow-hidden">
      {community.bannerUrl ? (
        <img 
          src={community.bannerUrl} 
          alt={`${community.name} banner`}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.target.style.display = 'none';
            e.target.parentElement.classList.add('bg-gradient-to-br', 'from-blue-500/30', 'via-purple-500/25', 'to-pink-500/20');
          }}
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-blue-500/30 via-purple-500/25 to-pink-500/20" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
    </div>
    <div className="p-3 sm:p-5 text-left">
      <div className="flex items-start gap-3 mb-3">
        {/* Avatar Image */}
        {community.avatarUrl ? (
          <img 
            src={community.avatarUrl} 
            alt={`${community.name} avatar`}
            className="h-12 w-12 sm:h-14 sm:w-14 rounded-xl object-cover shadow-lg ring-2 ring-gray-200 dark:ring-gray-700 group-hover:scale-110 transition-transform duration-300"
            onError={(e) => {
              e.target.outerHTML = `<div class="h-12 w-12 sm:h-14 sm:w-14 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 text-white flex items-center justify-center text-base font-bold shadow-lg ring-4 ring-white dark:ring-gray-900 group-hover:scale-110 transition-transform duration-300">${community.name?.slice(0,2).toUpperCase()}</div>`;
            }}
          />
        ) : (
          <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 text-white flex items-center justify-center text-base font-bold shadow-lg ring-2 ring-gray-200 dark:ring-gray-700 group-hover:scale-110 transition-transform duration-300">
            {community.name?.slice(0,2).toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="font-bold text-sm sm:text-base text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors break-words line-clamp-2">{community.name}</div>
          <div className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 mt-1">{community.description || 'No description'}</div>
        </div>
      </div>
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs">
          <span className="inline-flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
            <Users className="h-4 w-4" />
            <span className="font-semibold">{community.stats?.memberCount || 0}/{community.settings?.memberLimit || 100}</span>
          </span>
          {community.visibility && (
            <span className="px-2.5 py-1 rounded-full bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 font-medium border border-purple-200 dark:border-purple-800 capitalize">
              {community.visibility.replace('-', ' ')}
            </span>
          )}
        </div>
        {/* Interests */}
        {community.interests && community.interests.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {community.interests.slice(0, 3).map((interest, idx) => (
              <span key={idx} className="px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 text-xs font-medium border border-purple-200 dark:border-purple-800">
                {interest.replace(/_/g, ' ')}
              </span>
            ))}
            {community.interests.length > 3 && (
              <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs font-medium">
                +{community.interests.length - 3}
              </span>
            )}
          </div>
        )}
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
  const [form, setForm] = useState({ name: '', description: '', visibility: 'public', interests: [], memberLimit: 1 })

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      try {
        const [a, b] = await Promise.all([
          communitiesAPI.listMine(),
          communitiesAPI.discover({})
        ]);

        if (!active) return;

        const mineData = a?.data?.data || [];
        const discoverData = b?.data?.data || [];

        setMine(mineData);
        setDiscover(discoverData);

        // 👉 mark loading false only AFTER data is placed in state synchronously
        setTimeout(() => {
          if (active) setLoading(false);
        }, 0); 
      } catch(err){}
    }

    if (isAuthenticated) load();
    return () => { active = false };
  }, [isAuthenticated]);


  const filteredDiscover = useMemo(() => {
    if (!query) return discover
    const q = query.toLowerCase()
    return discover.filter(c => c.name?.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q))
  }, [discover, query])

  const handleCreate = async () => {
    if (!form.name.trim()) return
    const payload = {
      name: form.name.trim(),
      description: form.description || '',
      visibility: form.visibility || 'public',
      interests: Array.isArray(form.interests) ? form.interests : [],
      memberLimit: Math.max(1, Math.min(100, parseInt(form.memberLimit || '1')))
    }
    const res = await communitiesAPI.create(payload)
    const created = res?.data?.data
    if (created) {
      setMine(prev => [created, ...prev])
      setShowCreate(false)
      setForm({ name: '', description: '', visibility: 'public', interests: [], memberLimit: 1 })
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-3 mb-6 sm:mb-8">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Users2 className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </div>
            Communities
          </h2>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-2 ml-0 sm:ml-13">Connect, collaborate, and achieve together</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="inline-flex items-center justify-center gap-2 px-5 py-2.5 sm:py-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold hover:from-blue-600 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 whitespace-nowrap">
          <Plus className="h-5 w-5" /> <span>Create Community</span>
        </button>
      </div>

      <div className="mb-8">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <div className="h-1 w-1 rounded-full bg-blue-500" />
          My Communities
        </h2>
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <Loader2 className="h-10 w-10 animate-spin text-blue-500 mx-auto mb-3" />
              <p className="text-sm text-gray-500 dark:text-gray-400">Loading communities...</p>
            </div>
          </div>
        ) : mine.length === 0 ? (
          <div className="glass-card-hover rounded-2xl p-10 text-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mx-auto mb-4">
              <Users2 className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No communities yet</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">Join communities to connect with others and share goals</p>
            <a
              href="/discover?tab=communities"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold hover:from-blue-600 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105"
            >
              <Compass className="h-5 w-5" />
              Explore Communities
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {mine.map(c => (
              <CommunityCard key={c._id} community={c} onClick={() => (window.location.href = `/communities/${c._id}`)} />
            ))}
          </div>
        )}
      </div>

      {/* Discover moved to DiscoverPage */}

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowCreate(false)} />
          <div className="relative z-10 w-full max-w-md rounded-3xl bg-white dark:bg-gray-900 p-6 sm:p-8 shadow-2xl border-2 border-gray-200 dark:border-gray-800 my-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <Plus className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Create Community</h3>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">Community Name</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Enter community name..." className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:border-blue-500 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">Description</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} placeholder="Describe your community..." className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:border-blue-500 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none resize-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">Visibility</label>
                <select value={form.visibility} onChange={e => setForm({ ...form, visibility: e.target.value })} className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:border-blue-500 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none">
                  <option value="public">Public</option>
                  <option value="private">Private</option>
                  <option value="invite-only">Invite-only</option>
                </select>
              </div>
              <InterestsPicker value={form.interests} onChange={(next) => setForm({ ...form, interests: next })} />
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">Member Limit</label>
                <input type="number" min={1} max={100} value={form.memberLimit} onChange={e => setForm({ ...form, memberLimit: Math.max(1, Math.min(100, parseInt(e.target.value || '1'))) })} className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:border-blue-500 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none" placeholder="Max 100" />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button onClick={() => setShowCreate(false)} className="px-5 py-2.5 rounded-xl border-2 border-gray-200 dark:border-gray-700 font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">Cancel</button>
                <button onClick={handleCreate} className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold hover:from-blue-600 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl">Create</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function InterestsPicker({ value = [], onChange }) {
  const { interestsCatalog, loadInterests } = useApiStore();
  const [selected, setSelected] = useState(Array.isArray(value) ? value : []);
  useEffect(() => { if (!interestsCatalog || interestsCatalog.length === 0) loadInterests().catch(() => {}) }, []);
  useEffect(() => { setSelected(Array.isArray(value) ? value : []) }, [value]);
  const list = (interestsCatalog && interestsCatalog.length > 0)
    ? interestsCatalog.map(x => x.interest)
    : ['fitness','health','travel','education','career','finance','hobbies','relationships','personal_growth','creativity','technology','business','lifestyle','spirituality','sports','music','art','reading','cooking','gaming','nature','volunteering'];
  const toggle = (i) => {
    const active = selected.includes(i);
    const next = active ? selected.filter(v => v !== i) : [...selected, i];
    setSelected(next);
    onChange?.(next);
  };
  return (
    <div>
      <label className="block text-xs font-medium mb-1">Interests</label>
      <div className="flex flex-wrap gap-2">
        {list.map((i) => {
          const active = selected.includes(i);
          return (
            <button key={i} onClick={() => toggle(i)} className={`px-2.5 py-1.5 rounded-full text-xs border ${active ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700'}`}>{i.replace(/_/g,' ')}</button>
          );
        })}
      </div>
      {selected.length > 0 && <div className="text-xs text-gray-500 mt-1">{selected.length} selected</div>}
    </div>
  )
}


