import { GOAL_CATEGORIES } from '../constants/goalCategories'
import { useState, useEffect, useRef, useMemo, lazy, Suspense } from "react";
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Target, TrendingUp, Star, Edit2, ExternalLink, Youtube, Instagram, MapPin, Globe, Trophy, BookOpen, Clock, CheckCircle, Circle, User, UserPlus, UserCheck, ArrowLeft, Lock, Download, Flame, Award, BarChart2, Activity, MoreVertical, Plus, Camera, CalendarDays, BadgeCheck, Search, SlidersHorizontal, ChevronRight, ChevronLeft, Home, Compass, Users, Newspaper, Settings } from "lucide-react";
import CategoryIcon from '../components/CategoryIcon';
import CategoryBadge from '../components/CategoryBadge';
import HabitCategoryIcon from '../components/HabitCategoryIcon';
import { getHabitCategoryLabel } from '../constants/habitCategories';
const FollowListModal = lazy(() => import("../components/FollowListModal"));
import { motion } from "framer-motion";
import useApiStore from "../store/apiStore";
import { dailyLogssAPI } from "../services/api";
import { habitsAPI } from '../services/api';
import ShareSheet from '../components/ShareSheet';
import toast from 'react-hot-toast';
import { getDateKeyInTimezone } from '../utils/timezoneUtils';
import ConfirmActionModal from '../components/ConfirmActionModal';
import MetricInfoModal from '../components/MetricInfoModal';
const ReportModal = lazy(() => import("../components/ReportModal"));
const BlockModal = lazy(() => import("../components/BlockModal"));
const DailyLogsPromptModal = lazy(() => import("../components/DailyLogsPromptModal"));
const DailyLogsExportModal = lazy(() => import("../components/DailyLogsExportModal"));
const HabitAnalyticsCard = lazy(() => import("../components/HabitAnalyticsCard"));
const HabitDetailModal = lazy(() => import("../components/HabitDetailModal"));
const GoalPostModal = lazy(() => import('../components/GoalPostModal'));

