import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Search, 
  Users, 
  Activity, 
  Heart, 
  UserPlus, 
  TrendingUp, 
  Compass,
  Target,
  MessageCircle,
  Flame,
  UserCheck,
  X,
  Bell,
  Check,
  RefreshCw,
  ChevronsDown
} from 'lucide-react';
import useApiStore from '../store/apiStore';
import { activitiesAPI } from '../services/api';
import SkeletonList from '../components/loader/SkeletonList'
import ActivityDetailModal from '../components/ActivityDetailModal'
import ActivityCommentsModal from '../components/ActivityCommentsModal'
import ReportModal from '../components/ReportModal'
import BlockModal from '../components/BlockModal'

const ExplorePage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'activities';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInterest, setSelectedInterest] = useState(searchParams.get('interest') || '');
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [activities, setActivities] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState('');
  const openLightbox = (url) => { if (!url) return; setLightboxUrl(url); setLightboxOpen(true); };
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailActivity, setDetailActivity] = useState(null);
  const openDetail = (act) => { setDetailActivity(act); setDetailOpen(true); };
  const closeDetail = () => { setDetailOpen(false); setDetailActivity(null); };
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentsActivity, setCommentsActivity] = useState(null);
  const openComments = (act) => { setCommentsActivity(act); setCommentsOpen(true); };
  const closeComments = () => { setCommentsOpen(false); setCommentsActivity(null); };
  const [reportOpen, setReportOpen] = useState(false);
  const [reportTarget, setReportTarget] = useState({ type: null, id: null, label: '' });
  const [blockOpen, setBlockOpen] = useState(false);
  const [blockUserId, setBlockUserId] = useState(null);
  const [openUserMenuId, setOpenUserMenuId] = useState(null);
  const [openActivityMenuId, setOpenActivityMenuId] = useState(null);

  const { 
    isAuthenticated, 
    user,
    followUser, 
    unfollowUser, 
    getActivityFeed,
    searchUsers, 
    likeActivity,
    followedUsers,
    initializeFollowingStatus,
    getUsers,
    getNotifications,
    loadMoreNotifications,
    notifications,
    notificationsPagination,
    unreadNotifications,
    markNotificationRead,
    markAllNotificationsRead,
    acceptFollowRequest,
    rejectFollowRequest,
    report,
    blockUser,
    cancelFollowRequest,
    loadInterests,
    interestsCatalog
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
  const [interestsExpanded, setInterestsExpanded] = useState(false);
  const [interestQuery, setInterestQuery] = useState('');
  const activitiesSentinelRef = useRef(null);
  const discoverSentinelRef = useRef(null);
  const notificationsSentinelRef = useRef(null);
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
      // Load dynamic interests once for Discover
      if (activeTab === 'discover' && (!interestsCatalog || interestsCatalog.length === 0)) {
        loadInterests().catch(() => {});
      }
    }
  }, [isAuthenticated]);

  // Close any open 3-dot menus on outside click
  useEffect(() => {
    const onDocClick = () => {
      setOpenUserMenuId(null);
      setOpenActivityMenuId(null);
    };
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

  const fetchInitialData = async (opts = {}) => {
    setLoading(true);
    try {
      if (activeTab === 'activities') {
        // First page for activities
        setActivitiesPage(1);
        setActivitiesHasMore(true);
        const activitiesData = await getActivityFeed({ page: 1, limit: ACTIVITIES_PAGE_SIZE }, opts);
        setActivities(activitiesData.activities || []);
        const totalPages = activitiesData.pagination?.pages || 1;
        setActivitiesHasMore(1 < totalPages);
        // Do not mutate users list here; keep Discover users separate
      } else if (activeTab === 'discover') {
        // First page for discover users
        setDiscoverPage(1);
        setDiscoverHasMore(true);
        const usersData = await getUsers({ page: 1, limit: DISCOVER_PAGE_SIZE }, opts);
        if (usersData.success) {
          const filteredUsers = (usersData.users || []).filter(u => u && u._id && u._id !== user?._id);
          // Replace the entire list for page 1 to avoid stale entries
          setUsers(filteredUsers.slice(0, DISCOVER_PAGE_SIZE));
          const totalPages = usersData.pagination?.pages || 1;
          setDiscoverHasMore(1 < totalPages);
        } else {
          setUsers([]);
        }
      } else if (activeTab === 'notifications') {
        await getNotifications({ page: 1, limit: 20 }, opts);
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
    if (activeTab === 'activities') {
      setActivities([]);
      setActivitiesPage(1);
      setActivitiesHasMore(true);
    } else if (activeTab === 'discover') {
      setUsers([]);
      setDiscoverPage(1);
      setDiscoverHasMore(true);
    } else if (activeTab === 'notifications') {
      // nothing special
    }
    fetchInitialData();
  }, [activeTab]);

  useEffect(() => {
    const tabFromUrl = searchParams.get('tab') || 'activities';
    if (tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams]);

  const handleTabChange = (tab) => {
    const params = { tab };
    if (searchTerm) params.q = searchTerm;
    if (selectedInterest) params.interest = selectedInterest;
    setSearchParams(params);
    setActiveTab(tab); 
  };

  const handleSearch = async (term, interestValue) => {
    const t = term.trim();
    if (!t && !interestValue) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    if (t && t.length < 2 && !interestValue) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    try {
      const results = await searchUsers(t, interestValue);
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
        handleSearch(searchTerm, selectedInterest);
      }, 300);
      return () => clearTimeout(debounceTimer);
    } else if (!selectedInterest) {
      setSearchResults([]);
      setIsSearching(false);
    }
  }, [searchTerm, selectedInterest]);

  useEffect(() => {
    if (activeTab !== 'discover') return;
    const params = { tab: 'discover' };
    if (searchTerm) params.q = searchTerm;
    if (selectedInterest) params.interest = selectedInterest;
    setSearchParams(params);
    if (selectedInterest && (!searchTerm || searchTerm.trim().length < 2)) {
      handleSearch('', selectedInterest);
    }
  }, [selectedInterest]);

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
        if (activeTab === 'activities') loadMoreActivities();
        if (activeTab === 'discover') loadMoreDiscover();
        if (activeTab === 'notifications') {
          const hasMore = (notificationsPagination?.page || 1) < (notificationsPagination?.pages || 1);
          if (hasMore) {
            loadMoreNotifications();
          }
        }
      }
    }, { root: null, rootMargin: '300px', threshold: 0.1 });
    const target = activeTab === 'activities' ? activitiesSentinelRef.current : activeTab === 'discover' ? discoverSentinelRef.current : notificationsSentinelRef.current;
    if (target) observer.observe(target);
    return () => observer.disconnect();
  }, [activeTab, isAuthenticated, loadMoreActivities, loadMoreDiscover, activities.length, users.length, activitiesHasMore, discoverHasMore, searchTerm, notifications?.length, notificationsPagination?.page, notificationsPagination?.pages]);

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
      if (activeTab === 'activities') {
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

  const openNotificationActivity = async (activityId) => {
    if (!activityId) return;
    try {
      const resp = await activitiesAPI.getActivity(activityId);
      const act = resp?.data?.data?.activity;
      if (act) {
        setDetailActivity(act);
        setDetailOpen(true);
      }
    } catch (e) {}
  };
      
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
          <div className="bg-white/80 dark:bg-gray-800/50 backdrop-blur-lg rounded-2xl p-2 border border-gray-200 dark:border-gray-700/50 flex shadow-lg overflow-x-auto whitespace-nowrap gap-1">
            <button
              onClick={() => handleTabChange('activities')}
              className={`flex items-center space-x-2 px-6 py-3 rounded-xl transition-all duration-200 shrink-0 ${
                activeTab === 'activities'
                  ? 'bg-blue-500 text-white shadow-lg'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700/50'
              }`}
            >
              <Activity className="h-5 w-5" />
              <span className="font-medium">Activities</span>
            </button>
            <button
              onClick={() => handleTabChange('discover')}
              className={`flex items-center space-x-2 px-6 py-3 rounded-xl transition-all duration-200 shrink-0 ${
                activeTab === 'discover'
                  ? 'bg-blue-500 text-white shadow-lg'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700/50'
              }`}
            >
              <Users className="h-5 w-5" />
              <span className="font-medium">Discover</span>
            </button>
            <button
              onClick={() => handleTabChange('notifications')}
              className={`flex items-center space-x-2 px-6 py-3 rounded-xl transition-all duration-200 shrink-0 ${
                activeTab === 'notifications'
                  ? 'bg-blue-500 text-white shadow-lg'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700/50'
              }`}
            >
              <Bell className="h-5 w-5" />
              <span className="font-medium">Notifications</span>
              {unreadNotifications > 0 && (
                <span className="ml-2 inline-flex items-center justify-center min-w-[1.25rem] h-5 text-xs px-1 rounded-full bg-red-500 text-white">{unreadNotifications}</span>
              )}
            </button>
          </div>
        </motion.div>

        {/* Search Bar + Interest Chips */}
        {activeTab === 'discover' && 
          (<motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="relative max-w-3xl mx-auto mb-8"
          >
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Search by name or username..."
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
            <div className="mt-3">
              <div className="relative">
                <div className="flex gap-2 flex-nowrap overflow-hidden pr-16 items-center">
                  {(() => {
                    const items = (interestsCatalog && interestsCatalog.length > 0)
                      ? interestsCatalog.map(x => x.interest)
                      : ['fitness','health','travel','education','career','finance','hobbies','relationships','personal_growth','creativity','technology','business','lifestyle','spirituality','sports','music','art','reading','cooking','gaming','nature','volunteering'];
                    const unique = Array.from(new Set([
                      selectedInterest || null,
                      ...items
                    ].filter(Boolean)));
                    return unique.slice(0, 12).map((i) => {
                      const active = selectedInterest === i;
                      return (
                        <button
                          key={i}
                          onClick={() => setSelectedInterest(active ? '' : i)}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium border shrink-0 transition-colors ${active ? 'bg-blue-500 text-white border-blue-500' : 'bg-white/70 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700/50'}`}
                          aria-pressed={active}
                          title={i.replace(/_/g,' ')}
                        >
                          {i.replace(/_/g,' ')}
                        </button>
                      );
                    });
                  })()}
                  
                </div>
                <div className="pointer-events-none absolute right-12 top-0 h-full w-8 bg-gradient-to-l from-white/90 dark:from-gray-800/90 to-transparent rounded-r-2xl" />
                <button
                  onClick={() => setInterestsExpanded(prev => !prev)}
                  className="absolute right-0 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-full text-xs font-medium border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800/70 text-gray-600 dark:text-gray-300 opacity-80 hover:opacity-100 hover:bg-gray-200 dark:hover:bg-gray-700 inline-flex items-center gap-1"
                  aria-expanded={interestsExpanded}
                >
                  <ChevronsDown className="h-4 w-4 opacity-90" />
                  {interestsExpanded ? 'Collapse' : 'Expand'}
                </button>
              </div>
            </div>
            {interestsExpanded && (
              <div className="mt-3 bg-white/80 dark:bg-gray-800/50 backdrop-blur-lg rounded-2xl border border-gray-200 dark:border-gray-700/50 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Search className="h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search interests..."
                    value={interestQuery}
                    onChange={(e) => setInterestQuery(e.target.value)}
                    className="flex-1 bg-transparent outline-none text-sm text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                  />
                </div>
                <div className="max-h-72 overflow-auto pr-1 grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {(() => {
                    const list = (interestsCatalog && interestsCatalog.length > 0)
                      ? interestsCatalog
                      : ['fitness','health','travel','education','career','finance','hobbies','relationships','personal_growth','creativity','technology','business','lifestyle','spirituality','sports','music','art','reading','cooking','gaming','nature','volunteering'].map(i => ({ interest: i, count: 0 }));
                    const q = interestQuery.trim().toLowerCase();
                    const filtered = q ? list.filter(x => x.interest.replace(/_/g,' ').toLowerCase().includes(q)) : list;
                    return filtered.map((x) => {
                      const i = x.interest;
                      const label = i.replace(/_/g,' ');
                      const active = selectedInterest === i;
                      return (
                        <button
                          key={i}
                          className={`w-full text-left px-3 py-2 rounded-md flex items-center justify-between ${active ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-200' : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200'}`}
                          onClick={() => { setSelectedInterest(active ? '' : i); }}
                        >
                          <span className="truncate">{label}</span>
                          {typeof x.count === 'number' && x.count > 0 && (<span className="text-xs text-gray-500 dark:text-gray-400">{x.count}</span>)}
                        </button>
                      );
                    });
                  })()}
                </div>
              </div>
            )}
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
                    {(searchTerm.trim() || selectedInterest) ? 'Search Results' : 'Discover Users'}
                  </h2>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => fetchInitialData({ force: true })}
                      aria-label="Refresh"
                      className={`h-9 w-9 inline-flex items-center justify-center rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors ${loading ? 'opacity-80' : ''}`}
                      disabled={loading}
                    >
                      <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
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
                          className="bg-white/80 dark:bg-gray-800/50 backdrop-blur-lg rounded-2xl p-6 border border-gray-200 dark:border-gray-700/50 hover:border-gray-300 dark:hover:border-gray-600/50 transition-all duration-200 shadow-lg hover:shadow-xl relative"
                        >
                          <div className="flex items-center space-x-4 mb-4">
                            <img
                              src={userItem.avatar || '/api/placeholder/64/64'}
                              alt={userItem.name}
                              className="w-16 h-16 rounded-full border-2 border-gray-200 dark:border-gray-600 cursor-pointer hover:border-blue-500 transition-colors"
                              onClick={() => userItem.username && navigate(`/profile/@${userItem.username}?tab=overview`)}
                            />
                            <div className="flex-1">
                              <h3 
                                className="font-semibold text-gray-900 dark:text-white text-lg cursor-pointer hover:text-blue-500 transition-colors"
                                onClick={() => userItem.username && navigate(`/profile/@${userItem.username}?tab=overview`)}
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
                                ) : userItem.isRequested ? (
                                  <button
                                    onClick={async () => { await cancelFollowRequest(userItem._id); setUsers(prev => prev.map(u => u._id === userItem._id ? { ...u, isRequested: false } : u)); }}
                                    className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-white rounded-xl transition-colors duration-200 text-sm font-medium flex items-center justify-center space-x-1"
                                  >
                                    <UserPlus className="h-4 w-4" />
                                    <span>Requested</span>
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
                          {/* 3-dots for user card */}
                          <div className="absolute right-2 top-2 z-30">
                            <div className="relative">
                              <button
                                onClick={(e) => { e.stopPropagation(); setOpenUserMenuId(prev => prev === userItem._id ? null : userItem._id); }}
                                className="px-2 py-1 rounded-md text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                              >⋯</button>
                              {openUserMenuId === userItem._id && (
                                <div
                                  onClick={(e) => e.stopPropagation()}
                                  className="absolute right-0 mt-2 w-40 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-30"
                                >
                                  <button
                                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                                    onClick={() => { setReportTarget({ type: 'user', id: userItem._id, label: 'user' }); setReportOpen(true); setOpenUserMenuId(null); }}
                                  >Report</button>
                                  <button
                                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                                    onClick={() => { setBlockUserId(userItem._id); setBlockOpen(true); setOpenUserMenuId(null); }}
                                  >Block</button>
                                </div>
                              )}
                            </div>
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

            {activeTab === 'notifications' && (
              <div className="w-full">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
                    <Bell className="h-6 w-6 mr-2 text-purple-500" />
                    Notifications
                  </h2>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => fetchInitialData({ force: true })}
                      aria-label="Refresh"
                      className={`h-9 w-9 inline-flex items-center justify-center rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors ${loading ? 'opacity-80' : ''}`}
                      disabled={loading}
                    >
                      <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    {unreadNotifications > 0 && (
                      <button onClick={markAllNotificationsRead} className="text-sm text-blue-600 hover:underline">Mark all as read</button>
                    )}
                  </div>
                </div>

                {loading ? (
                  <SkeletonList count={6} grid={false} avatar lines={3} />
                ) : (notifications || []).length > 0 ? (
                  <>
                    <div className="space-y-3">
                      {(() => {
                        const now = new Date();
                        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

                        const groups = { today: [], week: [], month: [], older: [] };
                        (notifications || []).forEach((n) => {
                          const created = new Date(n.createdAt);
                          if (created >= startOfToday) groups.today.push(n);
                          else if (created >= sevenDaysAgo) groups.week.push(n);
                          else if (created >= thirtyDaysAgo) groups.month.push(n);
                          else groups.older.push(n);
                        });

                        const renderGroup = (title, items) => items.length > 0 && (
                          <div className="space-y-2" key={title}>
                            <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 px-1">{title}</div>
                            {items.map((n) => {
                              const actorName = n.data?.actorName || n.data?.followerName || n.data?.likerName || 'Someone';
                              const actorAvatar = n.data?.actorAvatar || n.data?.followerAvatar || n.data?.likerAvatar;
                              const isUnread = !n.isRead;
                              const baseClass = isUnread ? 'bg-blue-50 dark:bg-gray-800/60 border-blue-200 dark:border-gray-700' : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800';
                              return (
                                <div key={n._id} className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${baseClass}`}>
                                  <img
                                    src={actorAvatar || '/api/placeholder/40/40'}
                                    alt={actorName}
                                    className="w-10 h-10 rounded-full cursor-pointer"
                                    onClick={() => {
                                      if (n.data?.actorId) navigate(`/profile/@${n.data?.actorId?.username || ''}?tab=overview`);
                                    }}
                                  />
                                  <div className="flex-1 min-w-0">
                                    <div className="text-sm text-gray-800 dark:text-gray-200">
                                      <button
                                        className="font-medium hover:underline"
                                        onClick={() => {
                                          if (n.data?.actorId && n.data?.actorId?.username) navigate(`/profile/${n.data.actorId.username}?tab=overview`)
                                        }}
                                      >
                                        {actorName}
                                      </button>
                                      <span className="text-gray-600 dark:text-gray-400"> {n.message}</span>
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400">{formatTimeAgo(n.createdAt)}</div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {n.type === 'follow_request' && n.data?.followerId && (
                                      <>
                                        <button onClick={async () => { await acceptFollowRequest(n.data.followerId); await markNotificationRead(n._id); }} className="px-3 py-1.5 rounded-lg bg-green-500 hover:bg-green-600 text-white text-xs inline-flex items-center gap-1"><Check className="w-4 h-4" />Accept</button>
                                        <button onClick={async () => { await rejectFollowRequest(n.data.followerId); await markNotificationRead(n._id); }} className="px-3 py-1.5 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 text-xs inline-flex items-center gap-1"><X className="w-4 h-4" />Reject</button>
                                      </>
                                    )}
                                    {n.type === 'follow_request_accepted' && n.data?.actorId && (
                                      <button
                                        onClick={async () => { await followUser(n.data.actorId); await markNotificationRead(n._id); }}
                                        className="px-3 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-xs"
                                      >Follow back</button>
                                    )}
                                    {(n.data?.activityId) && (
                                      <button
                                        onClick={() => openNotificationActivity(n.data.activityId)}
                                        className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-xs"
                                      >View</button>
                                    )}
                                    {isUnread && (
                                      <button onClick={() => markNotificationRead(n._id)} className="text-xs text-blue-600 hover:underline">Mark read</button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );

                        return (
                          <>
                            {renderGroup('Today', groups.today)}
                            {renderGroup('Last 7 days', groups.week)}
                            {renderGroup('Last 30 days', groups.month)}
                            {renderGroup('Older', groups.older)}
                          </>
                        );
                      })()}
                    </div>
                    <div ref={notificationsSentinelRef} className="h-10"></div>
                  </>
                ) : (
                  <div className="text-center py-12">
                    <Bell className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400 text-lg">No notifications yet.</p>
                    <p className="text-gray-500 dark:text-gray-500 text-sm mt-2">When people interact with you, you'll see updates here.</p>
                  </div>
                )}
              </div>
            )}
            {activeTab === 'activities' && (
              <div className="w-full">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
                    <Activity className="h-6 w-6 mr-2 text-green-500" />
                    Activities
                  </h2>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => fetchInitialData({ force: true })}
                      aria-label="Refresh"
                      className={`h-9 w-9 inline-flex items-center justify-center rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors ${loading ? 'opacity-80' : ''}`}
                      disabled={loading}
                    >
                      <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
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
                        className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm relative overflow-visible"
                      >
                         {/* Header */}
                        <div className="flex items-center gap-3 px-4 pt-4 pb-3">
                          <img
                            src={activity?.user?.avatar || activity?.avatar || '/api/placeholder/48/48'}
                            alt={activity?.user?.name || activity?.name || 'User'}
                            className="w-10 h-10 rounded-full object-cover cursor-pointer"
                            onClick={() => activity.user?.username && navigate(`/profile/@${activity.user.username}?tab=overview`)}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <button
                                className="font-semibold text-gray-900 dark:text-white hover:text-blue-500 truncate"
                                onClick={() => activity.user?.username && navigate(`/profile/@${activity.user.username}?tab=overview`)}
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

                         {/* 3-dots menu for post */}
                         <div className="absolute right-2 top-2 z-30">
                           <div className="relative">
                             <button
                               onClick={(e) => { e.stopPropagation(); setOpenActivityMenuId(prev => prev === activity._id ? null : activity._id); }}
                               className="px-2 py-1 rounded-md text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                             >⋯</button>
                             {openActivityMenuId === activity._id && (
                               <div
                                 onClick={(e) => e.stopPropagation()}
                                 className="absolute right-0 mt-2 w-44 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-30"
                               >
                                 <button
                                   className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                                   onClick={() => { setReportTarget({ type: 'activity', id: activity._id, label: 'activity' }); setReportOpen(true); setOpenActivityMenuId(null); }}
                                 >Report</button>
                                 {activity.user?._id && (
                                   <button
                                     className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                                     onClick={async () => { try { await unfollowUser(activity.user._id); } catch {} ; setOpenActivityMenuId(null); }}
                                   >Unfollow user</button>
                                 )}
                                 {activity.user?._id && (
                                   <button
                                     className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                                     onClick={() => { setBlockUserId(activity.user._id); setBlockOpen(true); setOpenActivityMenuId(null); }}
                                   >Block user</button>
                                 )}
                               </div>
                             )}
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
        <ReportModal
          isOpen={reportOpen}
          onClose={() => setReportOpen(false)}
          targetLabel={reportTarget.label}
          onSubmit={async ({ reason, description }) => { await report({ targetType: reportTarget.type, targetId: reportTarget.id, reason, description }); }}
          onReportAndBlock={reportTarget.type === 'user' ? async () => { if (reportTarget.id) { await blockUser(reportTarget.id); } } : undefined}
        />
        <BlockModal
          isOpen={blockOpen}
          onClose={() => setBlockOpen(false)}
          username={''}
          onConfirm={async () => { if (blockUserId) { await blockUser(blockUserId); setBlockOpen(false); } }}
        />
      </div>
    </div>
  );
};

export default ExplorePage; 