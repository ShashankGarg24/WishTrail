import { useState, useEffect, useRef, lazy, Suspense } from "react";
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Calendar, Target, TrendingUp, Star, Edit2, ExternalLink, Youtube, Instagram, MapPin, Globe, Trophy, BookOpen, Clock, CheckCircle, Circle, User, UserPlus, UserCheck, ArrowLeft, Lock, Sparkles, Download } from "lucide-react";
const FollowListModal = lazy(() => import("../components/FollowListModal"));
import { motion } from "framer-motion";
import useApiStore from "../store/apiStore";
import { journalsAPI } from "../services/api";
import { habitsAPI } from '../services/api';
const ProfileEditModal = lazy(() => import("../components/ProfileEditModal"));
const ReportModal = lazy(() => import("../components/ReportModal"));
const BlockModal = lazy(() => import("../components/BlockModal"));
const JournalPromptModal = lazy(() => import("../components/JournalPromptModal"));
const JournalEntryModal = lazy(() => import("../components/JournalEntryModal"));
const JournalExportModal = lazy(() => import("../components/JournalExportModal"));
const HabitAnalyticsCard = lazy(() => import("../components/HabitAnalyticsCard"));
const GoalPostModal = lazy(() => import('../components/GoalPostModal'));
const GoalDetailsModal = lazy(() => import('../components/GoalDetailsModal'));