const DAILY_LOG_MOOD_META = {
  happy: { label: 'Happy', score: 5, chip: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
  motivated: { label: 'Motivated', score: 4, chip: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  okay: { label: 'Okay', score: 3, chip: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300' },
  stressed: { label: 'Stressed', score: 2, chip: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  angry: { label: 'Angry', score: 1.5, chip: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' },
  sad: { label: 'Sad', score: 1, chip: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300' }
};

const ProfilePage = () => {
  const params = useParams();
  const usernameParam = params.username;
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'overview';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [userGoals, setUserGoals] = useState([]);
  const [profileUser, setProfileUser] = useState(null);
  
  // Pagination for goals
  const GOALS_PER_PAGE = 10;
  const PROGRESS_GOALS_PER_PAGE = 6;
  const [goalsPage, setGoalsPage] = useState(1);
  const [hasMoreGoals, setHasMoreGoals] = useState(true);
  const [loadingMoreGoals, setLoadingMoreGoals] = useState(false);
  const [userStats, setUserStats] = useState(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isTabLoading, setIsTabLoading] = useState(false);
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
  const [quoteModalOpen, setQuoteModalOpen] = useState(false);
  const [metricInfo, setMetricInfo] = useState(null);
  
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
    getUserDailyLogsHighlights,
    getMyDailyLogsEntries,
    clearDailyLogsEntry,
    dailyLogsEntries,
    getFollowers,
    getFollowing,
    getUserAnalytics,
    getRecentActivities
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
  const [isDailyLogsOpen, setIsDailyLogsOpen] = useState(false);
  const [submittedDailyLogsToday, setSubmittedDailyLogsToday] = useState(false);
  const [expandedDailyLogIds, setExpandedDailyLogIds] = useState([]);
  const [dailyLogsFeed, setDailyLogsFeed] = useState([]);
  const [dailyLogsSkip, setDailyLogsSkip] = useState(0);
  const DAILY_LOGS_LIMIT = 62;
  const [dailyLogsHasMore, setDailyLogsHasMore] = useState(true);
  const [dailyLogsLoading, setDailyLogsLoading] = useState(false);
  const [deletingDailyLogId, setDeletingDailyLogId] = useState(null);
  const [isDeleteDailyLogConfirmOpen, setIsDeleteDailyLogConfirmOpen] = useState(false);
  const [pendingDeleteDailyLogId, setPendingDeleteDailyLogId] = useState(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [myHabits, setMyHabits] = useState([]);
  const [userHabits, setUserHabits] = useState([]);
  const [recentHabits, setRecentHabits] = useState([]);
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
  const [goalSearch, setGoalSearch] = useState('')
  const [habitFilter, setHabitFilter] = useState('all')
  const [habitSearch, setHabitSearch] = useState('')
  const [profileFilterSheet, setProfileFilterSheet] = useState(null)
  const [journalMonth, setJournalMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  const [journalCalendarOpen, setJournalCalendarOpen] = useState(true)
  const [trailYear, setTrailYear] = useState(() => new Date().getFullYear())
  const [trailFilter, setTrailFilter] = useState('all')
  const [trailActivities, setTrailActivities] = useState([])
  const [trailLoading, setTrailLoading] = useState(false)
  const [trailPage, setTrailPage] = useState(1)
  const [trailHasMore, setTrailHasMore] = useState(true)
  const [trailAvailableYears, setTrailAvailableYears] = useState([new Date().getFullYear()])
  const trailLoaderRef = useRef(null)
  const previousTabRef = useRef(initialTab)
  const tabLoadRequestRef = useRef(0)

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
    const openProfileMenu = () => setProfileMenuOpen(true)
    window.addEventListener('wt_open_profile_menu', openProfileMenu)
    return () => window.removeEventListener('wt_open_profile_menu', openProfileMenu)
  }, [])

  useEffect(() => {
    if (!isAuthenticated) {
      window.location.href = '/auth';
      return;
    }

    if (isOwnProfile) {
      fetchOwnProfile();
      // Load dailyLogs entries to check if today's dailyLogs exists
      getMyDailyLogsEntries({ todayOnly: true, limit: 1 }).catch(() => {});
    } else {
      fetchUserProfile();
    }
  }, [isAuthenticated, usernameParam]);

  useEffect(() => {
    setFollowModalOpen(false);
    setFollowers([]);
    setFollowing([]);
    setFollowersPage(1);
    setFollowingPage(1);
    setHasMoreFollowers(false);
    setHasMoreFollowing(false);
    if (!isOwnProfile) {
      setIsFollowing(false);
      setIsRequested(false);
    }
  }, [usernameParam, isOwnProfile]);

  // Outside click to close profile modal menu is handled by backdrop onClick
  useEffect(() => {
    return () => {};
  }, []);


  // Open DailyLogs modal directly if ?dailyLogs=1 and viewing own profile
  useEffect(() => {
    try {
      const j = searchParams.get('daily-logs');
      if (j === '1' && isOwnProfile) {
        setIsDailyLogsOpen(true);
      }
    } catch { }
  }, [searchParams, isOwnProfile]);

  useEffect(() => {
    const tabFromUrl = searchParams.get('tab') || 'overview';
    if (tabFromUrl !== activeTab) {
      setIsTabLoading(true);
      setActiveTab(tabFromUrl);
    }
  }, [searchParams]);

  useEffect(() => {
    if (previousTabRef.current !== activeTab) {
      setIsTabLoading(true);
      previousTabRef.current = activeTab;
    }
  }, [activeTab]);

  // Lazy load analytics and content based on active tab
  useEffect(() => {
    const requestId = ++tabLoadRequestRef.current;
    const loadTabContent = async () => {
      try {
        const targetUsername = isOwnProfile ? currentUser?.username : profileUser?.username;
        
        if (!targetUsername) {
          return;
        }

        // For other users' profiles, check privacy
        const canViewContent = isOwnProfile || !profileUser?.isPrivate || isFollowing;

        // Load analytics when overview tab is viewed
        // Reload when profile changes or tab becomes overview
        if (activeTab === 'overview') {
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
            if (isOwnProfile && userHabits.length === 0) {
              await fetchUserHabits();
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
            const targetUserId = currentUser?.id;
            await fetchUserHabits(targetUserId);
          } else if (canViewContent && profileUser?.showHabits) {
            // Load for others only if profile accessible AND habits are visible (showHabits = true)
            const targetUserId = profileUser?.id;
            await fetchUserHabits(targetUserId);
          }
        }
      } finally {
        if (tabLoadRequestRef.current === requestId) {
          setIsTabLoading(false);
        }
      }
    };

    loadTabContent();
  }, [activeTab, isOwnProfile, profileUser?.username, isFollowing, userGoals.length, userHabits.length, currentUser?.id]);

  useEffect(() => {
    
    // Load DailyLogs when tab opens
    const fetchDailyLogs = async () => {
      try {
        
        if ((activeTab === 'daily-logs' || activeTab === 'overview') && isOwnProfile && currentUser?.username) {
          // Reset feed and load first page (own profile only)
          setDailyLogsFeed([]);
          setDailyLogsSkip(0);
          setDailyLogsHasMore(true);
          setDailyLogsLoading(true);
          
          try {
            const params = { limit: DAILY_LOGS_LIMIT, skip: 0 };
            const res = await dailyLogssAPI.getMyEntries(params);
            const entries = res?.data?.data?.entries || [];
            setDailyLogsFeed(entries);
            setDailyLogsSkip(entries.length);
            if (entries.length < DAILY_LOGS_LIMIT) setDailyLogsHasMore(false);
          } catch (err) {
            setDailyLogsHasMore(false);
          } finally {
            setDailyLogsLoading(false);
          }
        }
      } catch (e) {
      }
    };
    fetchDailyLogs();
  }, [activeTab, profileUser?.username, currentUser?.username, isOwnProfile]);

  useEffect(() => {
    if (activeTab !== 'trail' || !isOwnProfile) return;
    let cancelled = false;
    setTrailLoading(true);
    setTrailActivities([]);
    setTrailPage(1);
    getRecentActivities({ page: 1, limit: 20, type: 'personal', scope: 'trail', year: trailYear })
      .then((result) => {
        if (cancelled) return;
        setTrailActivities(result?.activities || []);
        setTrailAvailableYears(result?.years?.length ? result.years : [new Date().getFullYear()]);
        setTrailHasMore(1 < (result?.pagination?.pages || 1));
      })
      .catch(() => {
        if (!cancelled) setTrailActivities([]);
      })
      .finally(() => {
        if (!cancelled) setTrailLoading(false);
      });
    return () => { cancelled = true; };
  }, [activeTab, isOwnProfile, currentUser?.id, getRecentActivities, trailYear]);

  useEffect(() => {
    if (activeTab !== 'trail' || trailLoading || !trailHasMore) return undefined;
    const target = trailLoaderRef.current;
    if (!target) return undefined;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      const nextPage = trailPage + 1;
      setTrailLoading(true);
      getRecentActivities({ page: nextPage, limit: 20, type: 'personal', scope: 'trail', year: trailYear })
        .then((result) => {
          const incoming = result?.activities || [];
          setTrailActivities((current) => {
            const known = new Set(current.map((item) => String(item._id)));
            return [...current, ...incoming.filter((item) => !known.has(String(item._id)))];
          });
          setTrailPage(nextPage);
          setTrailHasMore(nextPage < (result?.pagination?.pages || nextPage));
        })
        .catch(() => setTrailHasMore(false))
        .finally(() => setTrailLoading(false));
    }, { root: null, rootMargin: '240px' });
    observer.observe(target);
    return () => observer.disconnect();
  }, [activeTab, trailLoading, trailHasMore, trailPage, trailYear, getRecentActivities]);

  const loadMoreDailyLogs = async () => {
    if (!isOwnProfile || dailyLogsLoading || !dailyLogsHasMore) return;
    try {
      setDailyLogsLoading(true);
      const params = { limit: DAILY_LOGS_LIMIT, skip: dailyLogsSkip };
      const res = await dailyLogssAPI.getMyEntries(params);
      const entries = res?.data?.data?.entries || [];
      setDailyLogsFeed(prev => {
        const seen = new Set(prev.map(x => x?.createdAt).filter(Boolean));
        const filtered = entries.filter(e => e && e.createdAt && !seen.has(e.createdAt));
        return [...prev, ...filtered];
      });
      setDailyLogsSkip(prev => prev + entries.length);
      if (entries.length < DAILY_LOGS_LIMIT) setDailyLogsHasMore(false);
    } catch (_) {
      setDailyLogsHasMore(false);
    } finally {
      setDailyLogsLoading(false);
    }
  };

  const todayDailyLogEntry = useMemo(() => {
    if (!isOwnProfile) return null;
    const todayKey = getDateKeyInTimezone(new Date());

    const matchesToday = (entry) => {
      if (!entry) return false;
      if (entry.dayKey === todayKey) return true;
      if (entry.createdAt && getDateKeyInTimezone(new Date(entry.createdAt)) === todayKey) return true;
      return false;
    };

    if (Array.isArray(dailyLogsFeed) && dailyLogsFeed.length > 0) {
      const fromFeed = dailyLogsFeed.find(matchesToday);
      if (fromFeed) return fromFeed;
    }

    if (Array.isArray(dailyLogsEntries) && dailyLogsEntries.length > 0) {
      const fromStore = dailyLogsEntries.find(matchesToday);
      if (fromStore) return fromStore;
    }

    return null;
  }, [isOwnProfile, dailyLogsFeed, dailyLogsEntries]);

  const hasTodayDailyLogs = Boolean(todayDailyLogEntry);

  const sortedDailyLogs = [...(dailyLogsFeed || [])].sort((a, b) => new Date(b?.createdAt || 0) - new Date(a?.createdAt || 0));

  const journalEntriesByDay = new Map((dailyLogsFeed || []).map((entry) => [
    entry?.dayKey || (entry?.createdAt ? getDateKeyInTimezone(new Date(entry.createdAt)) : ''),
    entry
  ]));
  const journalMonthYear = journalMonth.getFullYear();
  const journalMonthIndex = journalMonth.getMonth();
  const journalYears = [...new Set([
    new Date().getFullYear(),
    ...(dailyLogsFeed || []).map((entry) => new Date(entry?.createdAt || 0).getFullYear()).filter(Number.isFinite)
  ])].sort((a, b) => b - a);
  const journalMonthDays = new Date(journalMonthYear, journalMonthIndex + 1, 0).getDate();
  const journalLeadingDays = (new Date(journalMonthYear, journalMonthIndex, 1).getDay() + 6) % 7;
  const journalCalendarCells = [
    ...Array.from({ length: journalLeadingDays }, () => null),
    ...Array.from({ length: journalMonthDays }, (_, index) => index + 1)
  ];
  while (journalCalendarCells.length % 7) journalCalendarCells.push(null);

  const journalDayKey = (day) => `${journalMonthYear}-${String(journalMonthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const journalChartDays = Array.from({ length: 10 }, (_, index) => {
    const date = new Date()
    date.setDate(date.getDate() - (9 - index))
    const key = getDateKeyInTimezone(date)
    return { key, logged: journalEntriesByDay.has(key), label: date.toLocaleDateString('en-US', { weekday: 'short' }) }
  })

  const toggleDailyLogExpand = (logId) => {
    if (!logId) return;
    setExpandedDailyLogIds((prev) => (
      prev.includes(logId)
        ? prev.filter((id) => id !== logId)
        : [...prev, logId]
    ));
  };

  const handleDeleteDailyLog = async (entryId) => {
    if (!entryId || deletingDailyLogId) return;

    setPendingDeleteDailyLogId(String(entryId));
    setIsDeleteDailyLogConfirmOpen(true);
  };

  const confirmDeleteDailyLog = async () => {
    if (!pendingDeleteDailyLogId || deletingDailyLogId) return;

    setDeletingDailyLogId(String(pendingDeleteDailyLogId));
    try {
      const res = await clearDailyLogsEntry(pendingDeleteDailyLogId);
      if (!res?.success) {
        throw new Error(res?.error || 'Failed to delete daily log');
      }

      setDailyLogsFeed((prev) => prev.filter((entry) => String(entry?.id || entry?._id) !== String(pendingDeleteDailyLogId)));
      setExpandedDailyLogIds((prev) => prev.filter((id) => String(id) !== String(pendingDeleteDailyLogId)));
      setDailyLogsSkip((prev) => Math.max(0, prev - 1));
      const analyticsResult = await getUserAnalytics(null);
      if (analyticsResult.success) setAnalytics(analyticsResult.analytics);
      setIsDeleteDailyLogConfirmOpen(false);
      setPendingDeleteDailyLogId(null);
      toast.success('Daily log deleted');
    } catch (error) {
      toast.error(error?.message || 'Failed to delete daily log');
    } finally {
      setDeletingDailyLogId(null);
    }
  };

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
      const today = getDateKeyInTimezone(new Date());
      const params = isOwnProfile 
        ? { page: 1, limit: HABITS_PER_PAGE, today }
        : { username: targetUserName, page: 1, limit: HABITS_PER_PAGE, today };
        
      const [result, historyResult] = await Promise.all([
        habitsAPI.list(params),
        habitsAPI.list({ ...params, limit: 5, sort: 'recent_logged' })
      ]);
      setRecentHabits(historyResult.data.success ? historyResult.data.data.habits || [] : []);
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

  const loadMoreHabits = async () => {
    if (loadingMoreHabits || !hasMoreHabits) return;
    setLoadingMoreHabits(true);
    try {
      const nextPage = habitsPage + 1;
      const targetUserName = isOwnProfile ? currentUser?.username : profileUser?.username;
      const today = getDateKeyInTimezone(new Date());
      const params = isOwnProfile
        ? { page: nextPage, limit: HABITS_PER_PAGE, today }
        : { username: targetUserName, page: nextPage, limit: HABITS_PER_PAGE, today };
      const result = await habitsAPI.list(params);
      if (result.data.success) {
        const incoming = result.data.data.habits || [];
        setUserHabits((current) => {
          const known = new Set(current.map((habit) => String(habit.id)));
          return [...current, ...incoming.filter((habit) => !known.has(String(habit.id)))];
        });
        setHabitsPage(nextPage);
        setHasMoreHabits(nextPage < (result.data.data.pagination?.pages || nextPage));
      }
    } catch (error) {
      setHasMoreHabits(false);
    } finally {
      setLoadingMoreHabits(false);
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
    const refreshGoals = isOwnProfile
      ? getGoals({ page: 1, limit: GOALS_PER_PAGE }, { force: true })
      : getUserGoals(profileUser?.username, { page: 1, limit: GOALS_PER_PAGE });
    refreshGoals.then((result) => {
      if (!result?.success) return;
      setUserGoals(result.goals || []);
      setGoalsPage(1);
      setHasMoreGoals(1 < (result.pagination?.pages || 1));
    }).catch(() => {});
    try {
      const params = new URLSearchParams(location.search)
      if (params.get('goalId')) navigate(-1)
    } catch { }
  }

  const handleTabChange = (tab) => {
    if (tab !== activeTab) {
      setIsTabLoading(true);
    }
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
      'Personal Development': 'bg-blue-500',
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

  if (loading || isTabLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center" style={{ fontFamily: 'Manrope, sans-serif' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4c99e6] mx-auto mb-4"></div>
          <p className="text-gray-500 dark:text-gray-400">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!isOwnProfile && !profileUser) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">User Not Found</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-8">The user you are looking for does not exist.</p>
          <button
            onClick={() => navigate('/discover')}
            className="px-6 py-3 bg-[#4c99e6] hover:bg-[#3d88d5] text-white rounded-xl transition-all duration-200 font-medium shadow-lg hover:shadow-xl hover:scale-105"
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

  const backgroundClass = "min-h-screen bg-[#f6f9fd] dark:bg-gray-900";
  const containerClass = "max-w-[1320px]";

  const profileTabs = ["overview", ...(isOwnProfile ? ["trail"] : []), "goals", ...(isOwnProfile ? ["habits"] : (profileUser?.showHabits && (isFollowing || !profileUser?.isPrivate) ? ["habits"] : [])), ...(isOwnProfile ? ["daily-logs"] : [])];
  const tabMeta = {
    overview: { label: 'Overview', icon: Activity },
    trail: { label: 'Trail', icon: TrendingUp },
    goals: { label: 'Goals', icon: Target },
    habits: { label: 'Habits', icon: Award },
    'daily-logs': { label: 'Journal', icon: BookOpen }
  };

  const formatStatNumber = (n) => {
    if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
    return String(n ?? 0);
  };

  const canAccessProfileContent = isProfileAccessible();
  const trailItems = trailActivities
    .map((activity) => ({ ...activity, date: new Date(activity.activityAt || activity.createdAt) }))
    .filter((item) => !Number.isNaN(item.date.getTime()))
    .sort((a, b) => b.date - a.date);
  const trailYears = [...new Set([new Date().getFullYear(), ...trailAvailableYears])].sort((a, b) => b - a);
  const trailMonthGroups = trailItems
    .filter((item) => item.date.getFullYear() === Number(trailYear))
    .filter((item) => trailFilter === 'all' || (trailFilter === 'goals' && item.type.startsWith('goal_')) || (trailFilter === 'habits' && item.type.startsWith('habit_')) || (trailFilter === 'journals' && item.type === 'journal_logged'))
    .reduce((groups, item) => {
      const key = item.date.toLocaleDateString('en-US', { month: 'long' });
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
      return groups;
    }, {});

  return (
    <div className={`${backgroundClass} wt-profile-page ${isOwnProfile ? 'is-own-profile' : ''} font-manrope`} style={{ fontFamily: 'Manrope, ui-sans-serif, system-ui' }}>
      <div className={`${containerClass} wt-profile-frame mx-auto px-0 sm:px-4 md:px-6 py-0 sm:py-5 md:py-6`}>
        <div className="wt-profile-shell">
          <aside className="wt-profile-sidebar" aria-label="Primary navigation">
            <nav>
              {[
                ['Home', Home, '/home'],
                ['Explore', Compass, '/discover'],
                ['Communities', Users, '/communities'],
                ['Feed', Newspaper, '/feed'],
                ['Goals', Target, '/home?tab=goals'],
                ['Habits', Award, '/home?tab=habits'],
                ['Journal', BookOpen, `?tab=daily-logs`],
                ['Leaderboard', Trophy, '/leaderboard']
              ].map(([label, Icon, href]) => (
                <button key={label} type="button" onClick={() => href.startsWith('?') ? handleTabChange('daily-logs') : navigate(href)}>
                  <Icon /> <span>{label}</span>
                </button>
              ))}
            </nav>
            <nav className="wt-profile-sidebar-bottom">
              <button type="button" className="active"><User /><span>Profile</span></button>
              <button type="button" onClick={() => navigate('/settings')}><Settings /><span>Settings</span></button>
            </nav>
          </aside>
          <main className="wt-profile-main">
        {!isOwnProfile && (
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            onClick={() => navigate(-1)}
            className="flex items-center space-x-1.5 sm:space-x-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors mb-3 sm:mb-4 md:mb-6"
          >
            <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="text-sm sm:text-base">Back</span>
          </motion.button>
        )}

        {/* Responsive profile hero: dashboard on web, compact identity card in the app. */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="wt-profile-hero relative mb-3 overflow-hidden bg-white shadow-sm sm:rounded-2xl sm:border sm:border-slate-200 dark:bg-gray-800 dark:sm:border-gray-700"
        >
          <div className="wt-profile-cover relative h-28 overflow-hidden bg-slate-800 sm:h-44">
            <img src={displayUser.coverImage || displayUser.coverPhoto || '/images/profile-mountain-cover.png'} alt="Mountain sunrise profile cover" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-slate-950/25 to-transparent" />
            <button
              data-profile-menu-btn="true"
              onClick={() => setProfileMenuOpen((v) => !v)}
              className="absolute right-5 top-5 z-10 hidden rounded-lg bg-slate-950/30 p-2 text-white transition-colors hover:bg-slate-950/50 md:block"
              aria-label="More options"
            >
              <MoreVertical className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
          </div>
          <div className="relative px-4 pb-4 sm:px-7 sm:pb-5">
            <button
              data-profile-menu-btn="true"
              onClick={() => setProfileMenuOpen((v) => !v)}
              className="absolute right-3 top-8 z-10 rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 md:hidden"
              aria-label="More options"
            >
              <MoreVertical className="h-4 w-4" />
            </button>

            {/* Action buttons - desktop */}
            {!isOwnProfile && isAuthenticated && (
              <div className="absolute right-16 top-20 hidden items-center gap-2 md:flex">
                {isFollowing ? (
                  <button
                    onClick={handleUnfollow}
                    className="px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-medium text-xs sm:text-sm transition-colors"
                  >
                    <UserCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4 inline mr-1 sm:mr-1.5" />
                    Following
                  </button>
                ) : isRequested ? (
                  <button
                    onClick={handleCancelRequest}
                    className="px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-medium text-xs sm:text-sm transition-colors"
                  >
                    <UserCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4 inline mr-1 sm:mr-1.5" />
                    Requested
                  </button>
                ) : (
                  <button
                    onClick={handleFollow}
                    className="px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-white font-medium text-xs sm:text-sm transition-opacity hover:opacity-90"
                    style={{ backgroundColor: THEME_COLOR }}
                  >
                    <UserPlus className="h-3.5 w-3.5 sm:h-4 sm:w-4 inline mr-1 sm:mr-1.5" />
                    Follow
                  </button>
                )}
              </div>
            )}

            <div className="wt-profile-avatar relative -mt-12 w-fit flex-shrink-0 sm:-mt-16">
              <img
                src={displayUser.avatar || '/api/placeholder/150/150'}
                alt={displayUser.name}
                width="96"
                height="96"
                className="h-24 w-24 rounded-full border-4 border-white bg-slate-100 object-cover shadow-md dark:border-gray-800 sm:h-32 sm:w-32"
              />
              {displayUser.currentMood && (
                <button
                  onClick={() => setQuoteModalOpen(true)}
                  className="absolute bottom-1 right-1 grid h-9 w-9 translate-x-1/4 translate-y-1/4 place-items-center rounded-full border-[3px] border-white bg-blue-50 text-blue-600 shadow-md transition hover:scale-110 dark:border-gray-800 dark:bg-gray-700 sm:h-10 sm:w-10"
                  title={displayUser.quote ? "View mood & quote" : "Current mood"}
                >
                  <span className="text-sm leading-none sm:text-base">{displayUser.currentMood}</span>
                </button>
              )}
              {isOwnProfile && !displayUser.currentMood && (
                <button type="button" onClick={() => navigate('/settings?section=personal-info')} className="absolute bottom-1 right-1 rounded-full border-2 border-white bg-blue-50 p-1.5 text-blue-600 shadow-md dark:border-gray-800 dark:bg-gray-700" aria-label="Change profile photo"><Camera className="h-4 w-4" /></button>
              )}
            </div>

            <div className="wt-profile-identity mt-3 min-w-0 sm:ml-0 sm:mt-3 sm:pr-12">
              <div className="flex items-center gap-2">
                <h1 className="truncate text-2xl font-extrabold tracking-tight text-slate-950 dark:text-white sm:text-3xl">{displayUser.name}</h1>
                {displayUser.username === "wishtrail" && <BadgeCheck className="h-5 w-5 shrink-0 fill-blue-500 text-white" />}
              </div>
              <p className="text-sm font-medium text-slate-500 dark:text-gray-400">@{displayUser.username}</p>
              {displayUser.bio && <p className="wt-profile-inline-detail mt-2 max-w-xl text-sm font-medium leading-relaxed text-slate-700 dark:text-gray-300">{displayUser.bio}</p>}
              <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-slate-500 dark:text-gray-400">
                {displayUser.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{displayUser.location}</span>}
                {displayUser.createdAt && <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />Joined {new Date(displayUser.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>}
              </div>
              {(displayUser.interests || []).length > 0 && <div className="wt-profile-inline-detail mt-3 flex flex-wrap gap-2">{displayUser.interests.slice(0, 6).map((interest) => <span key={interest} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-gray-700 dark:text-gray-200">{interest}</span>)}</div>}
            </div>

            <div className="wt-profile-stats mt-4 grid grid-cols-3 gap-2 border-y border-slate-100 py-3 dark:border-gray-700 sm:static sm:w-full sm:py-3">
                <button
                  className="text-center"
                  onClick={() => {
                    if (!canAccessProfileContent) return;
                    handleTabChange('goals');
                  }}
                  disabled={!canAccessProfileContent}
                  style={!canAccessProfileContent ? { pointerEvents: 'none', cursor: 'default' } : {}}
                >
                  <div className="text-lg font-extrabold text-gray-900 dark:text-white">
                    {isOwnProfile ? (displayUser.totalGoals ?? 0) : (userStats?.totalGoals ?? 0)}
                  </div>
                  <div className="text-[11px] text-gray-500 dark:text-gray-400">Goals</div>
                </button>
                <button
                  className="text-center"
                  onClick={async () => {
                    if (!canAccessProfileContent) return;
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
                  }}
                  disabled={!canAccessProfileContent}
                  style={!canAccessProfileContent ? { pointerEvents: 'none', cursor: 'default' } : {}}
                >
                  <div className="text-lg font-extrabold text-gray-900 dark:text-white">
                    {formatStatNumber(isOwnProfile ? (displayUser.followerCount ?? 0) : (userStats?.followers ?? 0))}
                  </div>
                  <div className="text-[11px] text-gray-500 dark:text-gray-400">Followers</div>
                </button>
                <button
                  className="text-center"
                  onClick={async () => {
                    if (!canAccessProfileContent) return;
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
                  }}
                  disabled={!canAccessProfileContent}
                  style={!canAccessProfileContent ? { pointerEvents: 'none', cursor: 'default' } : {}}
                >
                  <div className="text-lg font-extrabold text-gray-900 dark:text-white">
                    {isOwnProfile ? (displayUser.followingCount ?? 0) : (userStats?.followings ?? 0)}
                  </div>
                  <div className="text-[11px] text-gray-500 dark:text-gray-400">Following</div>
                </button>
            </div>
            <div className="wt-profile-actions mt-3 flex items-center gap-3 sm:ml-0 sm:mt-4">
              {(displayUser.website || displayUser.youtube || displayUser.instagram) && (
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-sm text-gray-500 dark:text-gray-400">
                  {displayUser.website && (
                    <a href={formatUrl(displayUser.website)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:opacity-80"><Globe className="h-4 w-4 sm:h-5 sm:w-5" /></a>
                  )}
                  {displayUser.youtube && (
                    <a href={formatUrl(displayUser.youtube)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:opacity-80"><Youtube className="h-4 w-4 sm:h-5 sm:w-5" /></a>
                  )}
                  {displayUser.instagram && (
                    <a href={formatUrl(displayUser.instagram)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:opacity-80"><Instagram className="h-4 w-4 sm:h-5 sm:w-5" /></a>
                  )}
                </div>
              )}

              {isOwnProfile && <button type="button" onClick={() => navigate('/settings?section=personal-info')} className="wt-edit-profile ml-auto flex-1 rounded-lg bg-slate-100 px-4 py-2 text-sm font-bold text-blue-600 hover:bg-blue-50 dark:bg-gray-700 dark:text-blue-300 sm:max-w-[130px]">Edit Profile</button>}
              {!isOwnProfile && isAuthenticated && (
                <div className="flex flex-1 gap-2 md:hidden">
                  {isFollowing ? (
                    <button
                      onClick={handleUnfollow}
                      className="flex-1 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-medium text-xs sm:text-sm transition-colors"
                    >
                      <UserCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4 inline mr-1 sm:mr-1.5" />
                      Following
                    </button>
                  ) : isRequested ? (
                    <button
                      onClick={handleCancelRequest}
                      className="flex-1 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-medium text-xs sm:text-sm transition-colors"
                    >
                      <UserCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4 inline mr-1 sm:mr-1.5" />
                      Requested
                    </button>
                  ) : (
                    <button
                      onClick={handleFollow}
                      className="flex-1 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-white font-medium text-xs sm:text-sm transition-opacity hover:opacity-90"
                      style={{ backgroundColor: THEME_COLOR }}
                    >
                      <UserPlus className="h-3.5 w-3.5 sm:h-4 sm:w-4 inline mr-1 sm:mr-1.5" />
                      Follow
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Follow List Modal */}
          <Suspense fallback={null}><FollowListModal
            isOpen={followModalOpen}
            onClose={() => setFollowModalOpen(false)}
            activeTab={followModalTab}
            onTabChange={async (tab) => {
              if (!canAccessProfileContent) {
                setFollowModalOpen(false);
                return;
              }
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
              if (!canAccessProfileContent) {
                setFollowModalOpen(false);
                return;
              }
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
                const path = u?.username ? `/profile/@${u.username}` : (`/profile/${u?.id}`)
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
                  className="px-6 py-3 bg-[#4c99e6] hover:bg-[#3d88d5] text-white rounded-xl transition-all duration-200 font-medium shadow-lg hover:shadow-xl"
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
            <div className="wt-profile-tabs sticky top-0 z-20 mb-3 border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900 sm:static sm:mb-5 sm:rounded-xl sm:border sm:px-2 md:mb-6">
              <div className="flex overflow-x-auto scrollbar-hide sm:justify-around">
                {profileTabs.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => handleTabChange(tab)}
                    className={`relative inline-flex min-w-[78px] items-center justify-center gap-1.5 px-3 py-3 text-xs font-semibold transition-colors whitespace-nowrap sm:min-w-0 sm:px-7 sm:py-4 sm:text-lg ${
                      activeTab === tab
                        ? "text-gray-900 dark:text-white"
                        : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                    }`}
                  >
                    {(() => { const TabIcon = tabMeta[tab]?.icon; return TabIcon ? <TabIcon className="h-4 w-4 sm:h-6 sm:w-6" /> : null })()}
                    {tabMeta[tab]?.label || tab}
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
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-5">
                  <section className="hidden">
                    {(() => {
                      const totalGoals = analytics?.goals?.totalGoals ?? displayUser.totalGoals ?? 0;
                      const completedGoals = analytics?.goals?.completedGoals ?? 0;
                      const activeGoals = Math.max(0, totalGoals - completedGoals);
                      const goalProgress = totalGoals ? Math.round((completedGoals / totalGoals) * 100) : 0;
                      const habitCompletions = analytics?.habits?.done || 0;
                      const activeDays = analytics?.habits?.activeDays || 0;
                      const progressLabel = totalGoals === 0 ? 'No goals yet' : goalProgress === 100 ? 'All goals completed' : `${activeGoals} active ${activeGoals === 1 ? 'goal' : 'goals'}`;
                      const progressMessage = totalGoals === 0
                        ? 'Create a goal to start tracking your progress.'
                        : `${completedGoals} of ${totalGoals} goals completed.`;
                      return <>
                        <div className="flex items-center gap-4">
                          <div className="relative grid h-20 w-20 shrink-0 place-items-center rounded-full" style={{ background: `conic-gradient(#1683ed ${goalProgress}%, #dcecff 0)` }}><div className="grid h-16 w-16 place-items-center rounded-full bg-white text-xl font-extrabold text-slate-950 dark:bg-gray-800 dark:text-white">{goalProgress}%</div></div>
                          <div><h2 className="text-base font-extrabold text-slate-950 dark:text-white">Your Progress</h2><span className="mt-1 inline-flex rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-bold text-emerald-700">{progressLabel}</span><p className="mt-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300">{progressMessage}</p></div>
                        </div>
                        <div className="mt-4 grid grid-cols-4 gap-2">
                          {[[activeGoals, 'Active Goals'], [completedGoals, 'Completed'], [habitCompletions, 'Habit Completions'], [activeDays, 'Active Days']].map(([value, label]) => <button type="button" key={label} onClick={() => label.includes('Goal') || label === 'Completed' ? handleTabChange('goals') : handleTabChange('habits')} className="rounded-lg border border-white/80 bg-white/80 px-2 py-3 text-center dark:border-gray-700 dark:bg-gray-800/80"><strong className="block text-base font-extrabold text-slate-950 dark:text-white">{value}</strong><span className="mt-1 block text-[9px] font-medium leading-tight text-slate-500">{label}</span></button>)}
                        </div>
                      </>;
                    })()}
                  </section>
                  {isProfileAccessible() && (() => {
                    const total = analytics?.goals?.totalGoals || 0;
                    const completed = analytics?.goals?.completedGoals || 0;
                    const inProgress = analytics?.goals?.inProgressGoals || 0;
                    const notStarted = analytics?.goals?.notStartedGoals ?? Math.max(0, total - completed - inProgress);
                    const pct = total ? Math.round((completed / total) * 100) : 0;
                    const completedPct = total ? (completed / total) * 100 : 0;
                    const progressPct = total ? (inProgress / total) * 100 : 0;
                    return <section className="rounded-xl border border-[#dce5f4] bg-white p-4 shadow-[0_1px_4px_rgba(30,58,100,.035)] dark:border-gray-700 dark:bg-gray-800">
                      <div className="flex items-center justify-between"><h3 className="flex items-center gap-2 text-sm font-extrabold text-[#0b1746] dark:text-white"><span className="grid h-5 w-5 place-items-center rounded-md bg-rose-50 text-rose-500"><Target className="h-3.5 w-3.5" /></span>Goals Progress</h3><button type="button" onClick={() => handleTabChange('goals')} className="text-[11px] font-bold text-[#087cec]">See all</button></div>
                      <div className="mt-3 flex items-center justify-center gap-4">
                        <div className="grid h-[78px] w-[78px] shrink-0 place-items-center rounded-full" style={{ background: `conic-gradient(#0bb978 0 ${completedPct}%, #1683ed ${completedPct}% ${completedPct + progressPct}%, #dce5ef ${completedPct + progressPct}% 100%)` }}><div className="grid h-[60px] w-[60px] place-items-center rounded-full bg-white text-lg font-extrabold text-[#0b1746] dark:bg-gray-800 dark:text-white">{pct}%</div></div>
                        <div><p className="text-lg font-extrabold text-[#0b1746] dark:text-white">{completed} / {total} goals</p><p className="mt-1 text-xs text-[#63739c]">{total ? `${inProgress} currently in progress` : 'No goals added yet'}</p></div>
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-2 text-[9px] font-medium text-[#526392]">
                        {[["bg-[#0bb978]", `Completed ${completed}`], ["bg-[#1683ed]", `In Progress ${inProgress}`], ["bg-[#dce5ef]", `Not Started ${notStarted}`]].map(([color, label]) => <span key={label} className="flex items-center gap-1.5 whitespace-nowrap"><i className={`h-2.5 w-2.5 rounded-full ${color}`} />{label}</span>)}
                      </div>
                    </section>;
                  })()}
                  {isProfileAccessible() && (() => {
                    const streak = Math.max(0, ...(analytics?.topHabits || []).map(habit => Number(habit.currentStreak || 0)));
                    const completedKeys = new Set(analytics?.habits?.completedDateKeys || []);
                    const today = new Date();
                    const monday = new Date(today);
                    monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
                    const week = Array.from({ length: 7 }, (_, index) => { const date = new Date(monday); date.setDate(monday.getDate() + index); const key = getDateKeyInTimezone(date); return { key, label: date.toLocaleDateString('en-US', { weekday: 'short' }), done: completedKeys.has(key) }; });
                    return <section className="rounded-xl border border-[#dce5f4] bg-white p-4 shadow-[0_1px_4px_rgba(30,58,100,.035)] dark:border-gray-700 dark:bg-gray-800">
                      <div className="flex items-center justify-between"><h3 className="flex items-center gap-2 text-sm font-extrabold text-[#0b1746] dark:text-white"><span className="grid h-5 w-5 place-items-center rounded-md bg-amber-50 text-amber-500"><Flame className="h-3.5 w-3.5" /></span>Habits Streak</h3><button type="button" onClick={() => handleTabChange('habits')} className="text-[11px] font-bold text-[#087cec]">See all</button></div>
                      <div className="mt-4 flex items-center gap-3"><span className="text-4xl">🔥</span><div><p className="text-xl font-extrabold text-[#0b1746] dark:text-white">{streak} {streak === 1 ? 'day' : 'days'}</p><p className="text-xs text-[#63739c]">Current streak</p></div></div>
                      <div className="mt-4 grid grid-cols-7 gap-2">{week.map(day => <div key={day.key} className="text-center"><span className={`mx-auto grid h-5 w-5 place-items-center rounded-full border text-[10px] font-black ${day.done ? 'border-[#0bb978] bg-[#0bb978] text-white' : 'border-[#cad6e8] text-transparent'}`}>{day.done ? '✓' : '·'}</span><small className="mt-1.5 block text-[9px] text-[#63739c]">{day.label}</small></div>)}</div>
                    </section>;
                  })()}
                  {isOwnProfile && <section className="rounded-xl border border-[#dce5f4] bg-white p-4 shadow-[0_1px_4px_rgba(30,58,100,.035)] dark:border-gray-700 dark:bg-gray-800">
                    <div className="flex items-center justify-between"><h3 className="flex items-center gap-2 text-sm font-extrabold text-[#0b1746] dark:text-white"><span className="grid h-5 w-5 place-items-center rounded-md bg-violet-50 text-violet-600"><BookOpen className="h-3.5 w-3.5" /></span>Journal Entries</h3><button type="button" onClick={() => handleTabChange('daily-logs')} className="text-[11px] font-bold text-[#087cec]">See all</button></div>
                    <div className="mt-3 flex items-end gap-3"><span className="text-2xl font-extrabold text-[#0b1746] dark:text-white">{analytics?.dailyLogs?.entries ?? 0}</span><span className="pb-0.5 text-[10px] text-[#63739c]">Entries this month</span></div>
                    <div className="mt-2 flex h-[54px] items-end gap-1.5 border-b border-dashed border-[#dce5ef] pb-0.5">{journalChartDays.map(day => <span key={day.key} title={`${day.key}: ${day.logged ? 'Journal entry' : 'No entry'}`} className={`flex-1 rounded-t-sm ${day.logged ? 'bg-gradient-to-t from-[#1683ed] to-[#62b8ff]' : 'bg-[#edf2f8] dark:bg-gray-700'}`} style={{ height: day.logged ? '82%' : '18%' }} />)}</div>
                    <div className="mt-1.5 flex justify-between text-[8px] text-[#63739c]"><span>{journalChartDays[0]?.key.slice(5)}</span><span>Last 10 days</span><span>{journalChartDays[9]?.key.slice(5)}</span></div>
                  </section>}
                  {/* Goal Statistics - circular progress */}
                  <button type="button" onClick={() => setMetricInfo({ title: 'Goal Completion', description: 'The share of goals that have been marked finished.' })} className="hidden">
                    <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-4 sm:mb-5 flex items-center gap-2">
                      <BarChart2 className="h-5 w-5 sm:h-6 sm:w-6" style={{ color: THEME_COLOR }} />
                      Goals Progress
                    </h3>
                    {isProfileAccessible() ? (
                      <>
                        <div className="flex flex-col items-center mb-4 sm:mb-5">
                          <div className="relative w-28 h-28 sm:w-32 sm:h-32 flex items-center justify-center">
                            <svg className="w-28 h-28 sm:w-32 sm:h-32" viewBox="0 0 36 36">
                              <path
                                fill="none"
                                stroke="#e5e7eb"
                                strokeWidth="3"
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                              />
                              <path
                                fill="none"
                                strokeWidth="3"
                                strokeDasharray={`${((analytics?.goals?.completedGoals || 0) / Math.max(1, analytics?.goals?.totalGoals || 0)) * 100}, 100`}
                                strokeLinecap="round"
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                style={{ stroke: THEME_COLOR, transition: 'stroke-dasharray 0.5s' }}
                              />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                              <span className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                                {Math.round(((analytics?.goals?.completedGoals || 0) / Math.max(1, analytics?.goals?.totalGoals || 0)) * 100)}%
                              </span>
                              <span className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 uppercase">Completion</span>
                            </div>
                          </div>
                          <div className="flex gap-2 sm:gap-3 w-full mt-3 sm:mt-4">
                            <div className="flex-1 p-2 sm:p-3 rounded-lg sm:rounded-xl bg-gray-100 dark:bg-gray-700/50 text-center">
                              <div className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white">
                                {analytics?.goals?.totalGoals || 0}
                              </div>
                              <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 uppercase">Total Goals</div>
                            </div>
                            <div className="flex-1 p-2 sm:p-3 rounded-lg sm:rounded-xl bg-green-50 dark:bg-green-900/20 text-center border border-green-200/50 dark:border-green-800/30">
                              <div className="text-xs sm:text-sm font-semibold text-green-800 dark:text-green-200">
                                {analytics?.goals?.completedGoals || 0}
                              </div>
                              <div className="text-[10px] sm:text-xs text-green-600 dark:text-green-400 uppercase">Completed</div>
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
                  </button>
                  {/* Habit Stats - Last 7 Days */}
                  <button type="button" onClick={() => setMetricInfo({ title: 'Habit Consistency', description: 'How often you completed habit occurrences scheduled in the last seven days.', note: 'Skipped and missed occurrences count; unscheduled days do not.' })} className="hidden">
                    <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-1.5 sm:mb-2 flex items-center gap-2">
                      <Activity className="h-5 w-5 sm:h-6 sm:w-6" style={{ color: THEME_COLOR }} />
                      Habit Consistency
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-3 sm:mb-4">Last 7 days</p>
                    {isProfileAccessible() ? (() => {
                      const l7 = analytics?.habits ?? { done: 0, skipped: 0, missed: 0, expected: 0, consistency: 0 };
                      const pct = Math.max(0, Math.min(100, l7.consistency ?? 0));
                      return (
                        <>
                          <div className="flex flex-col items-center mb-4 sm:mb-5">
                            <div className="relative w-28 h-28 sm:w-32 sm:h-32 flex items-center justify-center">
                              <svg className="w-28 h-28 sm:w-32 sm:h-32" viewBox="0 0 36 36">
                                <path
                                  fill="none"
                                  stroke="#e5e7eb"
                                  strokeWidth="3"
                                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                />
                                <path
                                  fill="none"
                                  strokeWidth="3"
                                  strokeDasharray={`${pct}, 100`}
                                  strokeLinecap="round"
                                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                  style={{ stroke: THEME_COLOR, transition: 'stroke-dasharray 0.5s' }}
                                />
                              </svg>
                              <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{pct}%</span>
                                <span className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 uppercase">Consistency</span>
                              </div>
                            </div>
                            {l7.trendPoints === null || l7.trendPoints === undefined ? (
                              <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-2">No previous-period comparison</p>
                            ) : (
                              <button type="button" onClick={() => setMetricInfo({ title: 'Consistency Trend', description: 'How your habit completion rate changed compared with the previous seven days.', note: 'The change is shown in percentage points.' })} className={`text-[10px] sm:text-xs mt-2 ${l7.trendPoints > 0 ? 'text-green-600 dark:text-green-400' : l7.trendPoints < 0 ? 'text-amber-600 dark:text-amber-400' : 'text-gray-500 dark:text-gray-400'}`}>
                                {l7.trendPoints > 0 ? '↑' : l7.trendPoints < 0 ? '↓' : '→'} {Math.abs(l7.trendPoints)} pts vs previous 7 days
                              </button>
                            )}
                          </div>
                          <div className="flex gap-2 sm:gap-3 w-full">
                            <div className="flex-1 p-2 sm:p-3 rounded-lg sm:rounded-xl bg-green-50 dark:bg-green-900/20 text-center border border-green-200/50 dark:border-green-800/30">
                              <div className="text-xs sm:text-sm font-semibold text-green-800 dark:text-green-200">{l7.done}</div>
                              <div className="text-[10px] sm:text-xs text-green-600 dark:text-green-400 uppercase">Completed</div>
                            </div>
                            <div className="flex-1 p-2 sm:p-3 rounded-lg sm:rounded-xl bg-yellow-50 dark:bg-yellow-900/20 text-center border border-yellow-200/50 dark:border-yellow-800/30">
                              <div className="text-xs sm:text-sm font-semibold text-yellow-800 dark:text-yellow-200">{l7.expected}</div>
                              <div className="text-[10px] sm:text-xs text-yellow-600 dark:text-yellow-400 uppercase">Expected</div>
                            </div>
                          </div>
                          <p className="text-xs sm:text-sm text-center text-gray-500 dark:text-gray-400 mt-3">{l7.activeDays || 0} / {l7.periodDays || 7} Active Days</p>
                        </>
                      );
                    })() : (
                      <div className="text-center py-12">
                        <Lock className="h-8 w-8 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500 dark:text-gray-400 text-sm">Analytics are private</p>
                      </div>
                    )}
                  </button>
                  {/* Journal summary */}
                  {isOwnProfile && <button type="button" onClick={() => handleTabChange('daily-logs')} className="hidden">
                    <div className="flex items-center justify-between">
                      <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white sm:text-xl"><BookOpen className="h-5 w-5 text-violet-500 sm:h-6 sm:w-6" />Journal Entries</h3>
                      <span className="text-xs font-semibold text-blue-500">View all</span>
                    </div>
                    <div className="mt-5 flex items-end gap-3">
                      <div className="text-4xl font-extrabold text-slate-950 dark:text-white">{analytics?.dailyLogs?.entries ?? 0}</div>
                      <div className="pb-1 text-xs text-slate-500">total entries</div>
                    </div>
                    <div className="mt-5 flex h-16 items-end gap-2 border-b border-dashed border-slate-200 pb-1 dark:border-gray-700" aria-label="Journal entries over the last 10 days">
                      {journalChartDays.map((day) => <span key={day.key} title={`${day.key}: ${day.logged ? 'Journal entry' : 'No entry'}`} className={`flex-1 rounded-t ${day.logged ? 'bg-gradient-to-t from-blue-600 to-sky-300' : 'bg-slate-100 dark:bg-gray-700'}`} style={{ height: day.logged ? '100%' : '10%' }} />)}
                    </div>
                    <div className="mt-2 flex justify-between text-[9px] text-slate-400"><span>{journalChartDays[0]?.label}</span><span>Last 10 days</span><span>{journalChartDays[9]?.label}</span></div>
                    <p className="mt-3 text-xs text-slate-500">{journalChartDays.filter(day => day.logged).length} of the last 10 days have a journal entry.</p>
                  </button>}
                  {/* Current Goals */}
                  <div className="lg:col-span-3">
                    <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6 shadow-sm border border-gray-100 dark:border-gray-700">
                      <div className="flex items-center justify-between mb-4 sm:mb-5">
                        <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">Current Goals</h3>
                        {userGoals.filter(g => !g.completedAt).length > 0 && (
                          <button
                            onClick={() => handleTabChange('goals')}
                            className="text-xs sm:text-sm font-medium hover:underline"
                            style={{ color: THEME_COLOR }}
                          >
                            View All
                          </button>
                        )}
                      </div>
                      {isProfileAccessible() ? (
                        userGoals.filter(g => !g.completedAt).length > 0 ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                            {userGoals.filter(g => !g.completedAt).slice(0, PROGRESS_GOALS_PER_PAGE).map((goal, index) => (
                              <motion.div
                                key={goal.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className="p-3 sm:p-4 rounded-lg sm:rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-md cursor-pointer group"
                                onClick={() => setOpenGoalId(goal.id)}
                              >
                                <div className="flex items-start gap-2 sm:gap-3 mb-2">
                                  <CategoryIcon category={goal.category} size="sm" />
                                  <div className="flex-1 min-w-0">
                                    <h4 className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base line-clamp-2 group-hover:opacity-80">{goal.title}</h4>
                                  </div>
                                </div>
                                <CategoryBadge category={goal.category} />
                              </motion.div>
                            ))}
                          </div>
                        ) : (
                          <div className="border-2 border-dashed border-gray-200 dark:border-gray-600 rounded-xl sm:rounded-2xl p-8 sm:p-10 md:p-12 text-center">
                            <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-full bg-gray-100 dark:bg-gray-700 mx-auto mb-3 sm:mb-4 flex items-center justify-center">
                              <Target className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 text-gray-400" />
                            </div>
                            <h4 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-1.5 sm:mb-2">Ready for a new adventure?</h4>
                            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-4 sm:mb-5 md:mb-6 max-w-sm mx-auto">
                              You don&apos;t have any active goals right now. Start your next journey and track your progress here.
                            </p>
                            {isOwnProfile && (
                              <button
                                onClick={() => navigate('/dashboard?tab=goals')}
                                className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-white font-medium text-xs sm:text-sm hover:opacity-90"
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
                  <section className="lg:col-span-3 rounded-xl border border-gray-100 bg-white p-4 dark:border-gray-700 dark:bg-gray-800 sm:p-5">
                    <div className="mb-4 flex items-center justify-between"><h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Habits</h3><button type="button" onClick={() => handleTabChange('habits')} className="text-xs font-bold text-blue-500">See all</button></div>
                    {userHabits.length > 0 ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{userHabits.slice(0, 3).map((habit) => {
                      const completed = Number(habit.weeklyCompletedDays || 0);
                      const target = habit.frequency === 'custom'
                        ? Math.max(1, habit.daysOfWeek?.length || 1)
                        : habit.frequency === 'weekly' ? 1 : 7;
                      const percent = Math.min(100, Math.round(Number(habit.last7CompletionRate ?? ((completed / Math.max(1, target)) * 100))));
                      const trend = habit.last7TrendPoints;
                      return <button type="button" key={habit.id || habit._id} onClick={() => { setOpenHabitId(habit.id || habit._id); setHabitModalOpen(true); }} className="rounded-xl border border-slate-100 p-3 text-left hover:border-blue-200 dark:border-gray-700"><div className="flex items-center gap-2"><HabitCategoryIcon category={habit.category} size="sm"/><span className="min-w-0 flex-1"><strong className="block truncate text-sm text-slate-950 dark:text-white">{habit.name}</strong><small className="text-[9px] font-semibold uppercase text-slate-400">{getHabitCategoryLabel(habit.category)}</small></span><span className="text-xs font-bold text-[#1683ed]">{percent}%</span></div><p className="mt-1 text-[10px] text-slate-500">{trend == null ? 'Last 7 days' : `${trend > 0 ? '↑ ' : trend < 0 ? '↓ ' : '→ '}${Math.abs(trend)} pts vs previous 7 days`}</p><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-gray-700"><span className="block h-full rounded-full bg-emerald-500" style={{ width: `${percent}%` }} /></div></button>;
                    })}</div> : <p className="py-5 text-center text-sm text-slate-500">Your recent habits will appear here.</p>}
                  </section>
                </div>
              )}
              {activeTab === 'trail' && (
                <div className="wt-trail-view rounded-xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:p-5 md:p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex max-w-[calc(100%-80px)] overflow-x-auto rounded-xl bg-slate-100 p-1 dark:bg-gray-700/70">
                      {[['all', 'All'], ['goals', 'Goals'], ['habits', 'Habits'], ['journals', 'Journals']].map(([value, label]) => <button key={value} type="button" onClick={() => setTrailFilter(value)} className={`shrink-0 rounded-lg px-3 py-2 text-xs font-bold transition sm:px-4 ${trailFilter === value ? 'bg-white text-blue-600 shadow-sm dark:bg-gray-800 dark:text-blue-300' : 'text-slate-500 hover:text-slate-800 dark:text-gray-400 dark:hover:text-white'}`}>{label}</button>)}
                    </div>
                    <label className="relative"><span className="sr-only">Trail year</span><select value={trailYear} onChange={(event) => setTrailYear(Number(event.target.value))} className="appearance-none rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-8 text-xs font-extrabold text-slate-800 outline-none transition focus:border-blue-400 dark:border-gray-700 dark:bg-gray-800 dark:text-white">{trailYears.map((year) => <option key={year} value={year}>{year}</option>)}</select><ChevronRight className="pointer-events-none absolute right-2.5 top-2.5 h-3.5 w-3.5 rotate-90 text-slate-400" /></label>
                  </div>
                  <div className="mb-5 flex items-center justify-between border-b border-slate-100 pb-3 dark:border-gray-700"><p className="text-xs font-semibold text-slate-500 dark:text-gray-400">Your creations, progress, and daily check-ins</p><span className="rounded-full bg-blue-50 px-3 py-1.5 text-[10px] font-bold text-blue-600 dark:bg-blue-950/30 dark:text-blue-300">{Object.values(trailMonthGroups).reduce((count, items) => count + items.length, 0)} activities</span></div>
                  {isProfileAccessible() ? (
                    trailLoading && trailActivities.length === 0 ? <div className="grid min-h-48 place-items-center"><span className="h-6 w-6 animate-spin rounded-full border-2 border-blue-100 border-t-blue-500" /></div> : Object.keys(trailMonthGroups).length > 0 ? (
                      <><div className="space-y-7">
                        {Object.entries(trailMonthGroups).map(([month, items]) => <section key={month}>
                          <div className="mb-3 flex items-center gap-3"><span className="text-[10px] font-extrabold uppercase tracking-[.14em] text-slate-500 dark:text-gray-400">{month} {trailYear}</span><span className="h-px flex-1 bg-slate-100 dark:bg-gray-700" /></div>
                          <div className="relative space-y-3 pl-7"><span className="absolute bottom-4 left-[7px] top-4 w-px bg-blue-200 dark:bg-blue-900" />
                            {items.map((item) => {
                              const isGoal = item.type.startsWith('goal_');
                              const isHabit = item.type.startsWith('habit_');
                              const isMilestone = item.type === 'goal_completed';
                              const labels = { goal_created: 'Goal created', goal_completed: 'Goal completed', goal_logged: 'Progress logged', habit_created: 'Habit created', habit_logged: item.data?.status === 'skipped' ? 'Habit skipped' : 'Habit logged', journal_logged: 'Journal logged' };
                              const Icon = isGoal ? Target : isHabit ? Flame : BookOpen;
                              const itemName = item.data?.itemName || (item.data?.dayKey ? `Entry for ${item.data.dayKey}` : 'Daily journal');
                              const logDetail = item.type === 'goal_logged'
                                ? (item.data?.detail || (item.data?.emotion ? `Feeling ${item.data.emotion}` : 'Progress check-in'))
                                : item.type === 'habit_logged'
                                  ? (item.data?.detail || `${Math.max(1, item.data?.count || 1)} ${Math.max(1, item.data?.count || 1) === 1 ? 'completion' : 'completions'}`)
                                  : item.type === 'journal_logged' && item.data?.mood ? `Mood: ${item.data.mood}` : null;
                              const openItem = () => { if (isGoal) setOpenGoalId(item.data?.itemId); else if (isHabit) { setOpenHabitId(item.data?.itemId); setHabitModalOpen(true); } else handleTabChange('daily-logs'); };
                              return <button key={item._id} type="button" onClick={openItem} className={`group relative block w-full rounded-xl border p-3.5 text-left shadow-[0_1px_3px_rgba(15,23,42,.04)] transition hover:shadow-md ${isMilestone ? 'border-amber-200 bg-gradient-to-r from-amber-50 to-yellow-50 hover:border-amber-300 dark:border-amber-800/60 dark:from-amber-950/30 dark:to-gray-800' : 'border-slate-100 bg-white hover:border-blue-200 dark:border-gray-700 dark:bg-gray-800/70'}`}><span className={`absolute -left-[27px] top-5 grid h-4 w-4 place-items-center rounded-full border-[3px] border-white shadow-sm dark:border-gray-900 ${isMilestone ? 'bg-amber-400' : isGoal ? 'bg-blue-500' : isHabit ? 'bg-orange-400' : 'bg-violet-500'}`} />
                                <div className="flex items-start gap-3"><span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${isMilestone ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/40' : isGoal ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/30' : isHabit ? 'bg-orange-50 text-orange-500 dark:bg-orange-950/30' : 'bg-violet-50 text-violet-600 dark:bg-violet-950/30'}`}><Icon className="h-5 w-5" /></span><span className="min-w-0 flex-1"><strong className={`block text-sm font-extrabold ${isMilestone ? 'text-amber-800 dark:text-amber-200' : 'text-slate-900 dark:text-white'}`}>{labels[item.type] || 'Trail activity'}</strong><small className="mt-1 block truncate font-semibold text-slate-500 dark:text-gray-400">{itemName}</small>{logDetail && <small className="mt-1 block truncate text-[10px] text-slate-400">{logDetail}</small>}<small className="mt-1.5 block text-[10px] text-slate-400">{item.date.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}</small></span>{isMilestone && <span className="rounded-full bg-amber-200/70 px-2 py-1 text-[9px] font-extrabold uppercase tracking-wide text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">Milestone</span>}<ChevronRight className="mt-3 h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-blue-500" /></div>
                              </button>;
                            })}
                          </div>
                        </section>)}
                      </div></>
                    ) : <div className="py-12 text-center"><span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-blue-50 text-blue-400 dark:bg-blue-950/30"><TrendingUp className="h-6 w-6" /></span><p className="mt-3 text-sm font-semibold text-slate-600 dark:text-gray-300">No {trailFilter === 'all' ? '' : `${trailFilter} `}activity in {trailYear}</p><p className="mt-1 text-xs text-slate-400">Choose another filter or year.</p></div>
                  ) : <p className="py-10 text-center text-sm text-gray-500 dark:text-gray-400">This trail is private.</p>}
                  {isProfileAccessible() && <div ref={trailLoaderRef} className="flex min-h-12 items-center justify-center">{trailLoading && trailActivities.length > 0 ? <span className="h-5 w-5 animate-spin rounded-full border-2 border-blue-100 border-t-blue-500" /> : !trailHasMore && trailActivities.length > 0 ? <span className="text-[10px] text-slate-400">You’ve reached the start of your trail.</span> : null}</div>}
                </div>
              )}
              {activeTab === 'goals' && (
                <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6 shadow-sm border border-gray-100 dark:border-gray-700">
                  {isProfileAccessible() ? (
                    <>
                      <div className="hidden">
                        {['all', 'on_track', 'attention'].map((filter) => (
                          <button
                            key={filter}
                            onClick={() => setGoalFilter(filter)}
                            className={`flex-1 rounded-lg px-3 py-2 text-xs font-bold transition-colors sm:text-sm ${
                              goalFilter === filter
                                ? 'bg-white text-blue-600 shadow-sm dark:bg-gray-700 dark:text-blue-300'
                                : 'text-gray-500 dark:text-gray-400'
                            }`}
                          >
                            {filter === 'all' ? `All (${userGoals.length})` : filter === 'on_track' ? 'On Track' : 'Needs Attention'}
                          </button>
                        ))}
                      </div>
                      <div className="mb-4 flex gap-2"><label className="flex flex-1 items-center gap-2 rounded-xl bg-slate-100 px-3 py-2.5 dark:bg-gray-700"><Search className="h-4 w-4 text-slate-400" /><input value={goalSearch} onChange={(event) => setGoalSearch(event.target.value)} placeholder="Search goals..." className="w-full bg-transparent text-sm outline-none dark:text-white" /></label><button type="button" onClick={() => setProfileFilterSheet('goals')} className={`rounded-xl p-3 ${goalFilter !== 'all' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-600'} dark:bg-gray-700 dark:text-gray-300`} aria-label="Filter goals"><SlidersHorizontal className="h-4 w-4" /></button></div>
                      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                      {isOwnProfile && (
                          <button
                            onClick={() => navigate('/dashboard?tab=goals')}
                            className="rounded-lg sm:rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 p-4 sm:p-5 md:p-6 flex flex-col items-center justify-center min-h-[120px] sm:min-h-[140px] hover:border-gray-400 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                            <Plus className="h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 text-gray-400 mb-1.5 sm:mb-2" />
                            <span className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">Create New Goal</span>
                          </button>
                        )}
                        {userGoals
                          .filter((g) => {
                            if (goalSearch && !g.title?.toLowerCase().includes(goalSearch.toLowerCase())) return false;
                            if (goalFilter === 'all') return true;
                            const health = String(g.goalHealth || '').toUpperCase();
                            if (goalFilter === 'on_track') return !g.completedAt && ['GETTING_STARTED', 'STRONG', 'STABLE'].includes(health);
                            if (goalFilter === 'attention') return !g.completedAt && ['SLIPPING', 'STALLED'].includes(health);
                            return true;
                          })
                          .map((goal, index) => (
                            <motion.div
                              key={goal.id}
                              initial={{ opacity: 0, y: 12 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: Math.min(index * 0.03, 0.3) }}
                              onClick={() => setOpenGoalId(goal.id)}
                              className="group cursor-pointer rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
                            >
                              <div className="flex items-start gap-2 sm:gap-3 mb-2 sm:mb-3">
                                <CategoryIcon category={goal.category} size="md" />
                                <div className="min-w-0 flex-1">
                                  <h4 className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base line-clamp-2 group-hover:opacity-80 mb-1.5 sm:mb-2">{goal.title}</h4>
                                  <CategoryBadge category={goal.category} />
                                </div>
                                <ChevronRight className="h-5 w-5 flex-shrink-0 text-slate-400" />
                              </div>
                              <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-100 pt-3 text-xs dark:border-gray-700"><span className={`rounded-full px-2.5 py-1 font-bold ${goal.completedAt ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300' : ['SLIPPING', 'STALLED'].includes(String(goal.goalHealth || '').toUpperCase()) ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300' : 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300'}`}>{goal.completedAt ? 'Completed' : (goal.healthLabel || 'Active')}</span><span className="truncate text-right text-slate-500 dark:text-gray-400">{goal.completedAt ? (goal.completedAt && new Date(goal.completedAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })) : (goal.healthReason || 'No progress logged yet')}</span></div>
                            </motion.div>
                          ))}
                      </div>
                      {userGoals.length === 0 && (
                        <div className="text-center py-8 sm:py-10 md:py-12 mt-3 sm:mt-4">
                          <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mb-3 sm:mb-4">No goals yet</p>
                          {isOwnProfile && (
                            <button
                              onClick={() => navigate('/dashboard')}
                              className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-white font-medium text-xs sm:text-sm"
                              style={{ backgroundColor: THEME_COLOR }}
                            >
                              Create Goal
                            </button>
                          )}
                        </div>
                      )}
                      {hasMoreGoals && userGoals.length > 0 && (
                        <div className="flex justify-center mt-4 sm:mt-5 md:mt-6">
                          <button
                            onClick={loadMoreGoals}
                            disabled={loadingMoreGoals}
                            className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg sm:rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-xs sm:text-sm font-medium disabled:opacity-50 flex items-center gap-2"
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
                <div className="wt-profile-list-screen space-y-4 sm:space-y-5 md:space-y-6">
                  <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6 shadow-sm border border-gray-100 dark:border-gray-700">
                    <div className="hidden">
                      <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-1.5 sm:gap-2">
                        <Flame className="h-5 w-5 sm:h-6 sm:w-6" style={{ color: THEME_COLOR }} />
                        Active Habits
                      </h3>
                      {isOwnProfile && (
                        <button
                          onClick={() => navigate('/dashboard?tab=habits')}
                          className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 md:px-5 py-1.5 sm:py-2 bg-[#4c99e6] hover:bg-[#3d88d5] text-white rounded-lg transition-colors shadow-sm font-manrope font-medium text-xs sm:text-sm"
                          >
                          <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                          <span className="xs:inline">New Habit</span>
                        </button>
                      )}
                    </div>
                    <div className="hidden">
                      {['all', 'active', 'archived'].map((filter) => (
                        <button key={filter} type="button" onClick={() => setHabitFilter(filter)} className={`flex-1 rounded-lg px-3 py-2 text-xs font-bold capitalize transition-colors sm:text-sm ${habitFilter === filter ? 'bg-white text-blue-600 shadow-sm dark:bg-gray-700 dark:text-blue-300' : 'text-gray-500 dark:text-gray-400'}`}>
                          {filter === 'all' ? `All (${userHabits.length})` : filter}
                        </button>
                      ))}
                    </div>
                    <div className="mb-4 flex gap-2"><label className="flex flex-1 items-center gap-2 rounded-xl bg-slate-100 px-3 py-2.5 dark:bg-gray-700"><Search className="h-4 w-4 text-slate-400" /><input value={habitSearch} onChange={(event) => setHabitSearch(event.target.value)} placeholder="Search habits..." className="w-full bg-transparent text-sm outline-none dark:text-white" /></label><button type="button" onClick={() => setProfileFilterSheet('habits')} className={`rounded-xl p-3 ${habitFilter !== 'all' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-600'} dark:bg-gray-700 dark:text-gray-300`} aria-label="Filter habits"><SlidersHorizontal className="h-4 w-4" /></button></div>
                    {userHabits.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                        {userHabits.filter((habit) => {
                          if (habitSearch && !habit.name?.toLowerCase().includes(habitSearch.toLowerCase())) return false;
                          return habitFilter === 'all' || (habitFilter === 'archived' ? habit.isArchived : habit.isActive && !habit.isArchived);
                        }).map((habit, index) => {
                          const weeklyTarget = habit.frequency === 'custom'
                            ? Math.max(1, habit.daysOfWeek?.length || 1)
                            : habit.frequency === 'weekly' ? 1 : 7;
                          const weeklyCompleted = Number(habit.weeklyCompletedDays || 0);
                          const weeklyPercent = Math.min(100, Math.round(Number(habit.last7CompletionRate ?? ((weeklyCompleted / weeklyTarget) * 100))));
                          const trend = habit.last7TrendPoints;
                          const scheduleLabel = habit.frequency === 'custom'
                            ? `${habit.daysOfWeek?.length || 0} days / week`
                            : habit.frequency === 'weekly' ? 'Weekly' : 'Daily';
                          return (
                            <motion.div
                              key={habit.id}
                              initial={{ opacity: 0, y: 12 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.05 }}
                              onClick={() => {
                                if (!isOwnProfile) return;
                                setOpenHabitId(habit.id);
                                setHabitModalOpen(true);
                              }}
                              className={`rounded-lg border border-gray-200 p-3 sm:rounded-xl sm:p-4 dark:border-gray-700 ${isOwnProfile ? 'cursor-pointer hover:shadow-md' : ''}`}
                            >
                              <div className="flex items-start justify-between gap-2 sm:gap-3 mb-2 sm:mb-3">
                                <div className="flex items-start gap-2 sm:gap-3 min-w-0 flex-1">
                                  <HabitCategoryIcon category={habit.category} size="lg" />
                                  <div className="min-w-0 flex-1">
                                    <h4 className="font-semibold text-gray-900 dark:text-white text-base sm:text-lg">{habit.name}</h4>
                                    <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">{getHabitCategoryLabel(habit.category)} · {scheduleLabel}</p>
                                  </div>
                                </div>
                                <div className="flex-shrink-0 text-right">
                                  <span className="text-xl sm:text-2xl font-bold block leading-tight" style={{ color: THEME_COLOR }}>{weeklyPercent}%</span>
                                  <span className="text-xs sm:text-sm" style={{ color: THEME_COLOR }}>COMPLETION</span>
                                </div>
                              </div>
                              <div className="mt-3"><div className="mb-1.5 flex items-center justify-between text-xs text-slate-500 dark:text-gray-400"><span>{habit.last7CompletedDays ?? weeklyCompleted}/{habit.last7ExpectedDays ?? weeklyTarget} scheduled days · last 7 days</span><span className="font-bold">{trend == null ? 'No prior comparison' : `${trend > 0 ? '+' : ''}${trend} pts`}</span></div><div className="flex items-center gap-3"><div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-gray-700"><div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-400" style={{ width: `${weeklyPercent}%` }} /></div><ChevronRight className="h-4 w-4 text-slate-400" /></div></div>
                            </motion.div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-8 sm:py-10 md:py-12">
                        <Flame className="h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 text-gray-300 dark:text-gray-600 mx-auto mb-3 sm:mb-4" />
                        <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mb-3 sm:mb-4">No active habits yet</p>
                        {isOwnProfile && (
                          <button
                            onClick={() => navigate('/dashboard')}
                            className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-white text-xs sm:text-sm font-medium"
                            style={{ backgroundColor: THEME_COLOR }}
                          >
                            Create Habit
                          </button>
                        )}
                      </div>
                    )}
                    {hasMoreHabits && userHabits.length > 0 && <div className="mt-5 flex justify-center"><button type="button" onClick={loadMoreHabits} disabled={loadingMoreHabits} className="rounded-xl bg-slate-100 px-5 py-2.5 text-sm font-bold text-slate-700 disabled:opacity-50 dark:bg-gray-700 dark:text-gray-200">{loadingMoreHabits ? 'Loading…' : 'Load More'}</button></div>}
                  </div>
                  <div className="hidden">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4 flex items-center gap-1.5 sm:gap-2">
                      <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500" />
                      Habit History
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-4">The five most recently logged habits.</p>
                    <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
                      <table className="w-full text-xs sm:text-sm min-w-[500px]">
                        <thead>
                          <tr className="text-left text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 uppercase border-b border-gray-200 dark:border-gray-700">
                            <th className="pb-3 font-medium">Habit Name</th>
                            <th className="pb-3 font-medium">Best Streak</th>
                            <th className="pb-3 font-medium">Progress</th>
                          </tr>
                        </thead>
                        <tbody>
                          {recentHabits.length > 0 ? (
                            recentHabits.map((h) => (
                              <tr key={h.id} className="border-b border-gray-100 dark:border-gray-700/50">
                                <td className="py-3 flex items-center gap-2">
                                  <span className="text-gray-400">•</span>
                                  {h.name}
                                </td>
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
                              <td colSpan={3} className="py-8 text-center text-gray-500 dark:text-gray-400 text-sm">
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
              {activeTab === 'daily-logs' && (
                <div className={isOwnProfile
                  ? "bg-white/95 dark:bg-gray-800/90 backdrop-blur-2xl rounded-2xl p-5 sm:p-6 shadow-sm border border-white/70 dark:border-gray-700"
                  : "bg-white/90 dark:bg-gray-800/70 backdrop-blur-2xl rounded-2xl p-5 sm:p-6 border border-white/60 dark:border-gray-700/50"
                }>
                  <div className="hidden">
                    <div>
                      <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">Daily Logs</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5">A simple space to capture how the day felt.</p>
                    </div>
                    {isOwnProfile && (
                      <div className="w-full sm:w-auto">
                        <button
                          onClick={() => setIsDailyLogsOpen(true)}
                          className={`w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-sm font-manrope
                            ${
                              hasTodayDailyLogs
                                ? 'bg-gray-300 dark:bg-gray-700 text-gray-600'
                                : 'bg-[#4c99e6] hover:bg-[#3d88d5] text-white'
                            }
                          `}                        >
                          {hasTodayDailyLogs ? 'Update Today’s Log' : 'Log Today’s Feeling'}
                       </button>
                      </div>
                    )}
                  </div>
                  {/* Daily Logs Feed (own profile) */}
                  {isOwnProfile && (
                    <div className="space-y-5">
                      <button type="button" onClick={() => setJournalCalendarOpen(value => !value)} aria-expanded={journalCalendarOpen} className="flex w-full items-center justify-between rounded-xl border border-slate-100 bg-white p-4 text-left text-sm font-bold text-slate-800 dark:border-gray-700 dark:bg-gray-800 dark:text-white"><span className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-[#1683ed]" />Calendar view</span><span className="flex items-center gap-1 text-[10px] text-slate-400">{journalCalendarOpen ? 'Hide' : 'Show'}<ChevronRight className={`h-4 w-4 transition-transform ${journalCalendarOpen ? 'rotate-90' : ''}`} /></span></button>
                      <div className={`wt-journal-calendar rounded-xl border border-slate-100 p-4 dark:border-gray-700 ${journalCalendarOpen ? '' : 'hidden'}`}>
                        <div className="mb-3 flex items-center justify-between"><label className="relative"><span className="sr-only">Journal year</span><select value={journalMonthYear} onChange={(event) => setJournalMonth(new Date(Number(event.target.value), journalMonthIndex, 1))} className="appearance-none rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-8 text-xs font-extrabold text-slate-800 outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white">{journalYears.map((year) => <option key={year} value={year}>{year}</option>)}</select><ChevronRight className="pointer-events-none absolute right-2.5 top-2.5 h-3.5 w-3.5 rotate-90 text-slate-400" /></label><span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Journal calendar</span></div>
                        <div className="mb-5 grid grid-cols-[36px_1fr_36px] items-center">
                          <button type="button" aria-label="Previous month" onClick={() => setJournalMonth(new Date(journalMonthYear, journalMonthIndex - 1, 1))} className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-gray-700 dark:text-gray-300"><ChevronLeft className="h-4 w-4" /></button>
                          <div className="text-center"><h4 className="text-sm font-extrabold text-slate-950 dark:text-white">{journalMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h4><p className="mt-0.5 text-[10px] font-medium text-slate-400">{Array.from(journalEntriesByDay.keys()).filter((key) => key.startsWith(`${journalMonthYear}-${String(journalMonthIndex + 1).padStart(2, '0')}`)).length} entries this month</p></div>
                          <button type="button" aria-label="Next month" disabled={journalMonthYear === new Date().getFullYear() && journalMonthIndex >= new Date().getMonth()} onClick={() => setJournalMonth(new Date(journalMonthYear, journalMonthIndex + 1, 1))} className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-35 dark:border-gray-700 dark:text-gray-300"><ChevronRight className="h-4 w-4" /></button>
                        </div>
                        <div className="grid grid-cols-7 text-center">{['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(day => <span key={day} className="pb-3 text-[10px] font-bold uppercase tracking-wide text-slate-400">{day}</span>)}{journalCalendarCells.map((day, index) => {
                          if (!day) return <span key={`empty-${index}`} className="h-11 sm:h-14" />;
                          const entry = journalEntriesByDay.get(journalDayKey(day));
                          const mood = entry ? DAILY_LOG_MOOD_META[entry.mood] : null;
                          const isToday = journalDayKey(day) === getDateKeyInTimezone(new Date());
                          return <button key={day} type="button" disabled={!entry} onClick={() => entry && toggleDailyLogExpand(entry.id || entry._id || entry.createdAt)} className={`relative mx-0.5 mb-1 flex h-10 flex-col items-center justify-center rounded-lg text-xs font-bold sm:h-14 ${entry ? 'bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/25 dark:text-blue-300' : 'text-slate-500 dark:text-gray-400'} ${isToday ? 'ring-1 ring-blue-500' : ''}`}><span>{day}</span>{entry && <span className={`mt-1 h-1.5 w-1.5 rounded-full ${mood?.score >= 4 ? 'bg-emerald-500' : mood?.score >= 3 ? 'bg-amber-400' : 'bg-rose-400'}`} />}</button>;
                        })}</div>
                        <div className="mt-3 flex items-center justify-center gap-4 border-t border-slate-100 pt-3 text-[10px] text-slate-500 dark:border-gray-700"><span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-emerald-500" />Positive</span><span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-amber-400" />Neutral</span><span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-rose-400" />Low</span></div>
                      </div>

                      {dailyLogsFeed.length === 0 && !dailyLogsLoading && (
                        <div className="text-center py-10 sm:py-12 md:py-14 px-4 border border-dashed border-gray-200 dark:border-gray-600 rounded-2xl bg-gray-50/50 dark:bg-gray-900/20">
                          <p className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Start your first daily log</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">Capture how you feel in seconds and build your reflection habit.</p>
                          <button
                            onClick={() => setIsDailyLogsOpen(true)}
                            className="w-full sm:w-auto px-5 py-2.5 rounded-lg sm:rounded-xl text-sm font-medium text-white"
                            style={{ backgroundColor: THEME_COLOR }}
                          >
                            Write Today’s Log
                          </button>
                        </div>
                      )}
                      <div className="space-y-3 sm:space-y-4 max-h-[430px] sm:max-h-[500px] overflow-y-auto scrollbar-hide pr-0.5 sm:pr-1">
                        {sortedDailyLogs.map((e) => {
                          const entryId = e?.id || e?._id || e?.createdAt;
                          const isDeletingThisEntry = deletingDailyLogId && String(deletingDailyLogId) === String(entryId);
                          const isExpanded = expandedDailyLogIds.includes(entryId);
                          const moodMeta = DAILY_LOG_MOOD_META[e?.mood] || null;
                          return (
                            <div
                              key={entryId}
                              className="w-full text-left p-4 sm:p-5 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm"
                            >
                              <div className="flex items-start gap-3">
                                <button
                                  type="button"
                                  onClick={() => toggleDailyLogExpand(entryId)}
                                  className="w-full text-left"
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div>
                                      <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 uppercase mb-1.5 sm:mb-2">{formatDate(e.createdAt)}</div>
                                      <div className="flex items-center gap-2 mb-2 sm:mb-3">
                                        {moodMeta ? (
                                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium ${moodMeta.chip}`}>
                                            {moodMeta.label}
                                          </span>
                                        ) : (
                                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                                            No Mood
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <span className="text-xs font-medium text-[#4c99e6] whitespace-nowrap">{isExpanded ? 'Hide' : 'Details'}</span>
                                  </div>
                                  <p className={`text-sm sm:text-base text-gray-700 dark:text-gray-300 leading-relaxed mt-1 ${isExpanded ? '' : 'line-clamp-1'}`}>
                                    {e.content}
                                  </p>
                                </button>

                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    handleDeleteDailyLog(entryId);
                                  }}
                                  disabled={!!deletingDailyLogId}
                                  className="shrink-0 text-xs font-medium text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                  title="Delete entry"
                                  aria-label="Delete daily log entry"
                                >
                                  {isDeletingThisEntry ? (
                                    <span className="text-[10px] font-medium">...</span>
                                  ) : (
                                    'Delete'
                                  )}
                                </button>
                              </div>

                              {isExpanded && e?.motivation && (
                                <div className="mt-3 sm:mt-4 p-3 sm:p-4 rounded-xl border border-blue-100 dark:border-blue-900/40 bg-blue-50/80 dark:bg-blue-900/15">
                                  <div>
                                    <span className="text-[10px] sm:text-xs font-semibold uppercase" style={{ color: THEME_COLOR }}>AI Insight</span>
                                    <p className="text-xs sm:text-sm mt-0.5 sm:mt-1 leading-relaxed" style={{ color: '#3d7ab8' }}>{e.motivation}</p>
                                  </div>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                      <div className="flex items-center justify-center mt-3 sm:mt-4">
                        {dailyLogsHasMore ? (
                          <button onClick={loadMoreDailyLogs} disabled={dailyLogsLoading} className="px-4 sm:px-5 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
                            {dailyLogsLoading ? 'Loading…' : 'Load More'}
                          </button>
                        ) : (
                          dailyLogsFeed.length > 0 && <div className="text-[10px] sm:text-xs text-gray-400">No more entries</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </>
        )}
          </main>
          <aside className="wt-profile-rail" aria-label="Profile highlights">
            {/* Achievements are hidden until this section is ready.
            <section>
              <div className="wt-profile-rail-heading"><h2>Achievements</h2><button type="button">See all</button></div>
              <div className="wt-achievement-grid">
                {[
                  ['🏆', 'First Goal', `${analytics?.goals?.completedGoals || 0} completed`],
                  ['🔥', `${analytics?.habits?.bestStreak || 0} Day`, 'Habit streak'],
                  ['📖', `${dailyLogsFeed.length || analytics?.dailyLogs?.entries || 0} Journals`, 'This month'],
                  ['🌅', 'Early Bird', 'Morning log'],
                  ['⭐', 'Explorer', 'Keep going!'],
                  ['＋', 'More', 'To unlock']
                ].map(([icon, title, detail]) => <div key={`${title}-${detail}`}><span>{icon}</span><strong>{title}</strong><small>{detail}</small></div>)}
              </div>
            </section> */}
            <section>
              <div className="wt-profile-rail-heading"><h2>About</h2>{isOwnProfile && <button type="button" onClick={() => navigate('/settings?section=personal-info')}>Edit</button>}</div>
              <p>{displayUser.bio || 'Share a little about your journey and what inspires you.'}</p>
              <ul>
                {displayUser.location && <li><MapPin />{displayUser.location}</li>}
                {displayUser.createdAt && <li><CalendarDays />Joined {new Date(displayUser.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</li>}
                {displayUser.website && <li><Globe /><a href={formatUrl(displayUser.website)} target="_blank" rel="noreferrer">{displayUser.website}</a></li>}
              </ul>
            </section>
            <section>
              <div className="wt-profile-rail-heading"><h2>Interests</h2>{isOwnProfile && <button type="button" onClick={() => navigate('/settings?section=personal-info')}>Edit</button>}</div>
              <div className="wt-interest-list">{(displayUser.interests || []).map((interest) => <span key={interest}>{interest}</span>)}{(displayUser.interests || []).length === 0 && <small>No interests added yet.</small>}</div>
            </section>
          </aside>
        </div>
        {/* Daily Log Modal */}
        {isOwnProfile && (
          <Suspense fallback={null}><DailyLogsPromptModal
            isOpen={isDailyLogsOpen}
            onClose={() => setIsDailyLogsOpen(false)}
            existingEntry={todayDailyLogEntry}
            onSubmitted={async (entry) => {
              setSubmittedDailyLogsToday(Boolean(entry));
              try {
                await getUserDailyLogsHighlights(currentUser?.id, { limit: 12 });
                const entries = await getMyDailyLogsEntries({ limit: 10 });
                // Update local dailyLogsFeed with fresh entries
                if (Array.isArray(entries)) {
                  setDailyLogsFeed(entries);
                  setDailyLogsSkip(entries.length);
                } else {
                  setDailyLogsFeed([]);
                  setDailyLogsSkip(0);
                }
                const analyticsResult = await getUserAnalytics(null);
                if (analyticsResult.success) setAnalytics(analyticsResult.analytics);
              } catch { }
            }}
          /></Suspense>
        )}
        {exportOpen && (
          <Suspense fallback={null}><DailyLogsExportModal isOpen={exportOpen} onClose={() => setExportOpen(false)} /></Suspense>
        )}
      </div>
      {profileFilterSheet && (
        <div className="fixed inset-0 z-[205] flex items-end justify-center">
          <button type="button" aria-label="Close filters" onClick={() => setProfileFilterSheet(null)} className="absolute inset-0 bg-slate-950/45" />
          <section className="relative w-full rounded-t-3xl bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl dark:bg-gray-900 sm:max-w-md sm:rounded-2xl">
            <div className="mb-5 flex items-center justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-blue-500">Filters</p><h2 className="mt-1 text-lg font-extrabold text-slate-950 dark:text-white">{profileFilterSheet === 'goals' ? 'Filter goals' : 'Filter habits'}</h2></div><button type="button" onClick={() => setProfileFilterSheet(null)} className="rounded-lg p-2 text-2xl leading-none text-slate-400">×</button></div>
            <div className="grid gap-2">
              {(profileFilterSheet === 'goals' ? [['all','All goals'],['on_track','On Track'],['attention','Needs Attention']] : [['all','All habits'],['active','Active'],['archived','Archived']]).map(([value, label]) => {
                const selected = profileFilterSheet === 'goals' ? goalFilter === value : habitFilter === value;
                return <button key={value} type="button" onClick={() => profileFilterSheet === 'goals' ? setGoalFilter(value) : setHabitFilter(value)} className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left text-sm font-bold ${selected ? 'border-blue-500 bg-blue-50 text-blue-600 dark:bg-blue-950/30' : 'border-slate-200 text-slate-600 dark:border-gray-700 dark:text-gray-300'}`}><span>{label}</span><span className={`h-4 w-4 rounded-full border-2 ${selected ? 'border-blue-500 bg-blue-500 shadow-[inset_0_0_0_3px_white]' : 'border-slate-300'}`} /></button>;
              })}
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3"><button type="button" onClick={() => profileFilterSheet === 'goals' ? setGoalFilter('all') : setHabitFilter('all')} className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-600 dark:border-gray-700 dark:text-gray-300">Clear</button><button type="button" onClick={() => setProfileFilterSheet(null)} className="rounded-xl bg-[#1683ed] px-4 py-3 text-sm font-bold text-white">Apply</button></div>
          </section>
        </div>
      )}
      {/* Report & Block Modals */}
      <Suspense fallback={null}><ReportModal
        isOpen={reportOpen}
        onClose={() => setReportOpen(false)}
        targetLabel={displayUser?.username ? `@${displayUser.username}` : 'user'}
        onSubmit={async ({ reason, description }) => {
          try {
            if (!displayUser?.id) return;
            await report({ targetType: 'user', targetId: displayUser.id, reason, description });
          } finally {
            // Offer to block after report
            try { if (displayUser?.id) { setBlockOpen(true); } } catch { }
            setReportOpen(false);
          }
        }}
        onReportAndBlock={displayUser?.id ? async () => { await blockUser(displayUser.id); } : undefined}
      /></Suspense>
      <Suspense fallback={null}><BlockModal
        isOpen={blockOpen}
        onClose={() => setBlockOpen(false)}
        username={displayUser?.username || 'this user'}
        onConfirm={async () => {
          try {
            if (!displayUser?.id) {
              toast.error('User ID not found');
              return;
            }
            const result = await blockUser(displayUser.id);
            if (result.success) {
              setBlockOpen(false);
              // Navigate away from blocked user's profile
              navigate('/dashboard');
            } else {
              toast.error(result.error || 'Failed to block user');
            }
          } catch (error) {
            toast.error('Failed to block user');
          }
        }}
      /></Suspense>
      {/* Goal Details Modal (with timeline) */}
      {openGoalId && (
        <Suspense fallback={null}><GoalPostModal
          isOpen={!!openGoalId}
          goalId={openGoalId}
          openWithComments={scrollCommentsOnOpen}
          onClose={closeGoalModal}
        /></Suspense>
      )}
      {/* Habit Detail Modal */}
      {isOwnProfile && habitModalOpen && openHabitId && (
        <Suspense fallback={null}><HabitDetailModal
          habit={userHabits.find(h => String(h.id) === String(openHabitId))}
          isOpen={habitModalOpen}
          onClose={() => {
            setHabitModalOpen(false);
            setOpenHabitId(null);
          }}
          onLog={isOwnProfile ? async (status, mood = 'neutral', count = 1) => {
            try {
              const response = await habitsAPI.log(openHabitId, { status, mood, count });
              const log = response?.data?.data?.log || response?.data?.log;
              toast.success(`Habit ${status === 'done' ? 'completed' : status}!`);
              await fetchUserHabits();
              const analyticsResult = await getUserAnalytics(null);
              if (analyticsResult.success) setAnalytics(analyticsResult.analytics);
              return {
                success: true,
                todayCompletionCount: status === 'done'
                  ? (Number.isFinite(log?.completionCount) ? Number(log.completionCount) : undefined)
                  : 0,
                log
              };
            } catch (error) {
              toast.error('Failed to log habit');
              return { success: false, error };
            }
          } : undefined}
          onHabitStatsChanged={isOwnProfile ? async () => {
            await fetchUserHabits();
            const analyticsResult = await getUserAnalytics(null);
            if (analyticsResult.success) setAnalytics(analyticsResult.analytics);
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
          className="fixed inset-0 z-[210] flex items-end justify-center sm:items-center sm:p-4"
          onClick={() => setProfileMenuOpen(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-slate-950/55 backdrop-blur-[1px] dark:bg-black/70" />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, y: 80 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 80 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="relative mt-auto w-full sm:mt-0 sm:max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="max-h-[88dvh] w-full overflow-y-auto rounded-t-[26px] bg-white shadow-2xl dark:bg-gray-900 sm:rounded-2xl">
              <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-slate-300 dark:bg-gray-600" />
              <div className="space-y-1 px-4 pb-2 pt-4">
                {isOwnProfile ? (
                  <>
                    <button
                      className="w-full rounded-lg px-4 py-2 text-center text-gray-900 transition-colors hover:bg-gray-100 dark:text-white dark:hover:bg-gray-700"
                      onClick={() => {
                        navigate('/settings?section=personal-info');
                        setProfileMenuOpen(false);
                      }}
                    >
                      Edit Profile
                    </button>
                    <button
                      className="w-full rounded-lg px-4 py-2 text-center text-gray-900 transition-colors hover:bg-gray-100 dark:text-white dark:hover:bg-gray-700"
                      onClick={() => {
                        shareUrlRef.current = `${window.location.origin}/profile/@${displayUser.username}`;
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
              <div className="border-t border-slate-100 px-4 pb-[calc(14px+env(safe-area-inset-bottom))] pt-3 dark:border-gray-800">
                <button onClick={() => setProfileMenuOpen(false)} className="w-full rounded-xl bg-gray-100 px-3 py-3 text-sm font-bold text-gray-700 dark:bg-gray-800 dark:text-gray-200">Cancel</button>
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
      
      {/* Quote Modal */}
      {quoteModalOpen && displayUser?.currentMood && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => setQuoteModalOpen(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm" />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.2 }}
            className="relative w-full max-w-md min-w-0"
            role="dialog"
            aria-modal="true"
            aria-label="Mood and quote"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-h-[calc(100dvh-2rem)] overflow-y-auto border border-gray-200 dark:border-gray-700">
              {/* Mood Header */}
              <div className="flex items-center justify-center pt-8 pb-4">
                <div 
                  className="w-20 h-20 rounded-full flex items-center justify-center shadow-lg"
                  style={{ backgroundColor: 'rgba(76, 153, 230, 0.1)' }}
                >
                  <span className="text-5xl">{displayUser.currentMood}</span>
                </div>
              </div>
              
              {/* User Info */}
              <div className="text-center px-6 pb-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  @{displayUser.username}
                </p>
              </div>
              
              {/* Quote Section */}
              {displayUser.quote ? (
                <div className="px-6 pb-6">
                  <div 
                    className="min-h-[7rem] p-5 rounded-xl border-l-4 flex items-center"
                    style={{ 
                      backgroundColor: 'rgba(76, 153, 230, 0.08)',
                      borderLeftColor: '#4c99e6'
                    }}
                  >
                    <div className="flex min-w-0 w-full items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm sm:text-base text-gray-800 dark:text-gray-200 leading-relaxed italic whitespace-pre-wrap [overflow-wrap:anywhere]">
                          &ldquo;{displayUser.quote}&rdquo;
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="px-6 pb-6">
                  <div className="min-h-[7rem] p-5 rounded-xl bg-gray-50 dark:bg-gray-700/30 flex items-center justify-center text-center">
                    <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                      No quote shared yet
                    </p>
                  </div>
                </div>
              )}
              
              {/* Close Button */}
              <div className="border-t border-gray-200 dark:border-gray-700 p-4">
                <button
                  onClick={() => setQuoteModalOpen(false)}
                  className="w-full px-4 py-2.5 rounded-xl text-white font-medium text-sm transition-opacity hover:opacity-90"
                  style={{ backgroundColor: '#4c99e6' }}
                >
                  Close
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
      
      {/* Footer quote */}
      <footer className="text-center py-8 mt-8">
        <p className="text-gray-500 dark:text-gray-400 italic text-sm">
          &ldquo;The only way to achieve the impossible is to believe it is possible.&rdquo;
        </p>
      </footer>

      <ConfirmActionModal
        isOpen={isDeleteDailyLogConfirmOpen}
        onClose={() => {
          if (deletingDailyLogId) return;
          setIsDeleteDailyLogConfirmOpen(false);
          setPendingDeleteDailyLogId(null);
        }}
        onConfirm={confirmDeleteDailyLog}
        title="Delete daily log?"
        message="This will remove your daily log for that day."
        confirmText="Delete"
        isLoading={!!deletingDailyLogId}
      />
      {metricInfo && <MetricInfoModal metric={metricInfo} onClose={() => setMetricInfo(null)} />}
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
