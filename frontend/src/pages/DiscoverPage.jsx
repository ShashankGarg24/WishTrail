import { useEffect, useState, useRef, useCallback, lazy, Suspense } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, Target, RefreshCw, TrendingUp, Flame, UserPlus, UserCheck, Compass, Search, Sparkles } from 'lucide-react'
import { communitiesAPI } from '../services/api'
import useApiStore from '../store/apiStore'
import SkeletonList from '../components/loader/SkeletonList'
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
const GoalDetailsModal = lazy(() => import('../components/GoalDetailsModal'));
const ReportModal = lazy(() => import('../components/ReportModal'));
const BlockModal = lazy(() => import('../components/BlockModal'));
import { lockBodyScroll, unlockBodyScroll } from '../utils/scrollLock'
import { useSwipeable } from 'react-swipeable'

const DiscoverPage = () => {
  const {
    isAuthenticated,
    user,
    searchUsers,
    getUsers,
    getTrendingGoals,
    loadInterests,
    interestsCatalog,
    cancelFollowRequest,
    followUser,
    unfollowUser,
    report,
    blockUser,
  } = useApiStore()

  const DISCOVER_PAGE_SIZE = 6
  const INITIAL_RECOMMENDATIONS_LIMIT = 6
  const INITIAL_TRENDING_LIMIT = 9
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('users')
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedInterest, setSelectedInterest] = useState('')
  const [users, setUsers] = useState([])
  const [trending, setTrending] = useState([])
  const [discoverPage, setDiscoverPage] = useState(1)
  const [discoverHasMore, setDiscoverHasMore] = useState(true)
  const [isSearching, setIsSearching] = useState(false)
  const discoverSentinelRef = useRef(null)
  const [searchResults, setSearchResults] = useState([]);
  const [loadingGoals, setLoadingGoals] = useState(false);
  const [openUserMenuId, setOpenUserMenuId] = useState(null);
  const [loadingMoreDiscover, setLoadingMoreDiscover] = useState(false);
  const [trendingPage, setTrendingPage] = useState(1);
  const [trendingHasMore, setTrendingHasMore] = useState(true);
  const [loadingMoreUserSearch, setLoadingMoreUserSearch] = useState(false);
  const [userSearchPage, setUserSearchPage] = useState(1);
  const [userSearchHasMore, setUserSearchHasMore] = useState(true);
  const [goalSearchPage, setGoalSearchPage] = useState(1);
  const [loadingMoreGoalSearch, setLoadingMoreGoalSearch] = useState(false);
  const [goalSearchHasMore, setGoalSearchHasMore] = useState(true);
  const [goalResults, setGoalResults] = useState([])
  const [communities, setCommunities] = useState([])
  const [communityResults, setCommunityResults] = useState([])
  const [goalModalOpen, setGoalModalOpen] = useState(false)
  const [openGoalId, setOpenGoalId] = useState(null)
  const [scrollCommentsOnOpen, setScrollCommentsOnOpen] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [reportTarget, setReportTarget] = useState({ type: null, id: null, label: '', username: '', userId: null })
  const [blockOpen, setBlockOpen] = useState(false)
  const [blockUserId, setBlockUserId] = useState(null)
  const [blockUsername, setBlockUsername] = useState('')
  const location = useLocation();
  const [inNativeApp, setInNativeApp] = useState(false)

  // Outside click for user menu
  useEffect(() => {
    const onDocMouseDown = (e) => {
      if (!openUserMenuId) return;
      const target = e.target;
      const inside = target?.closest?.('[data-user-menu="true"]') || target?.closest?.('[data-user-menu-btn="true"]');
      if (inside) return;
      setOpenUserMenuId(null);
    };
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, [openUserMenuId]);

  useEffect(() => {
    try { if (typeof window !== 'undefined' && window.ReactNativeWebView) setInNativeApp(true) } catch { }
  }, [])

  // Deep link: open via ?goalId=
  useEffect(() => {
    try {
      const params = new URLSearchParams(location.search)
      const gid = params.get('goalId')
      if (gid) {
        openGoalModal(gid)
      }
    } catch { }
  }, [location.search])

  useEffect(() => {
    if (!isAuthenticated) return
    // Don't fetch initial content - only load interests catalog
    if (!interestsCatalog || interestsCatalog.length === 0) {
      loadInterests().catch(() => { })
    }
  }, [isAuthenticated])

  // Tab changes now only clear state, don't fetch
  useEffect(() => {
    if (!isAuthenticated) return;
    // Clear results when switching tabs
    setSearchResults([]);
    setGoalResults([]);
    setUsers([]);
    setTrending([]);
    setCommunities([]);
    setCommunityResults([]);
  }, [activeTab, isAuthenticated]);

  useEffect(() => {
    const tabFromUrl = searchParams.get('tab') || 'goals';
    if (tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams]);

  const handleTabChange = (tab) => {
    setSearchParams({ tab });
    setActiveTab(tab);
  };

  useEffect(() => {
    // Trigger search when user types or filters
    if (searchTerm.trim() || selectedInterest) {
      const debounceTimer = setTimeout(() => {
        handleSearch(searchTerm, selectedInterest);
      }, 400);
      return () => clearTimeout(debounceTimer);
    } else {
      // Clear search results when no search term or filter
      setSearchResults([]);
      setGoalResults([]);
      setCommunityResults([]);
      setIsSearching(false);
    }
  }, [searchTerm, selectedInterest, activeTab]);

  const fetchInitial = async () => {
    // Only fetch when user actively searches or filters
    // This is now only called from handleSearch
    setLoading(true)
    try {
      if (activeTab === 'users') {
        setDiscoverPage(1)
        setDiscoverHasMore(true)
        const usersData = await getUsers({ page: 1, limit: INITIAL_RECOMMENDATIONS_LIMIT })
        if (usersData.success) {
          const filteredUsers = (usersData.users || []).filter(u => u && u._id && u._id !== user?._id)
          setUsers(filteredUsers.slice(0, INITIAL_RECOMMENDATIONS_LIMIT))
          const totalPages = usersData.pagination?.pages || 1
          setDiscoverHasMore(1 < totalPages)
        } else {
          setUsers([])
        }
      } 
      else if (activeTab === 'communities') {
        try {
          const resp = await communitiesAPI.discover({ interests: selectedInterest ? selectedInterest : '', limit: 30 });
          const data = resp?.data?.data || [];
          setCommunities(data);
          if (searchTerm.trim()) {
            const q = searchTerm.trim().toLowerCase();
            setCommunityResults(data.filter(c => (c.name || '').toLowerCase().includes(q)));
          } else {
            setCommunityResults(data);
          }
        } catch (_) {
          setCommunities([]); setCommunityResults([]);
        }
      } else
        // Goals subtab: either refresh search or fetch trending list
        if (searchTerm.trim() || selectedInterest) {
          try {
            setLoadingGoals(true);
            await handleSearch(searchTerm, selectedInterest);
          } finally {
            setLoadingGoals(false);
          }
        } else {
          try {
            setLoadingGoals(true);
            setTrendingPage(1);
            setTrendingHasMore(true);
            const { goals, pagination } = await getTrendingGoals({ strategy: 'global', page: 1, limit: INITIAL_TRENDING_LIMIT });
            setTrending(goals || []);
            const totalPages = pagination?.pages || 1;
            setTrendingHasMore(1 < totalPages);
          } catch (_) {
            setTrending([]);
            setTrendingHasMore(false);
          } finally {
            setLoadingGoals(false);
          }
        }
    } catch (_) {
      setUsers([]); setTrending([])
      setDiscoverHasMore(false)
    } finally {
      setLoading(false)
    }
  }

  const openGoalModal = (gid) => {
    if (!gid) return
    setOpenGoalId(gid)
    setGoalModalOpen(true)
  }

  const closeGoalModal = () => {
    setGoalModalOpen(false)
    setOpenGoalId(null)
    setScrollCommentsOnOpen(false)
    try {
      const params = new URLSearchParams(location.search)
      if (params.get('goalId')) navigate(-1)
    } catch { }
  }

  // Lock body scroll when modal open
  useEffect(() => {
    if (goalModalOpen) {
      lockBodyScroll()
      return () => unlockBodyScroll()
    }
    return undefined
  }, [goalModalOpen])


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
    } catch (error) {
      console.error('Error unfollowing user:', error);
    }
  };

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

  const loadMoreTrending = useCallback(async () => {
    if (loadingMoreDiscover || !trendingHasMore) return;
    if (searchTerm.trim() || selectedInterest) return; // pause if searching
    setLoadingMoreDiscover(true);
    try {
      const next = trendingPage + 1;
      const { goals, pagination } = await getTrendingGoals({ strategy: 'global', page: next, limit: 18 });
      setTrending(prev => mergeUniqueById(prev, goals || []));
      setTrendingPage(next);
      const totalPages = pagination?.pages || next;
      setTrendingHasMore(next < totalPages);
    } catch (_) {
      setTrendingHasMore(false);
    } finally {
      setLoadingMoreDiscover(false);
    }
  }, [trendingPage, trendingHasMore, loadingMoreDiscover, getTrendingGoals, searchTerm, selectedInterest]);

  const loadMoreUserSearch = useCallback(async () => {
    if (loadingMoreUserSearch || !userSearchHasMore) return;
    const t = searchTerm.trim();
    const next = userSearchPage + 1;
    setLoadingMoreUserSearch(true);
    try {
      const { users: results, pagination } = await searchUsers({ search: t, interest: selectedInterest, page: next, limit: 18 });
      const filtered = (results || []).filter(u => u && u._id && u._id !== user?._id);
      setSearchResults(prev => mergeUniqueById(prev, filtered));
      setUserSearchPage(next);
      const totalPages = pagination?.pages || next;
      setUserSearchHasMore(next < totalPages);
    } catch (_) {
      setUserSearchHasMore(false);
    } finally {
      setLoadingMoreUserSearch(false);
    }
  }, [userSearchPage, userSearchHasMore, loadingMoreUserSearch, searchUsers, searchTerm, selectedInterest]);

  const loadMoreGoalSearch = useCallback(async () => {
    if (loadingMoreGoalSearch || !goalSearchHasMore) return;
    const t = searchTerm.trim();
    const next = goalSearchPage + 1;
    setLoadingMoreGoalSearch(true);
    try {
      const { goals, pagination } = await useApiStore.getState().searchGoals({ q: t, interest: selectedInterest, page: next, limit: 18 });
      setGoalResults(prev => mergeUniqueById(prev, goals || []));
      setGoalSearchPage(next);
      const totalPages = pagination?.pages || next;
      setGoalSearchHasMore(next < totalPages);
    } catch (_) {
      setGoalSearchHasMore(false);
    } finally {
      setLoadingMoreGoalSearch(false);
    }
  }, [goalSearchPage, goalSearchHasMore, loadingMoreGoalSearch, searchTerm, selectedInterest]);


  // Observer (single, parity with Explore discover)
  useEffect(() => {
    if (!isAuthenticated) return;
    const observer = new IntersectionObserver((entries) => {
      const entry = entries[0];
      if (entry.isIntersecting) {
        if ((searchTerm.trim() || selectedInterest) && activeTab === 'users') {
          loadMoreUserSearch();
        } else if ((searchTerm.trim() || selectedInterest) && activeTab === 'goals') {
          loadMoreGoalSearch();
        } else if (activeTab === 'users') {
          loadMoreDiscover();
        } else if (activeTab === 'goals') {
          loadMoreTrending();
        }
      }
    }, { root: null, rootMargin: '300px', threshold: 0.1 });
    const target = discoverSentinelRef.current;
    if (target) observer.observe(target);
    return () => observer.disconnect();
  }, [isAuthenticated, loadMoreDiscover, loadMoreTrending, loadMoreUserSearch, loadMoreGoalSearch, activeTab, searchTerm, selectedInterest]);

  const handleSearch = async (term, interestValue) => {
    const t = term.trim();
    if (!t && !interestValue) {
      setSearchResults([]);
      setGoalResults([]);
      setCommunityResults([]);
      setIsSearching(false);
      return;
    }
    if (t && t.length < 2 && !interestValue) {
      setSearchResults([]);
      setGoalResults([]);
      setCommunityResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    setUserSearchPage(1);
    setGoalSearchPage(1);
    setUserSearchHasMore(true);
    setGoalSearchHasMore(true);
    try {
      if (activeTab === 'users') {
        const { users: results, pagination } = await searchUsers({ search: t, interest: interestValue, page: 1, limit: 18 });
        const filteredResults = (results || []).filter(u => u && u._id !== user?._id);
        setSearchResults(filteredResults);
        const totalPages = pagination?.pages || 1;
        setUserSearchHasMore(1 < totalPages);
      } else if (activeTab === 'goals') {
        setLoadingGoals(true);
        const { goals, pagination } = await useApiStore.getState().searchGoals({ q: t, interest: interestValue, page: 1, limit: 18 });
        setGoalResults(goals || []);
        const totalPages = pagination?.pages || 1;
        setGoalSearchHasMore(1 < totalPages);
      } else if (activeTab === 'communities') {
        // Only fetch from API if we don't have data or interest changed
        if (communities.length === 0 || interestValue) {
          const resp = await communitiesAPI.discover({ interests: interestValue || '', limit: 50 });
          const data = resp?.data?.data || [];
          setCommunities(data);
          // Apply text filter client-side
          const q = t.toLowerCase();
          setCommunityResults(q ? data.filter(c => (c.name || '').toLowerCase().includes(q) || (c.description || '').toLowerCase().includes(q)) : data);
        } else {
          // Just filter existing communities client-side
          const q = t.toLowerCase();
          setCommunityResults(q ? communities.filter(c => (c.name || '').toLowerCase().includes(q) || (c.description || '').toLowerCase().includes(q)) : communities);
        }
      }
    } catch (error) {
      console.error('Error searching:', error);
      setSearchResults([]);
      setGoalResults([]);
      setCommunityResults([]);
    } finally {
      setIsSearching(false);
      setLoadingGoals(false);
    }
  };

  const displayUsers = (selectedInterest || (searchTerm.trim() && searchTerm.trim().length >= 2))
    ? searchResults
    : users;

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

  const handleSwipe = useSwipeable({
    onSwipedLeft: () => {
      if (activeTab === "users") handleTabChange("goals")
      // else if (activeTab === "goals") handleTabChange("communities")
    },
    onSwipedRight: () => {
      // if (activeTab === "communities") handleTabChange("goals")
      if (activeTab === "goals") handleTabChange("users")
    },
    trackMouse: false
  })

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
    <div
      {...handleSwipe}
      className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-slate-900 dark:via-gray-900 dark:to-zinc-900">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {!inNativeApp && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between mb-8"
          >
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Compass className="h-8 w-8 text-blue-500" />
                Discover
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {activeTab === 'users' ? 'Find inspiring people to follow' : 
                 activeTab === 'goals' ? 'Explore trending achievements' : 
                 'Join amazing communities'}
              </p>
            </div>
            <button
              onClick={() => fetchInitial()}
              aria-label="Refresh"
              className={`h-10 w-10 inline-flex items-center justify-center rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all shadow-sm hover:shadow ${loading ? 'opacity-60' : ''}`}
              disabled={loading}
            >
              <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </motion.div>
        )}

        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.4, delay: 0.1 }} 
          className="relative max-w-4xl mx-auto mb-8"
        >
          {/* Search Bar */}
          <div className="relative mb-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input 
              type="text" 
              placeholder={activeTab === 'users' ? 'Search users by name or username...' : (activeTab === 'goals' ? 'Search goals by title...' : 'Search communities by name...')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm hover:shadow-md" 
            />
          </div>
          {/* Tabs */}
          <div className="flex justify-center mb-6">
            <div className="inline-flex bg-gray-100 dark:bg-gray-800 rounded-xl p-1 gap-1">
              {/* {["users", "goals", "communities"].map((tab) => ( */}
              {["users", "goals"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => handleTabChange(tab)}
                  className={`
                    relative px-6 py-2.5 rounded-lg text-sm font-medium capitalize transition-all duration-200
                    ${activeTab === tab
                      ? "bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                    }
                  `}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
          {/* Interest Filter */}
          <div className="relative">
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {(() => {
                const items = (interestsCatalog && interestsCatalog.length > 0)
                  ? interestsCatalog.map(x => x.interest).slice(0, 12)
                  : ['fitness', 'health', 'travel', 'education', 'career', 'finance', 'hobbies', 'relationships', 'personal_growth', 'creativity', 'technology', 'business'];
                
                return items.map((i) => {
                  const active = selectedInterest === i;
                  return (
                    <button
                      key={i}
                      onClick={() => setSelectedInterest(active ? '' : i)}
                      className={`
                        px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all
                        ${active 
                          ? 'bg-blue-500 text-white shadow-md' 
                          : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600'
                        }
                      `}
                      aria-pressed={active}
                    >
                      {i.replace(/_/g, ' ')}
                    </button>
                  );
                });
              })()}
            </div>
          </div>
        </motion.div>

        {/* Content Section */}
        {(loading || isSearching || loadingGoals) ? (
          <SkeletonList count={9} grid avatar lines={3} />
        ) : activeTab === 'users' ? (
          displayUsers.length > 0 ? (
            <>
              {/* Section Header */}
              {!(searchTerm.trim() || selectedInterest) && (
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-blue-500" />
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Suggested Users</h2>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Search to discover more</p>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {displayUsers.filter(u => u && u._id).map((userItem, index) => (
                  <motion.div
                    key={`${userItem._id}-${index}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: Math.min(0.05 * index, 0.3) }}
                    className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-200 shadow-sm hover:shadow-md relative group"
                  >
                    <div className="flex items-center space-x-4 mb-5">
                      <div className="relative">
                        <img
                          src={userItem.avatar || '/api/placeholder/64/64'}
                          alt={userItem.name}
                          className="w-16 h-16 rounded-full border-2 border-gray-200 dark:border-gray-600 cursor-pointer hover:border-blue-500 transition-all hover:scale-105"
                          onClick={() => userItem.username && navigate(`/profile/@${userItem.username}?tab=overview`)}
                        />
                        {userItem.currentStreak > 0 && (
                          <div className="absolute -bottom-1 -right-1 bg-orange-500 rounded-full p-1">
                            <Flame className="h-3 w-3 text-white" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3
                          className="font-semibold text-gray-900 dark:text-white text-lg cursor-pointer hover:text-blue-500 transition-colors truncate"
                          onClick={() => userItem.username && navigate(`/profile/@${userItem.username}?tab=overview`)}
                        >
                          {userItem.name}
                        </h3>
                        <p className="text-gray-500 dark:text-gray-400 text-sm truncate">
                          @{userItem.username || userItem.email?.split('@')[0]}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 mb-5">
                      <div className="text-center p-2 bg-blue-50 dark:bg-blue-900/10 rounded-lg">
                        <div className="text-blue-600 dark:text-blue-400 font-semibold text-lg">{userItem.totalGoals || 0}</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">Goals</div>
                      </div>
                      <div className="text-center p-2 bg-green-50 dark:bg-green-900/10 rounded-lg">
                        <div className="text-green-600 dark:text-green-400 font-semibold text-lg">{userItem.completedGoals || 0}</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">Done</div>
                      </div>
                      <div className="text-center p-2 bg-orange-50 dark:bg-orange-900/10 rounded-lg">
                        <div className="text-orange-600 dark:text-orange-400 font-semibold text-lg">{userItem.currentStreak || 0}</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">Streak</div>
                      </div>
                    </div>

                    {userItem.recentGoals && userItem.recentGoals.length > 0 && (
                      <div className="mb-5 pb-5 border-b border-gray-100 dark:border-gray-700">
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Recent Goals</p>
                        <div className="space-y-2">
                          {userItem.recentGoals.slice(0, 2).map((goal, idx) => (
                            <div key={idx} className="flex items-start gap-2">
                              <div className={`w-1.5 h-1.5 rounded-full mt-1.5 ${getCategoryColor(goal.category)}`}></div>
                              <span className="text-sm text-gray-700 dark:text-gray-300 line-clamp-1 flex-1">{goal.title}</span>
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
                          data-user-menu-btn="true"
                          onClick={(e) => { e.stopPropagation(); setOpenUserMenuId(prev => prev === userItem._id ? null : userItem._id); }}
                          className="px-2 py-1 rounded-md text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                        >⋯</button>
                        {openUserMenuId === userItem._id && (
                          <div
                            data-user-menu="true"
                            onClick={(e) => e.stopPropagation()}
                            className="absolute right-0 mt-2 w-40 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-30"
                          >
                            <button
                              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                              onClick={() => { setReportTarget({ type: 'user', id: userItem._id, userId: userItem._id, username: userItem.username || '', label: userItem.username ? `@${userItem.username}` : 'user' }); setReportOpen(true); setOpenUserMenuId(null); }}
                            >Report</button>
                            <button
                              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                              onClick={() => { setBlockUserId(userItem._id); setBlockUsername(userItem.username || ''); setBlockOpen(true); setOpenUserMenuId(null); }}
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
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-16 px-4"
            >
              <div className="max-w-md mx-auto">
                <div className="w-20 h-20 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center mx-auto mb-4">
                  <Users className="h-10 w-10 text-blue-500" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  {searchTerm.trim() || selectedInterest ? 'No users found' : 'Discover People'}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  {searchTerm.trim() || selectedInterest 
                    ? 'Try adjusting your search or filters to find more people.' 
                    : 'Use the search bar or select interests to discover inspiring people and follow their journey.'}
                </p>
                {(searchTerm.trim() || selectedInterest) && (
                  <button
                    onClick={() => { setSearchTerm(''); setSelectedInterest(''); }}
                    className="px-6 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl transition-colors"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            </motion.div>
          )
        ) : activeTab === 'goals' ? (
          (searchTerm.trim() || selectedInterest)
            ? (goalResults && goalResults.length > 0 ? (
              <>
                {/* Search Results Header */}
                <div className="flex items-center gap-2 mb-6">
                  <Search className="h-5 w-5 text-blue-500" />
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Search Results</h2>
                  <span className="text-sm text-gray-500 dark:text-gray-400">({goalResults.length})</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {goalResults.map((g, idx) => (
                  <motion.div
                    key={`${g._id || idx}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: Math.min(0.05 * idx, 0.3) }}
                    onClick={() => g._id && openGoalModal(g._id)}
                    className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500 transition-all duration-200 shadow-sm hover:shadow-lg cursor-pointer group"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <img
                        src={g.user?.avatar || '/api/placeholder/48/48'}
                        alt={g.user?.name || 'User'}
                        className="w-10 h-10 rounded-full border border-gray-200 dark:border-gray-700 group-hover:border-blue-400 dark:group-hover:border-blue-500 transition-all" 
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{g.user?.name || 'User'}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                          {g.completed && <span className="inline-block w-2 h-2 rounded-full bg-green-500"></span>}
                          {g.completedAt ? new Date(g.completedAt).toLocaleDateString() : (g.createdAt ? new Date(g.createdAt).toLocaleDateString() : '')}
                        </div>
                      </div>
                    </div>
                    <h3 className="font-semibold text-gray-900 dark:text-white line-clamp-2 mb-3 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{g.title}</h3>
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20">{g.category}</span>
                      <span className="text-sm text-blue-600 dark:text-blue-400 font-medium group-hover:underline">View →</span>
                    </div>
                  </motion.div>
                ))}
              </div>
              </>
            ) : (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-16 px-4"
              >
                <div className="max-w-md mx-auto">
                  <div className="w-20 h-20 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center mx-auto mb-4">
                    <Target className="h-10 w-10 text-blue-500" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No goals found</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    Try different search terms or filters to discover amazing goals.
                  </p>
                  <button
                    onClick={() => { setSearchTerm(''); setSelectedInterest(''); }}
                    className="px-6 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl transition-colors"
                  >
                    Clear Filters
                  </button>
                </div>
              </motion.div>
            ))
            : (
              trending && trending.length > 0 ? (
                <>
                  {/* Trending Section Header */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-blue-500" />
                      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Trending Goals</h2>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Search to discover more</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {trending.map((g, idx) => (
                    <motion.div
                      key={`${g._id || idx}`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: Math.min(0.05 * idx, 0.3) }}
                      onClick={() => g._id && openGoalModal(g._id)}
                      className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500 transition-all duration-200 shadow-sm hover:shadow-lg cursor-pointer group"
                    >
                      <div className="flex items-center gap-3 mb-4">
                        <img
                          src={g.user?.avatar || '/api/placeholder/48/48'}
                          alt={g.user?.name || 'User'}
                          className="w-10 h-10 rounded-full border border-gray-200 dark:border-gray-700 group-hover:border-blue-400 dark:group-hover:border-blue-500 transition-all" 
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{g.user?.name || 'User'}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                            {g.completed && <span className="inline-block w-2 h-2 rounded-full bg-green-500"></span>}
                            {g.completedAt ? new Date(g.completedAt).toLocaleDateString() : (g.createdAt ? new Date(g.createdAt).toLocaleDateString() : '')}
                          </div>
                        </div>
                        <TrendingUp className="h-4 w-4 text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <h3 className="font-semibold text-gray-900 dark:text-white line-clamp-2 mb-3 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{g.title}</h3>
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20">{g.category}</span>
                        <span className="text-sm text-blue-600 dark:text-blue-400 font-medium group-hover:underline">View →</span>
                      </div>
                    </motion.div>
                  ))}
                  <div ref={discoverSentinelRef} className="col-span-full h-10"></div>
                  {loadingMoreDiscover && (
                    <div className="col-span-full flex items-center justify-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                    </div>
                  )}
                </div>
                </>
              ) : (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-16 px-4"
                >
                  <div className="max-w-md mx-auto">
                    <div className="w-20 h-20 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center mx-auto mb-4">
                      <TrendingUp className="h-10 w-10 text-blue-500" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Discover Goals</h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      Use the search bar or select interests to find inspiring goals and achievements!
                    </p>
                  </div>
                </motion.div>
              )
            )
        ) : (
          communityResults && communityResults.length > 0 ? (
            <>
              {/* Communities Header */}
              <div className="flex items-center gap-2 mb-6">
                <Users className="h-5 w-5 text-purple-500" />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {searchTerm.trim() || selectedInterest ? 'Search Results' : 'Discover Communities'}
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {communityResults.map((c, idx) => (
                <motion.div
                  key={`${c._id || idx}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: Math.min(0.05 * idx, 0.3) }}
                  onClick={() => navigate(`/communities/${c._id}`)}
                  className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-600 transition-all duration-200 shadow-sm hover:shadow-md overflow-hidden cursor-pointer group"
                >
                  <div className="h-28 relative bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20">
                    {c.bannerUrl && (
                      <img src={c.bannerUrl} alt="Community banner" className="absolute inset-0 h-full w-full object-cover" />
                    )}
                  </div>
                  <div className="p-5">
                    <div className="flex items-center gap-3 mb-3">
                      {c.avatarUrl ? (
                        <img src={c.avatarUrl} alt="Community avatar" className="h-12 w-12 rounded-full border-2 border-white dark:border-gray-700 object-cover -mt-8 shadow-sm" />
                      ) : (
                        <div className="h-12 w-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-white flex items-center justify-center text-sm font-bold -mt-8 shadow-sm border-2 border-white dark:border-gray-800">
                          {c.name?.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-gray-900 dark:text-white truncate group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">{c.name}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">{c.description || 'No description'}</div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700">
                      <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                        <Users className="h-4 w-4" />
                        <span className="font-medium">{c.stats?.memberCount || 0}</span>
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 capitalize">{c.visibility}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
            </>
          ) : (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-16 px-4"
            >
              <div className="max-w-md mx-auto">
                <div className="w-20 h-20 rounded-full bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center mx-auto mb-4">
                  <Users className="h-10 w-10 text-purple-500" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  {searchTerm.trim() || selectedInterest ? 'No communities found' : 'Discover Communities'}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  {searchTerm.trim() || selectedInterest 
                    ? 'Try different search terms or filters to find communities.' 
                    : 'Use the search bar or select interests to discover amazing communities to join.'}
                </p>
                {(searchTerm.trim() || selectedInterest) && (
                  <button
                    onClick={() => { setSearchTerm(''); setSelectedInterest(''); }}
                    className="px-6 py-2.5 bg-purple-500 hover:bg-purple-600 text-white rounded-xl transition-colors"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            </motion.div>
          )
        )
        }
        {/* Goal Details Modal (same as Feed) */}
        {goalModalOpen && (
          <Suspense fallback={null}><GoalDetailsModal
            isOpen={goalModalOpen}
            goalId={openGoalId}
            autoOpenComments={scrollCommentsOnOpen}
            onClose={closeGoalModal}
          /></Suspense>
        )}
      </div>

      {/* Report & Block Modals */}
      <Suspense fallback={null}><ReportModal
        isOpen={reportOpen}
        onClose={() => setReportOpen(false)}
        targetLabel={reportTarget.label}
        onSubmit={async ({ reason, description }) => {
          await report({ targetType: reportTarget.type, targetId: reportTarget.id, reason, description });
          if (reportTarget.userId) { setBlockUserId(reportTarget.userId); setBlockUsername(reportTarget.username || ''); setBlockOpen(true); }
          setReportOpen(false);
        }}
        onReportAndBlock={reportTarget.type === 'user' ? async () => { if (reportTarget.id) { await blockUser(reportTarget.id); } } : undefined}
      /></Suspense>
      <Suspense fallback={null}><BlockModal
        isOpen={blockOpen}
        onClose={() => setBlockOpen(false)}
        username={blockUsername || ''}
        onConfirm={async () => { if (blockUserId) { await blockUser(blockUserId); setBlockOpen(false); } }}
      /></Suspense>
    </div>
  )
}

export default DiscoverPage


