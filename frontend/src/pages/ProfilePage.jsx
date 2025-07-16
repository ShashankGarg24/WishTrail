import { useState, useEffect } from "react";
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar, Target, TrendingUp, Star, Edit2, ExternalLink, Youtube, Instagram, MapPin, Globe, Award, Trophy, Heart, Clock, CheckCircle, Circle, User, Users, UserPlus, UserCheck, ArrowLeft, Lock } from "lucide-react";
import { motion } from "framer-motion";
import useApiStore from "../store/apiStore";
import ProfileEditModal from "../components/ProfileEditModal";

const ProfilePage = () => {
  const { userId } = useParams(); // If userId exists, viewing another user's profile
  const navigate = useNavigate();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [userGoals, setUserGoals] = useState([]);
  const [profileUser, setProfileUser] = useState(null);
  const [userStats, setUserStats] = useState(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const { 
    user: currentUser, 
    isAuthenticated, 
    getGoals,
    getUser,
    getUserGoals,
    followUser,
    unfollowUser,
  } = useApiStore();

  // Determine if viewing own profile or another user's profile
  const isOwnProfile = !userId || (currentUser && currentUser._id === userId);
  const displayUser = isOwnProfile ? currentUser : profileUser;

  const isProfileAccessible = () => {
    if (isOwnProfile) return true;
    if (!profileUser) return false;
    if (!profileUser.isPrivate || isFollowing) return true;
    return false;
  };

  useEffect(() => {
    if (!isAuthenticated) {
      window.location.href = '/auth';
      return;
    }

    if (isOwnProfile) {
      fetchOwnProfile();
    } else {
      fetchUserProfile();
    }
  }, [isAuthenticated, userId]);

  const fetchOwnProfile = async () => {
    setLoading(true);
    try {
      const result = await getGoals({});
      if (result.success) {
        setUserGoals(result.goals || []);
      }
    } catch (error) {
      console.error('Error fetching own goals:', error);
    } finally {
      setLoading(false);
    }
  };

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

        // Fetch user goals if profile is accessible
        if (userResult.user && (!userResult.user.isPrivate || userResult.isFollowing)) {
          const goalsResult = await getUserGoals(userId, { limit: 10 });
          if (goalsResult.success) {
            setUserGoals(goalsResult.goals);
          }
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
        if (profileUser?.isPrivate) {
          setUserGoals([]);
        }
        fetchUserProfile();
      }
    } catch (error) {
      console.error('Error unfollowing user:', error);
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
      'Health & Fitness': 'bg-green-500',
      'Education & Learning': 'bg-yellow-500',
      'Career & Business': 'bg-blue-500',
      'Personal Development': 'bg-purple-500',
      'Financial Goals': 'bg-red-500',
      'Creative Projects': 'bg-pink-500',
      'Travel & Adventure': 'bg-orange-500',
      'Relationships': 'bg-pink-500',
      'Family & Friends': 'bg-indigo-500',
      'Other': 'bg-gray-500'
    };
    return colors[category] || 'bg-gray-500';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatUrl = (url) => {
    if (!url) return '';
    return url.startsWith('http') ? url : `https://${url}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-slate-900 dark:via-gray-900 dark:to-zinc-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!isOwnProfile && (error || !profileUser)) {
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

  if (!displayUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400">Please sign in to view your profile</p>
        </div>
      </div>
    );
  }

  const backgroundClass = isOwnProfile 
    ? "min-h-screen bg-gray-50 dark:bg-gray-900" 
    : "min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-slate-900 dark:via-gray-900 dark:to-zinc-900";

  // Use same width for both profile types
  const containerClass = "max-w-4xl";

  return (
    <div className={backgroundClass}>
      <div className={`${containerClass} mx-auto px-4 py-8`}>
        {/* Back Button - only show for other users' profiles */}
        {!isOwnProfile && (
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
        )}
        
        {/* Profile Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className={isOwnProfile 
            ? "bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 mb-8"
            : "bg-white/80 dark:bg-gray-800/50 backdrop-blur-lg rounded-2xl p-8 border border-gray-200 dark:border-gray-700/50 mb-8"
          }
        >
          <div className="flex flex-col md:flex-row items-start space-y-6 md:space-y-0 md:space-x-8">
            {/* Profile Picture */}
            <div className="relative">
              <img
                src={displayUser.avatar || '/api/placeholder/150/150'}
                alt={displayUser.name}
                className="w-36 h-36 rounded-full border-4 border-gray-300 dark:border-gray-600 object-cover"
              />
              {isOwnProfile ? (
                <div className="absolute -bottom-2 -right-2 bg-primary-500 text-white rounded-full p-2">
                  <Star className="h-6 w-6" />
                </div>
              ) : (
                displayUser.level && (
                  <div className="absolute -bottom-2 -right-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-3 py-1 rounded-full text-sm font-bold">
                    {displayUser.level}
                  </div>
                )
              )}
            </div>

            {/* Profile Info */}
            <div className="flex-1">
              {/* Name and Username Row */}
              <div className="flex flex-col md:flex-row md:items-center md:space-x-4 mb-4">
                <div className="flex items-center space-x-3 mb-3 md:mb-0">
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                    {displayUser.name}
                  </h1>
                  {/* Action Button - Desktop */}
                  <div className="hidden md:block">
                    {isOwnProfile ? (
                      <button 
                        onClick={() => setIsEditModalOpen(true)}
                        className="flex items-center space-x-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg transition-colors font-medium border border-gray-300 dark:border-gray-600"
                      >
                        <Edit2 className="h-4 w-4" />
                        <span>Edit Profile</span>
                      </button>
                    ) : (
                      isAuthenticated && (
                        <div className="flex space-x-3">
                          {isFollowing ? (
                            <button
                              onClick={handleUnfollow}
                              className="flex items-center space-x-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg transition-colors font-medium border border-gray-300 dark:border-gray-600"
                            >
                              <UserCheck className="h-4 w-4" />
                              <span>Following</span>
                            </button>
                          ) : (
                            <button
                              onClick={handleFollow}
                              className="flex items-center space-x-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors font-medium"
                            >
                              <UserPlus className="h-4 w-4" />
                              <span>Follow</span>
                            </button>
                          )}
                        </div>
                      )
                    )}
                  </div>
                </div>
                
                {/* Username */}
                <p className="text-xl text-gray-600 dark:text-gray-400">
                  @{displayUser.username}
                </p>
              </div>

              {/* Stats Row */}
              <div className="flex items-center space-x-8 mb-4">
                <div className="text-center">
                  <div className="text-xl font-bold text-gray-900 dark:text-white">
                    {isOwnProfile ? (displayUser.totalGoals || 0) : (userStats?.totalGoals || 0)}
                  </div>
                  <div className="text-gray-600 dark:text-gray-400 text-sm">Goals</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-gray-900 dark:text-white">
                    {isOwnProfile ? (displayUser.followersCount || 0) : (userStats?.followers || 0)}
                  </div>
                  <div className="text-gray-600 dark:text-gray-400 text-sm">Followers</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-gray-900 dark:text-white">
                    {isOwnProfile ? (displayUser.followingCount || 0) : (userStats?.followings || 0)}
                  </div>
                  <div className="text-gray-600 dark:text-gray-400 text-sm">Following</div>
                </div>
              </div>

              {/* Bio */}
              {displayUser.bio && (
                <p className="text-gray-700 dark:text-gray-300 mb-4 leading-relaxed">
                  {displayUser.bio}
                </p>
              )}
              
              {/* Location and Join Date */}
              <div className="flex flex-col space-y-2 mb-4">
                {!isOwnProfile && displayUser.location && (
                  <div className="flex items-center text-gray-600 dark:text-gray-400">
                    <MapPin className="h-4 w-4 mr-2" />
                    <span className="text-sm">{displayUser.location}</span>
                  </div>
                )}
                <div className="flex items-center text-gray-600 dark:text-gray-400">
                  <Calendar className="h-4 w-4 mr-2" />
                  <span className="text-sm">Joined {formatDate(displayUser.createdAt || displayUser.joinedDate)}</span>
                </div>
              </div>

              {/* Social Links - only for own profile */}
              {isOwnProfile && (displayUser.website || displayUser.youtube || displayUser.instagram) && (
                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-4">
                  {displayUser.website && (
                    <a
                      href={formatUrl(displayUser.website)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center space-x-1 hover:text-primary-500 transition-colors"
                    >
                      <Globe className="h-4 w-4" />
                      <span>Website</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                  
                  {displayUser.youtube && (
                    <a
                      href={formatUrl(displayUser.youtube)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center space-x-1 hover:text-red-500 transition-colors"
                    >
                      <Youtube className="h-4 w-4" />
                      <span>YouTube</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                  
                  {displayUser.instagram && (
                    <a
                      href={formatUrl(displayUser.instagram)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center space-x-1 hover:text-pink-500 transition-colors"
                    >
                      <Instagram className="h-4 w-4" />
                      <span>Instagram</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              )}

              {/* Action Button - Mobile */}
              <div className="block md:hidden">
                {isOwnProfile ? (
                  <button 
                    onClick={() => setIsEditModalOpen(true)}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg transition-colors font-medium border border-gray-300 dark:border-gray-600"
                  >
                    <Edit2 className="h-4 w-4" />
                    <span>Edit Profile</span>
                  </button>
                ) : (
                  isAuthenticated && (
                    <div className="w-full">
                      {isFollowing ? (
                        <button
                          onClick={handleUnfollow}
                          className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg transition-colors font-medium border border-gray-300 dark:border-gray-600"
                        >
                          <UserCheck className="h-4 w-4" />
                          <span>Following</span>
                        </button>
                      ) : (
                        <button
                          onClick={handleFollow}
                          className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors font-medium"
                        >
                          <UserPlus className="h-4 w-4" />
                          <span>Follow</span>
                        </button>
                      )}
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        </motion.div>

         {/* Content Area */}
        {!isOwnProfile && !isProfileAccessible() ? (
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
                {displayUser.name} has chosen to keep their profile private. 
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
              <div className={isOwnProfile 
                ? "bg-white dark:bg-gray-800 rounded-2xl p-2 shadow-lg flex"
                : "bg-white/80 dark:bg-gray-800/50 backdrop-blur-lg rounded-2xl p-2 border border-gray-200 dark:border-gray-700/50 flex"
              }>
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`flex items-center space-x-2 px-6 py-3 rounded-xl transition-all duration-200 ${
                    activeTab === 'overview'
                      ? (isOwnProfile ? 'bg-primary-500 text-white shadow-lg' : 'bg-blue-500 text-white shadow-lg')
                      : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <User className="h-5 w-5" />
                  <span className="font-medium">Overview</span>
                </button>
                <button
                  onClick={() => setActiveTab('goals')}
                  className={`flex items-center space-x-2 px-6 py-3 rounded-xl transition-all duration-200 ${
                    activeTab === 'goals'
                      ? (isOwnProfile ? 'bg-primary-500 text-white shadow-lg' : 'bg-blue-500 text-white shadow-lg')
                      : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
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
                  {/* User Stats */}
                  <div className={isOwnProfile 
                    ? "bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg"
                    : "bg-white/80 dark:bg-gray-800/50 backdrop-blur-lg rounded-2xl p-6 border border-gray-200 dark:border-gray-700/50"
                  }>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
                      <Trophy className="h-6 w-6 mr-2 text-yellow-600 dark:text-yellow-400" />
                      {isOwnProfile ? 'Your Statistics' : 'Statistics'}
                    </h3>
                    {isProfileAccessible() ? (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl">
                          <div className="text-2xl font-bold text-gray-900 dark:text-white">
                            {isOwnProfile ? (displayUser.totalGoals || 0) : (userStats?.totalGoals || 0)}
                          </div>
                          <div className="text-gray-600 dark:text-gray-400 text-sm">Total Goals</div>
                        </div>
                        <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl">
                          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                            {isOwnProfile ? (displayUser.completedGoals || 0) : (userStats?.completedGoals || 0)}
                          </div>
                          <div className="text-gray-600 dark:text-gray-400 text-sm">Completed</div>
                        </div>
                        <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl">
                          <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                            {isOwnProfile ? (displayUser.currentStreak || 0) : (userStats?.currentStreak || 0)}
                          </div>
                          <div className="text-gray-600 dark:text-gray-400 text-sm">Day Streak</div>
                        </div>
                        <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl">
                          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                            {isOwnProfile ? (displayUser.totalPoints || 0) : (userStats?.totalPoints || 0)}
                          </div>
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

                    {/* Achievement Level for own profile */}
                    {isOwnProfile && (
                      <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl">
                        <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Achievement Level</h4>
                        <div className="flex items-center space-x-3">
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                {displayUser.level || 'Novice'}
                              </span>
                              <span className="text-sm text-gray-500 dark:text-gray-400">
                                {displayUser.totalPoints || 0} points
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                              <div
                                className="bg-primary-500 h-2 rounded-full transition-all duration-300"
                                style={{ 
                                  width: `${Math.min(((displayUser.totalPoints || 0) % 100), 100)}%` 
                                }}
                              ></div>
                            </div>
                          </div>
                          <div className="p-3 bg-primary-100 dark:bg-primary-900/20 rounded-full">
                            <TrendingUp className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  {/* User Interests */}
                  <div className={isOwnProfile 
                    ? "bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg"
                    : "bg-white/80 dark:bg-gray-800/50 backdrop-blur-lg rounded-2xl p-6 border border-gray-200 dark:border-gray-700/50"
                  }>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
                      <Heart className="h-6 w-6 mr-2 text-pink-600 dark:text-pink-400" />
                      {isOwnProfile ? 'Your Interests' : 'Interests'}
                    </h3>
                    {isProfileAccessible() ? (
                      displayUser.interests && displayUser.interests.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {displayUser.interests.map((interest, index) => (
                            <span 
                              key={index}
                              className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full text-sm font-medium"
                            >
                              {interest.charAt(0).toUpperCase() + interest.slice(1).replace('_', ' ')}
                            </span>
                          ))}
                        </div>
                      ) : (
                        isOwnProfile ? (
                          <div className="text-center py-8">
                            <div className="bg-gray-100 dark:bg-gray-700/50 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                              <Heart className="h-8 w-8 text-gray-400" />
                            </div>
                            <p className="text-gray-600 dark:text-gray-400 mb-4">No interests added yet</p>
                            <p className="text-gray-500 dark:text-gray-500 text-sm mb-4">
                              Add interests to help others discover shared passions and connect with you.
                            </p>
                            <button
                              onClick={() => setIsEditModalOpen(true)}
                              className="inline-flex items-center px-4 py-2 bg-primary-500 text-white text-sm font-medium rounded-lg hover:bg-primary-600 transition-colors"
                            >
                              <Heart className="h-4 w-4 mr-2" />
                              Add Interests
                            </button>
                          </div>
                        ) : (
                          <p className="text-gray-500 dark:text-gray-400 text-center py-8">No interests shared</p>
                        )
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
                    <div className={isOwnProfile 
                      ? "bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg"
                      : "bg-white/80 dark:bg-gray-800/50 backdrop-blur-lg rounded-2xl p-6 border border-gray-200 dark:border-gray-700/50"
                    }>
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
                <div className={isOwnProfile 
                  ? "bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg"
                  : "bg-white/80 dark:bg-gray-800/50 backdrop-blur-lg rounded-2xl p-6 border border-gray-200 dark:border-gray-700/50"
                }>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
                    <Target className="h-6 w-6 mr-2 text-blue-600 dark:text-blue-400" />
                    {isOwnProfile ? 'All Goals' : 'Goals'}
                  </h3>
                  {isProfileAccessible() ? (
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
                  ) : (
                    <div className="text-center py-8">
                      <div className="bg-gray-100 dark:bg-gray-700/50 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                        <Lock className="h-8 w-8 text-gray-600 dark:text-gray-400" />
                      </div>
                      <p className="text-gray-500 dark:text-gray-400">Goals are private</p>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </>
        )}
        {/* Profile Edit Modal - only for own profile */}
        {isOwnProfile && (
          <ProfileEditModal 
            isOpen={isEditModalOpen} 
            onClose={() => setIsEditModalOpen(false)} 
          />
        )}
      </div>
    </div>
  );
};

export default ProfilePage; 