import { useEffect, useRef, useState } from 'react'
import ActivityCommentsModal from './ActivityCommentsModal'
import useApiStore from '../store/apiStore'

export default function GoalPostModal({ isOpen, goalId, onClose }) {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState(null)
  const [detailsExpanded, setDetailsExpanded] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [commentsOpenActivityId, setCommentsOpenActivityId] = useState(null)
  const rightPanelScrollRef = useRef(null)
  const commentsAnchorRef = useRef(null)

  useEffect(() => {
    const compute = () => setIsMobile(typeof window !== 'undefined' && window.innerWidth < 768)
    compute()
    window.addEventListener('resize', compute)
    return () => window.removeEventListener('resize', compute)
  }, [])

  useEffect(() => {
    if (!isOpen || !goalId) return
    let active = true
    ;(async () => {
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
      } catch {}
    }, 0)
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={close} />
      <div className={`relative w-full ${(!data?.share?.image) ? 'max-w-3xl' : 'max-w-6xl'} mx-auto bg-white dark:bg-gray-900 rounded-2xl shadow-2xl ${isMobile ? 'overflow-y-auto' : 'overflow-hidden'} border border-gray-200 dark:border-gray-800 max-h=[85vh]`}>
        {loading || !data ? (
          <div className="p-10 text-center text-gray-500 dark:text-gray-400">Loading...</div>
        ) : (
          data?.share?.image ? (
            <div className="grid grid-cols-1 md:[grid-template-columns:minmax(0,1fr)_420px] items-stretch min-h-0">
              <div className="bg-black flex items-center justify-center min-h-[65vh] h-[65vh] md:min-h-[520px]">
                <img src={data.share.image} alt="Completion" className="h-full w-auto max-w-full object-contain" />
              </div>
              <div className="flex flex-col md:w-[420px] md:flex-shrink-0 min-h-[320px] md:min-h-[520px] md:max-h-[85vh] min-h-0">
                <div className="flex items-center gap-3 p-4 border-b border-gray-200 dark:border-gray-800">
                  <img src={data?.user?.avatar || '/api/placeholder/40/40'} className="w-10 h-10 rounded-full" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{data?.user?.name}</div>
                    {data?.user?.username && (<div className="text-xs text-gray-500">@{data.user.username}</div>)}
                  </div>
                  <button onClick={close} className="px-3 py-1.5 rounded-md text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800">✕</button>
                </div>
                <div ref={rightPanelScrollRef} className={`flex-1 min-h-0 ${isMobile ? '' : 'overflow-auto'} px-6 pb-0`}>
                  <div className="py-6 space-y-4">
                    <div>
                      <div className="h-1.5 w-14 rounded-full mb-2" style={{ background: 'linear-gradient(90deg, rgba(99,102,241,0.8), rgba(147,197,253,0.8))' }} />
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
                      </div>
                    )}
                  </div>
                  {!isMobile && (
                    <div className="pb-6">
                      <div ref={commentsAnchorRef} className="pt-2 border-t border-gray-200 dark:border-gray-800" />
                      {data?.social?.activityId ? (
                        <ActivityCommentsModal embedded activity={{ _id: data.social.activityId, commentCount: data?.social?.commentCount }} />
                      ) : (
                        <div className="text-sm text-gray-500 py-4">Comments unavailable</div>
                      )}
                    </div>
                  )}
                </div>
                <div className="mt-auto border-t border-gray-200 dark:border-gray-800 p-4 flex items-center gap-4 sticky bottom-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur">
                  <div className="text-sm text-gray-700 dark:text-gray-300">❤️ {data?.social?.likeCount || 0}</div>
                  <button onClick={openComments} className="text-sm text-gray-700 dark:text-gray-300 hover:text-blue-600">💬 {data?.social?.commentCount || 0}</button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col min-h-[320px] md:min-h-[520px] md:max-w-[420px] md:mx-auto md:max-h-[85vh] min-h-0">
              <div className="flex items-center gap-3 p-4 border-b border-gray-200 dark:border-gray-800">
                <img src={data?.user?.avatar || '/api/placeholder/40/40'} className="w-10 h-10 rounded-full" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{data?.user?.name}</div>
                  {data?.user?.username && (<div className="text-xs text-gray-500">@{data.user.username}</div>)}
                </div>
                <button onClick={close} className="px-3 py-1.5 rounded-md text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800">✕</button>
              </div>
              <div ref={rightPanelScrollRef} className={`flex-1 min-h-0 ${isMobile ? '' : 'overflow-auto'}` }>
                <div className="p-6 space-y-4">
                  <div>
                    <div className="h-1.5 w-14 rounded-full mb-2" style={{ background: 'linear-gradient(90deg, rgba(99,102,241,0.8), rgba(147,197,253,0.8))' }} />
                    <div className="inline-block px-2 py-1 rounded-full text-xs font-medium text-white bg-blue-500">{data?.goal?.category}</div>
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
                </div>
                {!isMobile && (
                  <div ref={commentsAnchorRef} className="px-6 pb-6">
                    {data?.social?.activityId ? (
                      <ActivityCommentsModal embedded activity={{ _id: data.social.activityId, commentCount: data?.social?.commentCount }} />
                    ) : (
                      <div className="text-sm text-gray-500">Comments unavailable</div>
                    )}
                  </div>
                )}
              </div>
              <div className="mt-auto border-t border-gray-200 dark:border-gray-800 p-4 flex items-center gap-4 sticky bottom-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur">
                <div className="text-sm text-gray-700 dark:text-gray-300">❤️ {data?.social?.likeCount || 0}</div>
                <button onClick={openComments} className="text-sm text-gray-700 dark:text-gray-300 hover:text-blue-600">💬 {data?.social?.commentCount || 0}</button>
              </div>
            </div>
          )
        )}
      </div>
      <ActivityCommentsModal isOpen={!!commentsOpenActivityId} onClose={() => setCommentsOpenActivityId(null)} activity={{ _id: commentsOpenActivityId }} />
    </div>
  )
}


