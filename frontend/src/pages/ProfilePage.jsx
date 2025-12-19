import { useState, useEffect, useRef, lazy, Suspense } from "react";
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Target, TrendingUp, Star, Edit2, ExternalLink, Youtube, Instagram, MapPin, Globe, Trophy, BookOpen, Clock, CheckCircle, Circle, User, UserPlus, UserCheck, ArrowLeft, Lock, Sparkles, Download, Flame } from "lucide-react";
const FollowListModal = lazy(() => import("../components/FollowListModal"));
import { motion } from "framer-motion";
import useApiStore from "../store/apiStore";
import { journalsAPI } from "../services/api";
import { habitsAPI } from '../services/api';
import ShareSheet from '../components/ShareSheet';
import toast from 'react-hot-toast';
const ProfileEditModal = lazy(() => import("../components/ProfileEditModal"));
const ReportModal = lazy(() => import("../components/ReportModal"));
const BlockModal = lazy(() => import("../components/BlockModal"));
const JournalPromptModal = lazy(() => import("../components/JournalPromptModal"));
const JournalEntryModal = lazy(() => import("../components/JournalEntryModal"));
const JournalExportModal = lazy(() => import("../components/JournalExportModal"));
const HabitAnalyticsCard = lazy(() => import("../components/HabitAnalyticsCard"));
const HabitDetailModal = lazy(() => import("../components/HabitDetailModal"));
const GoalDetailsModal = lazy(() => import('../components/GoalDetailsModal'));

