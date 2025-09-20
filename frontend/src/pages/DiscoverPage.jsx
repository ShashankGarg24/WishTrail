import { useEffect, useState, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Users, Target, RefreshCw, ChevronsDown, TrendingUp, Flame, UserPlus, UserCheck, Compass } from 'lucide-react'
import useApiStore from '../store/apiStore'
import SkeletonList from '../components/loader/SkeletonList'
import { useNavigate, useLocation } from 'react-router-dom';
import GoalPostModal from '../components/GoalPostModal'
import ReportModal from '../components/ReportModal'
import BlockModal from '../components/BlockModal'
import { lockBodyScroll, unlockBodyScroll } from '../utils/scrollLock'

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
    blockUser
  } = useApiStore()

  const DISCOVER_PAGE_SIZE = 9
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [activeDiscoverSubtab, setActiveDiscoverSubtab] = useState('users')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedInterest, setSelectedInterest] = useState('')
  const [users, setUsers] = useState([])
  const [trending, setTrending] = useState([])
  const [discoverPage, setDiscoverPage] = useState(1)
  const [discoverHasMore, setDiscoverHasMore] = useState(true)
  const [isSearching, setIsSearching] = useState(false)
  const discoverSentinelRef = useRef(null)
  const [interestsExpanded, setInterestsExpanded] = useState(false)
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
    try { if (typeof window !== 'undefined' && window.ReactNativeWebView) setInNativeApp(true) } catch {}
  }, [])

  // Deep link: open via ?goalId=
  useEffect(() => {
    try {
      const params = new URLSearchParams(location.search)
      const gid = params.get('goalId')
      if (gid) {
        openGoalModal(gid)
      }
    } catch {}
  }, [location.search])

  useEffect(() => {
    if (!isAuthenticated) return
    fetchInitial()
    if (!interestsCatalog || interestsCatalog.length === 0) {
      loadInterests().catch(() => {})
    }
  }, [isAuthenticated])

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
    if (selectedInterest && (!searchTerm || searchTerm.trim().length < 2)) {
      handleSearch('', selectedInterest);
    }
  }, [selectedInterest]);

  const fetchInitial = async () => {
    setLoading(true)
    try {
      if (activeDiscoverSubtab === 'users') {
        setDiscoverPage(1)
        setDiscoverHasMore(true)
        const usersData = await getUsers({ page: 1, limit: DISCOVER_PAGE_SIZE })
        if (usersData.success) {
          const filteredUsers = (usersData.users || []).filter(u => u && u._id && u._id !== user?._id)
          setUsers(filteredUsers.slice(0, DISCOVER_PAGE_SIZE))
          const totalPages = usersData.pagination?.pages || 1
          setDiscoverHasMore(1 < totalPages)
        } else {
          setUsers([])
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
          const { goals, pagination } = await getTrendingGoals({ strategy: 'global', page: 1, limit: 18 });
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
    } catch {}
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
        if ((searchTerm.trim() || selectedInterest) && activeDiscoverSubtab === 'users') {
          loadMoreUserSearch();
        } else if ((searchTerm.trim() || selectedInterest) && activeDiscoverSubtab === 'goals') {
          loadMoreGoalSearch();
        } else if (activeDiscoverSubtab === 'users') {
          loadMoreDiscover();
        } else if (activeDiscoverSubtab === 'goals') {
          loadMoreTrending();
        }
      }
    }, { root: null, rootMargin: '300px', threshold: 0.1 });
    const target = discoverSentinelRef.current;
    if (target) observer.observe(target);
    return () => observer.disconnect();
  }, [isAuthenticated, loadMoreDiscover, loadMoreTrending, loadMoreUserSearch, loadMoreGoalSearch, activeDiscoverSubtab, searchTerm, selectedInterest]);

  const handleSearch = async (term, interestValue) => {
    const t = term.trim();
    if (!t && !interestValue) {
      setSearchResults([]);
      setGoalResults([]);
      setIsSearching(false);
      return;
    }
    if (t && t.length < 2 && !interestValue) {
      setSearchResults([]);
      setGoalResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    setUserSearchPage(1);
    setGoalSearchPage(1);
    setUserSearchHasMore(true);
    setGoalSearchHasMore(true);
    try {
      if (activeDiscoverSubtab === 'users') {
        const { users: results, pagination } = await searchUsers({ search: t, interest: interestValue, page: 1, limit: 18 });
        const filteredResults = (results || []).filter(u => u && u._id !== user?._id);
        setSearchResults(filteredResults);
        const totalPages = pagination?.pages || 1;
        setUserSearchHasMore(1 < totalPages);
      } else {
        setLoadingGoals(true);
        const { goals, pagination } = await useApiStore.getState().searchGoals({ q: t, interest: interestValue, page: 1, limit: 18 });
        setGoalResults(goals || []);
        const totalPages = pagination?.pages || 1;
        setGoalSearchHasMore(1 < totalPages);
      }
    } catch (error) {
      console.error('Error searching:', error);
      setSearchResults([]);
      setGoalResults([]);
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
        {!inNativeApp && (
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
            <Users className="h-6 w-6 mr-2 text-blue-500" />
            Discover
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchInitial()}
              aria-label="Refresh"
              className={`h-9 w-9 inline-flex items-center justify-center rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors ${loading ? 'opacity-80' : ''}`}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
        )}

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }} className="relative max-w-3xl mx-auto mb-8">
          <div className="relative">
            <input type="text" placeholder={activeDiscoverSubtab === 'users' ? 'Search users by name or username...' : 'Search goals by title...'}
             value={searchTerm} 
             onChange={(e) => setSearchTerm(e.target.value)} 
             className="w-full pl-4 pr-36 py-4 bg-white/80 dark:bg-gray-800/50 backdrop-blur-lg border border-gray-200 dark:border-gray-700/50 rounded-2xl text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-lg" />
            <div role="tablist" aria-label="Discover mode" className="flex absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/50 rounded-xl p-1 shadow-sm">
              <button role="tab" 
              aria-selected={activeDiscoverSubtab === 'users'} 
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium ${activeDiscoverSubtab === 'users' ? 'bg-blue-500 text-white' : 'text-gray-700 dark:text-gray-300'}`} 
              onClick={() => { setActiveDiscoverSubtab('users'); setTrending([]); fetchInitial(); }}>Users</button>
              <button 
              role="tab" 
              aria-selected={activeDiscoverSubtab === 'goals'} 
              className={`ml-1 px-2.5 py-1.5 rounded-lg text-xs font-medium ${activeDiscoverSubtab === 'goals' ? 'bg-blue-500 text-white' : 'text-gray-700 dark:text-gray-300'}`} 
              onClick={() => { setActiveDiscoverSubtab('goals'); setUsers([]); fetchInitial(); }}>Goals</button>
            </div>
          </div>
          <div className="mt-3">
              <div className="relative">
                <div className="flex gap-2 flex-nowrap overflow-x-auto no-scrollbar pr-16 items-center">
                  {(() => {
                    const items = (interestsCatalog && interestsCatalog.length > 0)
                      ? interestsCatalog.map(x => x.interest)
                      : ['fitness','health','travel','education','career','finance','hobbies','relationships','personal_growth','creativity','technology','business','lifestyle','spirituality','sports','music','art','reading','cooking','gaming','nature','volunteering'];
                    const unique = Array.from(new Set([
                      selectedInterest || null,
                      ...items
                    ].filter(Boolean)));
                    return unique.map((i) => {
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
                  className="absolute right-0 top-0 px-3 py-1.5 rounded-full text-xs font-medium border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800/70 text-gray-600 dark:text-gray-300 opacity-80 hover:opacity-100 hover:bg-gray-200 dark:hover:bg-gray-700 inline-flex items-center gap-1"
                  aria-expanded={interestsExpanded}
                >
                  <ChevronsDown className="h-4 w-4 opacity-90" />
                  {interestsExpanded ? 'Collapse' : 'Expand'}
                </button>
              </div>
            </div>
            {interestsExpanded && (
              <div className="mt-3 bg-white/80 dark:bg-gray-800/50 backdrop-blur-lg rounded-2xl border border-gray-200 dark:border-gray-700/50 p-3">
                <div className="max-h-72 overflow-auto pr-1 grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {(() => {
                    const list = (interestsCatalog && interestsCatalog.length > 0)
                      ? interestsCatalog.map(x => ({ interest: x.interest }))
                      : ['fitness','health','travel','education','career','finance','hobbies','relationships','personal_growth','creativity','technology','business','lifestyle','spirituality','sports','music','art','reading','cooking','gaming','nature','volunteering'].map(i => ({ interest: i }));
                    return list.map((x) => {
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
                        </button>
                      );
                    });
                  })()}
                </div>
              </div>
            )}
        </motion.div>

        {(loading || isSearching || loadingGoals) ? (
                  <SkeletonList count={9} grid avatar lines={3} />
                ) : activeDiscoverSubtab === 'users' ? (
                  displayUsers.length > 0 ? (
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
                    <div className="text-center py-12">
                      <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 dark:text-gray-400 text-lg">
                        {searchTerm.trim() || selectedInterest ? 'No users found matching your search.' : 'No users to discover yet.'}
                      </p>
                    </div>
                  )
                ) : (
                  (searchTerm.trim() || selectedInterest)
                  ? (goalResults && goalResults.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {goalResults.map((g, idx) => (
                        <motion.div
                          key={`${g._id || idx}`}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.5, delay: 0.1 * idx }}
                          className="bg-white/80 dark:bg-gray-800/50 backdrop-blur-lg rounded-2xl p-5 border border-gray-200 dark:border-gray-700/50 hover:border-gray-300 dark:hover:border-gray-600/50 transition-all duration-200 shadow-lg hover:shadow-xl"
                        >
                          <div className="flex items-center gap-3 mb-3">
                            <img src={g.user?.avatar || '/api/placeholder/48/48'} className="w-10 h-10 rounded-full" />
                            <div className="min-w-0">
                              <div className="text-sm text-gray-700 dark:text-gray-300 truncate">{g.user?.name || 'User'}</div>
                              <div className="text-xs text-gray-400">{g.completedAt ? new Date(g.completedAt).toLocaleDateString() : ''}</div>
                            </div>
                          </div>
                          <h3 className="font-semibold text-gray-900 dark:text-white line-clamp-2 break-anywhere mb-2">{g.title}</h3>
                          <div className="flex items-center justify-between">
                            <span className="inline-block px-2 py-1 rounded-full text-xs font-medium text-white bg-blue-500">{g.category}</span>
                            <button className="text-sm text-blue-600 hover:underline" onClick={() => g._id && openGoalModal(g._id)}>View</button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Target className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 dark:text-gray-400 text-lg">No goals found.</p>
                    </div>
                  ))
                  : (
                    trending && trending.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {trending.map((g, idx) => (
                          <motion.div
                            key={`${g._id || idx}`}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.1 * idx }}
                            className="bg-white/80 dark:bg-gray-800/50 backdrop-blur-lg rounded-2xl p-5 border border-gray-200 dark:border-gray-700/50 hover:border-gray-300 dark:hover:border-gray-600/50 transition-all duration-200 shadow-lg hover:shadow-xl"
                          >
                            <div className="flex items-center gap-3 mb-3">
                              <img src={g.user?.avatar || '/api/placeholder/48/48'} className="w-10 h-10 rounded-full" />
                              <div className="min-w-0">
                                <div className="text-sm text-gray-700 dark:text-gray-300 truncate">{g.user?.name || 'User'}</div>
                                <div className="text-xs text-gray-400">{g.completedAt ? new Date(g.completedAt).toLocaleDateString() : ''}</div>
                              </div>
                            </div>
                            <h3 className="font-semibold text-gray-900 dark:text-white line-clamp-2 break-anywhere mb-2">{g.title}</h3>
                            <div className="flex items-center justify-between">
                              <span className="inline-block px-2 py-1 rounded-full text-xs font-medium text-white bg-blue-500">{g.category}</span>
                              <button className="text-sm text-blue-600 hover:underline" onClick={() => g._id && openGoalModal(g._id)}>View</button>
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
                    ) : (
                      <div className="text-center py-12">
                        <Target className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600 dark:text-gray-400 text-lg">No trending goals yet.</p>
                      </div>
                    )
                  )
                )}
        {/* Goal Post Modal */}
        {goalModalOpen && (
          <GoalPostModal
            isOpen={goalModalOpen}
            goalId={openGoalId}
            autoOpenComments={scrollCommentsOnOpen}
            onClose={closeGoalModal}
          />
        )}
      </div>
      
      {/* Report & Block Modals */}
      <ReportModal
        isOpen={reportOpen}
        onClose={() => setReportOpen(false)}
        targetLabel={reportTarget.label}
    onSubmit={async ({ reason, description }) => { 
      await report({ targetType: reportTarget.type, targetId: reportTarget.id, reason, description }); 
      if (reportTarget.userId) { setBlockUserId(reportTarget.userId); setBlockUsername(reportTarget.username || ''); setBlockOpen(true); }
      setReportOpen(false);
    }}
    onReportAndBlock={reportTarget.type === 'user' ? async () => { if (reportTarget.id) { await blockUser(reportTarget.id); } } : undefined}
      />
      <BlockModal
        isOpen={blockOpen}
        onClose={() => setBlockOpen(false)}
    username={blockUsername || ''}
        onConfirm={async () => { if (blockUserId) { await blockUser(blockUserId); setBlockOpen(false); } }}
      />
    </div>
  )
}

export default DiscoverPage


