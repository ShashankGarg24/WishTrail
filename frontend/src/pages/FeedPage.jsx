import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Bell, Heart, MessageCircle, MoreHorizontal, Send, Share2, UserPlus } from 'lucide-react'
import toast from 'react-hot-toast'
import useApiStore from '../store/apiStore'
import { socialAPI } from '../services/api'
import GoalPostModal from '../components/GoalPostModal'
import CategoryIcon from '../components/CategoryIcon'

const ActivityCommentsModal = lazy(() => import('../components/ActivityCommentsModal'))
const ReportModal = lazy(() => import('../components/ReportModal'))
const ShareSheet = lazy(() => import('../components/ShareSheet'))

const ago = iso => {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return 'Recently'
  const elapsed = Math.max(0, Date.now() - date.getTime())
  if (elapsed < 60000) return 'Just now'
  if (elapsed < 3600000) return `${Math.floor(elapsed / 60000)}m ago`
  if (elapsed < 86400000) return `${Math.floor(elapsed / 3600000)}h ago`
  if (elapsed < 30 * 86400000) return `${Math.floor(elapsed / 86400000)}d ago`
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(date.getFullYear() !== new Date().getFullYear() ? { year: 'numeric' } : {})
  })
}
const Avatar = ({ src, name, size = 'h-10 w-10', onClick }) => <button type="button" onClick={onClick} className={`${size} shrink-0 overflow-hidden rounded-full bg-blue-100 text-sm font-extrabold text-blue-600`}>{src ? <img src={src} alt={name || ''} className="h-full w-full object-cover" /> : <span className="grid h-full w-full place-items-center">{name?.[0]?.toUpperCase() || 'U'}</span>}</button>

