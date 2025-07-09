import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  User, 
  Users, 
  Target, 
  TrendingUp, 
  Flame, 
  Calendar, 
  MapPin, 
  Heart, 
  MessageCircle, 
  UserPlus, 
  UserCheck,
  Activity,
  Trophy,
  CheckCircle,
  Clock,
  ArrowLeft,
  Star
} from 'lucide-react';
import useApiStore from '../store/apiStore';

const UserProfile = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [profileUser, setProfileUser] = useState(null);
  const [userStats, setUserStats] = useState(null);
  const [userActivities, setUserActivities] = useState([]);
  const [userGoals, setUserGoals] = useState([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const { 
    user: currentUser, 
    isAuthenticated,
    getUser,
    getUserActivities,
    getUserGoals,
    followUser,
    unfollowUser,
    likeActivity,
    unlikeActivity
  } = useApiStore();

  useEffect(() => {
    if (userId) {
      fetchUserProfile();
    }
  }, [userId]);

  const fetchUserProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch user profile
      const userResult = await getUser(userId);
      if (userResult.success) {
        setProfileUser(userResult.user);
        setUserStats(userResult.stats);
        setIsFollowing(userResult.isFollowing);
      }

      // Fetch user activities
      const activitiesResult = await getUserActivities(userId, { limit: 20 });
      if (activitiesResult.success) {
        const activities = activitiesResult.activities;
        setUserActivities(Array.isArray(activities) ? activities : []);
      }

      // Fetch user goals
      const goalsResult = await getUserGoals(userId, { limit: 10 });
      if (goalsResult.success) {
        setUserGoals(goalsResult.goals);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      setError('Failed to load user profile');
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async () => {
    try {
      const result = await followUser(userId);
      if (result.success) {
        setIsFollowing(true);
      }
    } catch (error) {
      console.error('Error following user:', error);
    }
  };

  const handleUnfollow = async () => {
    try {
      const result = await unfollowUser(userId);
      if (result.success) {
        setIsFollowing(false);
      }
    } catch (error) {
      console.error('Error unfollowing user:', error);
    }
  };

  const handleLike = async (activityId) => {
    try {
      await likeActivity(activityId);
      setUserActivities(userActivities.map(activity => 
        activity._id === activityId 
          ? { ...activity, isLiked: true, likesCount: (activity.likesCount || 0) + 1 }
          : activity
      ));
    } catch (error) {
      console.error('Error liking activity:', error);
    }
  };

  const handleUnlike = async (activityId) => {
    try {
      await unlikeActivity(activityId);
      setUserActivities(userActivities.map(activity => 
        activity._id === activityId 
          ? { ...activity, isLiked: false, likesCount: Math.max((activity.likesCount || 0) - 1, 0) }
          : activity
      ));
    } catch (error) {
      console.error('Error unliking activity:', error);
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

  const getCategoryColor = (category) => {
    const colors = {
      'Career': 'bg-blue-500',
      'Health': 'bg-green-500',
      'Personal Development': 'bg-purple-500',
      'Education': 'bg-yellow-500',
      'Finance': 'bg-red-500',
      'Health & Fitness': 'bg-green-500',
      'Education & Learning': 'bg-yellow-500',
      'Career & Business': 'bg-blue-500',
      'Financial Goals': 'bg-red-500',
      'Creative Projects': 'bg-purple-500',
      'Travel & Adventure': 'bg-orange-500',
      'Relationships': 'bg-pink-500',
      'Family & Friends': 'bg-indigo-500',
      'Other': 'bg-gray-500'
    };
    return colors[category] || 'bg-gray-500';
  };

  const getActivityText = (activity) => {
    switch(activity.type) {
      case 'goal_completed':
        return 'completed a goal';
      case 'goal_created':
        return 'created a new goal';
      case 'user_followed':
        return `started following ${activity.data?.followedUserName || 'someone'}`;
      case 'level_up':
        return `leveled up to ${activity.data?.newLevel || 'next level'}`;
      case 'streak_milestone':
        return `reached a ${activity.data?.streakCount || 0} day streak!`;
      case 'achievement_earned':
        return `earned the "${activity.data?.achievementName || 'achievement'}" badge`;
      default:
        return 'had some activity';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-zinc-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error || !profileUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-zinc-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-4">User Not Found</h1>
          <p className="text-gray-400 mb-8">{error || 'The user you are looking for does not exist.'}</p>
          <button
            onClick={() => navigate('/explore')}
            className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl transition-colors duration-200 font-medium"
          >
            Back to Explore
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-zinc-900">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Back Button */}
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          onClick={() => navigate(-1)}
          className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors duration-200 mb-6"
        >
          <ArrowLeft className="h-5 w-5" />
          <span>Back</span>
        </motion.button>

        {/* Profile Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-gray-800/50 backdrop-blur-lg rounded-2xl p-8 border border-gray-700/50 mb-8"
        >
          <div className="flex flex-col md:flex-row items-start md:items-center space-y-6 md:space-y-0 md:space-x-8">
            <div className="relative">
              <img
                src={profileUser.avatar || '/api/placeholder/128/128'}
                alt={profileUser.name}
                className="w-32 h-32 rounded-full border-4 border-gray-600"
              />
              {profileUser.level && (
                <div className="absolute -bottom-2 -right-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-3 py-1 rounded-full text-sm font-bold">
                  {profileUser.level}
                </div>
              )}
            </div>

            <div className="flex-1">
              <h1 className="text-4xl font-bold text-white mb-2">
                {profileUser.name}
              </h1>
              {profileUser.bio && (
                <p className="text-gray-300 text-lg mb-4">{profileUser.bio}</p>
              )}
              {profileUser.location && (
                <div className="flex items-center text-gray-400 mb-4">
                  <MapPin className="h-5 w-5 mr-2" />
                  <span>{profileUser.location}</span>
                </div>
              )}

              {/* Stats */}
              <div className="flex flex-wrap gap-6 mb-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">{userStats?.totalGoals || 0}</div>
                  <div className="text-gray-400 text-sm">Goals</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-400">{userStats?.completedGoals || 0}</div>
                  <div className="text-gray-400 text-sm">Completed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-400">{userStats?.currentStreak || 0}</div>
                  <div className="text-gray-400 text-sm">Day Streak</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-400">{userStats?.totalPoints || 0}</div>
                  <div className="text-gray-400 text-sm">Points</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-400">{userStats?.followers || 0}</div>
                  <div className="text-gray-400 text-sm">Followers</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-indigo-400">{userStats?.followings || 0}</div>
                  <div className="text-gray-400 text-sm">Following</div>
                </div>
              </div>

              {/* Action Buttons */}
              {isAuthenticated && currentUser?._id !== userId && (
                <div className="flex space-x-4">
                  {isFollowing ? (
                    <button
                      onClick={handleUnfollow}
                      className="flex items-center space-x-2 px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-xl transition-colors duration-200 font-medium"
                    >
                      <UserCheck className="h-5 w-5" />
                      <span>Following</span>
                    </button>
                  ) : (
                    <button
                      onClick={handleFollow}
                      className="flex items-center space-x-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl transition-colors duration-200 font-medium"
                    >
                      <UserPlus className="h-5 w-5" />
                      <span>Follow</span>
                    </button>
                  )}
                  {/* <button className="flex items-center space-x-2 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl transition-colors duration-200 font-medium">
                    <MessageCircle className="h-5 w-5" />
                    <span>Message</span>
                  </button> */}
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex justify-center mb-8"
        >
          <div className="bg-gray-800/50 backdrop-blur-lg rounded-2xl p-2 border border-gray-700/50 flex">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex items-center space-x-2 px-6 py-3 rounded-xl transition-all duration-200 ${
                activeTab === 'overview'
                  ? 'bg-blue-500 text-white shadow-lg'
                  : 'text-gray-300 hover:text-white hover:bg-gray-700/50'
              }`}
            >
              <User className="h-5 w-5" />
              <span className="font-medium">Overview</span>
            </button>
            <button
              onClick={() => setActiveTab('activities')}
              className={`flex items-center space-x-2 px-6 py-3 rounded-xl transition-all duration-200 ${
                activeTab === 'activities'
                  ? 'bg-blue-500 text-white shadow-lg'
                  : 'text-gray-300 hover:text-white hover:bg-gray-700/50'
              }`}
            >
              <Activity className="h-5 w-5" />
              <span className="font-medium">Activities</span>
            </button>
            <button
              onClick={() => setActiveTab('goals')}
              className={`flex items-center space-x-2 px-6 py-3 rounded-xl transition-all duration-200 ${
                activeTab === 'goals'
                  ? 'bg-blue-500 text-white shadow-lg'
                  : 'text-gray-300 hover:text-white hover:bg-gray-700/50'
              }`}
            >
              <Target className="h-5 w-5" />
              <span className="font-medium">Goals</span>
            </button>
          </div>
        </motion.div>

        {/* Tab Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Recent Activities */}
              <div className="bg-gray-800/50 backdrop-blur-lg rounded-2xl p-6 border border-gray-700/50">
                <h3 className="text-xl font-bold text-white mb-6 flex items-center">
                  <Activity className="h-6 w-6 mr-2 text-green-400" />
                  Recent Activities
                </h3>
                <div className="space-y-4">
                  {userActivities.slice(0, 5).map((activity, index) => (
                    <div key={activity._id} className="flex items-start space-x-3 p-3 bg-gray-700/30 rounded-xl">
                      <div className="w-2 h-2 bg-blue-400 rounded-full mt-2"></div>
                      <div className="flex-1">
                        <p className="text-gray-300 text-sm">
                          {getActivityText(activity)}
                        </p>
                        <p className="text-gray-500 text-xs mt-1">
                          {formatTimeAgo(activity.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                  {userActivities.length === 0 && (
                    <p className="text-gray-400 text-center py-8">No recent activities</p>
                  )}
                </div>
              </div>

              {/* Recent Goals */}
              <div className="bg-gray-800/50 backdrop-blur-lg rounded-2xl p-6 border border-gray-700/50">
                <h3 className="text-xl font-bold text-white mb-6 flex items-center">
                  <Target className="h-6 w-6 mr-2 text-blue-400" />
                  Recent Goals
                </h3>
                <div className="space-y-4">
                  {userGoals.slice(0, 5).map((goal, index) => (
                    <div key={goal._id} className="p-4 bg-gray-700/30 rounded-xl">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-white">{goal.title}</h4>
                        {goal.completed && <CheckCircle className="h-5 w-5 text-green-400" />}
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-400">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium text-white ${getCategoryColor(goal.category)}`}>
                          {goal.category}
                        </span>
                        <span>{formatTimeAgo(goal.createdAt)}</span>
                      </div>
                    </div>
                  ))}
                  {userGoals.length === 0 && (
                    <p className="text-gray-400 text-center py-8">No goals yet</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'activities' && (
            <div className="bg-gray-800/50 backdrop-blur-lg rounded-2xl p-6 border border-gray-700/50">
              <h3 className="text-2xl font-bold text-white mb-6 flex items-center">
                <Activity className="h-6 w-6 mr-2 text-green-400" />
                All Activities
              </h3>
              <div className="space-y-4">
                {userActivities.map((activity, index) => (
                  <motion.div
                    key={activity._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 * index }}
                    className="bg-gray-700/30 rounded-xl p-6 border border-gray-600/30 hover:bg-gray-700/50 transition-all duration-200"
                  >
                    <div className="flex items-start space-x-4">
                      <div className="relative">
                        <img
                          src={profileUser.avatar || '/api/placeholder/48/48'}
                          alt={profileUser.name}
                          className="w-12 h-12 rounded-full border-2 border-gray-500"
                        />
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="font-semibold text-white">
                            {profileUser.name}
                          </span>
                          <span className="text-gray-400 text-sm">
                            {getActivityText(activity)}
                          </span>
                          <span className="text-gray-500 text-sm">
                            {formatTimeAgo(activity.createdAt)}
                          </span>
                        </div>
                        
                        {(activity.type === 'goal_completed' || activity.type === 'goal_created') && (
                          <div className="bg-gray-600/30 rounded-xl p-4 mb-3">
                            <h4 className="font-medium text-white mb-2">
                              {activity.data?.goalTitle || 'Goal Achievement'}
                            </h4>
                            {activity.data?.category && (
                              <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium text-white ${getCategoryColor(activity.data.category)}`}>
                                {activity.data.category}
                              </span>
                            )}
                          </div>
                        )}
                        
                        {isAuthenticated && (
                          <div className="flex items-center space-x-6">
                            <button
                              onClick={() => activity.isLiked ? handleUnlike(activity._id) : handleLike(activity._id)}
                              className={`flex items-center space-x-2 px-3 py-1 rounded-lg transition-colors duration-200 ${
                                activity.isLiked 
                                  ? 'bg-red-500/20 text-red-400' 
                                  : 'bg-gray-700/50 text-gray-400 hover:bg-gray-600/50 hover:text-red-400'
                              }`}
                            >
                              <Heart className={`h-4 w-4 ${activity.isLiked ? 'fill-current' : ''}`} />
                              <span className="text-sm">{activity.likesCount || 0}</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
                {userActivities.length === 0 && (
                  <div className="text-center py-12">
                    <Activity className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-400 text-lg">No activities yet</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'goals' && (
            <div className="bg-gray-800/50 backdrop-blur-lg rounded-2xl p-6 border border-gray-700/50">
              <h3 className="text-2xl font-bold text-white mb-6 flex items-center">
                <Target className="h-6 w-6 mr-2 text-blue-400" />
                Goals
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {userGoals.map((goal, index) => (
                  <motion.div
                    key={goal._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 * index }}
                    className="bg-gray-700/30 rounded-xl p-6 border border-gray-600/30 hover:bg-gray-700/50 transition-all duration-200"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium text-white ${getCategoryColor(goal.category)}`}>
                        {goal.category}
                      </span>
                      {goal.completed && <CheckCircle className="h-6 w-6 text-green-400" />}
                    </div>
                    
                    <h4 className="font-semibold text-white text-lg mb-2">{goal.title}</h4>
                    {goal.description && (
                      <p className="text-gray-300 text-sm mb-4">{goal.description}</p>
                    )}
                    
                    <div className="flex items-center justify-between text-sm text-gray-400">
                      <span>Created {formatTimeAgo(goal.createdAt)}</span>
                      {goal.completed && (
                        <span className="text-green-400">✓ Completed</span>
                      )}
                    </div>
                  </motion.div>
                ))}
                {userGoals.length === 0 && (
                  <div className="col-span-full text-center py-12">
                    <Target className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-400 text-lg">No goals yet</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default UserProfile; 