import PullToRefresh from '../components/PullToRefresh'
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Bell, Heart, MessageCircle, MoreHorizontal, Send, Share2, UserPlus, Trash2, ArrowRight, Target, TrendingUp, Trophy, Flame, CalendarDays, CheckSquare } from 'lucide-react'
import toast from 'react-hot-toast'
import useApiStore from '../store/apiStore'
import GoalSharePreview from '../components/GoalSharePreview'
import { socialAPI, activitiesAPI, usersAPI } from '../services/api'
import GoalPostModal from '../components/GoalPostModal'
import CategoryIcon from '../components/CategoryIcon'

const ActivityCommentsModal = lazy(() => import('../components/ActivityCommentsModal'))
const ConfirmActionModal = lazy(() => import('../components/ConfirmActionModal'))
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

const postStyle = post => {
  if (post.type === 'achievement_earned') return ['completed', Trophy, 'Achievement earned']
  if (post.snapshot?.shareType === 'COMPLETION' || post.type === 'goal_completed' || post.action === 'Completed a goal') return ['completed', Trophy, 'Completed a goal']
  if (post.snapshot?.shareType === 'GOAL' || post.type === 'habit_added' || post.type === 'goal_created' || post.action === 'Started a new goal') return ['started', Target, post.isHabit ? 'Started a new habit' : 'Started a new goal']
  if (post.snapshot?.shareType === 'MILESTONE' || post.isHabit) return ['milestone', Flame, post.isHabit ? 'Habit milestone' : 'Reached a milestone']
  return ['progress', TrendingUp, 'Progress update']
}

