import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Send } from 'lucide-react'
import { activitiesAPI } from '../services/api'
import { lockBodyScroll, unlockBodyScroll } from '../utils/scrollLock'

const ActivityCommentsModal = ({ isOpen, onClose, activity, inline = false, embedded = false }) => {
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(false)
  const [input, setInput] = useState('')
  const [replyTo, setReplyTo] = useState(null) // {commentId, userName, userId}
  const [expandedReplies, setExpandedReplies] = useState({}) // {commentId: boolean}

  useEffect(() => {
    const shouldLoad = (inline || embedded) ? !!activity?._id : (isOpen && !!activity?._id)
    if (!shouldLoad) return
    const fetchComments = async () => {
      setLoading(true)
      try {
        const res = await activitiesAPI.getComments(activity._id, { page: 1, limit: 30 })
        const list = res.data?.data?.comments || []
        setComments(list)
      } catch (e) {
        // noop
      } finally {
        setLoading(false)
      }
    }
    fetchComments()
  }, [isOpen, inline, activity?._id])

  const formatTimeAgo = (iso) => {
    const now = new Date()
    const date = new Date(iso)
    const diff = Math.max(0, Math.floor((now - date) / 1000))
    if (diff < 60) return `${diff}s ago`
    const mins = Math.floor(diff / 60)
    if (mins < 60) return `${mins}m ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    if (days < 7) return `${days}d ago`
    const weeks = Math.floor(days / 7)
    if (weeks < 4) return `${weeks}w ago`
    const months = Math.floor(days / 30)
    if (months < 12) return `${months}mo ago`
    const years = Math.floor(days / 365)
    return `${years}y ago`
  }

  const startReply = (comment) => {
    setReplyTo({ commentId: comment._id, userId: comment.userId?._id || comment.userId, userName: comment.userId?.name || 'user' })
    setInput(`@${(comment.userId?.name || 'user').replace(/\s+/g, '')} `)
  }

  const toggleReplies = (commentId) => {
    setExpandedReplies(prev => ({ ...prev, [commentId]: !prev[commentId] }))
  }

  const handlePost = async () => {
    const text = input.trim()
    if (!text) return
    try {
      if (replyTo) {
        const res = await activitiesAPI.replyComment(activity._id, replyTo.commentId, { text, mentionUserId: replyTo.userId })
        const newReply = res.data?.data?.reply
        setComments(prev => prev.map(c => c._id === replyTo.commentId ? { ...c, replies: [...(c.replies || []), newReply] } : c))
      } else {
        const res = await activitiesAPI.addComment(activity._id, { text })
        const newComment = res.data?.data?.comment
        setComments(prev => [newComment, ...prev])
      }
      setInput('')
      setReplyTo(null)
    } catch (e) {}
  }

  const toggleCommentLike = async (commentId) => {
    try {
      const res = await activitiesAPI.toggleCommentLike(activity._id, commentId)
      const { likeCount, isLiked } = res.data?.data || {}
      setComments(prev => prev.map(c => c._id === commentId ? { ...c, likeCount, isLiked } : { ...c, replies: (c.replies||[]).map(r => r._id === commentId ? { ...r, likeCount, isLiked } : r) }))
    } catch {}
  }

  useEffect(() => {
    if (!inline && !embedded && isOpen) {
      lockBodyScroll();
      return () => unlockBodyScroll();
    }
    return undefined;
  }, [inline, embedded, isOpen])
  if (!inline && !embedded && !isOpen) return null

  // Embedded mode: render comments in-place without own header or scroll container
  if (embedded) {
    return (
      <div className="w-full">
        <div className="space-y-4">
          {loading ? (
            <div className="text-sm text-gray-500">Loading comments...</div>
          ) : comments.length === 0 ? (
            <div className="text-sm text-gray-500">No comments yet. Be the first to comment.</div>
          ) : (
            comments.map((c) => {
              const replyCount = (c.replies || []).length;
              return (
                <div key={c._id} className="pb-1">
                  <div className="flex items-start gap-3">
                    <img src={c.userId?.avatar} alt={c.userId?.name} className="w-8 h-8 rounded-full object-cover" />
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div className="text-xs text-gray-500">
                          <span className="font-semibold text-gray-900 dark:text-white mr-2">{c.userId?.name}</span>
                          <span className="text-gray-500">{formatTimeAgo(c.createdAt)}</span>
                        </div>
                        <button onClick={() => toggleCommentLike(c._id)} className={`text-xs hover:text-red-600 ${c.isLiked ? 'text-red-600' : 'text-gray-500'} flex items-center gap-1`}>♥ {c.likeCount || 0}</button>
                      </div>
                      <div className="mt-1 text-sm text-gray-700 dark:text-gray-300">{c.text}</div>
                      <div className="mt-1 flex items-center gap-3">
                        <button onClick={() => startReply(c)} className="text-xs text-blue-600">Reply</button>
                        {replyCount > 0 && (
                          <button onClick={() => toggleReplies(c._id)} className="text-xs text-gray-600 dark:text-gray-400">
                            {expandedReplies[c._id] ? 'Hide replies' : `View replies (${replyCount})`}
                          </button>
                        )}
                      </div>
                      {replyTo?.commentId === c._id && (
                        <div className="mt-2 flex items-center gap-2">
                          <input
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder={`Replying to ${replyTo.userName}`}
                            className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                          />
                          <button onClick={handlePost} className="px-3 py-2 rounded-lg bg-blue-600 text-white disabled:opacity-50" disabled={!input.trim()}>
                            <Send className="h-4 w-4" />
                          </button>
                          <button onClick={() => { setReplyTo(null); setInput(''); }} className="text-xs text-gray-500">Cancel</button>
                        </div>
                      )}
                    </div>
                  </div>
                  {expandedReplies[c._id] && replyCount > 0 && (
                    <div className="mt-2 pl-11 space-y-2">
                      {(c.replies || []).map((r) => (
                        <div key={r._id}>
                          <div className="flex items-start gap-3">
                            <img src={r.userId?.avatar} alt={r.userId?.name} className="w-7 h-7 rounded-full object-cover" />
                            <div className="flex-1">
                              <div className="flex items-start justify-between">
                                <div className="text-xs text-gray-500">
                                  <span className="font-semibold text-gray-900 dark:text-white mr-2">{r.userId?.name}</span>
                                  <span className="text-gray-500">{formatTimeAgo(r.createdAt)}</span>
                                </div>
                                <button onClick={() => toggleCommentLike(r._id)} className={`text-xs hover:text-red-600 ${r.isLiked ? 'text-red-600' : 'text-gray-500'} flex items-center gap-1`}>♥ {r.likeCount || 0}</button>
                              </div>
                              <div className="mt-1 text-sm text-gray-700 dark:text-gray-300">{r.text}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {!replyTo && (
          <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-200 dark:border-gray-800 sticky bottom-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur supports-[backdrop-filter]:bg-white/70 supports-[backdrop-filter]:dark:bg-gray-900/70 z-10">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={'Add a comment'}
              className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
            <button onClick={handlePost} className="px-3 py-2 rounded-lg bg-blue-600 text-white disabled:opacity-50" disabled={!input.trim()}>
              <Send className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    )
  }

  if (inline) {
    return (
      <div className="flex flex-col w-full h-full bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800">
          <div className="font-semibold text-gray-900 dark:text-white truncate">Comments</div>
          <div className="flex items-center gap-3">
            {onClose && (
              <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"><X className="h-5 w-5" /></button>
            )}
          </div>
        </div>

        {/* Comments */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-4 overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
          {loading ? (
            <div className="text-sm text-gray-500">Loading comments...</div>
          ) : comments.length === 0 ? (
            <div className="text-sm text-gray-500">No comments yet. Be the first to comment.</div>
          ) : (
            comments.map((c) => {
              const replyCount = (c.replies || []).length;
              return (
                <div key={c._id}>
                  <div className="flex items-start gap-3">
                    <img src={c.userId?.avatar} alt={c.userId?.name} className="w-8 h-8 rounded-full object-cover" />
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div className="text-xs text-gray-500">
                          <span className="font-semibold text-gray-900 dark:text-white mr-2">{c.userId?.name}</span>
                          <span className="text-gray-500">{formatTimeAgo(c.createdAt)}</span>
                        </div>
                        <button onClick={() => toggleCommentLike(c._id)} className={`text-xs hover:text-red-600 ${c.isLiked ? 'text-red-600' : 'text-gray-500'} flex items-center gap-1`}>♥ {c.likeCount || 0}</button>
                      </div>
                      <div className="mt-1 text-sm text-gray-700 dark:text-gray-300">{c.text}</div>
                      <div className="mt-1 flex items-center gap-3">
                        <button onClick={() => startReply(c)} className="text-xs text-blue-600">Reply</button>
                        {replyCount > 0 && (
                          <button onClick={() => toggleReplies(c._id)} className="text-xs text-gray-600 dark:text-gray-400">
                            {expandedReplies[c._id] ? 'Hide replies' : `View replies (${replyCount})`}
                          </button>
                        )}
                      </div>
                      {replyTo?.commentId === c._id && (
                        <div className="mt-2 flex items-center gap-2">
                          <input
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder={`Replying to ${replyTo.userName}`}
                            className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                          />
                          <button onClick={handlePost} className="px-3 py-2 rounded-lg bg-blue-600 text-white disabled:opacity-50" disabled={!input.trim()}>
                            <Send className="h-4 w-4" />
                          </button>
                          <button onClick={() => { setReplyTo(null); setInput(''); }} className="text-xs text-gray-500">Cancel</button>
                        </div>
                      )}
                    </div>
                  </div>
                  {expandedReplies[c._id] && replyCount > 0 && (
                    <div className="mt-2 pl-11 space-y-2">
                      {(c.replies || []).map((r) => (
                        <div key={r._id}>
                          <div className="flex items-start gap-3">
                            <img src={r.userId?.avatar} alt={r.userId?.name} className="w-7 h-7 rounded-full object-cover" />
                            <div className="flex-1">
                              <div className="flex items-start justify-between">
                                <div className="text-xs text-gray-500">
                                  <span className="font-semibold text-gray-900 dark:text-white mr-2">{r.userId?.name}</span>
                                  <span className="text-gray-500">{formatTimeAgo(r.createdAt)}</span>
                                </div>
                                <button onClick={() => toggleCommentLike(r._id)} className={`text-xs hover:text-red-600 ${r.isLiked ? 'text-red-600' : 'text-gray-500'} flex items-center gap-1`}>♥ {r.likeCount || 0}</button>
                              </div>
                              <div className="mt-1 text-sm text-gray-700 dark:text-gray-300">{r.text}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* New comment input */}
        {!replyTo && (
          <div className="flex items-center gap-2 p-3 border-t border-gray-200 dark:border-gray-800">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={'Add a comment'}
              className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
            <button onClick={handlePost} className="px-3 py-2 rounded-lg bg-blue-600 text-white disabled:opacity-50" disabled={!input.trim()}>
              <Send className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[210] bg-black/70 flex items-end md:items-center md:justify-center p-0 md:p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          className="bg-white dark:bg-gray-900 rounded-t-2xl md:rounded-2xl w-full md:max-w-2xl max-h-[90vh] md:max-h-[85vh] flex flex-col overflow-hidden shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Mobile drag handle */}
          <div className="md:hidden flex items-center justify-center pt-2">
            <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-700 rounded-full" />
          </div>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800">
            <div className="font-semibold text-gray-900 dark:text-white truncate">Comments</div>
            <div className="flex items-center gap-3">
              <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"><X className="h-5 w-5" /></button>
            </div>
          </div>

          {/* Comments */}
          <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-4 overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
            {loading ? (
              <div className="text-sm text-gray-500">Loading comments...</div>
            ) : comments.length === 0 ? (
              <div className="text-sm text-gray-500">No comments yet. Be the first to comment.</div>
            ) : (
              comments.map((c) => {
                const replyCount = (c.replies || []).length;
                return (
                  <div key={c._id}>
                    <div className="flex items-start gap-3">
                      <img src={c.userId?.avatar} alt={c.userId?.name} className="w-8 h-8 rounded-full object-cover" />
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div className="text-xs text-gray-500">
                            <span className="font-semibold text-gray-900 dark:text-white mr-2">{c.userId?.name}</span>
                            <span className="text-gray-500">{formatTimeAgo(c.createdAt)}</span>
                          </div>
                          <button onClick={() => toggleCommentLike(c._id)} className={`text-xs hover:text-red-600 ${c.isLiked ? 'text-red-600' : 'text-gray-500'} flex items-center gap-1`}>♥ {c.likeCount || 0}</button>
                        </div>
                        <div className="mt-1 text-sm text-gray-700 dark:text-gray-300">{c.text}</div>
                        <div className="mt-1 flex items-center gap-3">
                          <button onClick={() => startReply(c)} className="text-xs text-blue-600">Reply</button>
                          {replyCount > 0 && (
                            <button onClick={() => toggleReplies(c._id)} className="text-xs text-gray-600 dark:text-gray-400">
                              {expandedReplies[c._id] ? 'Hide replies' : `View replies (${replyCount})`}
                            </button>
                          )}
                        </div>
                        {replyTo?.commentId === c._id && (
                          <div className="mt-2 flex items-center gap-2">
                            <input
                              value={input}
                              onChange={(e) => setInput(e.target.value)}
                              placeholder={`Replying to ${replyTo.userName}`}
                              className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                            />
                            <button onClick={handlePost} className="px-3 py-2 rounded-lg bg-blue-600 text-white disabled:opacity-50" disabled={!input.trim()}>
                              <Send className="h-4 w-4" />
                            </button>
                            <button onClick={() => { setReplyTo(null); setInput(''); }} className="text-xs text-gray-500">Cancel</button>
                          </div>
                        )}
                      </div>
                    </div>
                    {expandedReplies[c._id] && replyCount > 0 && (
                      <div className="mt-2 pl-11 space-y-2">
                        {(c.replies || []).map((r) => (
                          <div key={r._id}>
                            <div className="flex items-start gap-3">
                              <img src={r.userId?.avatar} alt={r.userId?.name} className="w-7 h-7 rounded-full object-cover" />
                              <div className="flex-1">
                                <div className="flex items-start justify-between">
                                  <div className="text-xs text-gray-500">
                                    <span className="font-semibold text-gray-900 dark:text-white mr-2">{r.userId?.name}</span>
                                    <span className="text-gray-500">{formatTimeAgo(r.createdAt)}</span>
                                  </div>
                                  <button onClick={() => toggleCommentLike(r._id)} className={`text-xs hover:text-red-600 ${r.isLiked ? 'text-red-600' : 'text-gray-500'} flex items-center gap-1`}>♥ {r.likeCount || 0}</button>
                                </div>
                                <div className="mt-1 text-sm text-gray-700 dark:text-gray-300">{r.text}</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* New comment input */}
          {!replyTo && (
            <div className="flex items-center gap-2 p-3 border-t border-gray-200 dark:border-gray-800">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={'Add a comment'}
                className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
              <button onClick={handlePost} className="px-3 py-2 rounded-lg bg-blue-600 text-white disabled:opacity-50" disabled={!input.trim()}>
                <Send className="h-4 w-4" />
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export default ActivityCommentsModal