const ProfilePage = () => {
  const params = useParams();
  const usernameParam = params.username;
  const navigate = useNavigate();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'overview';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [userGoals, setUserGoals] = useState([]);
  const [profileUser, setProfileUser] = useState(null);
  
  // Pagination for goals
  const GOALS_PER_PAGE = 9;
  const PROGRESS_GOALS_PER_PAGE = 6;
  const [goalsPage, setGoalsPage] = useState(1);
  const [hasMoreGoals, setHasMoreGoals] = useState(true);
  const [loadingMoreGoals, setLoadingMoreGoals] = useState(false);
  const [userStats, setUserStats] = useState(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [followModalOpen, setFollowModalOpen] = useState(false);
  const [followModalTab, setFollowModalTab] = useState('followers');
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [loadingFollows, setLoadingFollows] = useState(false);
  const [followersPage, setFollowersPage] = useState(1);
  const [followingPage, setFollowingPage] = useState(1);
  const [hasMoreFollowers, setHasMoreFollowers] = useState(false);
  const [hasMoreFollowing, setHasMoreFollowing] = useState(false);
  const [loadingMoreFollows, setLoadingMoreFollows] = useState(false);
  
  const FOLLOW_LIMIT = 20;

  const {
    user: currentUser,
    isAuthenticated,
    getGoals,
    getUser,
    getUserGoals,
    followUser,
    unfollowUser,
    report,
    blockUser,
    cancelFollowRequest,
    getUserJournalHighlights,
    getMyJournalEntries,
    journalEntries,
    getFollowers,
    getFollowing,
    getUserAnalytics
  } = useApiStore();

  const [analytics, setAnalytics] = useState(null);

  // Determine if viewing own profile or another user's profile
  const isOwnProfile = (() => {
    if (!currentUser) return false;

    let sanitizedUsername = usernameParam?.replace('@', '');
    return currentUser.username === sanitizedUsername;
  })();

  const displayUser = isOwnProfile ? currentUser : profileUser;

  const [isRequested, setIsRequested] = useState(false);
  const [isJournalOpen, setIsJournalOpen] = useState(false);
  const [entryModalOpen, setEntryModalOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [journalFeed, setJournalFeed] = useState([]);
  const [journalSkip, setJournalSkip] = useState(0);
  const JOURNAL_LIMIT = 6;
  const [journalHasMore, setJournalHasMore] = useState(true);
  const [journalLoading, setJournalLoading] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [myHabits, setMyHabits] = useState([]);
  const [userHabits, setUserHabits] = useState([]);
  const [habitsPage, setHabitsPage] = useState(1);
  const [hasMoreHabits, setHasMoreHabits] = useState(false);
  const [loadingMoreHabits, setLoadingMoreHabits] = useState(false);
  const HABITS_PER_PAGE = 9;
  const [openGoalId, setOpenGoalId] = useState(null)
  const [openHabitId, setOpenHabitId] = useState(null)
  const [habitModalOpen, setHabitModalOpen] = useState(false)
  const [scrollCommentsOnOpen, setScrollCommentsOnOpen] = useState(false)
  const [shareSheetOpen, setShareSheetOpen] = useState(false)
  const shareUrlRef = useRef('')
  const [isMobile, setIsMobile] = useState(false)

  const isProfileAccessible = () => {
    if (isOwnProfile) return true;
    if (!profileUser) return false;
    if (!profileUser.isPrivate || isFollowing) return true;
    return false;
  };

  useEffect(() => {
    const compute = () => setIsMobile(typeof window !== 'undefined' && window.innerWidth < 768)
    compute()
    window.addEventListener('resize', compute)
    return () => window.removeEventListener('resize', compute)
  }, [])

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
  }, [isAuthenticated, usernameParam]);

  // Outside click to close profile modal menu is handled by backdrop onClick
  useEffect(() => {
    return () => {};
  }, []);


  // Open Journal modal directly if ?journal=1 and viewing own profile
  useEffect(() => {
    try {
      const j = searchParams.get('journal');
      if (j === '1' && isOwnProfile) {
        setIsJournalOpen(true);
      }
    } catch { }
  }, [searchParams, isOwnProfile]);

  useEffect(() => {
    const tabFromUrl = searchParams.get('tab') || 'overview';
    if (tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams]);

  useEffect(() => {
    
    // Load Journal when tab opens
    const fetchJournal = async () => {
      try {
        
        if (activeTab === 'journal' && isOwnProfile && currentUser?.username) {
          // Reset feed and load first page (own profile only)
          setJournalFeed([]);
          setJournalSkip(0);
          setJournalHasMore(true);
          setJournalLoading(true);
          
          try {
            const params = { limit: JOURNAL_LIMIT, skip: 0 };
            const res = await journalsAPI.getMyEntries(params);
            const entries = res?.data?.data?.entries || [];
            setJournalFeed(entries);
            setJournalSkip(entries.length);
            if (entries.length < JOURNAL_LIMIT) setJournalHasMore(false);
          } catch (err) {
            setJournalHasMore(false);
          } finally {
            setJournalLoading(false);
          }
        }
      } catch (e) {
      }
    };
    fetchJournal();
    
    // Load habits when habits tab opens
    if (activeTab === 'habits' && isOwnProfile && userHabits.length === 0) {
      fetchUserHabits();
    }
    
    // Load habit analytics (no heatmap)
    const fetchHabits = async () => {
      try {
        if (activeTab !== 'overview') return;
        if (!isOwnProfile) return;

        const habits = listRes?.data?.data?.habits || [];
        setMyHabits(habits);
      } catch (_) { }
    };
    fetchHabits();
  }, [activeTab, profileUser?.username, currentUser?.username, isOwnProfile]);

  const loadMoreJournal = async () => {
    if (!isOwnProfile || journalLoading || !journalHasMore) return;
    try {
      setJournalLoading(true);
      const params = { limit: JOURNAL_LIMIT, skip: journalSkip };
      const res = await journalsAPI.getMyEntries(params);
      const entries = res?.data?.data?.entries || [];
      setJournalFeed(prev => {
        const seen = new Set(prev.map(x => x?.createdAt).filter(Boolean));
        const filtered = entries.filter(e => e && e.createdAt && !seen.has(e.createdAt));
        return [...prev, ...filtered];
      });
      setJournalSkip(prev => prev + entries.length);
      if (entries.length < JOURNAL_LIMIT) setJournalHasMore(false);
    } catch (_) {
      setJournalHasMore(false);
    } finally {
      setJournalLoading(false);
    }
  };

  const hasTodayJournal = (() => {
    if (!isOwnProfile) return false;
    const today = new Date(); today.setUTCHours(0, 0, 0, 0);
    const todayKey = today.toISOString().split('T')[0];
    if (Array.isArray(journalEntries) && journalEntries.length > 0) {
      return journalEntries.some(e => (e.dayKey || (new Date(e.createdAt).toISOString().split('T')[0])) === todayKey);
    }
    return false;
  })();

  const fetchOwnProfile = async () => {
    setLoading(true);
    try {
      const [goalsResult, analyticsResult] = await Promise.all([
        getGoals({ page: 1, limit: GOALS_PER_PAGE }),
        getUserAnalytics()
      ]);
      
      if (goalsResult.success) {
        setUserGoals(goalsResult.goals || []);
        const totalPages = goalsResult.pagination?.pages || 1;
        setHasMoreGoals(1 < totalPages);
        setGoalsPage(1);
      }
      
      if (analyticsResult.success) {
        setAnalytics(analyticsResult.analytics);
      }
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const fetchUserHabits = async () => {
    if (!isOwnProfile) return;
    try {
      const result = await habitsAPI.list({ page: 1, limit: HABITS_PER_PAGE });
      if (result.data.success) {
        setUserHabits(result.data.data.habits || []);
        const totalPages = result.data.data.pagination?.pages || 1;
        setHasMoreHabits(1 < totalPages);
        setHabitsPage(1);
      }
    } catch (error) {
    }
  };

  const fetchUserProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const idOrUsername = usernameParam;
      const userResult = await getUser(idOrUsername);
      if (userResult.success) {
        setProfileUser(userResult.user);
        setUserStats(userResult.stats);
        setIsFollowing(userResult.isFollowing);
        setIsRequested(!!userResult.isRequested);
        if (userResult.user && (!userResult.user.isPrivate || userResult.isFollowing)) {
          const goalsResult = await getUserGoals(userResult.user._id, { page: 1, limit: GOALS_PER_PAGE });
          if (goalsResult.success) {
            setUserGoals(goalsResult.goals || []);
            const totalPages = goalsResult.pagination?.pages || 1;
            setHasMoreGoals(1 < totalPages);
            setGoalsPage(1);
          }
        }
      }
    } catch (error) {
      setError('Failed to load user profile');
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async () => {
    // Store previous state for rollback
    const wasRequested = isRequested;
    const wasFollowing = isFollowing;
    const isPrivate = profileUser?.isPrivate;
    
    // Update UI immediately (optimistic)
    if (isPrivate) {
      setIsRequested(true);
      setIsFollowing(false);
    } else {
      setIsFollowing(true);
      setIsRequested(false);
      // Update follower count for public profiles
      setUserStats(prev => ({
        ...prev,
        followers: (prev?.followers || 0) + 1
      }));
    }

    try {
      const result = await followUser(profileUser?._id);
      if (result.success) {
        // Show success toast
        if (result.isRequested || isPrivate) {
          toast.success('Follow request sent');
          // Keep the optimistic state (already set above)
        } else {
          toast.success('Followed successfully');
          // Keep the optimistic state (already set above)
        }
      } else {
        // Revert on error
        setIsRequested(wasRequested);
        setIsFollowing(wasFollowing);
        if (!isPrivate && wasFollowing !== true) {
          setUserStats(prev => ({
            ...prev,
            followers: Math.max((prev?.followers || 0) - 1, 0)
          }));
        }
        toast.error(result.error || 'Failed to follow user');
      }
    } catch (error) {
      // Revert on error
      setIsRequested(wasRequested);
      setIsFollowing(wasFollowing);
      if (!isPrivate && wasFollowing !== true) {
        setUserStats(prev => ({
          ...prev,
          followers: Math.max((prev?.followers || 0) - 1, 0)
        }));
      }
      toast.error('Failed to follow user');
    }
  };

  const handleUnfollow = async () => {
    // Store previous state for rollback
    const wasFollowing = isFollowing;
    
    // Update UI immediately (optimistic)
    setIsFollowing(false);
    setUserStats(prev => ({
      ...prev,
      followers: Math.max((prev?.followers || 0) - 1, 0)
    }));
    if (profileUser?.isPrivate) {
      setUserGoals([]);
    }

    try {
      const result = await unfollowUser(profileUser?._id);
      if (result.success) {
        toast.success('Unfollowed successfully');
        // Keep the optimistic state (already set above)
      } else {
        // Revert on error
        setIsFollowing(wasFollowing);
        setUserStats(prev => ({
          ...prev,
          followers: (prev?.followers || 0) + 1
        }));
        toast.error(result.error || 'Failed to unfollow user');
      }
    } catch (error) {
      // Revert on error
      setIsFollowing(wasFollowing);
      setUserStats(prev => ({
        ...prev,
        followers: (prev?.followers || 0) + 1
      }));
      toast.error('Failed to unfollow user');
    }
  };

  const handleCancelRequest = async () => {
    // Optimistically update UI
    const wasRequested = isRequested;
    setIsRequested(false);

    try {
      const result = await cancelFollowRequest(profileUser?._id);
      if (result.success) {
        toast.success('Request cancelled');
        setIsRequested(false);
      } else {
        // Revert on error
        setIsRequested(wasRequested);
        toast.error(result.error || 'Failed to cancel request');
      }
    } catch (error) {
      // Revert on error
      setIsRequested(wasRequested);
      toast.error('Failed to cancel request');
    }
  };

  const loadMoreGoals = async () => {
    if (loadingMoreGoals || !hasMoreGoals) return;
    setLoadingMoreGoals(true);
    try {
      const nextPage = goalsPage + 1;
      const result = isOwnProfile 
        ? await getGoals({ page: nextPage, limit: GOALS_PER_PAGE })
        : await getUserGoals(profileUser._id, { page: nextPage, limit: GOALS_PER_PAGE });
      
      if (result.success) {
        setUserGoals(prev => [...prev, ...(result.goals || [])]);
        setGoalsPage(nextPage);
        const totalPages = result.pagination?.pages || nextPage;
        setHasMoreGoals(nextPage < totalPages);
      }
    } catch (error) {
      setHasMoreGoals(false);
    } finally {
      setLoadingMoreGoals(false);
    }
  };

  const closeGoalModal = () => {
    setOpenGoalId(null)
    setScrollCommentsOnOpen(false)
    try {
      const params = new URLSearchParams(location.search)
      if (params.get('goalId')) navigate(-1)
    } catch { }
  }

  const handleTabChange = (tab) => {
    setSearchParams({ tab });
    setActiveTab(tab);
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
            onClick={() => navigate('/discover')}
            className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl transition-colors duration-200 font-medium"
          >
            Back to Discover
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

  const containerClass = "max-w-4xl";

  return (
    <div className={backgroundClass}>
      <div className={`${containerClass} mx-auto px-4 py-8`}>
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
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className={isOwnProfile
            ? "bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 mb-8"
            : "bg-white/80 dark:bg-gray-800/50 backdrop-blur-lg rounded-2xl p-8 border border-gray-200 dark:border-gray-700/50 mb-8"
          }
        >
          <div className="flex flex-col relative">
            {/* Top Row - Image, Name, Stats (Desktop: horizontal, Mobile: same) */}
            <div className="flex flex-row items-start gap-4 md:gap-6 mb-6 md:mb-4">
              {/* Profile Picture */}
              <div className="relative flex-shrink-0">
                <img
                  src={displayUser.avatar || '/api/placeholder/150/150'}
                  alt={displayUser.name}
                  className="w-20 h-20 md:w-24 md:h-24 rounded-full border-4 border-gray-300 dark:border-gray-600 object-cover"
                />
                {isOwnProfile ? (
                  displayUser.currentMood && (
                    <button
                      onClick={() => setIsEditModalOpen(true)}
                      className="absolute -bottom-1 -right-1 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-full p-1 hover:scale-110 transition-transform cursor-pointer shadow-md"
                      title="Click to change your mood"
                    >
                      <span className="text-lg">{displayUser.currentMood}</span>
                    </button>
                  )
                ) : (
                  displayUser.currentMood && (
                    <div className="absolute -bottom-1 -right-1 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-full p-1 shadow-md">
                      <span className="text-lg">{displayUser.currentMood}</span>
                    </div>
                  )
                )}
              </div>

              {/* Name, Username, and Stats Container */}
              <div className="flex flex-col flex-1">
                {/* Name and Username */}
                <div className="mb-4 md:mb-2">
                  <h1 className="text-lg md:text-lg font-bold text-gray-900 dark:text-white mb-0.5">
                    {displayUser.name}
                  </h1>
                  <p className="text-sm md:text-sm text-gray-600 dark:text-gray-400">
                    @{displayUser.username}
                  </p>
                </div>

                {/* Stats Row */}
                <div className="flex gap-4 md:gap-6">
                  <button className="text-center flex-1 md:flex-none" onClick={() => { handleTabChange('goals') }}>
                    <div className="text-xl md:text-lg font-bold text-gray-900 dark:text-white">
                      {isOwnProfile ? (displayUser.totalGoals || 0) : (userStats?.totalGoals || 0)}
                    </div>
                    <div className="text-gray-600 dark:text-gray-400 text-xs md:text-xs">Goals</div>
                  </button>
                  <button className="text-center flex-1 md:flex-none" onClick={async () => {
                    setFollowModalTab('followers'); setFollowModalOpen(true); setLoadingFollows(true);
                    setFollowersPage(1); setFollowers([]);
                    try {
                      const username = isOwnProfile ? currentUser?.username : profileUser?.username;
                      const res = await getFollowers(username, { page: 1, limit: FOLLOW_LIMIT });
                      if (res?.success) {
                        setFollowers(res.followers || []);
                        setHasMoreFollowers((res.followers?.length || 0) >= FOLLOW_LIMIT);
                      }
                    } finally { setLoadingFollows(false); }
                  }}>
                    <div className="text-xl md:text-lg font-bold text-gray-900 dark:text-white">
                      {isOwnProfile ? (displayUser.followerCount || 0) : (userStats?.followers || 0)}
                    </div>
                    <div className="text-gray-600 dark:text-gray-400 text-xs md:text-xs">Followers</div>
                  </button>
                  <button className="text-center flex-1 md:flex-none" onClick={async () => {
                    setFollowModalTab('following'); setFollowModalOpen(true); setLoadingFollows(true);
                    setFollowingPage(1); setFollowing([]);
                    try {
                      const username = isOwnProfile ? currentUser?.username : profileUser?.username;
                      const res = await getFollowing(username, { page: 1, limit: FOLLOW_LIMIT });
                      if (res?.success) {
                        setFollowing(res.following || []);
                        setHasMoreFollowing((res.following?.length || 0) >= FOLLOW_LIMIT);
                      }
                    } finally { setLoadingFollows(false); }
                  }}>
                    <div className="text-xl md:text-lg font-bold text-gray-900 dark:text-white">
                      {isOwnProfile ? (displayUser.followingCount || 0) : (userStats?.followings || 0)}
                    </div>
                    <div className="text-gray-600 dark:text-gray-400 text-xs md:text-xs">Following</div>
                  </button>
                </div>
              </div>
            </div>

            {/* Bottom Row - Bio and Details (Below image on desktop) */}
            <div className="w-full">
              {/* Bio */}
              {displayUser.bio && (
                <p className="text-gray-700 dark:text-gray-300 mb-4 leading-relaxed text-sm md:text-base">
                  {displayUser.bio}
                </p>
              )}

              {/* Social Links */}
              {(displayUser.website || displayUser.youtube || displayUser.instagram) && (
                <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 dark:text-gray-400 mb-4">
                  {displayUser.website && (
                    <a
                      href={formatUrl(displayUser.website)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center space-x-1 hover:text-primary-500 transition-colors"
                    >
                      <Globe className="h-4 w-4" />
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
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* 3-dots menu button - Desktop position */}
            <div className="hidden md:block absolute top-0 right-0">
              <button data-profile-menu-btn="true" onClick={() => setProfileMenuOpen(v => !v)} className="px-2 py-1 rounded-md text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800">⋮</button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 mt-6 md:mt-0 md:absolute md:top-8 md:right-8 flex-col md:flex-row">
            {isOwnProfile ? (
              <>
                <div className="flex gap-2 w-full md:w-auto">
                  <button
                    onClick={() => setIsEditModalOpen(true)}
                    className="flex-1 md:hidden flex items-center justify-center space-x-2 px-4 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg transition-colors font-medium border border-gray-300 dark:border-gray-600"
                  >
                    <Edit2 className="h-4 w-4" />
                    <span>Edit Profile</span>
                  </button>
                  {/* 3-dots menu - vertical dots on mobile, horizontal on desktop */}
                  <div className="relative">
                    <button data-profile-menu-btn="true" onClick={() => setProfileMenuOpen(v => !v)} className="px-3 py-3 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border border-gray-300 dark:border-gray-600">
                      <span className="md:hidden">⋮</span>
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                {isAuthenticated && (
                  <div className="flex gap-2 w-full md:w-auto">
                    {isFollowing ? (
                      <button
                        onClick={handleUnfollow}
                        className="flex-1 md:flex-none flex items-center justify-center space-x-2 px-4 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg transition-colors font-medium border border-gray-300 dark:border-gray-600"
                      >
                        <UserCheck className="h-4 w-4" />
                        <span>Following</span>
                      </button>
                    ) : isRequested ? (
                      <button
                        onClick={handleCancelRequest}
                        className="flex-1 md:flex-none flex items-center justify-center space-x-2 px-4 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg transition-colors font-medium border border-gray-300 dark:border-gray-600"
                      >
                        <UserCheck className="h-4 w-4" />
                        <span>Requested</span>
                      </button>
                    ) : (
                      <button
                        onClick={handleFollow}
                        className="flex-1 md:flex-none flex items-center justify-center space-x-2 px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors font-medium"
                      >
                        <UserPlus className="h-4 w-4" />
                        <span>Follow</span>
                      </button>
                    )}
                    {/* 3-dots menu for mobile on other profiles - vertical dots */}
                    <div className="relative md:hidden">
                      <button data-profile-menu-btn="true" onClick={() => setProfileMenuOpen(v => !v)} className="px-3 py-3 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border border-gray-300 dark:border-gray-600">⋮</button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Follow List Modal */}
          <Suspense fallback={null}><FollowListModal
            isOpen={followModalOpen}
            onClose={() => setFollowModalOpen(false)}
            activeTab={followModalTab}
            onTabChange={async (tab) => {
              setFollowModalTab(tab)
              setLoadingFollows(true)
              try {
                const username = isOwnProfile ? currentUser?.username : profileUser?.username;
                if (tab === 'followers') {
                  setFollowersPage(1); setFollowers([]);
                  const res = await getFollowers(username, { page: 1, limit: FOLLOW_LIMIT })
                  if (res?.success) {
                    setFollowers(res.followers || [])
                    setHasMoreFollowers((res.followers?.length || 0) >= FOLLOW_LIMIT)
                  }
                } else {
                  setFollowingPage(1); setFollowing([]);
                  const res = await getFollowing(username, { page: 1, limit: FOLLOW_LIMIT })
                  if (res?.success) {
                    setFollowing(res.following || [])
                    setHasMoreFollowing((res.following?.length || 0) >= FOLLOW_LIMIT)
                  }
                }
              } finally { setLoadingFollows(false) }
            }}
            followers={followers}
            following={following}
            followersCount={isOwnProfile ? (displayUser?.followerCount || 0) : (userStats?.followers || 0)}
            followingCount={isOwnProfile ? (displayUser?.followingCount || 0) : (userStats?.followings || 0)}
            loading={loadingFollows}
            hasMore={followModalTab === 'followers' ? hasMoreFollowers : hasMoreFollowing}
            loadingMore={loadingMoreFollows}
            onLoadMore={async () => {
              setLoadingMoreFollows(true)
              try {
                const username = isOwnProfile ? currentUser?.username : profileUser?.username;
                if (followModalTab === 'followers') {
                  const nextPage = followersPage + 1
                  const res = await getFollowers(username, { page: nextPage, limit: FOLLOW_LIMIT })
                  if (res?.success) {
                    setFollowers(prev => [...prev, ...(res.followers || [])])
                    setFollowersPage(nextPage)
                    setHasMoreFollowers((res.followers?.length || 0) >= FOLLOW_LIMIT)
                  }
                } else {
                  const nextPage = followingPage + 1
                  const res = await getFollowing(username, { page: nextPage, limit: FOLLOW_LIMIT })
                  if (res?.success) {
                    setFollowing(prev => [...prev, ...(res.following || [])])
                    setFollowingPage(nextPage)
                    setHasMoreFollowing((res.following?.length || 0) >= FOLLOW_LIMIT)
                  }
                }
              } finally { setLoadingMoreFollows(false) }
            }}
            onOpenProfile={(u) => {
              try {
                const path = u?.username ? `/profile/@${u.username}` : (`/profile/${u?._id || u?.id}`)
                if (path) navigate(path)
                setFollowModalOpen(false)
              } catch { }
            }}
          /></Suspense>
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
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }} className="relative max-w-3xl mx-auto mb-8">
              <div className="flex justify-center mt-4">
                <div className="relative flex w-full max-w-sm border-b border-gray-300 dark:border-gray-700">
                  {["overview", "goals", ...(isOwnProfile ? ["habits"] : []), ...(isOwnProfile ? ["journal"] : [])].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => handleTabChange(tab)}
                      className={`
                                  flex-1 py-2 text-center text-sm font-medium capitalize
                                  transition-colors duration-200
                                  ${activeTab === tab
                          ? "text-blue-600 dark:text-blue-400"
                          : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                        }
                                `}
                    >
                      {tab}
                    </button>
                  ))}

                  {/* Sliding Underline */}
                  <motion.div
                    className="absolute bottom-0 h-0.5 bg-blue-600 dark:bg-blue-400"
                    layoutId="discoverTabUnderline"
                    initial={false}
                    animate={{
                      left: (() => {
                        const tabs = ["overview", "goals", ...(isOwnProfile ? ["habits"] : []), ...(isOwnProfile ? ["journal"] : [])];
                        const activeIndex = tabs.indexOf(activeTab);
                        const tabCount = tabs.length;
                        return `${(activeIndex / tabCount) * 100}%`;
                      })(),
                      width: (() => {
                        const tabs = ["overview", "goals", ...(isOwnProfile ? ["habits"] : []), ...(isOwnProfile ? ["journal"] : [])];
                        const tabCount = tabs.length;
                        return `${100 / tabCount}%`;
                      })()
                    }}
                    transition={{
                      type: "spring",
                      stiffness: 300,
                      damping: 30
                    }}
                  />
                </div>
              </div>
            </motion.div>
            {/* Tab Content */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              {activeTab === 'overview' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* User Stats */}
                  <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-5 flex items-center gap-2">
                      <Trophy className="h-5 w-5 text-yellow-500" />
                      Goal Statistics
                    </h3>
                    {isProfileAccessible() ? (
                      <>
                        <div className="grid grid-cols-2 gap-3 mb-5">
                          <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl border border-blue-200 dark:border-blue-800/30 cursor-pointer hover:shadow-md transition-shadow"
                            onClick={() => handleTabChange('goals')}
                          >
                            <Target className="h-5 w-5 text-blue-600 dark:text-blue-400 mb-2" />
                            <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                              {isOwnProfile ? (displayUser.totalGoals || 0) : (userStats?.totalGoals || 0)}
                            </div>
                            <div className="text-blue-700 dark:text-blue-300 text-xs font-medium">Total Goals</div>
                          </div>
                          <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-xl border border-green-200 dark:border-green-800/30">
                            <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mb-2" />
                            <div className="text-2xl font-bold text-green-900 dark:text-green-100">
                              {isOwnProfile ? (analytics?.goals?.completedGoals || 0) : (userStats?.completedGoals || 0)}
                            </div>
                            <div className="text-green-700 dark:text-green-300 text-xs font-medium">Completed</div>
                          </div>
                          <div className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-xl border border-orange-200 dark:border-orange-800/30">
                            <Flame className="h-5 w-5 text-orange-600 dark:text-orange-400 mb-2" />
                            <div className="text-2xl font-bold text-orange-900 dark:text-orange-100">
                              {isOwnProfile ? (analytics?.goals?.currentStreak || 0) : (userStats?.currentStreak || 0)}
                            </div>
                            <div className="text-orange-700 dark:text-orange-300 text-xs font-medium">Day Streak</div>
                          </div>
                          <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-xl border border-purple-200 dark:border-purple-800/30">
                            <Star className="h-5 w-5 text-purple-600 dark:text-purple-400 mb-2" />
                            <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                              {isOwnProfile ? (analytics?.goals?.totalPoints || 0) : (userStats?.totalPoints || 0)}
                            </div>
                            <div className="text-purple-700 dark:text-purple-300 text-xs font-medium">Points</div>
                          </div>
                        </div>

                        {/* Achievement Level for own profile */}
                        {isOwnProfile && (
                          <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/10 dark:to-purple-900/10 rounded-xl border border-blue-200 dark:border-blue-800/30">
                            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                              <TrendingUp className="h-4 w-4 text-blue-500" />
                              Achievement Progress
                            </h4>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                {analytics?.goals?.level || 'Novice'}
                              </span>
                              <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                                {analytics?.goals?.totalPoints || 0} pts
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                              <div
                                className="bg-gradient-to-r from-blue-500 to-purple-500 h-2.5 rounded-full transition-all duration-300"
                                style={{
                                  width: `${Math.min(((analytics?.goals?.totalPoints || 0) % 100), 100)}%`
                                }}
                              ></div>
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-center py-12">
                        <div className="bg-gray-100 dark:bg-gray-700/50 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                          <Lock className="h-8 w-8 text-gray-400" />
                        </div>
                        <p className="text-gray-500 dark:text-gray-400 text-sm">Statistics are private</p>
                      </div>
                    )}
                  </div>
                  {/* Habit Analytics */}
                  <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-5 flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-emerald-500" />
                      Habit Statistics
                    </h3>
                    {isProfileAccessible() ? (
                      <div className="space-y-4">
                        <HabitAnalyticsCard analytics={analytics} days={30} embedded />
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <div className="bg-gray-100 dark:bg-gray-700/50 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                          <Lock className="h-8 w-8 text-gray-400" />
                        </div>
                        <p className="text-gray-500 dark:text-gray-400 text-sm">Analytics are private</p>
                      </div>
                    )}
                  </div>
                  {/* Current Goals */}
                  <div className="lg:col-span-2">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                      <div className="flex items-center justify-between mb-5">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                          <Clock className="h-5 w-5 text-blue-500" />
                          Goals in Progress
                        </h3>
                        {userGoals.filter(goal => !goal.completed).length > 0 && (
                          <button 
                            onClick={() => handleTabChange('goals')}
                            className="text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium"
                          >
                            View All
                          </button>
                        )}
                      </div>
                      {isProfileAccessible() ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {userGoals.filter(goal => !goal.completed).slice(0, PROGRESS_GOALS_PER_PAGE).map((goal, index) => (
                            <motion.div
                              key={goal.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.3, delay: index * 0.05 }}
                              className="p-4 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700/30 dark:to-gray-700/10 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-md hover:border-blue-300 dark:hover:border-blue-600 transition-all cursor-pointer group"
                              onClick={() => setOpenGoalId(goal.id)}
                            >
                              <div className="flex items-start justify-between mb-3">
                                <h4 className="font-semibold text-gray-900 dark:text-white text-sm line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors flex-1">{goal.title}</h4>
                                <Circle className="h-4 w-4 text-blue-500 flex-shrink-0 ml-2" />
                              </div>
                              <div className="flex items-center justify-between text-xs">
                                <span className={`px-2 py-1 rounded-md font-medium text-white ${getCategoryColor(goal.category)}`}>
                                  {goal.category}
                                </span>
                                <span className="text-gray-500 dark:text-gray-400">{formatTimeAgo(goal.createdAt)}</span>
                              </div>
                            </motion.div>
                          ))}
                          {userGoals.filter(goal => !goal.completed).length === 0 && (
                            <div className="col-span-full text-center py-12">
                              <div className="bg-gray-100 dark:bg-gray-700/50 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                                <Target className="h-8 w-8 text-gray-400" />
                              </div>
                              <p className="text-gray-500 dark:text-gray-400 text-sm">No goals in progress</p>
                              {isOwnProfile && (
                                <button 
                                  onClick={() => navigate('/dashboard')}
                                  className="mt-4 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-sm font-medium transition-colors"
                                >
                                  Create Your First Goal
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-12">
                          <div className="bg-gray-100 dark:bg-gray-700/50 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                            <Lock className="h-8 w-8 text-gray-400" />
                          </div>
                          <p className="text-gray-500 dark:text-gray-400 text-sm">Goals are private</p>
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Removed bottom Habit Analytics block as requested */}
                </div>
              )}
              {activeTab === 'goals' && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                    <Target className="h-6 w-6 text-blue-500" />
                    {isOwnProfile ? 'All Goals' : 'Goals'}
                  </h3>
                  {isProfileAccessible() ? (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {userGoals.map((goal, index) => (
                          <motion.div
                            key={goal.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, delay: Math.min(index * 0.03, 0.3) }}
                            onClick={() => setOpenGoalId(goal.id)}
                            className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-700/50 dark:to-gray-800/30 rounded-xl p-5 border border-gray-200 dark:border-gray-700 hover:shadow-md hover:border-blue-300 dark:hover:border-blue-600 transition-all cursor-pointer group"
                          >
                            <div className="flex items-start justify-between mb-3">
                              <span className={`px-3 py-1 rounded-lg text-xs font-semibold text-white ${getCategoryColor(goal.category)} shadow-sm`}>
                                {goal.category}
                              </span>
                              {goal.completedAt ? (
                                <CheckCircle className="h-5 w-5 text-green-500" />
                              ) : (
                                <Circle className="h-5 w-5 text-blue-500" />
                              )}
                            </div>

                            <h4 className="font-semibold text-gray-900 dark:text-white text-base mb-2 line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{goal.title}</h4>
                            {goal.description && (
                              <p className="text-gray-600 dark:text-gray-400 text-sm mb-3 line-clamp-2">{goal.description}</p>
                            )}

                            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 pt-3 border-t border-gray-200 dark:border-gray-700">
                              <span>{goal.completedAt ? 'Completed' : 'Created'} {formatTimeAgo(goal.completedAt ? goal.completedAt : goal.createdAt)}</span>
                              <span className="text-blue-600 dark:text-blue-400 font-medium group-hover:underline">View →</span>
                            </div>
                          </motion.div>
                        ))}
                        {userGoals.length === 0 && (
                          <div className="col-span-full text-center py-16">
                            <div className="bg-gray-100 dark:bg-gray-700/50 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                              <Target className="h-8 w-8 text-gray-400" />
                            </div>
                            <p className="text-gray-500 dark:text-gray-400 text-lg font-medium mb-2">No goals yet</p>
                            {isOwnProfile && (
                              <>
                                <p className="text-gray-400 text-sm mb-4">Start your journey by creating your first goal</p>
                                <button 
                                  onClick={() => navigate('/dashboard')}
                                  className="px-6 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium transition-colors shadow-sm"
                                >
                                  Create Goal
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                      
                      {/* Pagination Controls */}
                      {hasMoreGoals && (
                        <div className="flex justify-center mt-8">
                          <button
                            onClick={loadMoreGoals}
                            disabled={loadingMoreGoals}
                            className="px-6 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                          >
                            {loadingMoreGoals ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900 dark:border-white"></div>
                                Loading...
                              </>
                            ) : (
                              'Load More Goals'
                            )}
                          </button>
                        </div>
                      )}
                      {!hasMoreGoals && userGoals.length > 0 && (
                        <div className="text-center mt-8 text-sm text-gray-400">
                          No more goals to load
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-16">
                      <div className="bg-gray-100 dark:bg-gray-700/50 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                        <Lock className="h-8 w-8 text-gray-400" />
                      </div>
                      <p className="text-gray-500 dark:text-gray-400">Goals are private</p>
                    </div>
                  )}
                </div>
              )}
              {activeTab === 'habits' && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                    <Flame className="h-6 w-6 text-orange-500" />
                    My Habits
                  </h3>
                  {userHabits.length > 0 ? (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {userHabits.map((habit, index) => (
                          <motion.div
                            key={habit.id || habit._id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, delay: Math.min(index * 0.03, 0.3) }}
                            onClick={() => {
                              setOpenHabitId(habit.id || habit._id);
                              setHabitModalOpen(true);
                            }}
                            className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-700/50 dark:to-gray-800/30 rounded-xl p-4 border border-gray-200 dark:border-gray-700 hover:shadow-md hover:border-orange-300 dark:hover:border-orange-600 transition-all cursor-pointer"
                          >
                            <div className="flex items-start justify-between mb-3">
                              <h4 className="font-semibold text-gray-900 dark:text-white text-base">{habit.name}</h4>
                              {habit.currentStreak > 0 && (
                                <div className="flex items-center gap-1 text-orange-600 dark:text-orange-400">
                                  <Flame className="h-4 w-4" />
                                  <span className="text-sm font-bold">{habit.currentStreak}</span>
                                </div>
                              )}
                            </div>
                            {habit.description && (
                              <p className="text-gray-600 dark:text-gray-400 text-sm mb-3 line-clamp-2">{habit.description}</p>
                            )}
                            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 pt-3 border-t border-gray-200 dark:border-gray-700">
                              <span>{habit.totalCompletions || 0} completions</span>
                              {habit.longestStreak > 0 && (
                                <span className="text-emerald-600 dark:text-emerald-400 font-medium">Best: {habit.longestStreak}</span>
                              )}
                            </div>
                          </motion.div>
                        ))}
                      </div>
                      {hasMoreHabits && (
                        <div className="flex justify-center mt-8">
                          <button
                            onClick={async () => {
                              setLoadingMoreHabits(true);
                              try {
                                const nextPage = habitsPage + 1;
                                const result = await habitsAPI.list({ page: nextPage, limit: HABITS_PER_PAGE });
                                if (result.data.success) {
                                  setUserHabits(prev => [...prev, ...(result.data.data.habits || [])]);
                                  setHabitsPage(nextPage);
                                  setHasMoreHabits(result.data.data.pagination.page < result.data.data.pagination.pages);
                                }
                              } catch (error) {
                              } finally {
                                setLoadingMoreHabits(false);
                              }
                            }}
                            disabled={loadingMoreHabits}
                            className="px-6 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                          >
                            {loadingMoreHabits ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900 dark:border-white"></div>
                                Loading...
                              </>
                            ) : (
                              'Load More Habits'
                            )}
                          </button>
                        </div>
                      )}
                      {!hasMoreHabits && userHabits.length > 0 && (
                        <div className="text-center mt-8 text-sm text-gray-400">
                          No more habits to load
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-16">
                      <div className="bg-gray-100 dark:bg-gray-700/50 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                        <Flame className="h-8 w-8 text-gray-400" />
                      </div>
                      <p className="text-gray-500 dark:text-gray-400 text-lg font-medium mb-2">No habits yet</p>
                      <p className="text-gray-400 text-sm mb-4">Start building positive habits today</p>
                      <button 
                        onClick={() => navigate('/dashboard')}
                        className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-medium transition-colors shadow-sm"
                      >
                        Create Habit
                      </button>
                    </div>
                  )}
                </div>
              )}
              {activeTab === 'journal' && (
                <div className={isOwnProfile
                  ? "bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700"
                  : "bg-white/80 dark:bg-gray-800/50 backdrop-blur-lg rounded-2xl p-5 border border-gray-200 dark:border-gray-700/50"
                }>
                  <div className="flex items-center justify-between mb-5">
                    {isOwnProfile && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setExportOpen(true)}
                          className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 inline-flex items-center gap-1.5 text-sm transition-colors"
                          title="Export your journal"
                        >
                          <Download className="h-3.5 w-3.5" /> Export
                        </button>
                        <button
                          onClick={() => setIsJournalOpen(true)}
                          disabled={hasTodayJournal}
                          className={`px-4 py-2 rounded-lg transition-colors ${hasTodayJournal ? 'bg-gray-300 dark:bg-gray-700 text-gray-600 dark:text-gray-300 cursor-not-allowed' : 'bg-indigo-500 hover:bg-indigo-600 text-white'}`}
                          title={hasTodayJournal ? 'You have already submitted today. Come back tomorrow!' : 'Open journal prompt'}
                        >
                          {hasTodayJournal ? 'Journal Submitted' : 'Write Today’s Journal'}
                        </button>
                      </div>
                    )}
                  </div>
                  {/* Journal Feed (own profile) */}
                  {isOwnProfile && (
                    <div>
                      {journalFeed.length === 0 && !journalLoading && (
                        <div className="text-center py-12">
                          <div className="bg-gray-50 dark:bg-gray-800 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                            <BookOpen className="h-8 w-8 text-gray-400" />
                          </div>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">No journal entries yet</p>
                          {isOwnProfile && (
                            <button onClick={() => setIsJournalOpen(true)} disabled={hasTodayJournal} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${hasTodayJournal ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed' : 'bg-indigo-500 hover:bg-indigo-600 text-white'}`}>{hasTodayJournal ? 'Submitted Today' : 'Write Your First Entry'}</button>
                          )}
                        </div>
                      )}
                      <div className="space-y-3 max-h-[500px] overflow-y-auto scrollbar-hide pr-1">
                        {journalFeed.map((e) => (
                          <button key={e.id || e._id} onClick={() => { setSelectedEntry(e); setEntryModalOpen(true); }} className="w-full text-left p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-sm transition-all">
                            <div className="flex items-center justify-between mb-2.5">
                              <span className="text-xs text-gray-500 dark:text-gray-400">{formatTimeAgo(e.createdAt)}</span>
                              <span className="inline-flex items-center gap-1.5">
                                <span className="px-2 py-0.5 rounded-md text-xs bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-medium">{e.visibility}</span>
                                <span className="px-2 py-0.5 rounded-md text-xs bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-medium capitalize">{e.mood?.replace('_', ' ') || 'neutral'}</span>
                              </span>
                            </div>
                            <p className="text-sm text-gray-800 dark:text-gray-200 line-clamp-3 leading-relaxed">{e.content}</p>
                            {e?.motivation && (
                              <div className="mt-3 p-2.5 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200/50 dark:border-indigo-800/30 rounded-lg text-xs text-indigo-700 dark:text-indigo-300 flex items-start gap-2">
                                <Sparkles className="h-3.5 w-3.5 mt-0.5 text-indigo-500 flex-shrink-0" />
                                <span className="leading-relaxed">{e.motivation}</span>
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                      <div className="flex items-center justify-center mt-4">
                        {journalHasMore ? (
                          <button onClick={loadMoreJournal} disabled={journalLoading} className="px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
                            {journalLoading ? 'Loading…' : 'Load More'}
                          </button>
                        ) : (
                          journalFeed.length > 0 && <div className="text-xs text-gray-400">No more entries</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </>
        )}
        {/* Profile Edit Modal - only for own profile */}
        {isOwnProfile && (
          <Suspense fallback={null}><ProfileEditModal
            isOpen={isEditModalOpen}
            onClose={() => setIsEditModalOpen(false)}
          /></Suspense>
        )}
        {/* Journal Prompt Modal */}
        {isOwnProfile && (
          <Suspense fallback={null}><JournalPromptModal
            isOpen={isJournalOpen}
            onClose={() => setIsJournalOpen(false)}
            onSubmitted={async () => {
              try {
                await getUserJournalHighlights(currentUser?._id, { limit: 12 });
                const entries = await getMyJournalEntries({ limit: 10 });
                // Update local journalFeed with fresh entries
                if (Array.isArray(entries) && entries.length > 0) {
                  setJournalFeed(entries);
                  setJournalSkip(entries.length);
                }
              } catch { }
            }}
          /></Suspense>
        )}
        {exportOpen && (
          <Suspense fallback={null}><JournalExportModal isOpen={exportOpen} onClose={() => setExportOpen(false)} /></Suspense>
        )}
        {entryModalOpen && selectedEntry && (
          <Suspense fallback={null}><JournalEntryModal
            isOpen={entryModalOpen}
            onClose={() => { setEntryModalOpen(false); setSelectedEntry(null); }}
            entry={selectedEntry}
          /></Suspense>
        )}
      </div>
      {/* Report & Block Modals */}
      <Suspense fallback={null}><ReportModal
        isOpen={reportOpen}
        onClose={() => setReportOpen(false)}
        targetLabel={displayUser?.username ? `@${displayUser.username}` : 'user'}
        onSubmit={async ({ reason, description }) => {
          try {
            if (!displayUser?._id) return;
            await report({ targetType: 'user', targetId: displayUser._id, reason, description });
          } finally {
            // Offer to block after report
            try { if (displayUser?._id) { setBlockOpen(true); } } catch { }
            setReportOpen(false);
          }
        }}
        onReportAndBlock={displayUser?._id ? async () => { await blockUser(displayUser._id); } : undefined}
      /></Suspense>
      <Suspense fallback={null}><BlockModal
        isOpen={blockOpen}
        onClose={() => setBlockOpen(false)}
        username={displayUser?.username || 'this user'}
        onConfirm={async () => {
          try {
            if (!displayUser?._id) return;
            await blockUser(displayUser._id);
          } finally {
            setBlockOpen(false);
          }
        }}
      /></Suspense>
      {/* Goal Details Modal (with timeline) */}
      {openGoalId && (
        <Suspense fallback={null}><GoalDetailsModal
          isOpen={!!openGoalId}
          goalId={openGoalId}
          autoOpenComments={scrollCommentsOnOpen}
          onClose={closeGoalModal}
        /></Suspense>
      )}
      {/* Habit Detail Modal */}
      {habitModalOpen && openHabitId && (
        <Suspense fallback={null}><HabitDetailModal
          habit={userHabits.find(h => (h.id || h._id) === openHabitId)}
          isOpen={habitModalOpen}
          onClose={() => {
            setHabitModalOpen(false);
            setOpenHabitId(null);
          }}
          onLog={async (status) => {
            try {
              await habitsAPI.log(openHabitId, { status });
              toast.success(`Habit ${status === 'done' ? 'completed' : status}!`);
              fetchUserHabits(); // Refresh the habits list
            } catch (error) {
              toast.error('Failed to log habit');
            }
          }}
          onEdit={() => {
            // Navigate to edit or open edit modal if needed
            toast.info('Edit functionality coming soon');
          }}
          onDelete={async () => {
            try {
              await habitsAPI.remove(openHabitId);
              toast.success('Habit deleted');
              setHabitModalOpen(false);
              setOpenHabitId(null);
              fetchUserHabits(); // Refresh the habits list
            } catch (error) {
              toast.error('Failed to delete habit');
            }
          }}
        /></Suspense>
      )}
      {/* Profile Menu Modal */}
      {profileMenuOpen && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center"
          onClick={() => setProfileMenuOpen(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40 dark:bg-black/60" />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg w-11/12 sm:w-64 min-w-fit">
              <div className="space-y-1 p-3">
                {isOwnProfile ? (
                  <>
                    {!isMobile && <button
                      className="w-full text-center px-4 py-2 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsEditModalOpen(true);
                        setProfileMenuOpen(false);
                      }}
                    >
                      Edit Profile
                    </button>}
                    <button
                      className="w-full text-center px-4 py-2 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const profileUrl = `${window.location.origin}/profile/@${displayUser.username}`;
                        shareUrlRef.current = profileUrl;
                        setShareSheetOpen(true);
                        setProfileMenuOpen(false);
                      }}
                    >
                      Share Profile
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      className="w-full text-center px-4 py-2 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const profileUrl = `${window.location.origin}/profile/@${displayUser.username}`;
                        shareUrlRef.current = profileUrl;
                        setShareSheetOpen(true);
                        setProfileMenuOpen(false);
                      }}
                    >
                      Share Profile
                    </button>
                    <button
                      className="w-full text-center px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      onClick={(e) => { 
                        e.preventDefault();
                        e.stopPropagation();
                        setReportOpen(true); 
                        setProfileMenuOpen(false); 
                      }}
                    >
                      Report
                    </button>
                    <button
                      className="w-full text-center px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      onClick={(e) => { 
                        e.preventDefault();
                        e.stopPropagation();
                        setBlockOpen(true); 
                        setProfileMenuOpen(false); 
                      }}
                    >
                      Block
                    </button>
                  </>
                )}
              </div>
              <div className="border-t border-gray-200 dark:border-gray-700 p-3">
                <button
                  onClick={() => setProfileMenuOpen(false)}
                  className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg transition-colors text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
      {/* Share Sheet */}
      <ShareSheet
        isOpen={shareSheetOpen}
        onClose={() => setShareSheetOpen(false)}
        url={shareUrlRef.current}
        title={`${displayUser?.name}'s Profile - WishTrail`}
      />
    </div>
  );
};

export default ProfilePage;
// Follow List Modal Mount
// (placed after default export to avoid interfering with main export)


// Modals
// Placed at end to avoid cluttering main JSX; render conditionally near root if needed
{/* Report & Block Modals */ }
{/* Intentionally placed after export to keep render tree simple; you can move inline if preferred */ }
// (No-op comment to indicate modal usage is already integrated above.)

// Reusable small stat pill
export const StatPill = ({ label, value }) => (
  <div className="p-3 bg-gray-50 dark:bg-gray-800/40 rounded-lg border border-gray-200 dark:border-gray-700 text-center">
    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</div>
    <div className="text-lg font-semibold text-gray-800 dark:text-gray-100">{value || 0}</div>
  </div>
);