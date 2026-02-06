import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCheck, RefreshCw, Trophy, Heart, MessageCircle, UserPlus } from 'lucide-react';
import useApiStore from '../store/apiStore';

const NotificationsPageNew = () => {
  const { user } = useApiStore();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = () => {
    // Mock data
    const mockNotifications = [
      {
        id: 1,
        type: 'follow',
        user: {
          name: 'Shashank Garg',
          avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Shashank',
        },
        message: 'started following you',
        timestamp: '2h ago',
        isUnread: true,
        group: 'today',
      },
      {
        id: 2,
        type: 'like',
        user: {
          name: 'Sarah Chen',
          avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah',
        },
        message: 'liked your goal',
        goalTitle: '"Document your recipes"',
        timestamp: '5h ago',
        isUnread: true,
        group: 'today',
      },
      {
        id: 3,
        type: 'comment',
        user: {
          name: 'Marcus Wright',
          avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Marcus',
        },
        message: 'added a comment to your activity',
        timestamp: '2d ago',
        isUnread: false,
        group: 'last30days',
      },
      {
        id: 4,
        type: 'achievement',
        icon: 'trophy',
        message: 'Achievement Unlocked: 7-Day Consistency Streak!',
        timestamp: '1w ago',
        isUnread: false,
        group: 'last30days',
      },
      {
        id: 5,
        type: 'follow',
        user: {
          name: 'Elena G',
          avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Elena',
        },
        message: 'started following you',
        timestamp: '2w ago',
        isUnread: false,
        group: 'last30days',
      },
    ];

    setNotifications(mockNotifications);
    setUnreadCount(mockNotifications.filter(n => n.isUnread).length);
    setLoading(false);
  };

  const handleMarkAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isUnread: false })));
    setUnreadCount(0);
  };

  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => {
      loadNotifications();
    }, 500);
  };

  const todayNotifications = notifications.filter(n => n.group === 'today');
  const last30DaysNotifications = notifications.filter(n => n.group === 'last30days');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4c99e6]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: 'Manrope, sans-serif' }}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Notifications</h1>
              <p className="text-gray-600">
                You have <span className="font-semibold text-[#4c99e6]">{unreadCount} unread</span> alerts
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleMarkAllAsRead}
                disabled={unreadCount === 0}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#4c99e6] text-white rounded-lg font-medium hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CheckCheck className="w-4 h-4" />
                Mark all as read
              </button>
              <button
                onClick={handleRefresh}
                className="p-2.5 bg-white border border-gray-200 rounded-lg text-gray-600 hover:text-[#4c99e6] hover:border-[#4c99e6] transition-colors"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Notifications List */}
        <div className="space-y-8">
          {/* Today Section */}
          {todayNotifications.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">
                Today
              </h3>
              <div className="space-y-3">
                {todayNotifications.map((notification) => (
                  <motion.div
                    key={notification.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`relative bg-white rounded-lg border transition-all ${
                      notification.isUnread
                        ? 'border-l-4 border-l-[#4c99e6] border-r border-r-gray-100 border-t border-t-gray-100 border-b border-b-gray-100 shadow-sm'
                        : 'border-gray-100'
                    }`}
                  >
                    <div className="flex items-center gap-4 p-4">
                      {/* Avatar or Icon */}
                      {notification.type === 'achievement' ? (
                        <div className="w-12 h-12 rounded-full bg-yellow-50 flex items-center justify-center flex-shrink-0">
                          <Trophy className="w-6 h-6 text-yellow-500" />
                        </div>
                      ) : (
                        <img
                          src={notification.user.avatar}
                          alt={notification.user.name}
                          className="w-12 h-12 rounded-full flex-shrink-0"
                        />
                      )}

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900">
                          {notification.type !== 'achievement' && (
                            <span className="font-semibold">{notification.user.name} </span>
                          )}
                          {notification.message}
                          {notification.goalTitle && (
                            <span className="text-[#4c99e6]"> {notification.goalTitle}</span>
                          )}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">{notification.timestamp}</p>
                      </div>

                      {/* Unread Indicator */}
                      {notification.isUnread && (
                        <div className="w-2 h-2 rounded-full bg-[#4c99e6] flex-shrink-0"></div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Last 30 Days Section */}
          {last30DaysNotifications.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">
                Last 30 Days
              </h3>
              <div className="space-y-3">
                {last30DaysNotifications.map((notification) => (
                  <motion.div
                    key={notification.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative bg-white rounded-lg border border-gray-100 hover:border-gray-200 transition-all"
                  >
                    <div className="flex items-center gap-4 p-4">
                      {/* Avatar or Icon */}
                      {notification.type === 'achievement' ? (
                        <div className="w-12 h-12 rounded-full bg-yellow-50 flex items-center justify-center flex-shrink-0">
                          <Trophy className="w-6 h-6 text-yellow-500" />
                        </div>
                      ) : (
                        <img
                          src={notification.user.avatar}
                          alt={notification.user.name}
                          className="w-12 h-12 rounded-full flex-shrink-0"
                        />
                      )}

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900">
                          {notification.type !== 'achievement' && (
                            <span className="font-semibold">{notification.user.name} </span>
                          )}
                          {notification.message}
                          {notification.goalTitle && (
                            <span className="text-[#4c99e6]"> {notification.goalTitle}</span>
                          )}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">{notification.timestamp}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </div>

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
    </div>
  );
};

export default NotificationsPageNew;
