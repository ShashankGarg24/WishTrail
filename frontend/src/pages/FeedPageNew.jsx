import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Heart, MessageCircle, Share2, Trophy, Zap, Target, Flame, Star, UserPlus } from 'lucide-react';
import useApiStore from '../store/apiStore';
import GoalDetailsModalNew from '../components/GoalDetailsModalNew';

const FeedPageNew = () => {
  const { user } = useApiStore();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedGoalId, setSelectedGoalId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Mock data for demonstration
  useEffect(() => {
    const mockActivities = [
      {
        id: 1,
        user: {
          name: 'Shrasti Shukla',
          avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Shrasti',
        },
        type: 'goal_completed',
        action: 'COMPLETED A GOAL',
        timestamp: '3h ago',
        content: {
          title: 'Master Modern UI Design',
          category: 'EDUCATION',
        },
        likes: 12,
        comments: 3,
        isLiked: false,
        cheered: false,
      },
      {
        id: 2,
        user: {
          name: 'Marcus Chen',
          avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Marcus',
        },
        type: 'habit_streak',
        action: 'Completed a habit streak',
        timestamp: '2h ago',
        content: {
          title: '30-Day Morning Run',
          description: 'Consistency is key. Goal smashed!!',
          days: 30,
        },
        likes: 45,
        comments: 8,
        isLiked: true,
        cheered: false,
      },
      {
        id: 3,
        user: {
          name: 'Elena Rodriguez',
          avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Elena',
        },
        type: 'goal_created',
        action: 'Created a goal',
        timestamp: '1h ago',
        content: {
          title: 'Learn Advanced Piano',
          category: 'CREATIVE',
        },
        likes: 21,
        comments: 4,
        isLiked: false,
        cheered: false,
      },
    ];
    
    setActivities(mockActivities);
    setLoading(false);
  }, []);

  const handleLike = (activityId) => {
    setActivities(prev =>
      prev.map(activity =>
        activity.id === activityId
          ? {
              ...activity,
              isLiked: !activity.isLiked,
              likes: activity.isLiked ? activity.likes - 1 : activity.likes + 1,
            }
          : activity
      )
    );
  };

  const handleCheer = (activityId) => {
    setActivities(prev =>
      prev.map(activity =>
        activity.id === activityId
          ? { ...activity, cheered: !activity.cheered }
          : activity
      )
    );
  };

  const mockAchievements = [
    {
      id: 1,
      icon: '🏆',
      title: 'Early Bird',
      description: 'Wake up before 6 AM for 7 days',
    },
    {
      id: 2,
      icon: '⚡',
      title: 'Hyper-Consistent',
      description: 'Maintain a 30-day habit streak',
    },
  ];

  const suggestedFriends = [
    {
      id: 1,
      name: 'Jordan Smith',
      subtitle: '12 goals tracked',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jordan',
      isFollowing: false,
    },
    {
      id: 2,
      name: 'Leo Vance',
      subtitle: '8 habits active',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Leo',
      isFollowing: false,
    },
  ];

  const [friends, setFriends] = useState(suggestedFriends);

  const handleFollow = (friendId) => {
    setFriends(prev =>
      prev.map(friend =>
        friend.id === friendId
          ? { ...friend, isFollowing: !friend.isFollowing }
          : friend
      )
    );
  };

  const handleOpenGoal = (goalId) => {
    setSelectedGoalId(goalId);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedGoalId(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4c99e6]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: 'Manrope, sans-serif' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Feed - Left Side (2 columns width) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Page Header */}
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Growth Feed</h1>
              <p className="text-gray-600">Celebrate your community's progress.</p>
            </div>

            {/* Activity Feed Cards */}
            <div className="space-y-4">
              {activities.map((activity) => (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
                >
                  {/* User Info Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={activity.user.avatar}
                        alt={activity.user.name}
                        className="w-10 h-10 rounded-full"
                      />
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {activity.user.name}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {activity.action} • {activity.timestamp}
                        </p>
                      </div>
                    </div>
                    <button className="text-gray-400 hover:text-gray-600">
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                        <circle cx="10" cy="4" r="1.5" />
                        <circle cx="10" cy="10" r="1.5" />
                        <circle cx="10" cy="16" r="1.5" />
                      </svg>
                    </button>
                  </div>

                  {/* Activity Content - Clickable */}
                  <div 
                    onClick={() => handleOpenGoal(activity.id)}
                    className="cursor-pointer"
                  >
                  {activity.type === 'habit_streak' ? (
                    <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-lg p-6 mb-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Flame className="w-5 h-5 text-orange-400" />
                            <h4 className="text-white font-semibold text-lg">
                              {activity.content.title}
                            </h4>
                          </div>
                          <p className="text-gray-300 text-sm">
                            {activity.content.description}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-4xl font-bold text-white">
                            {activity.content.days}
                          </div>
                          <div className="text-xs text-gray-400 uppercase">Days</div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="mb-4">
                      <h4 className="text-xl font-semibold text-gray-900 mb-3">
                        {activity.content.title}
                      </h4>
                      {activity.content.category && (
                        <span className="inline-block px-3 py-1 bg-blue-50 text-[#4c99e6] text-xs font-semibold rounded-full uppercase tracking-wide">
                          {activity.content.category}
                        </span>
                      )}
                    </div>
                  )}
                  </div>

                  {/* Engagement Bar */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-6">
                      {/* Like Button */}
                      <button
                        onClick={() => handleLike(activity.id)}
                        className="flex items-center gap-2 text-gray-600 hover:text-red-500 transition-colors"
                      >
                        <Heart
                          className={`w-5 h-5 ${
                            activity.isLiked ? 'fill-red-500 text-red-500' : ''
                          }`}
                        />
                        <span className="text-sm font-medium">{activity.likes}</span>
                      </button>

                      {/* Comment Button */}
                      <button className="flex items-center gap-2 text-gray-600 hover:text-[#4c99e6] transition-colors">
                        <MessageCircle className="w-5 h-5" />
                        <span className="text-sm font-medium">{activity.comments}</span>
                      </button>

                      {/* Share Button */}
                      <button className="flex items-center gap-2 text-gray-600 hover:text-[#4c99e6] transition-colors">
                        <Share2 className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Cheers Button */}
                    <button
                      onClick={() => handleCheer(activity.id)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                        activity.cheered
                          ? 'bg-[#4c99e6] text-white'
                          : 'bg-blue-50 text-[#4c99e6] hover:bg-blue-100'
                      }`}
                    >
                      <Zap className={`w-4 h-4 ${activity.cheered ? 'fill-white' : ''}`} />
                      Cheers
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            {/* Recent Achievements */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-2 mb-4">
                <Trophy className="w-5 h-5 text-[#4c99e6]" />
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide">
                  Recent Achievements
                </h3>
              </div>

              <div className="space-y-4">
                {mockAchievements.map((achievement) => (
                  <div key={achievement.id} className="flex items-start gap-3">
                    <div className="text-2xl">{achievement.icon}</div>
                    <div>
                      <h4 className="font-semibold text-gray-900">
                        {achievement.title}
                      </h4>
                      <p className="text-sm text-gray-600">{achievement.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              <button className="w-full mt-4 text-[#4c99e6] hover:text-blue-600 font-medium text-sm transition-colors">
                View All Achievements
              </button>
            </div>

            {/* Suggested Friends */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-4">
                Suggested Friends
              </h3>

              <div className="space-y-4">
                {friends.map((friend) => (
                  <div key={friend.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img
                        src={friend.avatar}
                        alt={friend.name}
                        className="w-10 h-10 rounded-full"
                      />
                      <div>
                        <h4 className="font-semibold text-gray-900 text-sm">
                          {friend.name}
                        </h4>
                        <p className="text-xs text-gray-500">{friend.subtitle}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleFollow(friend.id)}
                      className={`p-2 rounded-lg transition-all ${
                        friend.isFollowing
                          ? 'bg-gray-100 text-gray-600'
                          : 'bg-blue-50 text-[#4c99e6] hover:bg-blue-100'
                      }`}
                    >
                      <UserPlus className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              <button className="w-full mt-4 text-[#4c99e6] hover:text-blue-600 font-medium text-sm transition-colors">
                Find People
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Goal Details Modal */}
      <GoalDetailsModalNew
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        goalId={selectedGoalId}
      />
    </div>
  );
};

export default FeedPageNew;
