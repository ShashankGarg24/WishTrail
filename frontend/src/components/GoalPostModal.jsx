import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Heart, MessageCircle, Send } from 'lucide-react'
const ActivityCommentsModal = lazy(() => import('./ActivityCommentsModal'));
import useApiStore from '../store/apiStore'

export default function GoalPostModal({ isOpen, goalId, onClose, autoOpenComments = false }) {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState(null)
  const [detailsExpanded, setDetailsExpanded] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [commentsOpenActivityId, setCommentsOpenActivityId] = useState(null)
  const rightPanelScrollRef = useRef(null)
  const commentsAnchorRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    const compute = () => setIsMobile(typeof window !== 'undefined' && window.innerWidth < 768)
    compute()
    window.addEventListener('resize', compute)
    return () => window.removeEventListener('resize', compute)
  }, [])

  useEffect(() => {
    if (!isOpen || !goalId) return
    let active = true
      ; (async () => {
        setLoading(true)
        setData(null)
        try {
          const resp = await useApiStore.getState().getGoalPost(goalId)
          if (!active) return
          if (resp?.success) setData(resp.data)
        } finally {
          if (active) setLoading(false)
        }
      })()
    return () => { active = false }
  }, [isOpen, goalId])

  if (!isOpen) return null

  const close = () => { onClose?.() }
  const openComments = () => {
    const aid = data?.social?.activityId
    if (!aid) return
    if (isMobile) { setCommentsOpenActivityId(aid); return }
    setTimeout(() => {
      try {
        const scroller = rightPanelScrollRef.current
        const anchor = commentsAnchorRef.current
        if (scroller && anchor) scroller.scrollTo({ top: anchor.offsetTop - 8, behavior: 'smooth' })
      } catch { }
    }, 0)
  }

  useEffect(() => {
    if (!isOpen) return
    if (autoOpenComments && data) {
      openComments()
    }
  }, [isOpen, autoOpenComments, data])

  const handleUserClick = (userId) => {
    navigate(`/profile/@${userId}?tab=overview`);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={close} />
      {loading || !data ? (
        <div className="relative z-10 flex items-center justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-gray-300 dark:border-gray-700 border-t-blue-600" />
        </div>
      ) : null}
      <div className={`relative w-full ${(!data?.share?.image) ? 'max-w-3xl' : 'max-w-6xl'} 
        mx-auto bg-white dark:bg-gray-900 rounded-2xl shadow-2xl 
        ${isMobile ? 'overflow-y-auto' : 'overflow-hidden'} 
        border border-gray-200 dark:border-gray-800
        ${(!data?.share?.image) ? 'h-[55vh] ' : 'h-[85vh] '}
        ${(loading || !data) ? 'hidden' : ''}`}>
        {!loading && data && (
          data?.share?.image ? (
            <div className="grid grid-cols-1 md:[grid-template-columns:minmax(0,1fr)_420px] items-stretch h-full min-h-0">
              {/* Left: Media */}
              <div className="bg-black flex items-center justify-center h-full">
                <img
                  src={data.share.image} alt="Completion" className="h-full w-auto max-w-full object-contain" />
              </div>
              {/* Right: Details with toggleable comments */}
              <div className="flex flex-col md:w-[420px] md:flex-shrink-0 h-full min-h-0">
                <div className="flex items-center gap-3 p-4 border-b border-gray-200 dark:border-gray-800">
                  <img
                    src={data?.user?.avatar || '/api/placeholder/40/40'}
                    alt={data?.user?.name || 'User'}
                    className="w-10 h-10 rounded-full cursor-pointer"
                    onClick={() => handleUserClick(data?.user?.username)} />
                  <div className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => handleUserClick(data?.user?.username)}>
                    <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{data?.user?.name}</div>
                    {data?.user?.username && (<div className="text-xs text-gray-500">@{data.user.username}</div>)}
                  </div>
                  <button onClick={close} className="px-3 py-1.5 rounded-md text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800">✕</button>
                </div>
                <div ref={rightPanelScrollRef} className={`flex-1 min-h-0 overflow-auto px-6 pb-0`}>
                  <div className="py-6 space-y-4">
                    <div>
                      <div className="inline-block px-2 py-1 rounded-full text-xs font-medium text-white bg-blue-500">{data?.goal?.category}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Title</div>
                      <div className="text-gray-900 dark:text-gray-100 font-semibold text-lg leading-snug">{data?.goal?.title}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Description</div>
                      <div className={`text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed ${detailsExpanded ? '' : 'line-clamp-5'}`}>{data?.goal?.description || '—'}</div>
                      {String(data?.goal?.description || '').length > 200 && (
                        <button className="mt-1 text-xs text-blue-600" onClick={() => setDetailsExpanded((v) => !v)}>{detailsExpanded ? 'Show less' : 'More'}</button>
                      )}
                    </div>
                    {data?.share?.note && (
                      <div className="bg-gray-50 dark:bg-gray-800/40 rounded-xl p-3 border border-gray-200 dark:border-gray-700">
                        <div className="text-xs text-gray-500 mb-1">Completion note</div>
                        <div className={`text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap ${detailsExpanded ? '' : 'line-clamp-6'}`}>{data.share.note}</div>
                        {String(data.share.note || '').length > 240 && (
                          <button className="mt-1 text-xs text-blue-600" onClick={() => setDetailsExpanded((v) => !v)}>{detailsExpanded ? 'Show less' : 'More'}</button>
                        )}
                      </div>
                    )}
                  </div>
                  {!isMobile && (
                    <div className="pb-6">
                      <div ref={commentsAnchorRef} className="pt-2 border-t border-gray-200 dark:border-gray-800" />
                      {data?.social?.activityId ? (
                        <Suspense fallback={null}><ActivityCommentsModal embedded activity={{ _id: data.social.activityId, commentCount: data?.social?.commentCount }} /></Suspense>
                      ) : (
                        <div className="text-sm text-gray-500 py-4">Comments unavailable</div>
                      )}
                    </div>
                  )}
                </div>
                <div className="mt-auto border-t border-gray-200 dark:border-gray-800 p-4 flex items-center gap-3 sticky bottom-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur">
                  <div className="inline-flex items-center gap-1.5 text-sm text-gray-700 dark:text-gray-300"><Heart className="h-4 w-4" />{data?.social?.likeCount || 0}</div>
                  <button onClick={openComments} className="inline-flex items-center gap-1.5 text-sm text-gray-700 dark:text-gray-300 hover:text-blue-600"><MessageCircle className="h-4 w-4" />{data?.social?.commentCount || 0}</button>
                  <button onClick={() => {
                    try {
                      const id = data?.social?.activityId || data?.goal?._id;
                      const url = id ? `${window.location.origin}/feed?goalId=${data?.goal?._id}` : window.location.href;
                      navigator.clipboard.writeText(url);
                      window.dispatchEvent(new CustomEvent('wt_toast', { detail: { message: 'Link copied to clipboard', type: 'success', duration: 2000 } }));
                    } catch { }
                  }} className="inline-flex items-center gap-1.5 text-sm text-gray-700 dark:text-gray-300 hover:text-blue-600">
                    <Send className="h-4 w-4 -rotate-80" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col h-full w-full min-h-0">
              <div className="flex items-center gap-3 p-4 border-b border-gray-200 dark:border-gray-800">
                <img
                  src={data?.user?.avatar || '/api/placeholder/40/40'}
                  alt={data?.user?.name || 'User'}
                  className="w-10 h-10 rounded-full cursor-pointer"
                  onClick={() => handleUserClick(data?.user?.username)} />
                <div className="flex-1 min-w-0 cursor-pointer"
                  onClick={() => handleUserClick(data?.user?.username)}>
                  <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{data?.user?.name}</div>
                  {data?.user?.username && (<div className="text-xs text-gray-500">@{data.user.username}</div>)}
                </div>
                <button onClick={close} className="px-3 py-1.5 rounded-md text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800">✕</button>
              </div>
              <div ref={rightPanelScrollRef} className={`flex-1 min-h-0 overflow-auto`}>
                <div className="p-6 space-y-4">
                  <div>
                    <div className="inline-block px-2 py-1 rounded-full text-xs font-medium text-white bg-blue-500">{data?.goal?.category}</div>
                    {data?.share?.note && (
                      <div className="mt-3 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap line-clamp-3">
                        {data.share.note}
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Title</div>
                    <div className="text-gray-900 dark:text-gray-100 font-semibold text-lg leading-snug">{data?.goal?.title}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Description</div>
                    <div className={`text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed ${detailsExpanded ? '' : 'line-clamp-6'}`}>{data?.goal?.description || '—'}</div>
                    {String(data?.goal?.description || '').length > 200 && (
                      <button className="mt-1 text-xs text-blue-600" onClick={() => setDetailsExpanded((v) => !v)}>{detailsExpanded ? 'Show less' : 'More'}</button>
                    )}
                  </div>
                  {data?.goal?.completedAt && data?.goal?.points && (<div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-xs text-gray-500">Completed</div>
                      <div className="text-gray-800 dark:text-gray-200">{data?.goal?.completedAt ? new Date(data.goal.completedAt).toLocaleString(undefined, { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'}</div>
                    </div>
                    <div>
                      <div className="text-xs text_gray-500">Points</div>
                      <div className="text_gray-800 dark:text-gray-200">{data?.goal?.pointsEarned ?? 0}</div>
                    </div>
                  </div>)}
                </div>
                {!isMobile && (
                  <div ref={commentsAnchorRef} className="px-6 pb-6">
                    {data?.social?.activityId ? (
                      <Suspense fallback={null}><ActivityCommentsModal embedded activity={{ _id: data.social.activityId, commentCount: data?.social?.commentCount }} /></Suspense>
                    ) : (
                      <div className="text-sm text-gray-500">Comments unavailable</div>
                    )}
                  </div>
                )}
              </div>
              <div className="mt-auto border-t border-gray-200 dark:border-gray-800 p-4 flex items-center gap-3 sticky bottom-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur">
                <div className="inline-flex items-center gap-1.5 text-sm text_gray-700 dark:text-gray-300"><Heart className="h-4 w-4" />{data?.social?.likeCount || 0}</div>
                <button onClick={openComments} className="inline-flex items-center gap-1.5 text-sm text-gray-700 dark:text-gray-300 hover:text-blue-600"><MessageCircle className="h-4 w-4" />{data?.social?.commentCount || 0}</button>
                <button onClick={() => {
                  try {
                    const id = data?.social?.activityId || data?.goal?._id;
                    const url = id ? `${window.location.origin}/feed?goalId=${data?.goal?._id}` : window.location.href;
                    navigator.clipboard.writeText(url);
                    window.dispatchEvent(new CustomEvent('wt_toast', { detail: { message: 'Link copied to clipboard', type: 'success', duration: 2000 } }));
                  } catch { }
                }} className="inline-flex items-center gap-1.5 text-sm text-gray-700 dark:text-gray-300 hover:text-blue-600">
                  <Send className="h-4 w-4 -rotate-80" />
                </button>
              </div>
            </div>
          )
        )}
      </div>
      {/* Mobile comments bottom sheet */}
      <Suspense fallback={null}><ActivityCommentsModal
        isOpen={!!commentsOpenActivityId}
        onClose={() => setCommentsOpenActivityId(null)}
        activity={{ _id: commentsOpenActivityId }}
      />
      </Suspense>
    </div>
  )
}


