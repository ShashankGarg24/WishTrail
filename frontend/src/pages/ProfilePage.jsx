import { useState, useEffect } from "react";
import { Calendar, Target, TrendingUp, Star, Edit2, ExternalLink, Youtube, Instagram, MapPin, Globe, Award, Trophy, Heart, Clock, CheckCircle, Circle, User } from "lucide-react";
import { motion } from "framer-motion";
import useApiStore from "../store/apiStore";
import ProfileEditModal from "../components/ProfileEditModal";

const ProfilePage = () => {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [userGoals, setUserGoals] = useState([]);
  const { user, isAuthenticated, loading, getGoals } = useApiStore();

  useEffect(() => {
    if (!isAuthenticated) {
      // Redirect to auth if not authenticated
      window.location.href = '/auth';
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated && user) {
      fetchUserGoals();
    }
  }, [isAuthenticated, user]);

  const fetchUserGoals = async () => {
    try {
      const result = await getGoals({});
      if (result.success) {
        setUserGoals(result.data.goals || []);
      }
    } catch (error) {
      console.error('Error fetching goals:', error);
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400">Please sign in to view your profile</p>
        </div>
      </div>
    );
  }

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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Profile Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 mb-8"
        >
          <div className="flex flex-col md:flex-row items-center md:items-start space-y-6 md:space-y-0 md:space-x-8">
            {/* Profile Picture */}
              <div className="relative">
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-32 h-32 rounded-full border-4 border-primary-500 object-cover"
                />
              <div className="absolute -bottom-2 -right-2 bg-primary-500 text-white rounded-full p-2">
                <Star className="h-6 w-6" />
              </div>
            </div>

            {/* Profile Info */}
            <div className="flex-1 text-center md:text-left">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  {user.name}
                </h1>
                <button 
                  onClick={() => setIsEditModalOpen(true)}
                  className="mt-2 md:mt-0 flex items-center space-x-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
                >
                  <Edit2 className="h-4 w-4" />
                  <span>Edit Profile</span>
                </button>
              </div>
              
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                  {user.email}
                </p>
                
              {user.bio && (
                <p className="text-gray-700 dark:text-gray-300 mb-4 max-w-2xl">
                  {user.bio}
                </p>
              )}

              {/* Location and Links */}
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                {user.location && (
                  <div className="flex items-center space-x-1">
                    <MapPin className="h-4 w-4" />
                    <span>{user.location}</span>
                  </div>
                )}

                {user.website && (
                  <a
                    href={formatUrl(user.website)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-1 hover:text-primary-500 transition-colors"
                  >
                    <Globe className="h-4 w-4" />
                    <span>Website</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
                
                {user.youtube && (
                  <a
                    href={formatUrl(user.youtube)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-1 hover:text-red-500 transition-colors"
                  >
                    <Youtube className="h-4 w-4" />
                    <span>YouTube</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
                
                {user.instagram && (
                  <a
                    href={formatUrl(user.instagram)}
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
            
              {/* Join Date */}
              <div className="flex items-center space-x-1 text-sm text-gray-500 dark:text-gray-400 mt-4">
                <Calendar className="h-4 w-4" />
                <span>
                  Joined {formatDate(user.createdAt || user.joinedDate)}
                </span>
              </div>
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
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-2 shadow-lg flex">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex items-center space-x-2 px-6 py-3 rounded-xl transition-all duration-200 ${
                activeTab === 'overview'
                  ? 'bg-primary-500 text-white shadow-lg'
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
                  ? 'bg-primary-500 text-white shadow-lg'
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
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
                  <Trophy className="h-6 w-6 mr-2 text-yellow-600 dark:text-yellow-400" />
                  Your Statistics
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl">
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">{user.totalGoals || 0}</div>
                    <div className="text-gray-600 dark:text-gray-400 text-sm">Total Goals</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">{user.completedGoals || 0}</div>
                    <div className="text-gray-600 dark:text-gray-400 text-sm">Completed</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl">
                    <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{user.currentStreak || 0}</div>
                    <div className="text-gray-600 dark:text-gray-400 text-sm">Day Streak</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{user.totalPoints || 0}</div>
                    <div className="text-gray-600 dark:text-gray-400 text-sm">Points</div>
                  </div>
                </div>
        {/* Achievement Level */}
                <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Achievement Level</h4>
                  <div className="flex items-center space-x-3">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {user.level || 'Novice'}
                        </span>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {user.totalPoints || 0} points
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-primary-500 h-2 rounded-full transition-all duration-300"
                          style={{ 
                            width: `${Math.min(((user.totalPoints || 0) % 100), 100)}%` 
                          }}
                        ></div>
                      </div>
                    </div>
                    <div className="p-3 bg-primary-100 dark:bg-primary-900/20 rounded-full">
                      <TrendingUp className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                    </div>
                  </div>
                </div>
              </div>

              {/* User Interests */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
                  <Heart className="h-6 w-6 mr-2 text-pink-600 dark:text-pink-400" />
                  Your Interests
                </h3>
                {user.interests && user.interests.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {user.interests.map((interest, index) => (
                      <span 
                        key={index}
                        className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full text-sm font-medium"
                      >
                        {interest.charAt(0).toUpperCase() + interest.slice(1).replace('_', ' ')}
                      </span>
                    ))}
                  </div>
                ) : (
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
                )}
              </div>

              {/* Current Goals */}
              <div className="lg:col-span-2">
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
                    <Clock className="h-6 w-6 mr-2 text-blue-600 dark:text-blue-400" />
                    Current Goals in Progress
                  </h3>
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
                </div>
              </div>
            </div>
          )}

          {activeTab === 'goals' && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
                <Target className="h-6 w-6 mr-2 text-blue-600 dark:text-blue-400" />
                All Your Goals
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
                      {goal.completed ? (
                        <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                      ) : (
                        <Circle className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                      )}
                    </div>
                    
                    <h4 className="font-semibold text-gray-900 dark:text-white text-lg mb-2">{goal.title}</h4>
                    {goal.description && (
                      <p className="text-gray-600 dark:text-gray-300 text-sm mb-4 line-clamp-2">{goal.description}</p>
                    )}
                    
                    <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                      <span>Created {formatTimeAgo(goal.createdAt)}</span>
                      {goal.completed ? (
                        <span className="text-green-600 dark:text-green-400 font-medium">✓ Completed</span>
                      ) : (
                        <span className="text-blue-600 dark:text-blue-400 font-medium">In Progress</span>
                      )}
                    </div>

                    {goal.completed && goal.completedAt && (
                      <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                        Completed {formatTimeAgo(goal.completedAt)}
                      </div>
                    )}
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
      </div>

      {/* Edit Profile Modal */}
      <ProfileEditModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
      />
    </div>
  );
};

export default ProfilePage; 