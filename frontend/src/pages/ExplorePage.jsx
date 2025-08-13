import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  Users, 
  Activity, 
  Heart, 
  UserPlus, 
  TrendingUp, 
  Compass,
  User,
  Target,
  Clock,
  MessageCircle,
  ThumbsUp,
  Calendar,
  Flame,
  UserCheck,
  X
} from 'lucide-react';
import useApiStore from '../store/apiStore';
import SkeletonList from '../components/loader/SkeletonList'
import ActivityDetailModal from '../components/ActivityDetailModal'
import ActivityCommentsModal from '../components/ActivityCommentsModal'

const ExplorePage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('Activities');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [activities, setActivities] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState('');
  const openLightbox = (url) => { if (!url) return; setLightboxUrl(url); setLightboxOpen(true); };
  const closeLightbox = () => { setLightboxOpen(false); setLightboxUrl(''); };
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailActivity, setDetailActivity] = useState(null);
  const openDetail = (act) => { setDetailActivity(act); setDetailOpen(true); };
  const closeDetail = () => { setDetailOpen(false); setDetailActivity(null); };
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentsActivity, setCommentsActivity] = useState(null);
  const openComments = (act) => { setCommentsActivity(act); setCommentsOpen(true); };
  const closeComments = () => { setCommentsOpen(false); setCommentsActivity(null); };

  const { 
    isAuthenticated, 
    user,
    followUser, 
    unfollowUser, 
    getActivityFeed,
    searchUsers, 
    likeActivity,
    unlikeActivity,
    getFollowing,
    following,
    followedUsers,
    initializeFollowingStatus,
    getUsers
  } = useApiStore();
  // Infinite scroll state
  const ACTIVITIES_PAGE_SIZE = 10;
  const DISCOVER_PAGE_SIZE = 9;
  const [activitiesPage, setActivitiesPage] = useState(1);
  const [activitiesHasMore, setActivitiesHasMore] = useState(true);
  const [loadingMoreActivities, setLoadingMoreActivities] = useState(false);
  const [discoverPage, setDiscoverPage] = useState(1);
  const [discoverHasMore, setDiscoverHasMore] = useState(true);
  const [loadingMoreDiscover, setLoadingMoreDiscover] = useState(false);
  const activitiesSentinelRef = useRef(null);
  const discoverSentinelRef = useRef(null);
  const mergeUniqueById = (prev, next) => {
    const seen = new Set((prev || []).map((i) => i?._id).filter(Boolean));
    const merged = [...(prev || [])];
    for (const item of (next || [])) {
      if (!item || !item._id) continue;
      if (!seen.has(item._id)) {
        merged.push(item);
        seen.add(item._id);
      }
    }
    return merged;
  };
  
  useEffect(() => {
    if (isAuthenticated) {
      fetchInitialData();
      initializeFollowingStatus();
    }
  }, [isAuthenticated]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'Activities') {
        // First page for activities
        setActivitiesPage(1);
        setActivitiesHasMore(true);
        const activitiesData = await getActivityFeed({ page: 1, limit: ACTIVITIES_PAGE_SIZE });
        setActivities(activitiesData.activities || []);
        const totalPages = activitiesData.pagination?.pages || 1;
        setActivitiesHasMore(1 < totalPages);
        // Do not mutate users list here; keep Discover users separate
      } else {
        // First page for discover users
        setDiscoverPage(1);
        setDiscoverHasMore(true);
        const usersData = await getUsers({ page: 1, limit: DISCOVER_PAGE_SIZE });
        if (usersData.success) {
          const filteredUsers = (usersData.users || []).filter(u => u && u._id && u._id !== user?._id);
          // Replace the entire list for page 1 to avoid stale entries
          setUsers(filteredUsers.slice(0, DISCOVER_PAGE_SIZE));
          const totalPages = usersData.pagination?.pages || 1;
          setDiscoverHasMore(1 < totalPages);
        } else {
          setUsers([]);
        }
      }
    } catch (error) {
      console.error('Error fetching initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Refetch data when tab changes
  useEffect(() => {
    if (!isAuthenticated) return;
    if (activeTab === 'Activities') {
      setActivities([]);
      setActivitiesPage(1);
      setActivitiesHasMore(true);
    } else {
      setUsers([]);
      setDiscoverPage(1);
      setDiscoverHasMore(true);
    }
    fetchInitialData();
  }, [activeTab]);

  const handleSearch = async (term) => {
    if (!term.trim() || term.trim().length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    try {
      const results = await searchUsers(term);
      const filteredResults = (results || []).filter(u => u && u._id !== user?._id);
      setSearchResults(filteredResults);
    } catch (error) {
      console.error('Error searching:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    // Only trigger search if there's a valid search term
    if (searchTerm.trim() && searchTerm.trim().length >= 2) {
      const debounceTimer = setTimeout(() => {
        handleSearch(searchTerm);
      }, 300);
      return () => clearTimeout(debounceTimer);
    } else {
      setSearchResults([]);
      setIsSearching(false);
    }
  }, [searchTerm]);

  // Load more handlers
  const loadMoreActivities = useCallback(async () => {
    if (loadingMoreActivities || !activitiesHasMore) return;
    setLoadingMoreActivities(true);
    try {
      const next = activitiesPage + 1;
      const resp = await getActivityFeed({ page: next, limit: ACTIVITIES_PAGE_SIZE });
      setActivities(prev => mergeUniqueById(prev, resp.activities || []));
      setActivitiesPage(next);
      const totalPages = resp.pagination?.pages || next;
      setActivitiesHasMore(next < totalPages);
    } catch (e) {
      setActivitiesHasMore(false);
    } finally {
      setLoadingMoreActivities(false);
    }
  }, [activitiesPage, activitiesHasMore, loadingMoreActivities, getActivityFeed]);

  const loadMoreDiscover = useCallback(async () => {
    if (loadingMoreDiscover || !discoverHasMore) return;
    if (searchTerm.trim().length >= 2) return; // pause during search
    setLoadingMoreDiscover(true);
    try {
      const next = discoverPage + 1;
      const resp = await getUsers({ page: next, limit: DISCOVER_PAGE_SIZE });
      if (resp.success) {
        const filtered = (resp.users || []).filter(u => u && u._id && u._id !== user?._id);
        setUsers(prev => mergeUniqueById(prev, filtered));
        setDiscoverPage(next);
        const totalPages = resp.pagination?.pages || next;
        setDiscoverHasMore(next < totalPages);
      } else {
        setDiscoverHasMore(false);
      }
    } catch (e) {
      setDiscoverHasMore(false);
    } finally {
      setLoadingMoreDiscover(false);
    }
  }, [discoverPage, discoverHasMore, loadingMoreDiscover, getUsers, searchTerm]);

  // Observer
  useEffect(() => {
    if (!isAuthenticated) return;
    const observer = new IntersectionObserver((entries) => {
      const entry = entries[0];
      if (entry.isIntersecting) {
        if (activeTab === 'Activities') loadMoreActivities();
        if (activeTab === 'discover') loadMoreDiscover();
      }
    }, { root: null, rootMargin: '300px', threshold: 0.1 });
    const target = activeTab === 'Activities' ? activitiesSentinelRef.current : discoverSentinelRef.current;
    if (target) observer.observe(target);
    return () => observer.disconnect();
  }, [activeTab, isAuthenticated, loadMoreActivities, loadMoreDiscover, activities.length, users.length, activitiesHasMore, discoverHasMore, searchTerm]);

  const handleFollow = async (userId) => {
    try {
      await followUser(userId);
      // Update local state
      setUsers(users.map(u => 
        u._id === userId ? { ...u, isFollowing: true } : u
      ));
      setSearchResults(searchResults.map(u => 
        u._id === userId ? { ...u, isFollowing: true } : u
      ));
    } catch (error) {
      console.error('Error following user:', error);
    }
  };

  const handleUnfollow = async (userId) => {
    try {
      await unfollowUser(userId);
      // Update local state
      setUsers(users.map(u => 
        u._id === userId ? { ...u, isFollowing: false } : u
      ));
      setSearchResults(searchResults.map(u => 
        u._id === userId ? { ...u, isFollowing: false } : u
      ));
      
      // If we're in Activities tab, remove the user from the list
      if (activeTab === 'Activities') {
        setUsers(users.filter(u => u._id !== userId));
      }
    } catch (error) {
      console.error('Error unfollowing user:', error);
    }
  };

  const [likePending, setLikePending] = useState({});
  const toggleActivityLikeOptimistic = async (activityId) => {
    if (likePending[activityId]) return;
    setLikePending((p) => ({ ...p, [activityId]: true }));
    // Determine intended action from current state before optimistic flip
    const current = activities.find(a => a._id === activityId);
    const intendLike = !(current?.isLiked);
    // Optimistic update
    setActivities((prev) => prev.map((a) => {
      if (a._id !== activityId) return a;
      const currentCount = a.likeCount || 0;
      return intendLike
        ? { ...a, isLiked: true, likeCount: currentCount + 1 }
        : { ...a, isLiked: false, likeCount: Math.max(currentCount - 1, 0) };
    }));
    try {
      const resp = await likeActivity(activityId, intendLike);
      const { likeCount, isLiked } = resp?.data?.data || {};
      if (typeof likeCount === 'number') {
        setActivities((prev) => prev.map((a) => a._id === activityId ? { ...a, likeCount, isLiked: !!isLiked } : a));
      }
    } catch (err) {
      // Revert on failure
      setActivities((prev) => prev.map((a) => {
        if (a._id !== activityId) return a;
        const currentCount = a.likeCount || 0;
        return intendLike
          ? { ...a, isLiked: false, likeCount: Math.max(currentCount - 1, 0) }
          : { ...a, isLiked: true, likeCount: currentCount + 1 };
      }));
      console.error('Activity like toggle failed', err);
    } finally {
      setLikePending((p) => ({ ...p, [activityId]: false }));
    }
  };

  // Check if user is followed
  const isUserFollowed = (userId) => {
    return followedUsers.includes(userId);
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

  const getCategoryIcon = (category) => {
    switch(category) {
      case 'Career':
      case 'Career & Business':
        return '💼';
      case 'Health':
      case 'Health & Fitness':
        return '💪';
      case 'Personal Development':
        return '🌱';
      case 'Education':
      case 'Education & Learning':
        return '📚';
      case 'Finance':
      case 'Financial Goals':
        return '💰';
      case 'Creative Projects':
        return '🎨';
      case 'Travel & Adventure':
        return '✈️';
      case 'Relationships':
        return '❤️';
      case 'Family & Friends':
        return '👨‍👩‍👧‍👦';
      default:
        return '🎯';
    }
  };

  const getActivityText = (activity) => {
    switch(activity.type) {
      case 'goal_completed':
        return 'completed a goal';
      case 'goal_created':
        return 'created a new goal';
      case 'user_followed':
        return `started following you`;
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

  const getActivityIcon = (activity) => {
    switch(activity.type) {
      case 'goal_completed':
        return '🎯';
      case 'goal_created':
        return '✨';
      case 'user_followed':
        return '👥';
      case 'level_up':
        return '⬆️';
      case 'streak_milestone':
        return '🔥';
      case 'achievement_earned':
        return '🏆';
      default:
        return '📝';
    }
  };

  const UserCard = ({ user, showFollowButton = true }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-200 border border-gray-200 dark:border-gray-700"
    >
        <div className="flex items-center space-x-4">
          <img
          src={user.avatar || `/api/placeholder/64/64`}
            alt={user.name}
          className="w-16 h-16 rounded-full border-2 border-gray-200 dark:border-gray-600 cursor-pointer"
          onClick={() => navigate(`/profile/${user._id}`)}
          />
        <div className="flex-1">
          <h3 
            className="text-lg font-semibold text-gray-900 dark:text-white cursor-pointer hover:text-blue-500"
            onClick={() => navigate(`/profile/${user._id}`)}
          >
              {user.name}
            </h3>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            {user.bio || 'No bio available'}
          </p>
          <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500 dark:text-gray-400">
            <span className="flex items-center space-x-1">
              <Target className="h-4 w-4" />
              <span>{user.completedGoals || 0} goals</span>
            </span>
            <span className="flex items-center space-x-1">
              <Flame className="h-4 w-4" />
              <span>{user.currentStreak || 0} day streak</span>
            </span>
          </div>
        </div>
        {showFollowButton && user._id !== user?.id && (
          <div className="flex flex-col space-y-2">
            {isUserFollowed(user._id) || user.isFollowing ? (
              <button
                onClick={() => handleUnfollow(user._id)}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                <UserCheck className="h-4 w-4" />
                <span>Following</span>
              </button>
            ) : (
              <button
                onClick={() => handleFollow(user._id)}
                className="flex items-center space-x-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
              >
                <UserPlus className="h-4 w-4" />
                <span>Follow</span>
              </button>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
      
  const displayUsers = searchTerm.trim() && searchTerm.trim().length >= 2 ? searchResults : users;
      
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 dark:from-slate-900 dark:via-gray-900 dark:to-zinc-900">
        <div className="text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5 }}
            className="bg-gradient-to-r from-blue-500 to-indigo-600 p-6 rounded-full mb-6 mx-auto w-24 h-24 flex items-center justify-center"
          >
            <Compass className="h-12 w-12 text-white" />
          </motion.div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Explore WishTrail
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mb-8 max-w-md mx-auto">
            Discover inspiring goals and connect with like-minded achievers
          </p>
          <a href="/auth" className="btn-primary text-lg px-8 py-3">
            Join the Community
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-slate-900 dark:via-gray-900 dark:to-zinc-900">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8"
        >
          <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-4">
            Explore
          </h1>
          <p className="text-gray-600 dark:text-gray-300 text-xl max-w-3xl mx-auto">
            Discover inspiring goals and connect with achievers in the community
          </p>
        </motion.div>


        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex justify-center mb-8"
        >
          <div className="bg-white/80 dark:bg-gray-800/50 backdrop-blur-lg rounded-2xl p-2 border border-gray-200 dark:border-gray-700/50 flex shadow-lg">
            <button
              onClick={() => setActiveTab('Activities')}
              className={`flex items-center space-x-2 px-6 py-3 rounded-xl transition-all duration-200 ${
                activeTab === 'Activities'
                  ? 'bg-blue-500 text-white shadow-lg'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700/50'
              }`}
            >
              <Activity className="h-5 w-5" />
              <span className="font-medium">Activities</span>
            </button>
            <button
              onClick={() => setActiveTab('discover')}
              className={`flex items-center space-x-2 px-6 py-3 rounded-xl transition-all duration-200 ${
                activeTab === 'discover'
                  ? 'bg-blue-500 text-white shadow-lg'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700/50'
              }`}
            >
              <Users className="h-5 w-5" />
              <span className="font-medium">Discover</span>
            </button>
          </div>
        </motion.div>

        {/* Search Bar */}
        {activeTab === 'discover' && 
          (<motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="relative max-w-2xl mx-auto mb-8"
          >
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Search users by name or goals..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-white/80 dark:bg-gray-800/50 backdrop-blur-lg border border-gray-200 dark:border-gray-700/50 rounded-2xl text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-lg"
              />
              {/* {(isSearching || loading) && (
                <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                  </div>
              )} */}
            </div>
          </motion.div>)
        }

        {/* Global inline loader for Discover */}
        {activeTab === 'discover' && (loading || isSearching) && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        )}

        {/* Content */}
        <div className="w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
        >
            {activeTab === 'discover' && (
              <div className="w-full">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
                    <Users className="h-6 w-6 mr-2 text-blue-500" />
                    {searchTerm.trim() ? 'Search Results' : 'Discover Users'}
                  </h2>
                </div>

                {(loading || isSearching) ? (
                  <SkeletonList count={9} grid avatar lines={3} />
                ) : displayUsers.length > 0 ? (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {displayUsers.filter(u => u && u._id).map((userItem, index) => (
                        <motion.div
                          key={`${userItem._id}-${index}`}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.5, delay: 0.1 * index }}
                          className="bg-white/80 dark:bg-gray-800/50 backdrop-blur-lg rounded-2xl p-6 border border-gray-200 dark:border-gray-700/50 hover:border-gray-300 dark:hover:border-gray-600/50 transition-all duration-200 shadow-lg hover:shadow-xl"
                        >
                          <div className="flex items-center space-x-4 mb-4">
                            <img
                              src={userItem.avatar || '/api/placeholder/64/64'}
                              alt={userItem.name}
                              className="w-16 h-16 rounded-full border-2 border-gray-200 dark:border-gray-600 cursor-pointer hover:border-blue-500 transition-colors"
                              onClick={() => userItem.username && navigate(`/profile/@${userItem.username}`)}
                            />
                            <div className="flex-1">
                              <h3 
                                className="font-semibold text-gray-900 dark:text-white text-lg cursor-pointer hover:text-blue-500 transition-colors"
                                onClick={() => userItem.username && navigate(`/profile/@${userItem.username}`)}
                              >
                                {userItem.name}
                              </h3>
                              <p className="text-gray-500 dark:text-gray-400 text-sm">
                                @{userItem.username || userItem.email?.split('@')[0]}
                              </p>
                            </div>
                          </div>

                          <div className="space-y-2 mb-4">
                            <div className="flex items-center text-gray-600 dark:text-gray-300 text-sm">
                              <Target className="h-4 w-4 mr-2 text-blue-500" />
                              <span>{userItem.totalGoals || 0} goals</span>
                            </div>
                            <div className="flex items-center text-gray-600 dark:text-gray-300 text-sm">
                              <TrendingUp className="h-4 w-4 mr-2 text-green-500" />
                              <span>{userItem.completedGoals || 0} completed</span>
                            </div>
                            <div className="flex items-center text-gray-600 dark:text-gray-300 text-sm">
                              <Flame className="h-4 w-4 mr-2 text-orange-500" />
                              <span>{userItem.currentStreak || 0} day streak</span>
                            </div>
                          </div>

                          {userItem.recentGoals && userItem.recentGoals.length > 0 && (
                            <div className="mb-4">
                              <p className="text-gray-500 dark:text-gray-400 text-xs mb-2">Recent Goals:</p>
                              <div className="space-y-1">
                                {userItem.recentGoals.slice(0, 2).map((goal, idx) => (
                                  <div key={idx} className="flex items-center space-x-2">
                                    <div className={`w-2 h-2 rounded-full ${getCategoryColor(goal.category)}`}></div>
                                    <span className="text-gray-600 dark:text-gray-300 text-sm truncate">{goal.title}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="flex space-x-2">
                            {userItem._id !== user?._id && (
                              <>
                                {userItem.isFollowing ? (
                                  <button
                                    onClick={() => handleUnfollow(userItem._id)}
                                    className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-700 dark:text-white rounded-xl transition-colors duration-200 text-sm font-medium flex items-center justify-center space-x-1"
                                  >
                                    <UserCheck className="h-4 w-4" />
                                    <span>Following</span>
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleFollow(userItem._id)}
                                    className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl transition-colors duration-200 text-sm font-medium flex items-center justify-center space-x-1"
                                  >
                                    <UserPlus className="h-4 w-4" />
                                    <span>Follow</span>
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                    <div ref={discoverSentinelRef} className="h-10"></div>
                    {loadingMoreDiscover && (
                      <div className="flex items-center justify-center py-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                      </div>
                    )}
                    {!discoverHasMore && users.length > 0 && (
                      <div className="text-center text-xs text-gray-400 py-4">No more users</div>
                    )}
                  </>
                ) : (
                <div className="text-center py-12">
                  <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400 text-lg">
                      {searchTerm.trim() ? 'No users found matching your search.' : 'No users to discover yet.'}
                    </p>
                    <p className="text-gray-500 dark:text-gray-500 text-sm mt-2">
                      {searchTerm.trim() ? 'Try a different search term.' : 'Check back later for new members!'}
                  </p>
                </div>
              )}
            </div>
          )}

            {activeTab === 'Activities' && (
              <div className="w-full">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
                    <Activity className="h-6 w-6 mr-2 text-green-500" />
                    Activities
                  </h2>
                </div>

                {loading ? (
                  <SkeletonList count={6} grid={false} avatar lines={4} />
                ) : activities.length > 0 ? (
                <>
                  <div className="space-y-4">
                    {activities.map((activity, index) => (
                      <motion.div
                        key={activity._id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.1 * index }}
                        className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden"
                      >
                        {/* Header */}
                        <div className="flex items-center gap-3 px-4 pt-4 pb-3">
                          <img
                            src={activity?.user?.avatar || activity?.avatar || '/api/placeholder/48/48'}
                            alt={activity?.user?.name || activity?.name || 'User'}
                            className="w-10 h-10 rounded-full object-cover cursor-pointer"
                            onClick={() => activity.user?.username && navigate(`/profile/@${activity.user.username}`)}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <button
                                className="font-semibold text-gray-900 dark:text-white hover:text-blue-500 truncate"
                                onClick={() => activity.user?.username && navigate(`/profile/@${activity.user.username}`)}
                              >
                                {activity?.user?.name || activity?.name || 'Unknown User'}
                              </button>
                              <span className="text-xs text-gray-400">•</span>
                              <span className="text-xs text-gray-500 dark:text-gray-400">{formatTimeAgo(activity.createdAt)}</span>
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {getActivityText(activity)}
                            </div>
                          </div>
                        </div>

                        {/* Media/Content */}
                        <div className="px-4 pb-4">
                          <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-800">
                             {(activity.type === 'goal_completed' || activity.type === 'goal_created') ? (
                               <>
                                 <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                                   {activity.data?.goalTitle || 'Goal Achievement'}
                                 </h4>
                                 {activity.data?.goalCategory && (
                                   <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium text-white ${getCategoryColor(activity.data.goalCategory)}`}>
                                     {activity.data.goalCategory}
                                   </span>
                                 )}
                                 {/* Shared note/image when public */}
                                 {activity.isPublic && (() => {
                                   const sharedNote = activity?.data?.metadata?.completionNote || activity?.data?.completionNote || ''
                                   const sharedImage = activity?.data?.metadata?.completionAttachmentUrl || activity?.data?.completionAttachmentUrl || ''
                                   if (!sharedNote && !sharedImage) return null
                                   return (
                                     <div className="mt-3 space-y-3 cursor-pointer" onClick={() => openDetail(activity)}>
                                       {sharedImage && (
                                         <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
                                            <img
                                              src={sharedImage}
                                              alt="Completion attachment"
                                              className="w-full max-h-96 object-cover hover:scale-[1.01] transition-transform duration-200 cursor-zoom-in"
                                              onClick={() => openLightbox(sharedImage)}
                                            />
                                          </div>
                                        )}
                                        {sharedNote && (
                                          <div className="bg-white/80 dark:bg-gray-900/40 rounded-xl p-3 border border-gray-200 dark:border-gray-700">
                                            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">
                                              {sharedNote}
                                            </p>
                                          </div>
                                        )}
                                      </div>
                                    )
                                  })()}
                                </>
                              ) 
                              : activity.type === 'streak_milestone' ? (
                                <div className="flex items-center space-x-2">
                                  <span className="text-gray-900 dark:text-white font-medium">
                                    Achieved a {activity.data?.streakCount || 0} day streak!
                                  </span>
                                  <span className="text-2xl">🔥</span>
                                </div>
                              ) : activity.type === 'level_up' ? (
                                <div className="flex items-center space-x-2">
                                  <span className="text-gray-900 dark:text-white font-medium">
                                    Leveled up to {activity.data?.newLevel || 'next level'}
                                  </span>
                                  <span className="text-2xl">⬆️</span>
                                </div>
                              ) : activity.type === 'achievement_earned' ? (
                                <div className="flex items-center space-x-2">
                                  <span className="text-gray-900 dark:text-white font-medium">
                                    Earned "{activity.data?.achievementName || 'achievement'}" badge
                                  </span>
                                  <span className="text-2xl">🏆</span>
                                </div>
                              ) : (
                                <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                                  Activity Update
                                </h4>
                              )}
                          </div>

                          {/* Action bar */}
                          <div className="flex items-center gap-4 pt-2 px-1">
                            <button
                              onClick={() => toggleActivityLikeOptimistic(activity._id)}
                              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-colors ${activity.isLiked ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-300' : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                              disabled={!!likePending[activity._id]}
                            >
                              <Heart className={`h-4 w-4 ${activity.isLiked ? 'fill-current' : ''}`} />
                              <span>{activity.likeCount || 0}</span>
                            </button>
                            <button
                              onClick={() => openComments(activity)}
                              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-colors bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700`}
                            >
                              <MessageCircle className="h-4 w-4" />
                              <span>{(activity.commentCount || 0)}</span>
                            </button>
                           </div>
                         </div>
                       </motion.div>
                    ))}
                  </div>
                  <div ref={activitiesSentinelRef} className="h-10"></div>
                  {loadingMoreActivities && (
                    <div className="flex items-center justify-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                    </div>
                  )}
                  {!activitiesHasMore && activities.length > 0 && (
                    <div className="text-center text-xs text-gray-400 py-4">No more activities</div>
                  )}
                </>
                ) : (
                <div className="text-center py-12">
                  <Activity className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400 text-lg">No recent activity from friends.</p>
                    <p className="text-gray-500 dark:text-gray-500 text-sm mt-2">
                      Follow some users to see their goal completions here!
                  </p>
                  <button
                    onClick={() => setActiveTab('discover')}
                      className="mt-4 px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl transition-colors duration-200 font-medium"
                  >
                    Discover Users
                  </button>
                </div>
              )}
            </div>
          )}
                </motion.div>
        </div>

        <ActivityDetailModal isOpen={detailOpen} onClose={closeDetail} activity={detailActivity} onOpenComments={openComments} />
        <ActivityCommentsModal isOpen={commentsOpen} onClose={closeComments} activity={commentsActivity} />
      </div>
    </div>
  );
};

export default ExplorePage; 