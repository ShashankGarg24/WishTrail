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
  Star,
  Lock,
  Circle
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

  const isProfileAccessible = () => {
    if (!profileUser) return false;
    if (!profileUser.isPrivate) return true;
    if (currentUser && currentUser._id === userId) return true;
    if (isFollowing) return true;
    return false;
  };

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

      if (isProfileAccessible()) {
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
        fetchUserProfile();
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
        userStats.followers--;
        if (profileUser?.isPrivate) {
          setUserActivities([]);
          setUserGoals([]);
        }
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-slate-900 dark:via-gray-900 dark:to-zinc-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error || !profileUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-slate-900 dark:via-gray-900 dark:to-zinc-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">User Not Found</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-8">{error || 'The user you are looking for does not exist.'}</p>
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-slate-900 dark:via-gray-900 dark:to-zinc-900">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Back Button */}
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          onClick={() => navigate(-1)}
          className="flex items-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors duration-200 mb-6"
        >
          <ArrowLeft className="h-5 w-5" />
          <span>Back</span>
        </motion.button>

        {/* Profile Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white/80 dark:bg-gray-800/50 backdrop-blur-lg rounded-2xl p-8 border border-gray-200 dark:border-gray-700/50 mb-8"
        >
          <div className="flex flex-col md:flex-row items-start md:items-center space-y-6 md:space-y-0 md:space-x-8">
            <div className="relative">
              <img
                src={profileUser.avatar || '/api/placeholder/128/128'}
                alt={profileUser.name}
                className="w-32 h-32 rounded-full border-4 border-gray-300 dark:border-gray-600"
              />
              {profileUser.level && (
                <div className="absolute -bottom-2 -right-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-3 py-1 rounded-full text-sm font-bold">
                  {profileUser.level}
                </div>
              )}
            </div>

            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-2">
                <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
                  {profileUser.name}
                </h1>
              </div>
              {profileUser.bio && (
                <p className="text-gray-700 dark:text-gray-300 text-lg mb-4">{profileUser.bio}</p>
              )}
              {profileUser.location && (
                <div className="flex items-center text-gray-600 dark:text-gray-400 mb-4">
                  <MapPin className="h-5 w-5 mr-2" />
                  <span>{profileUser.location}</span>
                </div>
              )}

              {/* Only show followers/following for all profiles */}
              <div className="flex flex-wrap gap-6 mb-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{userStats?.followers || 0}</div>
                  <div className="text-gray-600 dark:text-gray-400 text-sm">Followers</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{userStats?.followings || 0}</div>
                  <div className="text-gray-600 dark:text-gray-400 text-sm">Following</div>
                </div>
              </div>

              {/* Action Buttons */}
              {isAuthenticated && currentUser?._id !== userId && (
                <div className="flex space-x-4">
                  {isFollowing ? (
                    <button
                      onClick={handleUnfollow}
                      className="flex items-center space-x-2 px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-xl transition-colors duration-200 font-medium"
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

        {/* Content Area */}
          {!isProfileAccessible() ? (
            /* Private Profile Message */
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="bg-white/80 dark:bg-gray-800/50 backdrop-blur-lg rounded-2xl p-12 border border-gray-200 dark:border-gray-700/50 text-center"
            >
              <div className="max-w-md mx-auto">
                <div className="bg-gray-100 dark:bg-gray-700/50 rounded-full p-6 w-24 h-24 mx-auto mb-6 flex items-center justify-center">
                  <Lock className="h-12 w-12 text-gray-600 dark:text-gray-400" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                  This Profile is Private
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  {profileUser.name} has chosen to keep their profile private. 
                  {isAuthenticated 
                    ? " Follow them to see their activities and goals." 
                    : " Sign in and follow them to see their activities and goals."
                  }
                </p>
                {!isAuthenticated && (
                  <button
                    onClick={() => navigate('/auth')}
                    className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl transition-colors duration-200 font-medium"
                  >
                    Sign In to Follow
                  </button>
                )}
              </div>
            </motion.div>
          ) : (
            /* Full Profile Content */
            <>
              {/* Tabs */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="flex justify-center mb-8"
              >
                <div className="bg-white/80 dark:bg-gray-800/50 backdrop-blur-lg rounded-2xl p-2 border border-gray-200 dark:border-gray-700/50 flex">
                  <button
                    onClick={() => setActiveTab('overview')}
                    className={`flex items-center space-x-2 px-6 py-3 rounded-xl transition-all duration-200 ${
                      activeTab === 'overview'
                        ? 'bg-blue-500 text-white shadow-lg'
                        : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700/50'
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
                        : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700/50'
                    }`}
                  >
                    <Activity className="h-5 w-5" />
                    <span className="font-medium">Activities</span>
                  </button>
                </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              {activeTab === 'overview' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* User Stats */}
                  <div className="bg-white/80 dark:bg-gray-800/50 backdrop-blur-lg rounded-2xl p-6 border border-gray-200 dark:border-gray-700/50">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
                      <Trophy className="h-6 w-6 mr-2 text-yellow-600 dark:text-yellow-400" />
                      Statistics
                    </h3>
{isProfileAccessible() ? (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl">
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">{userStats?.totalGoals || 0}</div>
                        <div className="text-gray-600 dark:text-gray-400 text-sm">Total Goals</div>
                      </div>
                      <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl">
                        <div className="text-2xl font-bold text-green-600 dark:text-green-400">{userStats?.completedGoals || 0}</div>
                        <div className="text-gray-600 dark:text-gray-400 text-sm">Completed</div>
                      </div>
                      <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl">
                        <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{userStats?.currentStreak || 0}</div>
                        <div className="text-gray-600 dark:text-gray-400 text-sm">Day Streak</div>
                      </div>
                      <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl">
                        <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{userStats?.totalPoints || 0}</div>
                        <div className="text-gray-600 dark:text-gray-400 text-sm">Points</div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="bg-gray-100 dark:bg-gray-700/50 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                        <Lock className="h-8 w-8 text-gray-600 dark:text-gray-400" />
                      </div>
                      <p className="text-gray-500 dark:text-gray-400">Statistics are private</p>
                    </div>
                  )}
                  </div>
                  {/* User Interests */}
                  <div className="bg-white/80 dark:bg-gray-800/50 backdrop-blur-lg rounded-2xl p-6 border border-gray-200 dark:border-gray-700/50">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
                      <Heart className="h-6 w-6 mr-2 text-pink-600 dark:text-pink-400" />
                      Interests
                    </h3>
                    {isProfileAccessible() ? (
                      profileUser.interests && profileUser.interests.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {profileUser.interests.map((interest, index) => (
                            <span 
                              key={index}
                              className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full text-sm font-medium"
                            >
                              {interest.charAt(0).toUpperCase() + interest.slice(1).replace('_', ' ')}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500 dark:text-gray-400 text-center py-8">No interests shared</p>
                      )
                    ) : (
                      <div className="text-center py-8">
                        <div className="bg-gray-100 dark:bg-gray-700/50 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                          <Lock className="h-8 w-8 text-gray-600 dark:text-gray-400" />
                        </div>
                        <p className="text-gray-500 dark:text-gray-400">Interests are private</p>
                      </div>
                    )}
                  </div>

                  {/* Current Goals */}
                  <div className="lg:col-span-2">
                    <div className="bg-white/80 dark:bg-gray-800/50 backdrop-blur-lg rounded-2xl p-6 border border-gray-200 dark:border-gray-700/50">
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
                        <Clock className="h-6 w-6 mr-2 text-blue-600 dark:text-blue-400" />
                        Current Goals in Progress
                      </h3>
                      {isProfileAccessible() ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {userGoals.filter(goal => !goal.completed).slice(0, 6).map((goal, index) => (
                            <div key={goal._id} className="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl">
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="font-medium text-gray-900 dark:text-white">{goal.title}</h4>
                                <Circle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                              </div>
                              <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium text-white ${getCategoryColor(goal.category)}`}>
                                  {goal.category}
                                </span>
                                <span>Started {formatTimeAgo(goal.createdAt)}</span>
                              </div>
                            </div>
                          ))}
                          {userGoals.filter(goal => !goal.completed).length === 0 && (
                            <div className="col-span-full text-center py-8">
                              <Target className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                              <p className="text-gray-500 dark:text-gray-400">No goals in progress</p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <div className="bg-gray-100 dark:bg-gray-700/50 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                            <Lock className="h-8 w-8 text-gray-600 dark:text-gray-400" />
                          </div>
                          <p className="text-gray-500 dark:text-gray-400">Goals are private</p>
                        </div>

                      )}
                    </div>
                  </div>
                </div>
              )}
            {activeTab === 'goals' && (
                <div className="bg-white/80 dark:bg-gray-800/50 backdrop-blur-lg rounded-2xl p-6 border border-gray-200 dark:border-gray-700/50">
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
                    <Target className="h-6 w-6 mr-2 text-blue-600 dark:text-blue-400" />
                    Goals
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {userGoals.map((goal, index) => (
                      <motion.div
                        key={goal._id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.1 * index }}
                        className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-6 border border-gray-200 dark:border-gray-600/30 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-all duration-200"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium text-white ${getCategoryColor(goal.category)}`}>
                            {goal.category}
                          </span>
                          {goal.completed && <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />}
                        </div>
                        
                        <h4 className="font-semibold text-gray-900 dark:text-white text-lg mb-2">{goal.title}</h4>
                        {goal.description && (
                          <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">{goal.description}</p>
                        )}
                        
                        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                          <span>Created {formatTimeAgo(goal.createdAt)}</span>
                          {goal.completed && (
                            <span className="text-green-600 dark:text-green-400">✓ Completed</span>
                          )}
                        </div>
                      </motion.div>
                    ))}
                    {userGoals.length === 0 && (
                      <div className="col-span-full text-center py-12">
                        <Target className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500 dark:text-gray-400 text-lg">No goals yet</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
};

export default UserProfile; 