import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Send } from 'lucide-react'
import useApiStore from '../store/apiStore'
import { activitiesAPI } from '../services/api'

const ActivityDetailModal = ({ isOpen, onClose, activity }) => {
  const { user } = useApiStore()
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(false)
  const [input, setInput] = useState('')
  const [replyTo, setReplyTo] = useState(null) // {commentId, userName}

  const sharedNote = activity?.data?.metadata?.completionNote || activity?.data?.completionNote || ''
  const sharedImage = activity?.data?.metadata?.completionAttachmentUrl || activity?.data?.completionAttachmentUrl || ''

  const fetchComments = async () => {
    if (!activity?._id) return
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

  useEffect(() => {
    if (isOpen) fetchComments()
  }, [isOpen, activity?._id])

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

  const startReply = (comment) => {
    setReplyTo({ commentId: comment._id, userId: comment.userId?._id || comment.userId, userName: comment.userId?.name || 'user' })
    setInput(`@${(comment.userId?.name || 'user').replace(/\s+/g, '')} `)
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] bg-black/70 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.98, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.98, opacity: 0 }}
          className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-5xl overflow-hidden shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="grid grid-cols-1 md:grid-cols-2">
            {/* Left: Image */}
            <div className="bg-black/5 dark:bg-black flex items-center justify-center p-2 min-h-[50vh]">
              {sharedImage ? (
                <img src={sharedImage} alt="Attachment" className="max-h-[80vh] w-full object-contain rounded-lg" />
              ) : (
                <div className="text-gray-400">No image</div>
              )}
            </div>

            {/* Right: Note + Comments */}
            <div className="flex flex-col min-h-[50vh]">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800">
                <div className="font-semibold text-gray-900 dark:text-white truncate">{activity?.name || 'User'}</div>
                <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"><X className="h-5 w-5" /></button>
              </div>

              {/* Note */}
              {sharedNote && (
                <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800">
                  <div className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-line">{sharedNote}</div>
                </div>
              )}

              {/* Comments */}
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
                {loading ? (
                  <div className="text-sm text-gray-500">Loading comments...</div>
                ) : comments.length === 0 ? (
                  <div className="text-sm text-gray-500">No comments yet. Be the first to comment.</div>
                ) : (
                  comments.map(c => (
                    <div key={c._id} className="">
                      <div className="flex items-start gap-3">
                        <img src={c.userId?.avatar} alt={c.userId?.name} className="w-8 h-8 rounded-full object-cover" />
                        <div className="flex-1">
                          <div className="text-sm"><span className="font-semibold">{c.userId?.name}</span> <span className="text-gray-700 dark:text-gray-300">{c.text}</span></div>
                          <button onClick={() => startReply(c)} className="text-xs text-blue-600 mt-1">Reply</button>
                        </div>
                      </div>
                      {(c.replies || []).map(r => (
                        <div key={r._id} className="mt-2 pl-11">
                          <div className="flex items-start gap-3">
                            <img src={r.userId?.avatar} alt={r.userId?.name} className="w-7 h-7 rounded-full object-cover" />
                            <div className="flex-1">
                              <div className="text-sm"><span className="font-semibold">{r.userId?.name}</span> <span className="text-gray-700 dark:text-gray-300">{r.text}</span></div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))
                )}
              </div>

              {/* Input */}
              <div className="flex items-center gap-2 p-3 border-t border-gray-200 dark:border-gray-800">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={replyTo ? `Replying to ${replyTo.userName}` : 'Add a comment'}
                  className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
                <button onClick={handlePost} className="px-3 py-2 rounded-lg bg-blue-600 text-white disabled:opacity-50" disabled={!input.trim()}>
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export default ActivityDetailModal 