const ProfilePage = () => {
  const params = useParams();
  const userIdParam = params.userId;
  const usernameParam = params.username;
  const navigate = useNavigate();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'overview';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [userGoals, setUserGoals] = useState([]);
  const [profileUser, setProfileUser] = useState(null);
  const [userStats, setUserStats] = useState(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef(null);
  const [followModalOpen, setFollowModalOpen] = useState(false);
  const [followModalTab, setFollowModalTab] = useState('followers');
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [loadingFollows, setLoadingFollows] = useState(false);

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
    journalHighlights,
    journalEntries,
    getFollowers,
    getFollowing,
    isFeatureEnabled
  } = useApiStore();

  // Determine if viewing own profile or another user's profile
  const isOwnProfile = !userIdParam && !usernameParam || (currentUser && (currentUser.username === usernameParam || currentUser._id === userIdParam));
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
  const [habitStats, setHabitStats] = useState(null);
  const [myHabits, setMyHabits] = useState([]);
  const [openGoalId, setOpenGoalId] = useState(null)
  const [scrollCommentsOnOpen, setScrollCommentsOnOpen] = useState(false)

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
  }, [isAuthenticated, userIdParam, usernameParam]);

  // Outside click to close profile 3-dot menu
  useEffect(() => {
    const onDocMouseDown = (e) => {
      if (!profileMenuOpen) return;
      const target = e.target;
      const inside = target?.closest?.('[data-profile-menu="true"]') || target?.closest?.('[data-profile-menu-btn="true"]');
      if (inside) return;
      setProfileMenuOpen(false);
    };
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, [profileMenuOpen]);


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
        const targetId = (isOwnProfile ? currentUser?._id : profileUser?._id);
        if (activeTab === 'journal' && targetId) {
          // Reset feed and load first page (own profile only)
          if (isOwnProfile) {
            setJournalFeed([]);
            setJournalSkip(0);
            setJournalHasMore(true);
            await loadMoreJournal();
          }
        }
      } catch (e) { }
    };
    fetchJournal();
    // Load habit analytics (no heatmap)
    const fetchHabits = async () => {
      try {
        if (activeTab !== 'overview') return;
        if (!isOwnProfile) return;
        const [listRes, analyticsRes] = await Promise.all([
          habitsAPI.list(),
          habitsAPI.analytics({ days: 30 })
        ]);
        const habits = listRes?.data?.data?.habits || [];
        setMyHabits(habits);
        const analytics = analyticsRes?.data?.data || null;
        setHabitStats(analytics);
      } catch (_) { }
    };
    fetchHabits();
  }, [activeTab, profileUser?._id, currentUser?._id]);

  const loadMoreJournal = async () => {
    if (!isOwnProfile || journalLoading || !journalHasMore) return;
    try {
      setJournalLoading(true);
      const params = { limit: JOURNAL_LIMIT, skip: journalSkip };
      const res = await journalsAPI.getMyEntries(params);
      const entries = res?.data?.data?.entries || [];
      setJournalFeed(prev => {
        const seen = new Set(prev.map(x => x?._id).filter(Boolean));
        const filtered = entries.filter(e => e && e._id && !seen.has(e._id));
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
      const idOrUsername = usernameParam || userIdParam;
      const userResult = await getUser(idOrUsername);
      if (userResult.success) {
        setProfileUser(userResult.user);
        setUserStats(userResult.stats);
        setIsFollowing(userResult.isFollowing);
        setIsRequested(!!userResult.isRequested);
        if (userResult.user && (!userResult.user.isPrivate || userResult.isFollowing)) {
          const goalsResult = await getUserGoals(userResult.user._id, { limit: 10 });
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
      const result = await followUser(profileUser?._id);
      if (result.success) {
        if (profileUser?.isPrivate || result.isRequested) {
          setIsRequested(true);
        } else {
          setIsFollowing(true);
        }
        fetchUserProfile();
      }
    } catch (error) {
      console.error('Error following user:', error);
    }
  };

  const handleUnfollow = async () => {
    try {
      const result = await unfollowUser(profileUser?._id);
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
          <div className="flex flex-row items-start gap-4 md:gap-8">
            {/* Profile Picture */}
            <div className="relative">
              <img
                src={displayUser.avatar || '/api/placeholder/150/150'}
                alt={displayUser.name}
                className="w-20 h-20 md:w-36 md:h-36 rounded-full border-4 border-gray-300 dark:border-gray-600 object-cover"
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
              {/* Name and Username Row (desktop) */}
              <div className="hidden md:flex md:flex-row md:items-center md:space-x-4 mb-4">
                <div className="flex items-center space-x-3 mb-3 md:mb-0">
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                    {displayUser.name}
                  </h1>
                </div>

                {/* Username */}
                <p className="text-xl text-gray-600 dark:text-gray-400 flex-1">
                  @{displayUser.username}
                </p>
                {/* 3-dots menu for profile actions (aligned right) */}
                <div className="relative inline-block">
                  <button data-profile-menu-btn="true" onClick={() => setProfileMenuOpen(v => !v)} className="px-2 py-1 rounded-md text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800">⋯</button>
                  {profileMenuOpen && (
                    <div ref={profileMenuRef} data-profile-menu="true" className="absolute right-0 top-full mt-2 w-44 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-40">
                      {isOwnProfile ? (
                        <button
                          className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                          onClick={() => { setIsEditModalOpen(true); setProfileMenuOpen(false); }}
                        >Edit Profile</button>
                      ) : (
                        <>
                          <button
                            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                            onClick={() => { setReportOpen(true); setProfileMenuOpen(false); }}
                          >Report</button>
                          <button
                            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                            onClick={() => { setBlockOpen(true); setProfileMenuOpen(false); }}
                          >Block</button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Mobile name/username under stats */}
              <div className="md:hidden mt-2 mb-2">
                <div className="text-lg font-semibold text-gray-900 dark:text-white">{displayUser.name}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">@{displayUser.username}</div>
              </div>

              {/* Stats Row */}
              <div className="hidden md:flex items-center space-x-8 mb-4">
                <button className="text-center" onClick={() => {
                  try { const el = document.getElementById('profile-goals-section'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch { }
                }}>
                  <div className="text-xl font-bold text-gray-900 dark:text-white">
                    {isOwnProfile ? (displayUser.totalGoals || 0) : (userStats?.totalGoals || 0)}
                  </div>
                  <div className="text-gray-600 dark:text-gray-400 text-sm">Goals</div>
                </button>
                <button className="text-center" onClick={async () => {
                  setFollowModalTab('followers'); setFollowModalOpen(true); setLoadingFollows(true);
                  try {
                    const uid = isOwnProfile ? currentUser?._id : (profileUser?._id || profileUser?.id);
                    const res = await getFollowers(uid);
                    if (res?.success) setFollowers(res.followers || []);
                  } finally { setLoadingFollows(false); }
                }}>
                  <div className="text-xl font-bold text-gray-900 dark:text-white">
                    {isOwnProfile ? (displayUser.followerCount || 0) : (userStats?.followers || 0)}
                  </div>
                  <div className="text-gray-600 dark:text-gray-400 text-sm">Followers</div>
                </button>
                <button className="text-center" onClick={async () => {
                  setFollowModalTab('following'); setFollowModalOpen(true); setLoadingFollows(true);
                  try {
                    const uid = isOwnProfile ? currentUser?._id : (profileUser?._id || profileUser?.id);
                    const res = await getFollowing(uid);
                    if (res?.success) setFollowing(res.following || []);
                  } finally { setLoadingFollows(false); }
                }}>
                  <div className="text-xl font-bold text-gray-900 dark:text-white">
                    {isOwnProfile ? (displayUser.followingCount || 0) : (userStats?.followings || 0)}
                  </div>
                  <div className="text-gray-600 dark:text-gray-400 text-sm">Following</div>
                </button>
              </div>

              {/* Mobile stats inline with avatar (already shown next to avatar) */}
              <div className="md:hidden flex items-center justify-around gap-4 mb-2">
                <button className="text-center" onClick={() => { try { const el = document.getElementById('profile-goals-section'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch { } }}>
                  <div className="text-xl font-bold text-gray-900 dark:text-white">{isOwnProfile ? (displayUser.totalGoals || 0) : (userStats?.totalGoals || 0)}</div>
                  <div className="text-gray-600 dark:text-gray-400 text-sm">Goals</div>
                </button>
                <button className="text-center" onClick={async () => { setFollowModalTab('followers'); setFollowModalOpen(true); setLoadingFollows(true); try { const uid = isOwnProfile ? currentUser?._id : (profileUser?._id || profileUser?.id); const res = await getFollowers(uid); if (res?.success) setFollowers(res.followers || []); } finally { setLoadingFollows(false); } }}>
                  <div className="text-xl font-bold text-gray-900 dark:text-white">{isOwnProfile ? (displayUser.followerCount || 0) : (userStats?.followers || 0)}</div>
                  <div className="text-gray-600 dark:text-gray-400 text-sm">Followers</div>
                </button>
                <button className="text-center" onClick={async () => { setFollowModalTab('following'); setFollowModalOpen(true); setLoadingFollows(true); try { const uid = isOwnProfile ? currentUser?._id : (profileUser?._id || profileUser?.id); const res = await getFollowing(uid); if (res?.success) setFollowing(res.following || []); } finally { setLoadingFollows(false); } }}>
                  <div className="text-xl font-bold text-gray-900 dark:text-white">{isOwnProfile ? (displayUser.followingCount || 0) : (userStats?.followings || 0)}</div>
                  <div className="text-gray-600 dark:text-gray-400 text-sm">Following</div>
                </button>
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

              {/* Goals Anchor for smooth scroll */}
              <div id="profile-goals-section" />

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

              {/* Follow List Modal */}
              <Suspense fallback={null}><FollowListModal
                isOpen={followModalOpen}
                onClose={() => setFollowModalOpen(false)}
                activeTab={followModalTab}
                onTabChange={async (tab) => {
                  setFollowModalTab(tab)
                  setLoadingFollows(true)
                  try {
                    const uid = isOwnProfile ? currentUser?._id : (profileUser?._id || profileUser?.id)
                    if (tab === 'followers') {
                      const res = await getFollowers(uid)
                      if (res?.success) setFollowers(res.followers || [])
                    } else {
                      const res = await getFollowing(uid)
                      if (res?.success) setFollowing(res.following || [])
                    }
                  } finally { setLoadingFollows(false) }
                }}
                followers={followers}
                following={following}
                followersCount={isOwnProfile ? (displayUser?.followerCount || 0) : (userStats?.followers || 0)}
                followingCount={isOwnProfile ? (displayUser?.followingCount || 0) : (userStats?.followings || 0)}
                loading={loadingFollows}
                onOpenProfile={(u) => {
                  try {
                    const path = u?.username ? `/profile/@${u.username}` : (`/profile/${u?._id || u?.id}`)
                    if (path) navigate(path)
                    setFollowModalOpen(false)
                  } catch { }
                }}
              /></Suspense>
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
              <div className={(isOwnProfile
                ? "bg-white dark:bg-gray-800"
                : "bg-white/80 dark:bg-gray-800/50 backdrop-blur-lg border border-gray-200 dark:border-gray-700/50") + " rounded-2xl p-2 shadow-lg flex overflow-x-auto whitespace-nowrap gap-1 no-scrollbar"}>
                <button
                  onClick={() => handleTabChange('overview')}
                  className={`flex items-center space-x-2 px-6 py-3 rounded-xl transition-all duration-200 shrink-0 ${activeTab === 'overview'
                    ? (isOwnProfile ? 'bg-primary-500 text-white shadow-lg' : 'bg-blue-500 text-white shadow-lg')
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                >
                  <User className="h-5 w-5" />
                  <span className="font-medium">Overview</span>
                </button>
                <button
                  onClick={() => handleTabChange('goals')}
                  className={`flex items-center space-x-2 px-6 py-3 rounded-xl transition-all duration-200 shrink-0 ${activeTab === 'goals'
                    ? (isOwnProfile ? 'bg-primary-500 text-white shadow-lg' : 'bg-blue-500 text-white shadow-lg')
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                >
                  <Target className="h-5 w-5" />
                  <span className="font-medium">Goals</span>
                </button>
                {isFeatureEnabled('journal') && isOwnProfile && <button
                  onClick={() => handleTabChange('journal')}
                  className={`flex items-center space-x-2 px-6 py-3 rounded-xl transition-all duration-200 shrink-0 ${activeTab === 'journal'
                    ? (isOwnProfile ? 'bg-primary-500 text-white shadow-lg' : 'bg-blue-500 text-white shadow-lg')
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                >
                  <BookOpen className="h-5 w-5" />
                  <span className="font-medium">Journal</span>
                </button>}
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
                        <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                          onClick={() => handleTabChange('goals')}
                        >
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
                  {/* Hobby Analytics (replaces Interests) */}
                  <div className={isOwnProfile
                    ? "bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg"
                    : "bg-white/80 dark:bg-gray-800/50 backdrop-blur-lg rounded-2xl p-6 border border-gray-200 dark:border-gray-700/50"
                  }>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
                      <TrendingUp className="h-6 w-6 mr-2 text-emerald-600 dark:text-emerald-400" />
                      Hobby Analytics
                    </h3>
                    {isProfileAccessible() ? (
                      <div className="space-y-4">
                        {/* Embed Habit Analytics inline (no nested card) */}
                        <HabitAnalyticsCard days={30} embedded />
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <div className="bg-gray-100 dark:bg-gray-700/50 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                          <Lock className="h-8 w-8 text-gray-600 dark:text-gray-400" />
                        </div>
                        <p className="text-gray-500 dark:text-gray-400">Analytics are private</p>
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
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 cursor-pointer">
                          {userGoals.filter(goal => !goal.completed).slice(0, 6).map((goal, index) => (
                            <div
                              key={goal._id}
                              className="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700/50"
                              onClick={() => setOpenGoalId(goal._id)}
                            >
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
                  {/* Removed bottom Habit Analytics block as requested */}
                </div>
              )}
              {activeTab === 'goals' && (
                <div id="profile-goals-section" className={isOwnProfile
                  ? "bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg"
                  : "bg-white/80 dark:bg-gray-800/50 backdrop-blur-lg rounded-2xl p-6 border border-gray-200 dark:border-gray-700/50"
                }>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
                    <Target className="h-6 w-6 mr-2 text-blue-600 dark:text-blue-400" />
                    {isOwnProfile ? 'All Goals' : 'Goals'}
                  </h3>
                  {isProfileAccessible() ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 cursor-pointer">
                      {userGoals.map((goal, index) => (
                        <motion.div
                          key={goal._id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.5, delay: 0.1 * index }}
                          onClick={() => setOpenGoalId(goal._id)}
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
              {activeTab === 'journal' && (
                <div className={isOwnProfile
                  ? "bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg"
                  : "bg-white/80 dark:bg-gray-800/50 backdrop-blur-lg rounded-2xl p-6 border border-gray-200 dark:border-gray-700/50"
                }>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
                      <BookOpen className="h-6 w-6 mr-2 text-indigo-600 dark:text-indigo-400" />
                      {isOwnProfile ? 'Your Journal' : 'Journal'}
                    </h3>
                    {isOwnProfile && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setExportOpen(true)}
                          className="px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 inline-flex items-center gap-2"
                          title="Export your journal"
                        >
                          <Download className="h-4 w-4" /> Export
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
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Journal</h4>
                      {journalFeed.length === 0 && !journalLoading && (
                        <div className="text-center py-10">
                          <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                          <p className="text-gray-600 dark:text-gray-400">No entries yet.</p>
                          {isOwnProfile && (
                            <button onClick={() => setIsJournalOpen(true)} disabled={hasTodayJournal} className={`mt-4 px-4 py-2 rounded-lg ${hasTodayJournal ? 'bg-gray-300 dark:bg-gray-700 text-gray-600 dark:text-gray-300 cursor-not-allowed' : 'bg-indigo-500 hover:bg-indigo-600 text-white'}`}>{hasTodayJournal ? 'Journal Submitted' : 'Write Your First Journal'}</button>
                          )}
                        </div>
                      )}
                      <div className="space-y-3 max-h-[520px] overflow-auto pr-1">
                        {journalFeed.map((e) => (
                          <button key={e._id} onClick={() => { setSelectedEntry(e); setEntryModalOpen(true); }} className="w-full text-left p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-gray-200 dark:border-gray-600/30 hover:bg-gray-100 dark:hover:bg-gray-700/40 transition-colors">
                            <div className="flex items-center justify-between mb-2 text-sm text-gray-500 dark:text-gray-400">
                              <span>{formatTimeAgo(e.createdAt)}</span>
                              <span className="inline-flex items-center gap-2">
                                <span className="px-2 py-0.5 rounded-full text-xs bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200">{e.visibility}</span>
                                <span className="px-2 py-0.5 rounded-full text-xs bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200">{e.mood?.replace('_', ' ') || 'neutral'}</span>
                              </span>
                            </div>
                            <p className="text-gray-800 dark:text-gray-200 line-clamp-2 mb-2">{e.content}</p>
                            {e?.ai?.motivation && (
                              <div className="p-3 bg-gradient-to-r from-indigo-50 to-sky-50 dark:from-indigo-900/10 dark:to-sky-900/10 border border-indigo-200/60 dark:border-indigo-800/40 rounded-lg text-sm text-indigo-800 dark:text-indigo-200 flex items-start gap-2">
                                <Sparkles className="h-4 w-4 mt-0.5 text-indigo-500" />
                                <span className="leading-relaxed">{e.ai.motivation}</span>
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                      <div className="flex items-center justify-center mt-4">
                        {journalHasMore ? (
                          <button onClick={loadMoreJournal} disabled={journalLoading} className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg border border-gray-200 dark:border-gray-600">
                            {journalLoading ? 'Loading…' : 'Load more'}
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
                await getMyJournalEntries({ limit: 10 });
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