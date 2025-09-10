import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Bell, RefreshCw, Check, X } from 'lucide-react'
import useApiStore from '../store/apiStore'
import SkeletonList from '../components/loader/SkeletonList'

const NotificationsPage = () => {
  const {
    isAuthenticated,
    getNotifications,
    loadMoreNotifications,
    notifications,
    notificationsPagination,
    unreadNotifications,
    markNotificationRead,
    markAllNotificationsRead,
    acceptFollowRequest,
    rejectFollowRequest,
    followUser
  } = useApiStore()

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return
    getNotifications({ page: 1, limit: 20 }).catch(() => {})
  }, [isAuthenticated])

  const openGoalModal = async (goalId) => {
    if (!goalId) return;
    try {
      // Open immediately and show loading spinner
      setGoalModalLoading(true);
      setGoalModalOpen(true);
      setGoalModalData(null);
      const resp = await useApiStore.getState().getGoalPost(goalId);
      if (resp?.success) {
        setGoalModalData(resp.data);
        // Do not change URL when opening from Explore; keep deep-link support only when URL already has goalId
        // Preload comments if activityId present
        const aid = resp?.data?.social?.activityId;
        if (aid) {
          try {
            setGoalCommentsLoading(true);
            const r = await activitiesAPI.getComments(aid, { page: 1, limit: 20 });
            const comments = r?.data?.data?.comments || [];
            const pagination = r?.data?.data?.pagination || null;
            setGoalComments(comments);
            setGoalCommentsPagination(pagination);
            setShowComments(true);
          } catch (_) { setGoalComments([]); setGoalCommentsPagination(null); setShowComments(false); }
          finally { setGoalCommentsLoading(false); }
        } else {
          setShowComments(false);
          setGoalComments([]);
          setGoalCommentsPagination(null);
        }
      }
    } catch (_) {
    } finally {
      setGoalModalLoading(false);
    }
  };

  const fetchInitialData = async (opts = {}) => {
    setLoading(true);
    try {
      await getNotifications({ page: 1, limit: 20 }, opts);
    } catch (error) {
      console.error('Error fetching notification data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTimeAgo = (dateString) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return `${Math.floor(diffInDays / 7)}w ago`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-slate-900 dark:via-gray-900 dark:to-zinc-900">
      <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
          <Bell className="h-6 w-6 mr-2 text-purple-500" />
          Notifications
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchInitialData({ force: true })}
            aria-label="Refresh"
            className={`h-9 w-9 inline-flex items-center justify-center rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors ${loading ? 'opacity-80' : ''}`}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          {unreadNotifications > 0 && (
            <button onClick={markAllNotificationsRead} className="text-sm text-blue-600 hover:underline">Mark all as read</button>
          )}
        </div>
      </div>

      {loading ? (
        <SkeletonList count={6} grid={false} avatar lines={3} />
      ) : (notifications || []).length > 0 ? (
        <>
          <div className="space-y-3">
            {(() => {
              const now = new Date();
              const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
              const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
              const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

              const groups = { today: [], week: [], month: [], older: [] };
              (notifications || []).forEach((n) => {
                const created = new Date(n.createdAt);
                if (created >= startOfToday) groups.today.push(n);
                else if (created >= sevenDaysAgo) groups.week.push(n);
                else if (created >= thirtyDaysAgo) groups.month.push(n);
                else groups.older.push(n);
              });

              const renderGroup = (title, items) => items.length > 0 && (
                <div className="space-y-2" key={title}>
                  <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 px-1">{title}</div>
                  {items.map((n) => {
                    const actorName = n.data?.actorName || n.data?.followerName || n.data?.likerName || 'Someone';
                    const actorAvatar = n.data?.actorAvatar || n.data?.followerAvatar || n.data?.likerAvatar;
                    const isUnread = !n.isRead;
                    const baseClass = isUnread ? 'bg-blue-50 dark:bg-gray-800/60 border-blue-200 dark:border-gray-700' : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800';
                    return (
                      <div key={n._id} className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${baseClass}`}>
                        <img
                          src={actorAvatar || '/api/placeholder/40/40'}
                          alt={actorName}
                          className="w-10 h-10 rounded-full cursor-pointer"
                          onClick={() => {
                            if (n.data?.actorId) navigate(`/profile/@${n.data?.actorId?.username || ''}?tab=overview`);
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-gray-800 dark:text-gray-200">
                            <button
                              className="font-medium hover:underline"
                              onClick={() => {
                                if (n.data?.actorId && n.data?.actorId?.username) navigate(`/profile/@${n.data.actorId.username}?tab=overview`)
                              }}
                            >
                              {actorName}
                            </button>
                            <span className="text-gray-600 dark:text-gray-400"> {n.message}</span>
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{formatTimeAgo(n.createdAt)}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          {n.type === 'follow_request' && n.data?.followerId && (
                            <>
                              <button onClick={async () => { await acceptFollowRequest(n.data.followerId); await markNotificationRead(n._id); }} className="px-3 py-1.5 rounded-lg bg-green-500 hover:bg-green-600 text-white text-xs inline-flex items-center gap-1"><Check className="w-4 h-4" />Accept</button>
                              <button onClick={async () => { await rejectFollowRequest(n.data.followerId); await markNotificationRead(n._id); }} className="px-3 py-1.5 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 text-xs inline-flex items-center gap-1"><X className="w-4 h-4" />Reject</button>
                            </>
                          )}
                          {n.type === 'follow_request_accepted' && n.data?.actorId && (
                            <button
                              onClick={async () => { await followUser(n.data.actorId); await markNotificationRead(n._id); }}
                              className="px-3 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-xs"
                            >Follow back</button>
                          )}
                          {(n.data?.activityId) && (
                            <button
                              onClick={() => openGoalModal(n?.data?.goalId?._id)}
                              className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-xs"
                            >View</button>
                          )}
                          {isUnread && (
                            <button onClick={() => markNotificationRead(n._id)} className="text-xs text-blue-600 hover:underline">Mark read</button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );

              return (
                <>
                  {renderGroup('Today', groups.today)}
                  {renderGroup('Last 7 days', groups.week)}
                  {renderGroup('Last 30 days', groups.month)}
                  {renderGroup('Older', groups.older)}
                </>
              );
            })()}
          </div>
        </>
      ) : (
        <div className="text-center py-12">
          <Bell className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400 text-lg">No notifications yet.</p>
          <p className="text-gray-500 dark:text-gray-500 text-sm mt-2">When people interact with you, you'll see updates here.</p>
        </div>
      )}
      </div>
    </div>
  )
}

export default NotificationsPage

