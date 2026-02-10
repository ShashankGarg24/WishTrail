import { GOAL_CATEGORIES } from '../constants/goalCategories'
import { useState, useEffect, useRef, lazy, Suspense } from "react";
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Target, TrendingUp, Star, Edit2, ExternalLink, Youtube, Instagram, MapPin, Globe, Trophy, BookOpen, Clock, CheckCircle, Circle, User, UserPlus, UserCheck, ArrowLeft, Lock, Sparkles, Download, Flame, Award, BarChart2, Activity, MoreVertical, Plus, PenSquare } from "lucide-react";
const FollowListModal = lazy(() => import("../components/FollowListModal"));
import { motion } from "framer-motion";
import useApiStore from "../store/apiStore";
import { journalsAPI } from "../services/api";
import { habitsAPI } from '../services/api';
import ShareSheet from '../components/ShareSheet';
import toast from 'react-hot-toast';
import { getDateKeyInTimezone } from '../utils/timezoneUtils';
const ProfileEditModal = lazy(() => import("../components/ProfileEditModal"));
const ReportModal = lazy(() => import("../components/ReportModal"));
const BlockModal = lazy(() => import("../components/BlockModal"));
const JournalPromptModal = lazy(() => import("../components/JournalPromptModal"));
const JournalEntryModal = lazy(() => import("../components/JournalEntryModal"));
const JournalExportModal = lazy(() => import("../components/JournalExportModal"));
const HabitAnalyticsCard = lazy(() => import("../components/HabitAnalyticsCard"));
const HabitDetailModal = lazy(() => import("../components/HabitDetailModal"));
const GoalPostModalNew = lazy(() => import('../components/GoalPostModalNew'));

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
  const [goalFilter, setGoalFilter] = useState('all') // 'all' | 'in_progress' | 'completed' | 'paused'

  const THEME_COLOR = '#4c99e6'

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
      // Load journal entries to check if today's journal exists
      getMyJournalEntries({ limit: 50 }).catch(() => {});
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

  // Lazy load analytics and content based on active tab
  useEffect(() => {
    const loadTabContent = async () => {
      const targetUsername = isOwnProfile ? currentUser?.username : profileUser?.username;
      
      if (!targetUsername) {
        return;
      }

      // For other users' profiles, check privacy
      const canViewContent = isOwnProfile || !profileUser?.isPrivate || isFollowing;

      // Load analytics when overview tab is viewed
      if (activeTab === 'overview' && !analytics) {
        // Own profile: always load (pass null to get own analytics)
        // Other profile: only if public or following (pass username)
        if (isOwnProfile || canViewContent) {
          try {
            const usernameParam = isOwnProfile ? null : targetUsername;
            const analyticsResult = await getUserAnalytics(usernameParam);
            if (analyticsResult.success) {
              setAnalytics(analyticsResult.analytics);
            }
          } catch (error) {
            console.error('Failed to load analytics:', error);
          }
        }
      }

      // Load goals when goals tab is viewed
      if (activeTab === 'goals' && userGoals.length === 0) {
        // Own profile: always load
        // Other profile: only if public or following
        if (isOwnProfile || canViewContent) {
          try {
            const targetUsername = isOwnProfile ? currentUser?.username : profileUser?.username;
            const goalsResult = isOwnProfile 
              ? await getGoals({ page: 1, limit: GOALS_PER_PAGE })
              : await getUserGoals(targetUsername, { page: 1, limit: GOALS_PER_PAGE });
            
            if (goalsResult.success) {
              setUserGoals(goalsResult.goals || []);
              const totalPages = goalsResult.pagination?.pages || 1;
              setHasMoreGoals(1 < totalPages);
              setGoalsPage(1);
            }
          } catch (error) {
            console.error('Failed to load goals:', error);
          }
        }
      }

      // Load habits when habits tab is viewed (ONLY for own profile or if following/public AND habits visible)
      if (activeTab === 'habits' && userHabits.length === 0) {
        if (isOwnProfile) {
          // Always load for own profile
          const targetUserId = currentUser?._id;
          await fetchUserHabits(targetUserId);
        } else if (canViewContent && profileUser?.showHabits) {
          // Load for others only if profile accessible AND habits are visible (showHabits = true)
          const targetUserId = profileUser?._id;
          await fetchUserHabits(targetUserId);
        }
      }
    };

    loadTabContent();
  }, [activeTab, isOwnProfile, profileUser, isFollowing, analytics, userGoals.length, userHabits.length, currentUser?._id]);

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
    
    // Get today's date in user's timezone (YYYY-MM-DD format)
    const todayKey = getDateKeyInTimezone(new Date());
    
    // Check if any journal entry has a dayKey matching today
    if (Array.isArray(journalEntries) && journalEntries.length > 0) {
      return journalEntries.some(e => e.dayKey === todayKey);
    }
    
    return false;
  })();

  const fetchOwnProfile = async () => {
    setLoading(true);
    try {
      // Only load goals initially, analytics will be loaded when tabs are viewed
      const goalsResult = await getGoals({ page: 1, limit: GOALS_PER_PAGE });
      
      if (goalsResult.success) {
        setUserGoals(goalsResult.goals || []);
        const totalPages = goalsResult.pagination?.pages || 1;
        setHasMoreGoals(1 < totalPages);
        setGoalsPage(1);
      }
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const fetchUserHabits = async () => {
    const targetUserName = isOwnProfile ? currentUser?.username : profileUser?.username;
    if (!targetUserName) return;
    
    try {
      const params = isOwnProfile 
        ? { page: 1, limit: HABITS_PER_PAGE }
        : { username: targetUserName, page: 1, limit: HABITS_PER_PAGE };
        
      const result = await habitsAPI.list(params);
      if (result.data.success) {
        setUserHabits(result.data.data.habits || []);
        const totalPages = result.data.data.pagination?.pages || 1;
        setHasMoreHabits(1 < totalPages);
        setHabitsPage(1);
      }
    } catch (error) {
      console.error('Failed to load habits:', error);
    }
  };

  const fetchUserProfile = async () => {
    setLoading(true);
    try {
      const idOrUsername = usernameParam;
      const userResult = await getUser(idOrUsername);
      if (userResult.success) {
        setProfileUser(userResult.user);
        setUserStats(userResult.stats);
        setIsFollowing(userResult.isFollowing);
        setIsRequested(!!userResult.isRequested);
        
        // Load goals initially if profile is public or following
        const canViewContent = !userResult.user.isPrivate || userResult.isFollowing;
        if (canViewContent) {
          const goalsResult = await getUserGoals(userResult.user.username, { page: 1, limit: GOALS_PER_PAGE });
          if (goalsResult.success) {
            setUserGoals(goalsResult.goals || []);
            const totalPages = goalsResult.pagination?.pages || 1;
            setHasMoreGoals(1 < totalPages);
            setGoalsPage(1);
          }
        }
      } else {
        window.dispatchEvent(new CustomEvent('wt_toast', {
          detail: { message: 'Failed to load user profile', type: 'error' }
        }));
      }
    } catch (error) {
      window.dispatchEvent(new CustomEvent('wt_toast', {
        detail: { message: 'Failed to load user profile', type: 'error' }
      }));
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
      const result = await followUser(profileUser?.id);
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
      const result = await unfollowUser(profileUser?.id);
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
      const result = await cancelFollowRequest(profileUser?.id);
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
        : await getUserGoals(profileUser.username, { page: nextPage, limit: GOALS_PER_PAGE });
      
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-slate-900 dark:via-gray-900 dark:to-zinc-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!isOwnProfile && !profileUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-slate-900 dark:via-gray-900 dark:to-zinc-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">User Not Found</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-8">The user you are looking for does not exist.</p>
          <button
            onClick={() => navigate('/discover')}
            className="px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-600 hover:from-purple-600 hover:to-blue-700 text-white rounded-xl transition-all duration-200 font-medium shadow-lg hover:shadow-xl hover:scale-105"
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

  const backgroundClass = "min-h-screen bg-[#f5f5f5] dark:bg-gray-900";
  const containerClass = "max-w-4xl";

  const profileTabs = ["overview", "goals", ...(isOwnProfile ? ["habits"] : (profileUser?.showHabits && (isFollowing || !profileUser?.isPrivate) ? ["habits"] : [])), ...(isOwnProfile ? ["journal"] : [])];

  const formatStatNumber = (n) => {
    if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
    return String(n ?? 0);
  };

  return (
    <div className={`${backgroundClass} font-manrope`} style={{ fontFamily: 'Manrope, ui-sans-serif, system-ui' }}>
      <div className={`${containerClass} mx-auto px-4 py-8`}>
        {!isOwnProfile && (
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            onClick={() => navigate(-1)}
            className="flex items-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors mb-6"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Back</span>
          </motion.button>
        )}

        {/* Profile summary card - top view like last image */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 md:p-8 mb-6"
        >
          <div className="flex flex-col md:flex-row md:items-start gap-6 relative">
            {/* Ellipsis top right */}
            <button
              data-profile-menu-btn="true"
              onClick={() => setProfileMenuOpen((v) => !v)}
              className="absolute top-0 right-0 p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              aria-label="More options"
            >
              <MoreVertical className="h-5 w-5" />
            </button>

            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <img
                src={displayUser.avatar || '/api/placeholder/150/150'}
                alt={displayUser.name}
                className="w-20 h-20 md:w-24 md:h-24 rounded-full object-cover border-2 border-white dark:border-gray-700 shadow-md"
              />
              {displayUser.currentMood && (
                isOwnProfile ? (
                  <button
                    onClick={() => setIsEditModalOpen(true)}
                    className="absolute -bottom-0.5 -right-0.5 bg-white dark:bg-gray-800 border-2 rounded-full p-1 shadow-md hover:scale-105 transition-transform"
                    title="Change mood"
                  >
                    <span className="text-base">{displayUser.currentMood}</span>
                  </button>
                ) : (
                  <div className="absolute -bottom-0.5 -right-0.5 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-600 rounded-full p-1 shadow-md">
                    <span className="text-base">{displayUser.currentMood}</span>
                  </div>
                )
              )}
            </div>

            {/* Name, handle, stats, bio */}
            <div className="flex-1 min-w-0 pr-8">
              <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white mb-0.5">
                {displayUser.name}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                @{displayUser.username}
              </p>
              <div className="flex flex-wrap gap-6 mb-4">
                <button
                  className="text-left"
                  onClick={isProfileAccessible() ? () => handleTabChange('goals') : undefined}
                  disabled={!isProfileAccessible()}
                  style={!isProfileAccessible() ? { pointerEvents: 'none', cursor: 'default' } : {}}
                >
                  <div className="text-xl font-bold text-gray-900 dark:text-white">
                    {isOwnProfile ? (displayUser.totalGoals ?? 0) : (userStats?.totalGoals ?? 0)}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Goals</div>
                </button>
                <button
                  className="text-left"
                  onClick={isProfileAccessible() ? async () => {
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
                  } : undefined}
                  disabled={!isProfileAccessible()}
                  style={!isProfileAccessible() ? { pointerEvents: 'none', cursor: 'default' } : {}}
                >
                  <div className="text-xl font-bold text-gray-900 dark:text-white">
                    {formatStatNumber(isOwnProfile ? (displayUser.followerCount ?? 0) : (userStats?.followers ?? 0))}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Followers</div>
                </button>
                <button
                  className="text-left"
                  onClick={isProfileAccessible() ? async () => {
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
                  } : undefined}
                  disabled={!isProfileAccessible()}
                  style={!isProfileAccessible() ? { pointerEvents: 'none', cursor: 'default' } : {}}
                >
                  <div className="text-xl font-bold text-gray-900 dark:text-white">
                    {isOwnProfile ? (displayUser.followingCount ?? 0) : (userStats?.followings ?? 0)}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Following</div>
                </button>
              </div>
              {displayUser.bio && (
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                  {displayUser.bio}
                </p>
              )}
              {(displayUser.website || displayUser.youtube || displayUser.instagram) && (
                <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                  {displayUser.website && (
                    <a href={formatUrl(displayUser.website)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:opacity-80"><Globe className="h-4 w-4" /></a>
                  )}
                  {displayUser.youtube && (
                    <a href={formatUrl(displayUser.youtube)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:opacity-80"><Youtube className="h-4 w-4" /></a>
                  )}
                  {displayUser.instagram && (
                    <a href={formatUrl(displayUser.instagram)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:opacity-80"><Instagram className="h-4 w-4" /></a>
                  )}
                </div>
              )}
            </div>

            {/* Action buttons - only for other users; own profile uses three-dots menu */}
            {!isOwnProfile && isAuthenticated && (
              <div className="flex flex-col sm:flex-row gap-3 flex-shrink-0">
                {isFollowing ? (
                  <button
                    onClick={handleUnfollow}
                    className="px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-medium text-sm transition-colors"
                  >
                    <UserCheck className="h-4 w-4 inline mr-1.5" />
                    Following
                  </button>
                ) : isRequested ? (
                  <button
                    onClick={handleCancelRequest}
                    className="px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-medium text-sm transition-colors"
                  >
                    <UserCheck className="h-4 w-4 inline mr-1.5" />
                    Requested
                  </button>
                ) : (
                  <button
                    onClick={handleFollow}
                    className="px-4 py-2.5 rounded-xl text-white font-medium text-sm transition-opacity hover:opacity-90"
                    style={{ backgroundColor: THEME_COLOR }}
                  >
                    <UserPlus className="h-4 w-4 inline mr-1.5" />
                    Follow
                  </button>
                )}
              </div>
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
                  className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-xl transition-all duration-200 font-medium shadow-lg hover:shadow-xl"
                >
                  Sign In to Follow
                </button>
              )}
            </div>
          </motion.div>
        ) : (
          /* Full Profile Content */
          <>
            {/* Tabs - theme underline #4c99e6 */}
            <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
              <div className="flex gap-0">
                {profileTabs.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => handleTabChange(tab)}
                    className={`relative px-4 py-3 text-sm font-medium capitalize transition-colors ${
                      activeTab === tab
                        ? "text-gray-900 dark:text-white"
                        : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                    }`}
                  >
                    {tab}
                    {activeTab === tab && (
                      <span
                        className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                        style={{ backgroundColor: THEME_COLOR }}
                      />
                    )}
                  </button>
                ))}
              </div>
            </div>
            {/* Tab Content */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              {activeTab === 'overview' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Goal Statistics - circular progress */}
                  <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-5 flex items-center gap-2">
                      <BarChart2 className="h-5 w-5" style={{ color: THEME_COLOR }} />
                      Goal Statistics
                    </h3>
                    {isProfileAccessible() ? (
                      <>
                        <div className="flex flex-col items-center mb-5">
                          <div className="relative w-32 h-32 flex items-center justify-center">
                            <svg className="w-32 h-32" viewBox="0 0 36 36">
                              <path
                                fill="none"
                                stroke="#e5e7eb"
                                strokeWidth="3"
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                              />
                              <path
                                fill="none"
                                strokeWidth="3"
                                strokeDasharray={`${((isOwnProfile ? (analytics?.goals?.completedGoals || 0) : (userStats?.completedGoals || 0)) / Math.max(1, (isOwnProfile ? (displayUser.totalGoals || 0) : (userStats?.totalGoals || 0)))) * 100}, 100`}
                                strokeLinecap="round"
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                style={{ stroke: THEME_COLOR, transition: 'stroke-dasharray 0.5s' }}
                              />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                              <span className="text-2xl font-bold text-gray-900 dark:text-white">
                                {Math.round(((isOwnProfile ? (analytics?.goals?.completedGoals || 0) : (userStats?.completedGoals || 0)) / Math.max(1, (isOwnProfile ? (displayUser.totalGoals || 0) : (userStats?.totalGoals || 0)))) * 100)}%
                              </span>
                              <span className="text-xs text-gray-500 dark:text-gray-400 uppercase">Completion</span>
                            </div>
                          </div>
                          <div className="flex gap-3 w-full mt-4">
                            <div className="flex-1 p-3 rounded-xl bg-gray-100 dark:bg-gray-700/50 text-center">
                              <div className="text-sm font-semibold text-gray-900 dark:text-white">
                                {isOwnProfile ? (displayUser.totalGoals || 0) : (userStats?.totalGoals || 0)}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 uppercase">Total Goals</div>
                            </div>
                            <div className="flex-1 p-3 rounded-xl bg-green-50 dark:bg-green-900/20 text-center border border-green-200/50 dark:border-green-800/30">
                              <div className="text-sm font-semibold text-green-800 dark:text-green-200">
                                {isOwnProfile ? (analytics?.goals?.completedGoals || 0) : (userStats?.completedGoals || 0)}
                              </div>
                              <div className="text-xs text-green-600 dark:text-green-400 uppercase">Completed</div>
                            </div>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-12">
                        <Lock className="h-8 w-8 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500 dark:text-gray-400 text-sm">Statistics are private</p>
                      </div>
                    )}
                  </div>
                  {/* Habit Consistency - grid + stats */}
                  <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                      <Activity className="h-5 w-5" style={{ color: THEME_COLOR }} />
                      Habit Consistency
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Last 30 days</p>
                    {isProfileAccessible() ? (
                      <>
                        <div className="grid grid-cols-6 gap-0.5 mb-4" style={{ maxWidth: 120, width: '100%' }}>
                          {Array.from({ length: 30 }).map((_, i) => {
                            const filled = (analytics?.habits?.done ?? 18) > 0 && (i % 3 !== 0 || i % 5 === 0);
                            return (
                              <div
                                key={i}
                                className="aspect-square rounded-[3px]"
                                style={{ backgroundColor: filled ? THEME_COLOR : '#e5e7eb', minWidth: 0 }}
                              />
                            );
                          })}
                        </div>
                        <div className="flex gap-4 flex-wrap">
                          <div className="text-center">
                            <div className="text-xl font-bold" style={{ color: THEME_COLOR }}>
                              {isOwnProfile ? (analytics?.habits?.currentStreak ?? userHabits.reduce((s, h) => Math.max(s, h.currentStreak || 0), 0)) : (userStats?.currentStreak ?? 0)}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 uppercase">Current Streak</div>
                          </div>
                          <div className="text-center">
                            <div className="text-xl font-bold text-gray-900 dark:text-white">
                              {analytics?.habits?.consistencyPercent ?? 94}%
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 uppercase">Consistency</div>
                          </div>
                          <div className="text-center">
                            <div className="text-xl font-bold text-gray-900 dark:text-white">{userHabits.length}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 uppercase">Active Habits</div>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-12">
                        <Lock className="h-8 w-8 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500 dark:text-gray-400 text-sm">Analytics are private</p>
                      </div>
                    )}
                  </div>
                  {/* Goals in Progress */}
                  <div className="lg:col-span-2">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
                      <div className="flex items-center justify-between mb-5">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Goals in Progress</h3>
                        {userGoals.filter(g => !g.completedAt).length > 0 && (
                          <button
                            onClick={() => handleTabChange('goals')}
                            className="text-sm font-medium hover:underline"
                            style={{ color: THEME_COLOR }}
                          >
                            View All Archive
                          </button>
                        )}
                      </div>
                      {isProfileAccessible() ? (
                        userGoals.filter(g => !g.completedAt).length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {userGoals.filter(g => !g.completedAt).slice(0, PROGRESS_GOALS_PER_PAGE).map((goal, index) => (
                              <motion.div
                                key={goal.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-md cursor-pointer group"
                                onClick={() => setOpenGoalId(goal.id)}
                              >
                                <h4 className="font-semibold text-gray-900 dark:text-white text-sm line-clamp-2 group-hover:opacity-80">{goal.title}</h4>
                                {goal.category && (() => {
                                  const cat = GOAL_CATEGORIES.find(c => c.id === goal.category);
                                  return cat ? (
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 ${cat.color} bg-opacity-10 text-xs font-medium rounded font-manrope uppercase tracking-wide`}>
                                      <span>{cat.icon}</span>
                                      {cat.label}
                                    </span>
                                  ) : null;
                                })()}
                              </motion.div>
                            ))}
                          </div>
                        ) : (
                          <div className="border-2 border-dashed border-gray-200 dark:border-gray-600 rounded-2xl p-12 text-center">
                            <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700 mx-auto mb-4 flex items-center justify-center">
                              <Target className="h-8 w-8 text-gray-400" />
                            </div>
                            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Ready for a new adventure?</h4>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-sm mx-auto">
                              You don&apos;t have any active goals right now. Start your next journey and track your progress here.
                            </p>
                            {isOwnProfile && (
                              <button
                                onClick={() => navigate('/dashboard-new?tab=goals')}
                                className="px-5 py-2.5 rounded-xl text-white font-medium text-sm hover:opacity-90"
                                style={{ backgroundColor: THEME_COLOR }}
                              >
                                Create Your Goal
                              </button>
                            )}
                          </div>
                        )
                      ) : (
                        <div className="text-center py-12">
                          <Lock className="h-8 w-8 text-gray-400 mx-auto mb-4" />
                          <p className="text-gray-500 dark:text-gray-400 text-sm">Goals are private</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
              {activeTab === 'goals' && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
                  {isProfileAccessible() ? (
                    <>
                      <div className="flex flex-wrap gap-2 mb-6">
                        {['all', 'in_progress', 'completed'].map((filter) => (
                          <button
                            key={filter}
                            onClick={() => setGoalFilter(filter)}
                            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                              goalFilter === filter
                                ? 'text-white'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                            }`}
                            style={goalFilter === filter ? { backgroundColor: THEME_COLOR } : {}}
                          >
                            {filter === 'all' ? 'All' : filter === 'in_progress' ? 'In Progress' : 'Completed'}
                          </button>
                        ))}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                      {isOwnProfile && (
                          <button
                            onClick={() => navigate('/dashboard')}
                            className="rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 p-6 flex flex-col items-center justify-center min-h-[140px] hover:border-gray-400 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                          >
                            <Plus className="h-10 w-10 text-gray-400 mb-2" />
                            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Create New Goal</span>
                          </button>
                        )}
                        {userGoals
                          .filter((g) => {
                            if (goalFilter === 'all') return true;
                            if (goalFilter === 'completed') return !!g.completedAt;
                            if (goalFilter === 'in_progress') return !g.completedAt;
                            return true;
                          })
                          .map((goal, index) => (
                            <motion.div
                              key={goal.id}
                              initial={{ opacity: 0, y: 12 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: Math.min(index * 0.03, 0.3) }}
                              onClick={() => setOpenGoalId(goal.id)}
                              className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md cursor-pointer group"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                  <h4 className="font-semibold text-gray-900 dark:text-white text-base line-clamp-2 group-hover:opacity-80">{goal.title}</h4>
                                  {goal.category && (() => {
                                    const cat = GOAL_CATEGORIES.find(c => c.id === goal.category);
                                    return cat ? (
                                      <p className={`text-xs mt-0.5 inline-flex items-center gap-1 ${cat.color} bg-opacity-10 font-medium rounded font-manrope uppercase tracking-wide`}>
                                        <span>{cat.icon}</span>
                                        {cat.label}
                                      </p>
                                    ) : null;
                                  })()}
                                </div>
                                {goal.completedAt && <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />}
                              </div>
                            </motion.div>
                          ))}
                      </div>
                      {userGoals.length === 0 && (
                        <div className="text-center py-12 mt-4">
                          <p className="text-gray-500 dark:text-gray-400 mb-4">No goals yet</p>
                          {isOwnProfile && (
                            <button
                              onClick={() => navigate('/dashboard')}
                              className="px-5 py-2.5 rounded-xl text-white font-medium text-sm"
                              style={{ backgroundColor: THEME_COLOR }}
                            >
                              Create Goal
                            </button>
                          )}
                        </div>
                      )}
                      {hasMoreGoals && userGoals.length > 0 && (
                        <div className="flex justify-center mt-6">
                          <button
                            onClick={loadMoreGoals}
                            disabled={loadingMoreGoals}
                            className="px-5 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-sm font-medium disabled:opacity-50 flex items-center gap-2"
                          >
                            {loadingMoreGoals ? 'Loading...' : 'Load More'}
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-16">
                      <Lock className="h-8 w-8 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500 dark:text-gray-400">Goals are private</p>
                    </div>
                  )}
                </div>
              )}
              {activeTab === 'habits' && (
                <div className="space-y-6">
                  <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-5">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        <Flame className="h-5 w-5" style={{ color: THEME_COLOR }} />
                        Active Habits
                      </h3>
                      {isOwnProfile && (
                        <button
                          onClick={() => navigate('/dashboard?tab=habits')}
                          className="flex items-center gap-2 px-5 py-2 bg-[#4c99e6] hover:bg-[#3d88d5] text-white rounded-lg transition-colors shadow-sm font-manrope font-medium text-sm"
                          >
                          <Plus className="h-4 w-4" />
                          New Habit
                        </button>
                      )}
                    </div>
                    {userHabits.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {userHabits.map((habit, index) => {
                          const consistency = habit.consistencyPercent ?? Math.min(100, ((habit.totalCompletions || 0) / Math.max(1, habit.durationDays || 30)) * 100);
                          return (
                            <motion.div
                              key={habit.id || habit._id}
                              initial={{ opacity: 0, y: 12 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.05 }}
                              onClick={() => {
                                setOpenHabitId(habit.id || habit._id);
                                setHabitModalOpen(true);
                              }}
                              className="rounded-xl p-4 border border-gray-200 dark:border-gray-700 hover:shadow-md cursor-pointer"
                            >
                              <div className="flex items-start justify-between gap-3 mb-3">
                                <div className="flex items-start gap-3 min-w-0 flex-1">
                                  <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(76, 153, 230, 0.2)' }}>
                                    <BookOpen className="h-5 w-5" style={{ color: THEME_COLOR }} />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <h4 className="font-semibold text-gray-900 dark:text-white">{habit.name}</h4>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{habit.durationMinutes ? `${habit.durationMinutes} mins / day` : (habit.targetValue || 'Daily')}</p>
                                  </div>
                                </div>
                                <div className="flex-shrink-0 text-right">
                                  <span className="text-xl font-bold block leading-tight" style={{ color: THEME_COLOR }}>{habit.currentStreak ?? 0}</span>
                                  <span className="text-xs" style={{ color: THEME_COLOR }}>DAY STREAK</span>
                                </div>
                              </div>
                              <div className="mb-3">
                                <div className="flex justify-between text-xs mb-1">
                                  <span className="text-gray-500 dark:text-gray-400">{Math.round(consistency)}% Consistency</span>
                                </div>
                                <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                                  <div className="h-full rounded-full" style={{ width: `${Math.min(100, consistency)}%`, backgroundColor: THEME_COLOR }} />
                                </div>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-500 dark:text-gray-400">Today&apos;s Status</span>
                                <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300">
                                  {habit.loggedToday ? 'Completed' : 'Mark Done'}
                                </span>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <Flame className="h-10 w-10 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                        <p className="text-gray-500 dark:text-gray-400 mb-4">No active habits yet</p>
                        {isOwnProfile && (
                          <button
                            onClick={() => navigate('/dashboard')}
                            className="px-5 py-2.5 rounded-xl text-white text-sm font-medium"
                            style={{ backgroundColor: THEME_COLOR }}
                          >
                            Create Habit
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                      <Clock className="h-5 w-5 text-gray-500" />
                      Habit History
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-xs text-gray-500 dark:text-gray-400 uppercase border-b border-gray-200 dark:border-gray-700">
                            <th className="pb-3 font-medium">Habit Name</th>
                            <th className="pb-3 font-medium">Duration</th>
                            <th className="pb-3 font-medium">Best Streak</th>
                            <th className="pb-3 font-medium">Progress</th>
                          </tr>
                        </thead>
                        <tbody>
                          {userHabits.length > 0 ? (
                            userHabits.slice(0, 5).map((h) => (
                              <tr key={h.id || h._id} className="border-b border-gray-100 dark:border-gray-700/50">
                                <td className="py-3 flex items-center gap-2">
                                  <span className="text-gray-400">•</span>
                                  {h.name}
                                </td>
                                <td className="py-3 text-gray-600 dark:text-gray-400">{h.durationDays ?? 30} Days</td>
                                <td className="py-3 text-gray-600 dark:text-gray-400">{h.longestStreak ?? 0} Days</td>
                                <td className="py-3">
                                  <span className="px-2 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: 'rgba(76, 153, 230, 0.2)', color: THEME_COLOR }}>
                                    {h.archived ? 'ARCHIVED' : 'ACTIVE'}
                                  </span>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={4} className="py-8 text-center text-gray-500 dark:text-gray-400 text-sm">
                                No habit history yet
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
              {activeTab === 'journal' && (
                <div className={isOwnProfile
                  ? "bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700"
                  : "bg-white/80 dark:bg-gray-800/50 backdrop-blur-lg rounded-2xl p-5 border border-gray-200 dark:border-gray-700/50"
                }>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Reflections Feed</h3>
                    {isOwnProfile && (
                      <div className="flex items-center gap-2">
                        {/* <button
                          onClick={() => setExportOpen(true)}
                          className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 inline-flex items-center gap-1.5 text-sm transition-colors"
                          title="Export your journal"
                        >
                          <Download className="h-3.5 w-3.5" /> Export
                        </button> */}
                        <button
                          onClick={() => setIsJournalOpen(true)}
                          disabled={hasTodayJournal}
                          className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-medium transition-colors shadow-sm font-manrope
                            ${
                              hasTodayJournal
                                ? 'bg-gray-300 dark:bg-gray-700 text-gray-600 cursor-not-allowed'
                                : 'bg-[#4c99e6] hover:bg-[#3d88d5] text-white'
                            }
                          `}                        >
                          <PenSquare className="h-4 w-4" />
                          {hasTodayJournal ? 'Journal Submitted' : 'Write Today’s Journal'}
                        </button>
                      </div>
                    )}
                  </div>
                  {/* Journal Feed (own profile) */}
                  {isOwnProfile && (
                    <div>
                      {journalFeed.length === 0 && !journalLoading && (
                        <div className="text-center py-12 border-2 border-dashed border-gray-200 dark:border-gray-600 rounded-2xl">
                          <BookOpen className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                          <p className="text-gray-500 dark:text-gray-400 mb-4">No reflections yet</p>
                          <button onClick={() => setIsJournalOpen(true)} disabled={hasTodayJournal} className={`px-5 py-2.5 rounded-xl text-sm font-medium ${hasTodayJournal ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'text-white'}`} style={!hasTodayJournal ? { backgroundColor: THEME_COLOR } : {}}>{hasTodayJournal ? 'Submitted Today' : 'Write Your First Entry'}</button>
                        </div>
                      )}
                      <div className="space-y-3 max-h-[500px] overflow-y-auto scrollbar-hide pr-1">
                        {journalFeed.map((e) => (
                          <button
                            key={e.id || e._id}
                            onClick={() => { setSelectedEntry(e); setEntryModalOpen(true); }}
                            className="w-full text-left p-5 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all"
                          >
                            <div className="text-xs text-gray-500 dark:text-gray-400 uppercase mb-2">{formatDate(e.createdAt)}</div>
                            <div className="flex items-center gap-2 mb-3">
                              {e.visibility === 'public' ? (
                                <span className="inline-flex items-center gap-1.5 text-xs font-medium" style={{ color: THEME_COLOR }}>
                                  <Globe className="h-3.5 w-3.5" /> PUBLIC
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500">
                                  <Lock className="h-3.5 w-3.5" /> PRIVATE
                                </span>
                              )}
                            </div>
                            <h4 className="font-semibold text-gray-900 dark:text-white mb-2 line-clamp-1">{e.title || 'Reflection'}</h4>
                            <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-3 leading-relaxed">{e.content}</p>
                            {e?.motivation && (
                              <div className="mt-4 p-4 rounded-xl flex items-start gap-2" style={{ backgroundColor: 'rgba(76, 153, 230, 0.1)' }}>
                                <Sparkles className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: THEME_COLOR }} />
                                <div>
                                  <span className="text-xs font-semibold uppercase" style={{ color: THEME_COLOR }}>AI Insight</span>
                                  <p className="text-sm mt-1 leading-relaxed" style={{ color: '#3d7ab8' }}>{e.motivation}</p>
                                </div>
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
        <Suspense fallback={null}><GoalPostModalNew
          isOpen={!!openGoalId}
          goalId={openGoalId}
          openWithComments={scrollCommentsOnOpen}
          onClose={closeGoalModal}
        /></Suspense>
      )}
      {/* Habit Detail Modal */}
      {isOwnProfile && habitModalOpen && openHabitId && (
        <Suspense fallback={null}><HabitDetailModal
          habit={userHabits.find(h => (h.id || h._id) === openHabitId)}
          isOpen={habitModalOpen}
          onClose={() => {
            setHabitModalOpen(false);
            setOpenHabitId(null);
          }}
          onLog={isOwnProfile ? async (status, mood = 'neutral') => {
            try {
              await habitsAPI.log(openHabitId, { status, mood });
              toast.success(`Habit ${status === 'done' ? 'completed' : status}!`);
              fetchUserHabits(); // Refresh the habits list
            } catch (error) {
              toast.error('Failed to log habit');
            }
          } : undefined}
          onEdit={isOwnProfile ? () => {
            // Navigate to edit or open edit modal if needed
            toast.info('Edit functionality coming soon');
          } : undefined}
          onDelete={isOwnProfile ? async () => {
            try {
              await habitsAPI.remove(openHabitId);
              toast.success('Habit deleted');
              setHabitModalOpen(false);
              setOpenHabitId(null);
              fetchUserHabits(); // Refresh the habits list
            } catch (error) {
              toast.error('Failed to delete habit');
            }
          } : undefined}
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
                        if (isMobile) {
                          shareUrlRef.current = profileUrl;
                          setShareSheetOpen(true);
                        } else {
                          navigator.clipboard.writeText(profileUrl)
                            .then(() => {
                              toast.success('Profile link copied to clipboard', { duration: 2000 });
                            })
                            .catch(() => {
                              toast.error('Failed to copy link');
                            });
                        }
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
                        if (isMobile) {
                          shareUrlRef.current = profileUrl;
                          setShareSheetOpen(true);
                        } else {
                          navigator.clipboard.writeText(profileUrl)
                            .then(() => {
                              toast.success('Profile link copied to clipboard', { duration: 2000 });
                            })
                            .catch(() => {
                              toast.error('Failed to copy link');
                            });
                        }
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
      {/* Footer quote */}
      <footer className="text-center py-8 mt-8">
        <p className="text-gray-500 dark:text-gray-400 italic text-sm">
          &ldquo;The only way to achieve the impossible is to believe it is possible.&rdquo;
        </p>
        <div className="flex justify-center gap-1.5 mt-4">
          <span className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-500" />
          <span className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600" />
          <span className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600" />
        </div>
      </footer>
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