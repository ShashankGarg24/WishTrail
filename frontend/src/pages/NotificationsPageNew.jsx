import { useState, useEffect, lazy, Suspense } from 'react';
import { motion } from 'framer-motion';
import { CheckCheck, RefreshCw, Trophy, Heart, MessageCircle, UserPlus, Check, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import useApiStore from '../store/apiStore';

const GoalPostModalNew = lazy(() => import('../components/GoalPostModalNew'));

const NotificationsPageNew = () => {
  const navigate = useNavigate();
  const { 
    user,
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
  } = useApiStore();

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const [openGoalId, setOpenGoalId] = useState(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    loadNotifications();
  }, [isAuthenticated]);

  const loadNotifications = async (force = false) => {
    setLoading(true);
    try {
      await Promise.all([
        getNotifications({ page: 1, limit: 15, scope: 'social' }, { force }),
        getFollowRequests({ page: 1, limit: 10 })
      ]);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAllAsRead = async () => {
    setMarkingAllRead(true);
    try {
      await markAllNotificationsRead();
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    } finally {
      setMarkingAllRead(false);
    }
  };

  const handleRefresh = () => {
    loadNotifications(true);
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
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)}w ago`;
    return `${Math.floor(diffInDays / 30)}mo ago`;
  };

  // Group notifications by time period
  const groupNotifications = () => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const groups = { today: [], week: [], month: [] };
    (notifications || []).forEach((n) => {
      const created = new Date(n.createdAt);
      if (created >= startOfToday) groups.today.push(n);
      else if (created >= sevenDaysAgo) groups.week.push(n);
      else groups.month.push(n);
    });

    return groups;
  };

  const { today: todayNotifications, week: weekNotifications, month: monthNotifications } = groupNotifications();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center" style={{ fontFamily: 'Manrope, sans-serif' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4c99e6] mx-auto mb-4"></div>
          <p className="text-gray-500">Loading notifications...</p>
        </div>
      </div>
    );
  }

  const hasNotifications = (notifications?.length > 0) || (followRequests?.length > 0);

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: 'Manrope, sans-serif' }}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Notifications</h1>
              <p className="text-gray-600">
                {unreadNotifications > 0 ? (
                  <>You have <span className="font-semibold text-[#4c99e6]">{unreadNotifications} unread</span> alerts</>
                ) : (
                  'All caught up!'
                )}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {unreadNotifications > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  disabled={markingAllRead}
                  className="flex items-center gap-2 px-4 py-2.5 bg-[#4c99e6] text-white rounded-lg font-medium hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <CheckCheck className={`w-4 h-4 ${markingAllRead ? 'animate-spin' : ''}`} />
                  {markingAllRead ? 'Marking...' : 'Mark all as read'}
                </button>
              )}
              <button
                onClick={handleRefresh}
                disabled={loading}
                className="p-2.5 bg-white border border-gray-200 rounded-lg text-gray-600 hover:text-[#4c99e6] hover:border-[#4c99e6] transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Notifications List */}
        {!hasNotifications ? (
          <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
            <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-4">
              <MessageCircle className="w-8 h-8 text-[#4c99e6]" />
            </div>
            <p className="text-lg font-semibold text-gray-700 mb-1">No notifications yet</p>
            <p className="text-sm text-gray-500">When people interact with you, you'll see updates here</p>
          </div>
        ) : (
          <div className="space-y-8">{/* Follow Requests Section */}
            {(followRequests?.length > 0) && (
              <div>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">
                  Follow Requests
                </h3>
                <div className="space-y-3">
                  {followRequests.map((request) => {
                    const actorName = request.data?.actor?.name || 'Someone';
                    const actorAvatar = request.data?.actor?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${actorName}`;
                    const actorUsername = request.data?.actor?.username;
                    const isUnread = !request.isRead;

                    return (
                      <motion.div
                        key={request.id || request._id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="relative bg-white rounded-lg border border-gray-100 transition-all"
                      >
                        <div className="flex items-center gap-4 p-4">
                          <div className="relative flex-shrink-0">
                            <img
                              src={actorAvatar}
                              alt={actorName}
                              onClick={() => actorUsername && navigate(`/profile/@${actorUsername}`)}
                              className="w-12 h-12 rounded-full cursor-pointer hover:opacity-80 ring-2 ring-white"
                            />
                            {isUnread && (
                              <span className="absolute -top-1 -right-1 w-3 h-3 bg-[#4c99e6] rounded-full ring-2 ring-white"></span>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-900">
                              <span 
                                onClick={() => actorUsername && navigate(`/profile/@${actorUsername}`)}
                                className="font-semibold cursor-pointer hover:text-[#4c99e6]"
                              >
                                {actorName}
                              </span>
                              <span className="text-gray-600"> wants to follow you</span>
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <p className="text-xs text-gray-500">{formatTimeAgo(request.createdAt)}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0">
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                await acceptFollowRequest(request.id || request._id);
                                await getFollowRequests({ page: 1, limit: 10 });
                              }}
                              className="p-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
                              title="Accept"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                await rejectFollowRequest(request.id || request._id);
                                await getFollowRequests({ page: 1, limit: 10 });
                              }}
                              className="p-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors"
                              title="Reject"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}
            {/* Today Section */}
            {todayNotifications.length > 0 && (
              <div>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">
                  Today
                </h3>
                <div className="space-y-3">
                  {todayNotifications.map((notification) => {
                    const actorName = notification.data?.actor?.name || 'Someone';
                    const actorAvatar = notification.data?.actor?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${actorName}`;
                    const actorUsername = notification.data?.actor?.username;
                    const goalTitle = notification.data?.goalTitle;
                    const isUnread = !notification.isRead;

                    return (
                      <motion.div
                        key={notification.id || notification._id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        onClick={() => {
                          if (notification.type === 'new_follower') {
                            actorUsername && navigate(`/profile/@${actorUsername}`);
                          } else if (notification.data?.goalId) {
                            setOpenGoalId(notification.data.goalId);
                          }
                          if (isUnread) markNotificationRead(notification.id || notification._id);
                        }}
                        className="relative bg-white rounded-lg border border-gray-100 transition-all cursor-pointer hover:shadow-md"
                      >
                        <div className="flex items-center gap-4 p-4">
                          {/* Avatar */}
                          <div className="relative flex-shrink-0">
                            <img
                              src={actorAvatar}
                              alt={actorName}
                              onClick={(e) => {
                                e.stopPropagation();
                                actorUsername && navigate(`/profile/@${actorUsername}`);
                              }}
                              className="w-12 h-12 rounded-full cursor-pointer hover:opacity-80 ring-2 ring-white"
                            />
                            {isUnread && (
                              <span className="absolute -top-1 -right-1 w-3 h-3 bg-[#4c99e6] rounded-full ring-2 ring-white"></span>
                            )}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-900">
                              <span 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  actorUsername && navigate(`/profile/@${actorUsername}`);
                                }}
                                className="font-semibold cursor-pointer hover:text-[#4c99e6]"
                              >
                                {actorName}
                              </span>
                              <span className="text-gray-600"> {notification.message?.replace(actorName, '').trim()}</span>
                              {goalTitle && (
                                <span className="text-[#4c99e6]"> {goalTitle}</span>
                              )}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <p className="text-xs text-gray-500">{formatTimeAgo(notification.createdAt)}</p>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Last 7 Days Section */}
            {weekNotifications.length > 0 && (
              <div>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">
                  Last 7 Days
                </h3>
                <div className="space-y-3">
                  {weekNotifications.map((notification) => {
                    const actorName = notification.data?.actor?.name || 'Someone';
                    const actorAvatar = notification.data?.actor?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${actorName}`;
                    const actorUsername = notification.data?.actor?.username;
                    const goalTitle = notification.data?.goalTitle;
                    const isUnread = !notification.isRead;

                    return (
                      <motion.div
                        key={notification.id || notification._id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        onClick={() => {
                          if (notification.type === 'new_follower') {
                            actorUsername && navigate(`/profile/@${actorUsername}`);
                          } else if (notification.data?.goalId) {
                            setOpenGoalId(notification.data.goalId);
                          }
                          if (isUnread) markNotificationRead(notification.id || notification._id);
                        }}
                        className="relative bg-white rounded-lg border border-gray-100 hover:border-gray-200 hover:shadow-md transition-all cursor-pointer"
                      >
                        <div className="flex items-center gap-4 p-4">
                          <div className="relative flex-shrink-0">
                            <img
                              src={actorAvatar}
                              alt={actorName}
                              onClick={(e) => {
                                e.stopPropagation();
                                actorUsername && navigate(`/profile/@${actorUsername}`);
                              }}
                              className="w-12 h-12 rounded-full cursor-pointer hover:opacity-80 ring-2 ring-white"
                            />
                            {isUnread && (
                              <span className="absolute -top-1 -right-1 w-3 h-3 bg-[#4c99e6] rounded-full ring-2 ring-white"></span>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-900">
                              <span 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  actorUsername && navigate(`/profile/@${actorUsername}`);
                                }}
                                className="font-semibold cursor-pointer hover:text-[#4c99e6]"
                              >
                                {actorName}
                              </span>
                              <span className="text-gray-600"> {notification.message?.replace(actorName, '').trim()}</span>
                              {goalTitle && (
                                <span className="text-[#4c99e6]"> {goalTitle}</span>
                              )}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <p className="text-xs text-gray-500">{formatTimeAgo(notification.createdAt)}</p>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Last 30 Days Section */}
            {monthNotifications.length > 0 && (
              <div>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">
                  Last 30 Days
                </h3>
                <div className="space-y-3">
                  {monthNotifications.map((notification) => {
                    const actorName = notification.data?.actor?.name || 'Someone';
                    const actorAvatar = notification.data?.actor?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${actorName}`;
                    const actorUsername = notification.data?.actor?.username;
                    const goalTitle = notification.data?.goalTitle;
                    const isUnread = !notification.isRead;

                    return (
                      <motion.div
                        key={notification.id || notification._id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        onClick={() => {
                          if (notification.type === 'new_follower') {
                            actorUsername && navigate(`/profile/@${actorUsername}`);
                          } else if (notification.data?.goalId) {
                            setOpenGoalId(notification.data.goalId);
                          }
                          if (isUnread) markNotificationRead(notification.id || notification._id);
                        }}
                        className="relative bg-white rounded-lg border border-gray-100 hover:border-gray-200 hover:shadow-md transition-all cursor-pointer"
                      >
                        <div className="flex items-center gap-4 p-4">
                          <div className="relative flex-shrink-0">
                            <img
                              src={actorAvatar}
                              alt={actorName}
                              onClick={(e) => {
                                e.stopPropagation();
                                actorUsername && navigate(`/profile/@${actorUsername}`);
                              }}
                              className="w-12 h-12 rounded-full cursor-pointer hover:opacity-80 ring-2 ring-white"
                            />
                            {isUnread && (
                              <span className="absolute -top-1 -right-1 w-3 h-3 bg-[#4c99e6] rounded-full ring-2 ring-white"></span>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-900">
                              <span 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  actorUsername && navigate(`/profile/@${actorUsername}`);
                                }}
                                className="font-semibold cursor-pointer hover:text-[#4c99e6]"
                              >
                                {actorName}
                              </span>
                              <span className="text-gray-600"> {notification.message?.replace(actorName, '').trim()}</span>
                              {goalTitle && (
                                <span className="text-[#4c99e6]"> {goalTitle}</span>
                              )}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <p className="text-xs text-gray-500">{formatTimeAgo(notification.createdAt)}</p>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Load More Button */}
            {notificationsPagination && notificationsPagination.page < notificationsPagination.pages && (
              <div className="flex justify-center">
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="px-6 py-3 bg-white border-2 border-[#4c99e6] text-[#4c99e6] rounded-xl font-medium hover:bg-blue-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
        )}

        {/* Inspirational Quote */}
        <div className="mt-12 text-center">
          <p className="text-sm text-gray-400 italic">
            "Success is a sequence of deliberate actions, executed with consistency."
          </p>
          <div className="flex items-center justify-center gap-2 mt-4">
            <div className="w-2 h-2 rounded-full bg-gray-300"></div>
            <div className="w-2 h-2 rounded-full bg-gray-200"></div>
          </div>
        </div>
      </div>

      {/* Goal Post Modal */}
      {openGoalId && (
        <Suspense fallback={null}>
          <GoalPostModalNew
            isOpen={!!openGoalId}
            goalId={openGoalId}
            onClose={() => setOpenGoalId(null)}
            openWithComments={false}
          />
        </Suspense>
      )}
    </div>
  );
};

export default NotificationsPageNew;
