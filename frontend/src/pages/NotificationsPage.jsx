import { useEffect, useState, lazy, Suspense } from 'react'
import { Bell, RefreshCw, Check, X, CheckCheck } from 'lucide-react'
import useApiStore from '../store/apiStore'
import SkeletonNotifications from '../components/loader/SkeletonNotifications'
import { useNavigate } from 'react-router-dom'

const GoalDetailsModal = lazy(() => import('../components/GoalDetailsModal'));

const NotificationsPage = () => {
  const {
    isAuthenticated,
    getNotifications,
    notifications,
    notificationsPagination,
    unreadNotifications,
    markNotificationRead,
    markAllNotificationsRead,
    acceptFollowRequest,
    rejectFollowRequest,
    loadMoreNotifications,
    getFollowRequests,
    followRequests,
  } = useApiStore()

  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const [inNativeApp, setInNativeApp] = useState(false)
  const [openGoalId, setOpenGoalId] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    try { if (typeof window !== 'undefined' && window.ReactNativeWebView) setInNativeApp(true) } catch {}
  }, [])

  useEffect(() => {
    if (!isAuthenticated) return
    fetchInitialData().catch(() => {})
  }, [isAuthenticated])

  const fetchInitialData = async (opts = {}) => {
    setLoading(true);
    try {
      await Promise.all([
        getNotifications({ page: 1, limit: 15, scope: 'social' }, opts),
        getFollowRequests({ page: 1, limit: 10 })
      ]);
    } catch (error) {
      console.error('Error fetching notification data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMore = async () => {
    if (loadingMore || !notificationsPagination) return;
    const { page, pages } = notificationsPagination;
    if (page >= pages) return;
    
    setLoadingMore(true);
    try {
      await loadMoreNotifications();
    } catch (error) {
      console.error('Error loading more notifications:', error);
    } finally {
      setLoadingMore(false);
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        {!inNativeApp && (
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-500 to-purple-500 flex items-center justify-center shadow-lg">
                  <Bell className="h-6 w-6 text-white" />
                </div>
                {unreadNotifications > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[20px] h-5 bg-red-500 rounded-full text-white text-xs font-bold flex items-center justify-center px-1.5 shadow-lg">
                    {unreadNotifications > 9 ? '9+' : unreadNotifications}
                  </span>
                )}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Notifications</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {unreadNotifications > 0 ? `${unreadNotifications} unread` : 'All caught up!'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchInitialData({ force: true })}
                disabled={loading}
                className="p-2.5 rounded-xl hover:bg-white dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700 transition-all shadow-sm"
              >
                <RefreshCw className={`h-5 w-5 text-gray-700 dark:text-gray-300 ${loading ? 'animate-spin' : ''}`} />
              </button>
              {unreadNotifications > 0 && (
                <button
                  onClick={async () => {
                    setMarkingAllRead(true);
                    try {
                      await markAllNotificationsRead();
                    } catch (error) {
                      console.error('Error marking all notifications as read:', error);
                    } finally {
                      setMarkingAllRead(false);
                    }
                  }}
                  disabled={markingAllRead}
                  className="px-4 py-2.5 bg-primary-500 text-white rounded-xl text-sm font-medium hover:bg-primary-600 transition-all shadow-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <CheckCheck className={`h-4 w-4 ${markingAllRead ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">{markingAllRead ? 'Marking...' : 'Mark all read'}</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Notifications List */}
        {loading ? (
          <SkeletonNotifications count={6} />
        ) : ((notifications || []).length > 0 || (followRequests || []).length > 0) ? (
          <div className="space-y-6">
            {/* Follow Requests Section */}
            {(followRequests || []).length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-700 to-transparent"></div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 px-2">Follow Requests</span>
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-700 to-transparent"></div>
                </div>
                
                <div className="space-y-2">
                  {(followRequests || []).map((n) => {
                    const actorName = n.data?.actor?.name || 'Someone';
                    const actorAvatar = n.data?.actor?.avatar || '/api/placeholder/48/48';
                    const actorUsername = n.data?.actor?.username;
                    const isUnread = !n.isRead;
                    
                    return (
                      <div
                        key={n.id}
                        className={`bg-white dark:bg-gray-800 rounded-xl p-4 hover:shadow-lg transition-all ${
                          isUnread ? 'ring-2 ring-primary-500/50 shadow-md' : 'shadow-sm'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="relative flex-shrink-0">
                            <img
                              src={actorAvatar}
                              alt={actorName}
                              className="w-12 h-12 rounded-full ring-2 ring-white dark:ring-gray-700 cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (actorUsername) navigate(`/profile/@${actorUsername}?tab=overview`)
                              }}
                            />
                            {isUnread && (
                              <span className="absolute -top-1 -right-1 w-3 h-3 bg-primary-500 rounded-full ring-2 ring-white dark:ring-gray-800"></span>
                            )}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-900 dark:text-gray-100">
                              <span className="font-semibold cursor-pointer hover:text-primary-500" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (actorUsername) navigate(`/profile/@${actorUsername}?tab=overview`)
                                }}
                                >
                                {actorName}
                              </span>
                              <span className="text-gray-600 dark:text-gray-400"> wants to follow you</span>
                            </p>
                            <div className="flex items-center gap-2 mt-1.5">
                              <span className="text-xs text-gray-500 dark:text-gray-400">{n.age || formatTimeAgo(n.createdAt)}</span>
                              {isUnread && (
                                <span className="text-xs px-2 py-0.5 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 rounded-full font-medium">
                                  New
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex gap-2 ml-2">
                            <button
                              onClick={async (e) => { 
                                e.stopPropagation();
                                await acceptFollowRequest(n.id);
                                await getFollowRequests({ page: 1, limit: 10 });
                              }}
                              className="p-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors shadow-sm"
                              title="Accept"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={async (e) => { 
                                e.stopPropagation();
                                await rejectFollowRequest(n.id);
                                await getFollowRequests({ page: 1, limit: 10 });
                              }}
                              className="p-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg transition-colors"
                              title="Reject"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Regular Notifications */}
            {(notifications || []).length > 0 && (
            <div className="space-y-6">
            {(() => {
              const now = new Date();
              const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
              const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
              const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

              const groups = { today: [], week: [], month: [] };
              (notifications || []).forEach((n) => {
                const created = new Date(n.createdAt);
                if (created >= startOfToday) groups.today.push(n);
                else if (created >= sevenDaysAgo) groups.week.push(n);
                else if (created >= thirtyDaysAgo) groups.month.push(n);
              });

              const renderGroup = (title, items) => items.length > 0 && (
                <div key={title} className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-700 to-transparent"></div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 px-2">{title}</span>
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-700 to-transparent"></div>
                  </div>
                  
                  <div className="space-y-2">
                    {items.map((n) => {
                      const actorName = n.data?.actor?.name || 'Someone';
                      const actorAvatar = n.data?.actor?.avatar || '/api/placeholder/48/48';
                      const actorUsername = n.data?.actor?.username;
                      const goalTitle = n.data?.goalTitle;
                      const isUnread = !n.isRead;
                      
                      return (
                        <div
                          key={n.id}
                          className={`bg-white dark:bg-gray-800 rounded-xl p-4 cursor-pointer hover:shadow-lg hover:scale-[1.01] transition-all ${
                            isUnread ? 'ring-2 ring-primary-500/50 shadow-md' : 'shadow-sm'
                          }`}
                          onClick={() => {
                            if (n.type === 'new_follower') navigate(`/profile/@${n.data.actor.username}?tab=overview`)
                            else if (n.data?.goalId) setOpenGoalId(n.data.goalId)
                            if (isUnread) markNotificationRead(n.id)
                          }}
                        >
                          <div className="flex items-start gap-3">
                            <div className="relative flex-shrink-0">
                              <img
                                src={actorAvatar || '/api/placeholder/48/48'}
                                alt={actorName}
                                className="w-12 h-12 rounded-full ring-2 ring-white dark:ring-gray-700 cursor-pointer hover:ring-primary-500 transition-all"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (actorUsername) navigate(`/profile/@${actorUsername}?tab=overview`)
                                }}
                              />
                              {isUnread && (
                                <span className="absolute -top-1 -right-1 w-3 h-3 bg-primary-500 rounded-full ring-2 ring-white dark:ring-gray-800"></span>
                              )}
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-gray-900 dark:text-gray-100">
                                <span 
                                  className="font-semibold cursor-pointer hover:text-primary-500 transition-colors"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (actorUsername) navigate(`/profile/@${actorUsername}?tab=overview`)
                                  }}
                                >{actorName}</span>
                                <span className="text-gray-600 dark:text-gray-400"> {n.message?.replace(actorName, '').trim()}</span>
                              </p>
                              {goalTitle && (
                                <div className="mt-1.5 px-2.5 py-1 bg-gradient-to-r from-primary-50 to-purple-50 dark:from-primary-900/20 dark:to-purple-900/20 rounded-lg border border-primary-200 dark:border-primary-800 inline-block">
                                  <p className="text-xs font-medium text-primary-700 dark:text-primary-300 truncate">
                                    {goalTitle}
                                  </p>
                                </div>
                              )}
                              <div className="flex items-center gap-2 mt-1.5">
                                <span className="text-xs text-gray-500 dark:text-gray-400">{formatTimeAgo(n.createdAt)}</span>
                                {isUnread && (
                                  <span className="text-xs px-2 py-0.5 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 rounded-full font-medium">
                                    New
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );

              return (
                <>
                  {renderGroup('Today', groups.today)}
                  {renderGroup('Last 7 days', groups.week)}
                  {renderGroup('Last 30 days', groups.month)}
                </>
              );
            })()}
            </div>
            )}

            {/* Load More Button */}
            {notificationsPagination && notificationsPagination.page < notificationsPagination.pages && (
              <div className="flex justify-center mt-6">
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="px-6 py-3 bg-white dark:bg-gray-800 border-2 border-primary-500 text-primary-600 dark:text-primary-400 rounded-xl font-medium hover:bg-primary-50 dark:hover:bg-gray-700 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loadingMore ? (
                    <div className="flex items-center gap-2">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Loading...
                    </div>
                  ) : (
                    'Load More'
                  )}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-primary-100 to-purple-100 dark:from-primary-900/30 dark:to-purple-900/30 mb-4">
              <Bell className="h-8 w-8 text-primary-500 dark:text-primary-400" />
            </div>
            <p className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-1">No notifications yet</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">When people interact with you, you'll see updates here</p>
          </div>
        )}
      </div>

      {/* Goal Details Modal */}
      {openGoalId && (
        <Suspense fallback={null}>
          <GoalDetailsModal
            isOpen={!!openGoalId}
            goalId={openGoalId}
            onClose={() => setOpenGoalId(null)}
          />
        </Suspense>
      )}
    </div>
  )
}

export default NotificationsPage

