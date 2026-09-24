import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence, useDragControls } from 'framer-motion'
import { X, Send, Heart, MessageCircle } from 'lucide-react'
import { activitiesAPI } from '../services/api'
import useApiStore from '../store/apiStore'
import { lockBodyScroll, unlockBodyScroll } from '../utils/scrollLock'

const ActivityCommentsModal = ({ isOpen, onClose, activity, inline = false, embedded = false, hideInput = false, onCommentAdded }) => {
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(false)
  const [input, setInput] = useState('')
  const [replyTo, setReplyTo] = useState(null)
  const [expandedReplies, setExpandedReplies] = useState({})
  const [isMobile, setIsMobile] = useState(false)
  const [mobileSheetMaxHeight, setMobileSheetMaxHeight] = useState(null)
  const dragControls = useDragControls()
  const navigate = useNavigate()

  useEffect(() => {
    const updateMobile = () => setIsMobile(window.innerWidth < 768)
    updateMobile()
    window.addEventListener('resize', updateMobile)
    return () => window.removeEventListener('resize', updateMobile)
  }, [])

  useEffect(() => {
    if (inline || embedded || !isOpen || !isMobile) {
      setMobileSheetMaxHeight(null)
      return undefined
    }
    const updateHeight = () => {
      const height = window.visualViewport?.height || window.innerHeight
      setMobileSheetMaxHeight(Math.max(320, Math.floor(height - 8)))
    }
    updateHeight()
    window.visualViewport?.addEventListener('resize', updateHeight)
    window.visualViewport?.addEventListener('scroll', updateHeight)
    window.addEventListener('orientationchange', updateHeight)
    return () => {
      window.visualViewport?.removeEventListener('resize', updateHeight)
      window.visualViewport?.removeEventListener('scroll', updateHeight)
      window.removeEventListener('orientationchange', updateHeight)
    }
  }, [inline, embedded, isOpen, isMobile])

  useEffect(() => {
    const shouldLoad = (inline || embedded) ? Boolean(activity?._id) : isOpen && Boolean(activity?._id)
    if (!shouldLoad) return undefined
    const fetchComments = async () => {
      setLoading(true)
      try {
        const response = await activitiesAPI.getComments(activity._id, { page: 1, limit: 20 })
        setComments(response.data?.data?.comments || [])
      } catch {
        setComments([])
      } finally {
        setLoading(false)
      }
    }
    fetchComments()
    const handleCommentAdded = (event) => {
      if (event.detail?.activityId === activity._id) fetchComments()
    }
    window.addEventListener('commentAdded', handleCommentAdded)
    return () => window.removeEventListener('commentAdded', handleCommentAdded)
  }, [activity?._id, embedded, inline, isOpen])

  useEffect(() => {
    if (!inline && !embedded && isOpen) {
      lockBodyScroll()
      return () => unlockBodyScroll()
    }
    return undefined
  }, [embedded, inline, isOpen])

  const formatTimeAgo = (iso) => {
    const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000))
    if (seconds < 60) return 'now'
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`
    if (seconds < 2592000) return `${Math.floor(seconds / 604800)}w`
    if (seconds < 31536000) return `${Math.floor(seconds / 2592000)}mo`
    return `${Math.floor(seconds / 31536000)}y`
  }

  const openProfile = (username) => {
    if (username) navigate(`/profile/@${username}?tab=overview`)
  }

  const startReply = (parentComment, user) => {
    const username = user?.username || 'user'
    setReplyTo({ commentId: parentComment._id, userId: user?._id || user, userName: username })
    setInput(`@${username} `)
  }

  const cancelReply = () => {
    setReplyTo(null)
    setInput('')
  }

  const handlePost = async () => {
    const text = input.trim()
    if (!text || !activity?._id) return
    try {
      if (replyTo) {
        const response = await activitiesAPI.replyComment(activity._id, replyTo.commentId, { text, mentionUserId: replyTo.userId })
        const reply = response.data?.data?.reply
        if (reply) {
          setComments((current) => current.map((comment) => comment._id === replyTo.commentId ? { ...comment, replies: [...(comment.replies || []), reply] } : comment))
          setExpandedReplies((current) => ({ ...current, [replyTo.commentId]: true }))
        }
      } else {
        const response = await activitiesAPI.addComment(activity._id, { text })
        const comment = response.data?.data?.comment
        if (comment) setComments((current) => [comment, ...current])
      }
      setInput('')
      setReplyTo(null)
      onCommentAdded?.()
      useApiStore.getState().invalidateGoalPostByActivity?.(activity._id)
    } catch {
      // The API interceptor reports errors; preserve the text so it can be retried.
    }
  }

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      handlePost()
    }
  }

  const toggleCommentLike = async (commentId, isLiked) => {
    try {
      const response = await activitiesAPI.toggleCommentLike(activity._id, commentId, !isLiked)
      const { likeCount, isLiked: nextIsLiked } = response.data?.data || {}
      setComments((current) => current.map((comment) => (
        comment._id === commentId
          ? { ...comment, likeCount, isLiked: nextIsLiked }
          : { ...comment, replies: (comment.replies || []).map((reply) => reply._id === commentId ? { ...reply, likeCount, isLiked: nextIsLiked } : reply) }
      )))
      useApiStore.getState().invalidateGoalPostByActivity?.(activity._id)
    } catch {
      // Preserve the current visual state when the request fails.
    }
  }

  const renderText = (text) => String(text || '').split(/(@[\w.-]+)/g).map((part, index) => (
    part.startsWith('@')
      ? <button key={`${part}-${index}`} type="button" onClick={() => openProfile(part.slice(1))} className="font-semibold text-[#4c99e6] hover:underline">{part}</button>
      : part
  ))

  const Avatar = ({ user, small = false }) => {
    const size = small ? 'h-8 w-8 text-xs' : 'h-10 w-10 text-sm'
    if (user?.avatar) return <img src={user.avatar} alt="" onClick={() => openProfile(user.username)} className={`${size} shrink-0 cursor-pointer rounded-full object-cover ring-1 ring-gray-200 dark:ring-gray-700`} />
    return <button type="button" aria-label={`Open ${user?.name || 'user'} profile`} onClick={() => openProfile(user?.username)} className={`${size} shrink-0 rounded-full bg-gradient-to-br from-[#4c99e6] to-[#7ab8f0] font-semibold text-white`}>{(user?.name || '?').slice(0, 1).toUpperCase()}</button>
  }

  const LikeButton = ({ item }) => {
    const liked = Boolean(item.isLiked)
    const count = Number(item.likeCount) || 0
    return <button type="button" aria-label={liked ? 'Unlike comment' : 'Like comment'} aria-pressed={liked} onClick={() => toggleCommentLike(item._id, liked)} className={`inline-flex min-w-8 shrink-0 flex-col items-center gap-0.5 rounded-lg px-1.5 py-1 text-[11px] font-medium transition-colors ${liked ? 'text-red-500' : 'text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300'}`}><Heart className={`h-4 w-4 ${liked ? 'fill-current' : ''}`} />{count > 0 && <span>{count}</span>}</button>
  }

  const ReplyComposer = ({ commentId }) => {
    if (replyTo?.commentId !== commentId) return null
    return <div className="mt-3 flex items-center gap-2 rounded-xl border border-[#4c99e6]/30 bg-blue-50/50 p-2 dark:bg-blue-950/20"><input autoFocus value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={handleKeyDown} placeholder={`Replying to @${replyTo.userName}`} className="min-w-0 flex-1 bg-transparent px-2 py-1.5 text-base md:text-sm text-gray-900 outline-none placeholder:text-gray-500 dark:text-white" /><button type="button" onClick={handlePost} disabled={!input.trim()} aria-label="Post reply" className="rounded-lg bg-[#4c99e6] p-2 text-white hover:bg-[#3d88d5] disabled:cursor-not-allowed disabled:opacity-40"><Send className="h-4 w-4" /></button><button type="button" onClick={cancelReply} className="px-1 text-xs font-medium text-gray-500 hover:text-gray-800 dark:hover:text-gray-200">Cancel</button></div>
  }

  const CommentItem = ({ comment, parentComment, isReply = false }) => {
    const user = comment.userId || {}
    const replies = comment.replies || []
    const replyCount = replies.length
    const parent = parentComment || comment
    return <article><div className={`flex items-start gap-3 ${isReply ? 'py-1' : 'rounded-xl px-1 py-2 transition-colors hover:bg-gray-50/80 dark:hover:bg-gray-800/40'}`}><Avatar user={user} small={isReply} /><div className="min-w-0 flex-1"><div className="rounded-2xl bg-gray-100 px-3 py-2.5 dark:bg-gray-800"><button type="button" onClick={() => openProfile(user.username)} className="block max-w-full truncate text-sm font-semibold text-gray-900 hover:text-[#4c99e6] dark:text-white">{user.name || user.username || 'WishTrail user'}</button><p className="mt-0.5 break-words text-sm leading-5 text-gray-700 dark:text-gray-200">{renderText(comment.text)}</p></div><div className="ml-3 mt-1 flex items-center gap-4 text-xs font-semibold text-gray-500 dark:text-gray-400"><span className="font-normal">{formatTimeAgo(comment.createdAt)}</span><button type="button" onClick={() => startReply(parent, user)} className="hover:text-gray-900 dark:hover:text-white">Reply</button>{!isReply && replyCount > 0 && <button type="button" onClick={() => setExpandedReplies((current) => ({ ...current, [comment._id]: !current[comment._id] }))} className="text-[#4c99e6] hover:text-[#287aca]">{expandedReplies[comment._id] ? 'Hide replies' : `View ${replyCount} ${replyCount === 1 ? 'reply' : 'replies'}`}</button>}</div>{!isReply && <ReplyComposer commentId={comment._id} />}</div><LikeButton item={comment} /></div>{!isReply && expandedReplies[comment._id] && replyCount > 0 && <div className="ml-5 mt-2 border-l-2 border-gray-200 pl-4 dark:border-gray-700 sm:ml-6"><div className="space-y-3">{replies.map((reply) => <CommentItem key={reply._id} comment={reply} parentComment={comment} isReply />)}</div></div>}</article>
  }

  const CommentList = () => <div className="space-y-4">{loading ? <p className="py-6 text-center text-sm text-gray-500">Loading comments…</p> : comments.length === 0 ? <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">No comments yet. Start the conversation.</p> : comments.map((comment) => <CommentItem key={comment._id} comment={comment} />)}</div>

  const Composer = () => {
    if (hideInput || replyTo) return null
    return <div className="flex items-center gap-2 border-t border-gray-100 bg-white/95 px-4 py-3 backdrop-blur dark:border-gray-800 dark:bg-gray-900/95"><input value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={handleKeyDown} placeholder="Add a comment…" className="min-w-0 flex-1 rounded-full bg-gray-100 px-4 py-2.5 text-base md:text-sm text-gray-900 outline-none placeholder:text-gray-500 focus:ring-2 focus:ring-[#4c99e6]/40 dark:bg-gray-800 dark:text-white" /><button type="button" onClick={handlePost} disabled={!input.trim()} className="rounded-full p-2.5 text-[#4c99e6] hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-blue-950/30" aria-label="Post comment"><Send className="h-5 w-5" /></button></div>
  }

  if (!inline && !embedded && !isOpen) return null
  if (embedded) return <section className="w-full" style={{ fontFamily: 'Manrope, sans-serif' }}><div className="mb-3 flex items-center gap-2"><MessageCircle className="h-4 w-4 text-[#4c99e6]" /><h3 className="text-sm font-semibold text-gray-900 dark:text-white">Comments</h3>{comments.length > 0 && <span className="text-xs text-gray-500">{comments.length}</span>}</div><CommentList /><div className="mt-4"><Composer /></div></section>
  if (inline) return <section className="flex h-full w-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900" style={{ fontFamily: 'Manrope, sans-serif' }}><header className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-800"><h2 className="font-semibold text-gray-900 dark:text-white">Comments</h2>{onClose && <button type="button" onClick={onClose} aria-label="Close comments" className="rounded-full p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"><X className="h-5 w-5" /></button>}</header><div className="min-h-0 flex-1 overflow-y-auto px-4 py-4"><CommentList /></div><Composer /></section>
  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-[210] flex items-end bg-black/70 md:items-center md:justify-center md:p-4">
        <motion.section
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          drag="y"
          dragControls={dragControls}
          dragListener={false}
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={{ top: 0, bottom: 0.45 }}
          onDragEnd={(_, info) => { if (info.offset.y > 120 || info.velocity.y > 600) onClose?.() }}
          onClick={(event) => event.stopPropagation()}
          style={mobileSheetMaxHeight ? { fontFamily: 'Manrope, sans-serif', maxHeight: `${mobileSheetMaxHeight}px` } : { fontFamily: 'Manrope, sans-serif' }}
          className="flex max-h-[90dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl md:max-h-[85vh] md:max-w-2xl md:rounded-2xl dark:bg-gray-900"
        >
          <div onPointerDown={(event) => dragControls.start(event)} className="flex cursor-grab justify-center pt-2 active:cursor-grabbing md:hidden">
            <span className="h-1.5 w-12 rounded-full bg-gray-300 dark:bg-gray-700" />
          </div>
          <header className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-800">
            <h2 className="font-semibold text-gray-900 dark:text-white">Comments</h2>
            <button type="button" onClick={onClose} aria-label="Close comments" className="rounded-full p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"><X className="h-5 w-5" /></button>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4"><CommentList /></div>
          <Composer />
        </motion.section>
      </motion.div>
    </AnimatePresence>
  )
}

export default ActivityCommentsModal