function FeedPostContent({ post, onOpen }) {
  const [tone, Icon, label] = postStyle(post)
  const snapshot = post.snapshot
  const rawProgress = snapshot ? snapshot.progress : post.progress
  const progress = typeof rawProgress === 'number' && Number.isFinite(rawProgress) ? Math.max(0, Math.min(100, rawProgress)) : null
  const photo = snapshot ? snapshot.photo : post.image
  const category = snapshot ? snapshot.category : post.category
  const stats = snapshot ? [
    snapshot.journeyDuration !== undefined && [CalendarDays, `${snapshot.journeyDuration} days`, 'Journey'],
    snapshot.progressUpdateCount !== undefined && [TrendingUp, snapshot.progressUpdateCount, 'Updates'],
    snapshot.activeDays !== undefined && [CheckSquare, snapshot.activeDays, 'Active days'],
  ].filter(Boolean) : post.days > 0 ? [[Flame, `${post.days} days`, 'Streak']] : []
  return <div className={`wt-feed-post-body ${photo || snapshot ? 'has-media' : ''}`}>
    <div className="wt-feed-post-copy">
      <span className={`wt-feed-badge ${tone}`}><Icon aria-hidden="true" />{label}</span>
      <h2><button className="wt-feed-title-link" onClick={onOpen}>{post.title}</button></h2>
      {post.description && <p className="wt-feed-description">{post.description}</p>}
      {post.note && <p className="wt-feed-note">{post.note}</p>}
      {category && <span className="wt-feed-category">{category}</span>}
      {progress !== null && <div className="wt-feed-progress"><div role="progressbar" aria-label="Goal progress" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${progress}%` }} /></div><span>{progress}%</span></div>}
      {!!stats.length && <div className="wt-feed-stats">{stats.map(([StatIcon, value, caption]) => <div key={caption}><span className="wt-feed-stat-icon"><StatIcon aria-hidden="true" /></span><span><strong>{value}</strong><small>{caption}</small></span></div>)}</div>}
    </div>
    {photo ? <div className="wt-feed-photo"><img src={photo} alt={post.title} loading="lazy" /></div> : snapshot ? <div className="wt-feed-share-preview"><GoalSharePreview snapshot={snapshot} maxWidth={220} /></div> : null}
  </div>
}

function WeekCard({ analytics, onDetails }) {
  const habits = analytics?.habits
  return <div className="wt-feed-rail-card"><div className="wt-feed-rail-heading"><h2>Your Week</h2><button onClick={onDetails}>View Details <ArrowRight /></button></div>
    <div className="wt-feed-week">
      <svg className="wt-feed-landscape" viewBox="0 0 260 210" preserveAspectRatio="none" aria-hidden="true"><path fill="#e2f1ff" d="M0 95Q35 60 70 90T140 75T210 60T260 80V210H0Z"/><path fill="#c9e5fb" d="M30 210L116 120L144 149L186 98L260 173V210Z"/><path fill="#9fcee9" d="M95 210L179 138L212 159L260 111V210Z"/><path fill="#5ba9c0" d="M0 191L31 200L65 193L110 207L170 185L260 174V210H0Z"/><path fill="#31899f" d="M218 210V117H209L221 91H214L226 65L238 91H231L245 117H235V210ZM244 210V157H237L247 132L257 157H251V210Z"/></svg>
      {habits ? <><div className="wt-feed-week-row"><span className="green"><CalendarDays /></span><div><strong>{habits.activeDays}/{habits.periodDays || 7}</strong><small>Active days</small></div></div><div className="wt-feed-week-row"><span className="blue"><CheckSquare /></span><div><strong>{habits.done}/{habits.expected}</strong><small>Habit completions</small></div></div><div className="wt-feed-week-row"><span className="orange"><Flame /></span><div><strong>{analytics.goals?.currentStreak ?? 0} days</strong><small>Current streak</small></div></div></> : <p className="relative p-4 text-sm text-slate-500">Weekly activity is unavailable.</p>}
      <p className="wt-feed-week-period">Last 7 days</p>
    </div>
  </div>
}

export default function FeedPage() {
  const navigate = useNavigate()
  const { goalId: routeGoalId } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const { user, getActivityFeed, likeActivity, getTrendingGoals, report, unfollowUser, followUser } = useApiStore()
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [trending, setTrending] = useState([])
  const [week, setWeek] = useState(null)
  const [people, setPeople] = useState([])
  const [goalId, setGoalId] = useState(null)
  const [goalOpen, setGoalOpen] = useState(false)
  const [commentsId, setCommentsId] = useState(null)
  const [menuPost, setMenuPost] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [shareOpen, setShareOpen] = useState(false)
  const [reportPost, setReportPost] = useState(null)
  const shareUrl = useRef('')
  const userId = user?.id || user?._id
  const username = user?.username
  const interestsKey = JSON.stringify(user?.interests || [])

  const transform = item => {
    const data = item.data || {}
    const snapshot = item.type === 'goal_shared' ? data.share : null
    const habit = ['habit_target_achieved', 'habit_streak_milestone', 'habit_added'].includes(item.type)
    const action = habit ? (item.type === 'habit_added' ? 'Started a habit' : 'Completed a habit streak') : data.lastUpdateType === 'created' || item.type === 'goal_created' ? 'Started a new goal' : item.type === 'goal_completed' || data.lastUpdateType === 'completed' ? 'Completed a goal' : 'Progress update'
    const authorId = item.user?._id || item.user?.id || item.userId || item.user_id
    const currentUserId = user?.id || user?._id || user?.userId || user?.user_id
    const authorUsername = item.user?.username || item.username || ''
    const isOwner = item.canDelete === true || (authorId != null && currentUserId != null && String(authorId) === String(currentUserId)) || (authorUsername && user?.username && authorUsername.toLowerCase() === user.username.toLowerCase())
    return { id: item._id, type: item.type, snapshot, action, isPublic: item.isPublic, isOwner, user: { id: authorId, name: item.user?.name || item.name || 'WishTrail member', username: authorUsername, avatar: item.user?.avatar || item.avatar }, timestamp: ago(data.completionMarkedAt || item.createdAt), title: snapshot ? snapshot.title : habit ? data.habitTitle || 'Habit milestone' : data.achievement?.name || data.achievementName || data.goalTitle || 'Goal progress', category: data.goalCategory, description: snapshot ? snapshot.description || '' : data.goalDescription || data.description || '', note: snapshot ? snapshot.note || '' : data.metadata?.completionNote || data.completionNote || data.note || '', image: snapshot ? '' : data.metadata?.completionAttachmentUrl || data.completionAttachmentUrl || '', days: data.streakDays || 0, progress: snapshot ? undefined : data.progress ?? data.progressPercentage, isHabit: habit, likes: item.likeCount || 0, comments: item.commentCount || 0, isLiked: Boolean(item.isLiked), originalId: snapshot && !isOwner ? null : data.goalId || data.habitId }
  }
  const loadFeed = async (number = 1, refresh = false) => {
    try { if (number === 1) setLoading(true); setError(''); const result = await getActivityFeed({ page: number, limit: 10 }, { force: refresh }); if (number === 1) setPage(1); const next = Array.isArray(result?.activities) ? result.activities.map(transform) : []; setActivities(old => number === 1 ? next : [...old, ...next]); setHasMore(Boolean(result?.pagination && result.pagination.page < result.pagination.pages)) }
    catch { setError('Could not load the feed. Please try again.') } finally { setLoading(false) }
  }
  useEffect(() => {
    if (!user) return
    let cancelled = false
    Promise.allSettled([loadFeed(1), usersAPI.getUserAnalytics().then(r => { if (!cancelled) setWeek(r?.data?.data?.analytics || null) }), getTrendingGoals({ strategy: user?.interests?.length ? 'personalized' : 'global', page: 1, limit: 8 }).then(r => { if (!cancelled) setTrending(r?.goals || []) }), socialAPI.getSuggestedUsers({ limit: 5 }).then(r => { if (!cancelled) setPeople(r?.data?.data?.users || r?.data?.data || []) })])
    return () => { cancelled = true }
  }, [userId, username, interestsKey])
  useEffect(() => { const refresh = () => loadFeed(1, true).finally(() => window.dispatchEvent(new Event('wt_refresh_complete'))); window.addEventListener('wt_refresh', refresh); return () => window.removeEventListener('wt_refresh', refresh) }, [user])
  useEffect(() => { const id = routeGoalId || searchParams.get('goalId'); if (id) { setGoalId(id); setGoalOpen(true) } }, [routeGoalId, searchParams])
  useEffect(() => {
    const activityId = searchParams.get('activityId')
    if (!activityId || loading) return
    let active = true
    activitiesAPI.getActivity(activityId).then(response => {
      if (!active) return
      const post = transform(response.data.data.activity)
      setActivities(items => [post, ...items.filter(item => item.id !== post.id)])
    }).catch(() => { if (active) setError('This post is unavailable or private.') })
    return () => { active = false }
  }, [searchParams, loading])
  const visible = useMemo(() => activities, [activities])
  const profile = person => person?.username && navigate(`/profile/@${person.username}`)
  const openGoal = id => { if (id) { setGoalId(id); setGoalOpen(true) } }
  const openPost = post => { if (post.originalId && !post.isHabit) openGoal(post.originalId); else setCommentsId(post.id) }
  const like = async id => { const old = activities.find(x => x.id === id); if (!old) return; setActivities(xs => xs.map(x => x.id === id ? { ...x, isLiked: !x.isLiked, likes: x.likes + (x.isLiked ? -1 : 1) } : x)); try { await likeActivity(id, !old.isLiked) } catch { setActivities(xs => xs.map(x => x.id === id ? old : x)) } }
  const deletePost = async post => {
    if (deleting || !post) return
    setDeleting(true)
    try {
      await useApiStore.getState().deleteSharedPost(post.id)
      setActivities(items => items.filter(item => item.id !== post.id))
      if (commentsId === post.id) setCommentsId(null)
      if (searchParams.get('activityId') === post.id) {
        const params = new URLSearchParams(searchParams)
        params.delete('activityId')
        setSearchParams(params, { replace: true })
      }
      setMenuPost(null)
      setDeleteTarget(null)
      toast.success('Shared post deleted')
    } catch (err) { toast.error(err.response?.data?.message || 'Unable to delete the post. Please retry.') }
    finally { setDeleting(false) }
  }
  const share = post => { shareUrl.current = post.snapshot ? `${window.location.origin}/feed?activityId=${post.id}` : post.originalId ? `${window.location.origin}/feed?goalId=${post.originalId}` : window.location.href; if (window.innerWidth < 768) setShareOpen(true); else navigator.clipboard.writeText(shareUrl.current).then(() => toast.success('Link copied')) }

  if (loading && !activities.length) return <div className="grid min-h-[70vh] place-items-center bg-[#f7f9fc] dark:bg-canvas"><div className="text-center"><div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-2 border-blue-100 border-t-[#1683ed]" /><p className="text-sm text-slate-500">Loading your feed...</p></div></div>
  return <div className="wt-feed-page min-h-screen bg-[#f7f9fc] text-[#101a3c] dark:bg-canvas dark:text-white">
    <div className="mx-auto flex max-w-[1500px]">
      <main className="wt-feed-main min-w-0 flex-1"><div className="wt-feed-grid">
        <section className="min-w-0"><PullToRefresh onRefresh={() => loadFeed(1, true)} disabled={loading}>
          {error && <div className="m-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">{error}</div>}
          {!visible.length ? <div className="m-4 rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center dark:border-line dark:bg-surface"><div className="mx-auto mb-4 grid h-20 w-20 place-items-center rounded-full bg-blue-50"><Send className="h-9 w-9 -rotate-12 text-[#1683ed]" /></div><h2 className="text-lg font-extrabold">No posts yet</h2><p className="mx-auto mt-2 max-w-xs text-sm text-slate-500">Follow people to see their inspiring updates here.</p><button onClick={() => navigate('/discover?tab=people')} className="mt-6 w-full max-w-xs rounded-xl bg-[#1683ed] py-3 text-sm font-bold text-white">Discover People</button></div> : <div className="wt-feed-posts">{visible.map((post,index) => <motion.article key={post.id} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:Math.min(index*.035,.2)}} className="wt-feed-post" onClick={event => { if (!event.target.closest('button, a') && !window.getSelection()?.toString()) openPost(post) }}>
            <header className="flex items-start gap-3"><Avatar src={post.user.avatar} name={post.user.name} size="h-11 w-11" onClick={() => profile(post.user)} /><div className="min-w-0 flex-1"><button onClick={() => profile(post.user)} className="block truncate text-sm font-extrabold hover:text-[#1683ed]">{post.user.name}</button><p className="mt-0.5 text-[11px] text-slate-500">{post.timestamp} &middot; {post.isPublic === false ? 'Only you' : 'Public'}</p></div><button aria-label={`Options for ${post.user.name}'s post`} onClick={() => setMenuPost(post)} className="rounded-lg p-1.5 text-slate-500"><MoreHorizontal className="h-5 w-5" /></button></header>
            <FeedPostContent post={post} onOpen={() => openPost(post)} />
            <footer className="wt-feed-post-actions">
              <button onClick={() => like(post.id)} aria-label={`${post.isLiked ? 'Unlike' : 'Like'} post`} aria-pressed={post.isLiked} className={post.isLiked ? 'is-liked' : ''}><Heart className={post.isLiked ? 'fill-current' : ''} /><span>{post.likes}</span></button>
              <button onClick={() => setCommentsId(post.id)} aria-label={`Comments (${post.comments})`}><MessageCircle /><span>{post.comments}</span></button>
              <button onClick={() => share(post)} aria-label="Share post"><Share2 /><span className="wt-feed-share-label">Share</span></button>
            </footer>
          </motion.article>)}{hasMore && <button onClick={() => { const next=page+1; setPage(next); loadFeed(next) }} className="mx-auto block px-5 py-3 text-sm font-bold text-[#1683ed]">Load more</button>}</div>}
        </PullToRefresh></section>
        <aside className="wt-feed-rail" aria-label="Your activity and recommendations">
          <WeekCard analytics={week} onDetails={() => navigate(`/profile/@${username}?tab=overview`)} />
          <div className="wt-feed-rail-card"><div className="wt-feed-rail-heading"><h2 className="text-sm font-extrabold">Trending Goals</h2><button onClick={() => navigate('/discover')} className="text-xs font-bold text-[#1683ed]">See all</button></div>{trending.length ? <div className="space-y-2.5">{trending.slice(0,5).map((goal,i) => <button key={goal.id||goal._id} onClick={() => openGoal(goal.id||goal._id)} className="flex w-full items-center gap-3 text-left"><span className="wt-feed-rank">{i+1}</span><CategoryIcon category={goal.category} size="md" /><div className="min-w-0"><p className="truncate text-xs font-extrabold">{goal.title}</p><p className="text-[10px] text-slate-500">{goal.category||'Trending goal'}</p></div></button>)}</div> : <p className="py-5 text-center text-xs text-slate-500">No trending posts available right now.</p>}</div>
          {!!people.length && <div className="wt-feed-rail-card"><div className="wt-feed-rail-heading"><h2 className="text-sm font-extrabold">Suggested for You</h2><button onClick={() => navigate('/discover?tab=people')} className="text-xs font-bold text-[#1683ed]">See all</button></div><div className="space-y-3">{people.slice(0,4).map(person => <div key={person._id||person.id} className="flex items-center gap-2.5"><Avatar src={person.avatar} name={person.name} size="h-9 w-9" onClick={() => profile(person)} /><button onClick={() => profile(person)} className="min-w-0 flex-1 text-left"><p className="truncate text-xs font-extrabold">{person.name}</p><p className="truncate text-[10px] text-slate-500">@{person.username}</p></button><button onClick={async () => { const r=await followUser(person._id||person.id); if(r?.success) setPeople(xs => xs.filter(x => (x._id||x.id)!==(person._id||person.id))) }} className="rounded-lg bg-blue-50 px-3 py-2 text-[11px] font-bold text-[#1683ed]">Follow</button></div>)}</div></div>}
        </aside>
      </div></main>
    </div>
    <AnimatePresence>{menuPost && <div className="fixed inset-0 z-[75] flex items-end justify-center bg-black/40 md:items-center" onClick={() => setMenuPost(null)}><motion.div initial={{y:50}} animate={{y:0}} exit={{y:50}} onClick={e => e.stopPropagation()} className="w-full rounded-t-3xl bg-white p-3 pb-8 md:max-w-sm md:rounded-2xl dark:bg-surface"><div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-200 md:hidden" /><button onClick={() => { navigator.clipboard.writeText(menuPost.snapshot ? `${window.location.origin}/feed?activityId=${menuPost.id}` : `${window.location.origin}/feed?goalId=${menuPost.originalId||''}`); toast.success('Link copied'); setMenuPost(null) }} className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold"><Share2 className="h-5 w-5" />Copy link</button>{menuPost.user.id && !menuPost.isOwner && <button onClick={async () => { await unfollowUser(menuPost.user.id); setMenuPost(null) }} className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-red-500"><UserPlus className="h-5 w-5" />Unfollow {menuPost.user.name}</button>}{menuPost.isOwner && <button disabled={deleting} onClick={() => { setDeleteTarget(menuPost); setMenuPost(null) }} className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-red-500 disabled:opacity-50"><Trash2 className="h-5 w-5" />{deleting ? 'Deleting...' : 'Delete post'}</button>}{!menuPost.isOwner && <button onClick={() => { setReportPost(menuPost); setMenuPost(null) }} className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-red-500"><Bell className="h-5 w-5" />Report post</button>}</motion.div></div>}</AnimatePresence>
    <GoalPostModal isOpen={goalOpen} onClose={() => { setGoalOpen(false); setGoalId(null); if(routeGoalId) navigate('/feed',{replace:true}) }} goalId={goalId} />
    <Suspense fallback={null}><ConfirmActionModal isOpen={Boolean(deleteTarget)} onClose={() => { if (!deleting) setDeleteTarget(null) }} onConfirm={() => deletePost(deleteTarget)} title="Delete this post?" message="This removes the post from everyone's feed, including its reactions and comments. Your goal or earned achievement stays unchanged." confirmText="Delete post" isLoading={deleting}/><ActivityCommentsModal isOpen={Boolean(commentsId)} onClose={() => setCommentsId(null)} activity={{_id:commentsId}} /><ShareSheet isOpen={shareOpen} onClose={() => setShareOpen(false)} url={shareUrl.current} title="WishTrail progress" /><ReportModal isOpen={Boolean(reportPost)} onClose={() => setReportPost(null)} targetLabel="activity" onSubmit={async ({reason,description}) => { await report({targetType:'activity',targetId:reportPost.id,reason,description}); setReportPost(null) }} /></Suspense>
  </div>
}
