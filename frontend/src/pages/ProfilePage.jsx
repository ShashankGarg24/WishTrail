import { useState, useEffect } from "react";
import { Calendar, Target, TrendingUp, Star, Edit2, ExternalLink, Youtube, Instagram, MapPin, Globe, Award } from "lucide-react";
import { motion } from "framer-motion";
import useApiStore from "../store/apiStore";
import ProfileEditModal from "../components/ProfileEditModal";

const ProfilePage = () => {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const { user, isAuthenticated, loading } = useApiStore();

  useEffect(() => {
    if (!isAuthenticated) {
      // Redirect to auth if not authenticated
      window.location.href = '/auth';
    }
  }, [isAuthenticated]);

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

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg"
        >
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-full">
                <Target className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {user.totalGoals || 0}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Goals</p>
          </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg"
          >
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-full">
                <Award className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {user.completedGoals || 0}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Completed</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg"
        >
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-yellow-100 dark:bg-yellow-900/20 rounded-full">
                <Star className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                    </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {user.totalPoints || 0}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Points</p>
                </div>
            </div>
          </motion.div>
            </div>

        {/* Achievement Level */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg"
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Achievement Level
          </h3>
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