export default function FeedPage() {
  const navigate = useNavigate()
  const { goalId: routeGoalId } = useParams()
  const [searchParams] = useSearchParams()
  const { user, getActivityFeed, likeActivity, getTrendingGoals, report, unfollowUser, followUser } = useApiStore()
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [trending, setTrending] = useState([])
  const [people, setPeople] = useState([])
  const [goalId, setGoalId] = useState(null)
  const [goalOpen, setGoalOpen] = useState(false)
  const [commentsId, setCommentsId] = useState(null)
  const [menuPost, setMenuPost] = useState(null)
  const [shareOpen, setShareOpen] = useState(false)
  const [reportPost, setReportPost] = useState(null)
  const shareUrl = useRef('')

  const transform = item => {
    const data = item.data || {}
    const habit = ['habit_target_achieved', 'habit_streak_milestone', 'habit_added'].includes(item.type)
    const action = habit ? (item.type === 'habit_added' ? 'Started a habit' : 'Completed a habit streak') : data.lastUpdateType === 'created' ? 'Started a new goal' : 'Completed a goal'
    return { id: item._id, user: { id: item.user?._id || item.user?.id || item.userId || item.user_id, name: item.user?.name || item.name || 'WishTrail member', username: item.user?.username || '', avatar: item.user?.avatar || item.avatar }, timestamp: ago(data.completionMarkedAt || item.createdAt), title: habit ? data.habitTitle || 'Habit milestone' : data.goalTitle || 'Goal progress', category: data.goalCategory, note: data.metadata?.completionNote || data.completionNote || data.note || '', image: data.metadata?.completionAttachmentUrl || data.completionAttachmentUrl || '', days: data.streakDays || 0, progress: data.progress ?? data.progressPercentage, isHabit: habit, likes: item.likeCount || 0, comments: item.commentCount || 0, isLiked: Boolean(item.isLiked), originalId: data.goalId || data.habitId }
  }
  const loadFeed = async (number = 1, refresh = false) => {
    try { if (number === 1) setLoading(true); setError(''); const result = await getActivityFeed({ page: number, limit: 10 }, { force: refresh }); const next = Array.isArray(result?.activities) ? result.activities.map(transform) : []; setActivities(old => number === 1 ? next : [...old, ...next]); setHasMore(Boolean(result?.pagination && result.pagination.page < result.pagination.pages)) }
    catch { setError('Could not load the feed. Please try again.') } finally { setLoading(false) }
  }
  useEffect(() => {
    if (!user) return
    let cancelled = false
    Promise.allSettled([loadFeed(1), getTrendingGoals({ strategy: user?.interests?.length ? 'personalized' : 'global', page: 1, limit: 8 }).then(r => { if (!cancelled) setTrending(r?.goals || []) }), socialAPI.getSuggestedUsers({ limit: 5 }).then(r => { if (!cancelled) setPeople(r?.data?.data?.users || r?.data?.data || []) })])
    return () => { cancelled = true }
  }, [user])
  useEffect(() => { const refresh = () => loadFeed(1, true).finally(() => window.dispatchEvent(new Event('wt_refresh_complete'))); window.addEventListener('wt_refresh', refresh); return () => window.removeEventListener('wt_refresh', refresh) }, [user])
  useEffect(() => { const id = routeGoalId || searchParams.get('goalId'); if (id) { setGoalId(id); setGoalOpen(true) } }, [routeGoalId, searchParams])
  const visible = useMemo(() => activities, [activities])
  const profile = person => person?.username && navigate(`/profile/@${person.username}`)
  const openGoal = id => { if (id) { setGoalId(id); setGoalOpen(true) } }
  const like = async id => { const old = activities.find(x => x.id === id); if (!old) return; setActivities(xs => xs.map(x => x.id === id ? { ...x, isLiked: !x.isLiked, likes: x.likes + (x.isLiked ? -1 : 1) } : x)); try { await likeActivity(id, !old.isLiked) } catch { setActivities(xs => xs.map(x => x.id === id ? old : x)) } }
  const share = post => { shareUrl.current = post.originalId ? `${window.location.origin}/feed?goalId=${post.originalId}` : window.location.href; if (window.innerWidth < 768) setShareOpen(true); else navigator.clipboard.writeText(shareUrl.current).then(() => toast.success('Link copied')) }

  if (loading && !activities.length) return <div className="grid min-h-[70vh] place-items-center bg-[#f7f9fc] dark:bg-gray-900"><div className="text-center"><div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-2 border-blue-100 border-t-[#1683ed]" /><p className="text-sm text-slate-500">Loading your feed...</p></div></div>
  return <div className="wt-feed-page min-h-screen bg-[#f7f9fc] text-[#101a3c] dark:bg-gray-900 dark:text-white">
    <div className="mx-auto flex max-w-[1500px]">
      <main className="wt-feed-main min-w-0 flex-1"><div className="wt-feed-grid mx-auto grid max-w-[1200px] grid-cols-1 gap-5 md:px-5 md:py-3 xl:grid-cols-[minmax(0,750px)_350px]">
        <section className="min-w-0">
          {error && <div className="m-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">{error}</div>}
          {!visible.length ? <div className="m-4 rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center dark:border-gray-700 dark:bg-gray-800"><div className="mx-auto mb-4 grid h-20 w-20 place-items-center rounded-full bg-blue-50"><Send className="h-9 w-9 -rotate-12 text-[#1683ed]" /></div><h2 className="text-lg font-extrabold">No posts yet</h2><p className="mx-auto mt-2 max-w-xs text-sm text-slate-500">Follow people to see their inspiring updates here.</p><button onClick={() => navigate('/discover?tab=people')} className="mt-6 w-full max-w-xs rounded-xl bg-[#1683ed] py-3 text-sm font-bold text-white">Discover People</button></div> : <div className="space-y-2 md:mt-2 md:space-y-3">{visible.map((post,index) => <motion.article key={post.id} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:Math.min(index*.035,.2)}} className="border-y border-slate-200 bg-white p-4 md:rounded-xl md:border dark:border-gray-700 dark:bg-gray-800">
            <header className="flex items-start gap-3"><Avatar src={post.user.avatar} name={post.user.name} size="h-11 w-11" onClick={() => profile(post.user)} /><div className="min-w-0 flex-1"><button onClick={() => profile(post.user)} className="block truncate text-sm font-extrabold hover:text-[#1683ed]">{post.user.name}</button><p className="mt-0.5 text-[11px] text-slate-500">{post.timestamp}</p></div><button onClick={() => setMenuPost(post)} className="rounded-lg p-1.5 text-slate-500"><MoreHorizontal className="h-5 w-5" /></button></header>
            <button onClick={() => openGoal(post.originalId)} className="mt-3 block w-full text-left"><div className="py-2"><p className="text-sm font-extrabold text-slate-900 dark:text-white">{post.title}</p><p className="mt-1 line-clamp-1 text-xs text-slate-500">{post.note || (post.isHabit && post.days ? `${post.days}-day streak — keep it going!` : post.action)}</p></div>{post.note && <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600 dark:text-gray-300">{post.note}</p>}{post.image && <div className="mt-3 aspect-[16/8.5] overflow-hidden rounded-xl bg-slate-100"><img src={post.image} alt="Progress update" className="h-full w-full object-cover" /></div>}{typeof post.progress === 'number' && <div className="mt-3 flex items-center gap-3"><div className="h-1.5 flex-1 rounded-full bg-slate-100"><div className="h-full rounded-full bg-[#1683ed]" style={{width:`${Math.min(100,post.progress)}%`}} /></div><span className="text-xs font-bold text-slate-500">{post.progress}%</span></div>}</button>
            <footer className="mt-3 flex items-center gap-7 text-slate-500"><button onClick={() => like(post.id)} className={`flex items-center gap-1.5 text-xs font-semibold ${post.isLiked ? 'text-red-500' : ''}`}><Heart className={`h-5 w-5 ${post.isLiked ? 'fill-current' : ''}`} />{post.likes}</button><button onClick={() => setCommentsId(post.id)} className="flex items-center gap-1.5 text-xs font-semibold"><MessageCircle className="h-5 w-5" />{post.comments}</button><button onClick={() => share(post)}><Share2 className="h-5 w-5" /></button></footer>
          </motion.article>)}{hasMore && <button onClick={() => { const next=page+1; setPage(next); loadFeed(next) }} className="mx-auto block px-5 py-3 text-sm font-bold text-[#1683ed]">Load more</button>}</div>}
        </section>
        <aside className="hidden space-y-3 xl:block">
          <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"><div className="mb-3 flex justify-between"><h2 className="text-sm font-extrabold">Trending This Week</h2><button onClick={() => navigate('/discover')} className="text-xs font-bold text-[#1683ed]">See all</button></div>{trending.length ? <div className="space-y-2.5">{trending.slice(0,5).map((goal,i) => <button key={goal.id||goal._id} onClick={() => openGoal(goal.id||goal._id)} className="flex w-full items-center gap-3 text-left"><span className="w-5 text-xs font-bold text-slate-400">{i+1}</span><CategoryIcon category={goal.category} size="md" /><div className="min-w-0"><p className="truncate text-xs font-extrabold">{goal.title}</p><p className="text-[10px] text-slate-500">{goal.category||'Trending goal'}</p></div></button>)}</div> : <p className="py-5 text-center text-xs text-slate-500">No trending posts available right now.</p>}</div>
          {!!people.length && <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"><div className="mb-3 flex justify-between"><h2 className="text-sm font-extrabold">Suggested People</h2><button onClick={() => navigate('/discover?tab=people')} className="text-xs font-bold text-[#1683ed]">See all</button></div><div className="space-y-3">{people.slice(0,4).map(person => <div key={person._id||person.id} className="flex items-center gap-2.5"><Avatar src={person.avatar} name={person.name} size="h-9 w-9" onClick={() => profile(person)} /><button onClick={() => profile(person)} className="min-w-0 flex-1 text-left"><p className="truncate text-xs font-extrabold">{person.name}</p><p className="truncate text-[10px] text-slate-500">@{person.username}</p></button><button onClick={async () => { const r=await followUser(person._id||person.id); if(r?.success) setPeople(xs => xs.filter(x => (x._id||x.id)!==(person._id||person.id))) }} className="rounded-lg bg-blue-50 px-3 py-2 text-[11px] font-bold text-[#1683ed]">Follow</button></div>)}</div></div>}
        </aside>
      </div></main>
    </div>
    <AnimatePresence>{menuPost && <div className="fixed inset-0 z-[75] flex items-end justify-center bg-black/40 md:items-center" onClick={() => setMenuPost(null)}><motion.div initial={{y:50}} animate={{y:0}} exit={{y:50}} onClick={e => e.stopPropagation()} className="w-full rounded-t-3xl bg-white p-3 pb-8 md:max-w-sm md:rounded-2xl dark:bg-gray-800"><div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-200 md:hidden" /><button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/feed?goalId=${menuPost.originalId||''}`); toast.success('Link copied'); setMenuPost(null) }} className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold"><Share2 className="h-5 w-5" />Copy link</button>{menuPost.user.id && String(menuPost.user.id) !== String(user?.id || user?._id || user?.userId || user?.user_id) && <button onClick={async () => { await unfollowUser(menuPost.user.id); setMenuPost(null) }} className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-red-500"><UserPlus className="h-5 w-5" />Unfollow {menuPost.user.name}</button>}<button onClick={() => { setReportPost(menuPost); setMenuPost(null) }} className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-red-500"><Bell className="h-5 w-5" />Report post</button></motion.div></div>}</AnimatePresence>
    <GoalPostModal isOpen={goalOpen} onClose={() => { setGoalOpen(false); setGoalId(null); if(routeGoalId) navigate('/feed',{replace:true}) }} goalId={goalId} />
    <Suspense fallback={null}><ActivityCommentsModal isOpen={Boolean(commentsId)} onClose={() => setCommentsId(null)} activity={{_id:commentsId}} /><ShareSheet isOpen={shareOpen} onClose={() => setShareOpen(false)} url={shareUrl.current} title="WishTrail progress" /><ReportModal isOpen={Boolean(reportPost)} onClose={() => setReportPost(null)} targetLabel="activity" onSubmit={async ({reason,description}) => { await report({targetType:'activity',targetId:reportPost.id,reason,description}); setReportPost(null) }} /></Suspense>
  </div>
}
