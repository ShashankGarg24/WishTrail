import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, TrendingUp, Target, Calendar, BarChart3, LayoutGrid, X, Clock, CheckCircle, XCircle, SkipForward, Smile, Meh, Frown, Heart, ChevronDown, ChevronUp, Pencil, RefreshCw, Flame, Trophy
} from 'lucide-react';

const THEME_COLOR = '#4c99e6';
import { habitsAPI } from '../services/api';
import { usePremiumStatus } from '../hooks/usePremium';
import ExpandableText from '../components/ExpandableText';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function HabitAnalyticsPageNew() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isPremium } = usePremiumStatus();
  const maxDays = isPremium ? 365 : 60;
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(Math.min(90, maxDays));
  const [selectedDay, setSelectedDay] = useState(null);
  const heatmapRef = useRef(null);
  
  // Paginated logs state
  const [logs, setLogs] = useState([]);
  const [logsPage, setLogsPage] = useState(1);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsPagination, setLogsPagination] = useState(null);
  const [expandedLogIds, setExpandedLogIds] = useState(new Set());

  useEffect(() => {
    loadAnalytics();
    loadLogs(1); // Load first page of logs
  }, [id, days]);
  
  const loadLogs = async (page = 1) => {
    try {
      setLogsLoading(true);
      const response = await habitsAPI.logs(id, { page, limit: 20 });
      if (response.data?.success) {
        if (page === 1) {
          setLogs(response.data.data.logs);
        } else {
          setLogs(prev => [...prev, ...response.data.data.logs]);
        }
        setLogsPagination(response.data.data.pagination);
        setLogsPage(page);
      }
    } catch (err) {
      window.dispatchEvent(new CustomEvent('wt_toast', {
        detail: { message: err.message || 'Failed to load logs', type: 'error' }
      }));
    } finally {
      setLogsLoading(false);
    }
  };
  
  const loadMoreLogs = () => {
    if (logsPagination && logsPagination.hasMore && !logsLoading) {
      loadLogs(logsPage + 1);
    }
  };
  
  const toggleLogExpanded = (logId) => {
    setExpandedLogIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(logId)) {
        newSet.delete(logId);
      } else {
        newSet.add(logId);
      }
      return newSet;
    });
  };

  // Close popup when clicking outside - must be before early returns
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (heatmapRef.current && !heatmapRef.current.contains(event.target)) {
        setSelectedDay(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const response = await habitsAPI.analytics(id, { days });
      if (response.data?.success) {
        setAnalytics(response.data.data.analytics);
      } else {
        window.dispatchEvent(new CustomEvent('wt_toast', {
          detail: { message: 'Failed to load analytics', type: 'error' }
        }));
      }
    } catch (err) {
      window.dispatchEvent(new CustomEvent('wt_toast', {
        detail: { message: err.message || 'Failed to load analytics', type: 'error' }
      }));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 font-manrope" style={{ fontFamily: 'Manrope, ui-sans-serif, system-ui' }}>
        <div className="max-w-7xl mx-auto">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mt-20" style={{ borderColor: THEME_COLOR }} />
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 font-manrope" style={{ fontFamily: 'Manrope, ui-sans-serif, system-ui' }}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-20">
            <p className="text-gray-600 dark:text-gray-400 mb-4">Analytics not found</p>
            <button
              onClick={() => navigate(-1)}
              className="px-4 py-2 text-white rounded-lg transition-colors"
              style={{ backgroundColor: THEME_COLOR }}
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { habit, stats, consistency, statusCounts, timeline, weeklyData } = analytics;

  // Calculate expected occurrences based on habit frequency and date range
  const calculateExpectedOccurrences = () => {
    const daysInRange = days || 90;
    
    if (habit.frequency === 'daily') {
      return daysInRange;
    } else if (habit.frequency === 'weekly' && Array.isArray(habit.daysOfWeek) && habit.daysOfWeek.length > 0) {
      const scheduledDaysPerWeek = habit.daysOfWeek.length;
      const fullWeeks = Math.floor(daysInRange / 7);
      const remainingDays = daysInRange % 7;
      
      let expected = fullWeeks * scheduledDaysPerWeek;
      
      const today = new Date();
      for (let i = 0; i < remainingDays; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - (daysInRange - 1) + i);
        const dayOfWeek = date.getDay();
        if (habit.daysOfWeek.includes(dayOfWeek)) {
          expected++;
        }
      }
      
      return expected;
    } else {
      return Math.ceil(daysInRange / 7);
    }
  };

  const expectedOccurrences = calculateExpectedOccurrences();
  const activeDays = statusCounts.done;
  const skippedDays = statusCounts.skipped;
  
  const expectedDaysAdjusted = Math.max(0, expectedOccurrences - skippedDays);
  const completionRate = expectedDaysAdjusted > 0 
    ? Math.round((activeDays / expectedDaysAdjusted) * 100) 
    : 0;

  // Calculate streaks from timeline
  const currentStreak = stats?.currentStreak || 0;
  const longestStreak = stats?.longestStreak || 0;

  // Chart configurations - theme color #4c99e6 = rgb(76, 153, 230)
  const themeRgb = '76, 153, 230';
  const statusChartData = {
    labels: ['Completed', 'Skipped', 'Missed'],
    datasets: [{
      data: [statusCounts.done, statusCounts.skipped, statusCounts.missed],
      backgroundColor: [
        `rgba(${themeRgb}, 0.9)`,
        'rgba(107, 114, 128, 0.7)',
        'rgba(209, 213, 219, 0.7)'
      ],
      borderColor: [
        `rgb(${themeRgb})`,
        'rgb(107, 114, 128)',
        'rgb(209, 213, 219)'
      ],
      borderWidth: 2
    }]
  };

  const statusChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          padding: 15,
          font: { size: 12 },
          color: document.documentElement.classList.contains('dark') ? '#e5e7eb' : '#374151'
        }
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const label = context.label || '';
            const value = context.parsed || 0;
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
            return `${label}: ${value} (${percentage}%)`;
          }
        }
      }
    }
  };

  // Create weekly data for charts from backend weeklyData
  const createWeeklyDataForCharts = () => {
    const weeklyCompletions = [];
    const weeklyActiveDays = [];
    const weeklyExpected = [];
    const weeklySkipped = [];
    const weeklyMissed = [];
    const weekLabels = [];
    const weekRanges = [];
    
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // Use backend weeklyData if available, otherwise fallback to local calculation
    if (weeklyData && weeklyData.length > 0) {
      weeklyData.forEach(week => {
        weeklyCompletions.push(week.completions || 0);
        weeklyActiveDays.push(week.activeDays || 0);
        weeklyExpected.push(week.expectedDays || 7);
        weeklySkipped.push(week.skippedDays || 0);
        weeklyMissed.push(week.missedDays || 0);
        
        // Parse dates for labels
        const startDate = new Date(week.weekStart);
        const endDate = new Date(week.weekEnd);
        const startLabel = `${monthNames[startDate.getMonth()]} ${startDate.getDate()}`;
        const endLabel = `${monthNames[endDate.getMonth()]} ${endDate.getDate()}`;
        weekLabels.push(startLabel);
        weekRanges.push({
          start: startLabel,
          end: endLabel,
          fullRange: `${startLabel} - ${endLabel}`
        });
      });
    } else {
      // Fallback: calculate locally from timeline
      const weeksToShow = Math.min(12, Math.ceil((days || 90) / 7));
      
      for (let weekIdx = weeksToShow - 1; weekIdx >= 0; weekIdx--) {
        const weekEnd = new Date();
        weekEnd.setDate(weekEnd.getDate() - (weekIdx * 7));
        const weekStart = new Date(weekEnd);
        weekStart.setDate(weekStart.getDate() - 6);
        
        const weekStartKey = weekStart.toISOString().split('T')[0];
        const weekEndKey = weekEnd.toISOString().split('T')[0];
        
        const doneLogs = timeline.filter(entry => 
          entry.status === 'done' && entry.date >= weekStartKey && entry.date <= weekEndKey
        );
        const weekCompletions = doneLogs.length;
        const activeDays = new Set(doneLogs.map(e => e.date)).size;
        
        const skippedLogs = timeline.filter(entry => 
          entry.status === 'skipped' && entry.date >= weekStartKey && entry.date <= weekEndKey
        );
        const skippedDays = new Set(skippedLogs.map(e => e.date)).size;
        
        let expectedThisWeek = 0;
        if (habit.frequency === 'daily') {
          expectedThisWeek = 7;
        } else if (habit.frequency === 'weekly' && Array.isArray(habit.daysOfWeek)) {
          expectedThisWeek = habit.daysOfWeek.length;
        } else {
          expectedThisWeek = 1;
        }
        
        const missedDays = Math.max(0, expectedThisWeek - activeDays - skippedDays);
        
        weeklyCompletions.push(weekCompletions);
        weeklyActiveDays.push(activeDays);
        weeklyExpected.push(expectedThisWeek);
        weeklySkipped.push(skippedDays);
        weeklyMissed.push(missedDays);
        
        const startLabel = `${monthNames[weekStart.getMonth()]} ${weekStart.getDate()}`;
        const endLabel = `${monthNames[weekEnd.getMonth()]} ${weekEnd.getDate()}`;
        weekLabels.push(startLabel);
        weekRanges.push({
          start: startLabel,
          end: endLabel,
          fullRange: `${startLabel} - ${endLabel}`
        });
      }
    }
    
    return { weeklyCompletions, weeklyActiveDays, weeklyExpected, weeklySkipped, weeklyMissed, weekLabels, weekRanges };
  };

  const { weeklyCompletions, weeklyActiveDays, weeklyExpected, weeklySkipped, weeklyMissed, weekLabels, weekRanges } = createWeeklyDataForCharts();

  // Calculate remaining (expected - active - skipped) for each week
  const weeklyRemaining = weeklyExpected.map((expected, idx) => {
    const remaining = expected - weeklyActiveDays[idx] - weeklySkipped[idx];
    return Math.max(0, remaining); // Ensure non-negative
  });

  const weeklyChartData = {
    labels: weekLabels,
    datasets: [
      {
        label: 'Active Days',
        data: weeklyActiveDays,
        backgroundColor: `rgba(${themeRgb}, 0.85)`,
        borderColor: `rgb(${themeRgb})`,
        borderWidth: 0,
        borderRadius: 0,
        stack: 'stack1'
      },
      {
        label: 'Skipped',
        data: weeklySkipped,
        backgroundColor: 'rgba(107, 114, 128, 0.6)',
        borderColor: 'rgb(107, 114, 128)',
        borderWidth: 0,
        borderRadius: 0,
        stack: 'stack1'
      },
      {
        label: 'Remaining',
        data: weeklyRemaining,
        backgroundColor: 'rgba(209, 213, 219, 0.5)',
        borderColor: 'rgb(209, 213, 219)',
        borderWidth: 0,
        borderRadius: 4,
        stack: 'stack1'
      }
    ]
  };

  const weeklyChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        mode: 'index',
        callbacks: {
          title: (context) => {
            const idx = context[0].dataIndex;
            return weekRanges[idx]?.fullRange || '';
          },
          label: (context) => {
            const idx = context.dataIndex;
            const label = context.dataset.label || '';
            const value = context.parsed.y || 0;
            // Show "Expected" instead of "Remaining" in tooltip
            if (label === 'Remaining') {
              return `Expected Days: ${weeklyExpected[idx]}`;
            }
            return `${label}: ${value}`;
          },
          footer: (context) => {
            const idx = context[0].dataIndex;
            return `Total Completions: ${weeklyCompletions[idx]}`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        stacked: true,
        ticks: {
          stepSize: 1,
          color: document.documentElement.classList.contains('dark') ? '#9ca3af' : '#6b7280'
        },
        grid: {
          color: document.documentElement.classList.contains('dark') ? 'rgba(75, 85, 99, 0.3)' : 'rgba(229, 231, 235, 0.8)'
        }
      },
      x: {
        stacked: true,
        ticks: {
          color: document.documentElement.classList.contains('dark') ? '#9ca3af' : '#6b7280'
        },
        grid: { display: false }
      }
    }
  };

  const weeklyTrendData = {
    labels: weekLabels,
    datasets: [{
      label: 'Completions',
      data: weeklyCompletions,
      borderColor: THEME_COLOR,
      backgroundColor: `rgba(${themeRgb}, 0.12)`,
      borderWidth: 3,
      fill: true,
      tension: 0.4,
      pointRadius: 4,
      pointHoverRadius: 6,
      pointBackgroundColor: '#fff',
      pointBorderColor: THEME_COLOR,
      pointBorderWidth: 2
    }]
  };

  const weeklyTrendOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          title: (context) => {
            const idx = context[0].dataIndex;
            return weekRanges[idx]?.fullRange || '';
          },
          label: (context) => {
            const value = context.parsed.y || 0;
            return `Completed: ${value}`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1,
          color: document.documentElement.classList.contains('dark') ? '#9ca3af' : '#6b7280',
          callback: function(value) {
            if (Number.isInteger(value)) {
              return value;
            }
          }
        },
        grid: {
          color: document.documentElement.classList.contains('dark') ? 'rgba(75, 85, 99, 0.3)' : 'rgba(229, 231, 235, 0.8)'
        }
      },
      x: {
        ticks: {
          color: document.documentElement.classList.contains('dark') ? '#9ca3af' : '#6b7280'
        },
        grid: { display: false }
      }
    }
  };

  // Create heatmap data with completion counts
  const createHeatmapData = () => {
    const map = {};
    
    // Build map from timeline (timeline is an array from backend)
    const timelineArr = Array.isArray(timeline) ? timeline : Object.values(timeline || {});
    timelineArr.forEach(entry => {
      map[entry.date] = {
        status: entry.status,
        completionCount: entry.completionCount || 0,
        completionTimesMood: entry.completionTimesMood || [],
        mood: entry.mood,
        note: entry.note
      };
    });

    // Find the latest date from timeline (backend already converted to user timezone)
    // If no timeline data, use current date
    let latestDate;
    if (timelineArr.length > 0) {
      const latestDateStr = timelineArr.reduce((max, entry) => 
        entry.date > max ? entry.date : max, 
        timelineArr[0].date
      );
      latestDate = new Date(latestDateStr + 'T12:00:00Z'); // Use noon UTC to avoid timezone issues
    } else {
      latestDate = new Date();
    }
    
    const totalDaysToShow = days || 90;
    const daysArray = [];
    
    for (let i = totalDaysToShow - 1; i >= 0; i--) {
      const date = new Date(latestDate);
      date.setUTCDate(date.getUTCDate() - i);
      const dateKey = date.toISOString().split('T')[0];
      const dayData = map[dateKey] || { status: 'none', completionCount: 0 };
      daysArray.push({
        date: dateKey,
        status: dayData.status,
        completionCount: dayData.completionCount,
        completionTimesMood: dayData.completionTimesMood || [],
        mood: dayData.mood,
        note: dayData.note,
        day: date.getUTCDate(),
        month: date.getUTCMonth(),
        year: date.getUTCFullYear(),
        dayOfWeek: date.getUTCDay()
      });
    }
    return daysArray;
  };

  const heatmapDays = createHeatmapData();
  
  // Group by months for display
  const groupByMonth = () => {
    const months = [];
    let currentMonth = null;
    let currentMonthData = { weeks: [], label: '', year: 0 };
    let currentWeek = [];
    
    heatmapDays.forEach((day, idx) => {
      const monthKey = `${day.year}-${day.month}`;
      
      if (currentMonth !== monthKey) {
        // Save previous month if exists
        if (currentMonth !== null) {
          if (currentWeek.length > 0) {
            currentMonthData.weeks.push(currentWeek);
          }
          months.push(currentMonthData);
        }
        // Start new month
        currentMonth = monthKey;
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        currentMonthData = {
          weeks: [],
          label: monthNames[day.month],
          year: day.year,
          month: day.month
        };
        currentWeek = [];
      }
      
      currentWeek.push(day);
      
      // Start new week on Sunday (dayOfWeek === 0) or after 7 days
      if (day.dayOfWeek === 6 || idx === heatmapDays.length - 1) {
        if (currentWeek.length > 0) {
          currentMonthData.weeks.push(currentWeek);
          currentWeek = [];
        }
      }
    });
    
    // Don't forget the last month
    if (currentWeek.length > 0) {
      currentMonthData.weeks.push(currentWeek);
    }
    if (currentMonthData.weeks.length > 0) {
      months.push(currentMonthData);
    }
    
    return months;
  };
  
  const heatmapMonths = groupByMonth();

  const getHeatmapColor = (day) => {
    if (day.status === 'skipped') return 'bg-amber-400 dark:bg-amber-500';
    if (day.status !== 'done' || day.completionCount === 0) return 'bg-gray-200 dark:bg-gray-700';
    return '';
  };
  const getHeatmapStyle = (day) => {
    if (day.status === 'skipped' || day.status !== 'done' || day.completionCount === 0) return {};
    const count = day.completionCount;
    const opacity = count >= 5 ? 1 : count >= 4 ? 0.9 : count >= 3 ? 0.75 : count >= 2 ? 0.55 : 0.35;
    return { backgroundColor: THEME_COLOR, opacity };
  };

  // Format time for display
  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Format date for display
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Handle day click/tap
  const handleDayClick = (day, event) => {
    event.stopPropagation();
    setSelectedDay(selectedDay?.date === day.date ? null : day);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 pb-16 font-manrope" style={{ fontFamily: 'Manrope, ui-sans-serif, system-ui' }}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-5">
          <button
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors mb-3"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Habits
          </button>
          
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4 rounded-xl shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                  {habit.name}
                </h1>
                {habit.description && (
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    <ExpandableText text={habit.description} maxLength={200} className="text-sm text-gray-600 dark:text-gray-400" />
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="flex flex-col">
                  <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Timeframe</span>
                  <select
                    value={days}
                    onChange={(e) => setDays(Math.min(Number(e.target.value), maxDays))}
                    className="mt-0.5 px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#4c99e6]"
                  >
                    <option value={30}>Last 30 days</option>
                    <option value={60}>Last 60 days</option>
                    {isPremium && <option value={90}>Last 90 days</option>}
                    {isPremium && <option value={180}>Last 6 months</option>}
                    {isPremium && <option value={365}>Last year</option>}
                  </select>
                </div>            
              </div>
            </div>
          </div>
        </div>

        {/* Key Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          {habit.targetCompletions && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 rounded-lg text-white" style={{ backgroundColor: THEME_COLOR }}>
                  <Target className="w-4 h-4" />
                </div>
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Target Progress</span>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats?.totalCompletions || 0}/{habit.targetCompletions}
              </p>
              <div className="mt-2 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${Math.min(100, ((stats?.totalCompletions || 0) / habit.targetCompletions) * 100)}%`, backgroundColor: THEME_COLOR }} />
              </div>
              <p className="text-xs mt-1" style={{ color: THEME_COLOR }}>{Math.round(((stats?.totalCompletions || 0) / habit.targetCompletions) * 100)}%</p>
            </motion.div>
          )}
          {habit.targetDays && !habit.targetCompletions && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 rounded-lg text-white" style={{ backgroundColor: THEME_COLOR }}>
                  <Target className="w-4 h-4" />
                </div>
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Target Progress</span>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats?.totalDays || 0}/{habit.targetDays}
              </p>
              <p className="text-xs mt-1" style={{ color: THEME_COLOR }}>{Math.round(((stats?.totalDays || 0) / habit.targetDays) * 100)}%</p>
            </motion.div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-lg text-white" style={{ backgroundColor: THEME_COLOR }}>
                <Calendar className="w-4 h-4" />
              </div>
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Active Days</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{activeDays}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">days this month</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-lg text-white" style={{ backgroundColor: THEME_COLOR }}>
                <TrendingUp className="w-4 h-4" />
              </div>
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Completion Rate</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{completionRate}%</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">avg. consistency · Targeting 95% overall</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-lg text-orange-500">
                <Flame className="w-4 h-4" />
              </div>
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Current Streak</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{currentStreak}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">days in a row</p>
            {longestStreak > 0 && (
              <span className="inline-flex items-center gap-1 mt-2 text-xs px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200">
                <Trophy className="w-3.5 h-3.5" /> Personal best: {longestStreak} days
              </span>
            )}
          </motion.div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
          {/* Activity Trends */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm"
          >
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" style={{ color: THEME_COLOR }} />
              Activity Trends
            </h3>
            <div className="flex items-center gap-2 mb-2 text-xs text-gray-500 dark:text-gray-400">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: THEME_COLOR }} />
              <span>Completions</span>
            </div>
            <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
              <div className="h-48 sm:h-56" style={{ minWidth: weekLabels.length > 6 ? `${Math.max(weekLabels.length * 50, 300)}px` : '100%' }}>
                <Line data={weeklyTrendData} options={weeklyTrendOptions} />
              </div>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
              {weekLabels[0]} to {weekLabels[weekLabels.length - 1]}
            </div>
          </motion.div>

          {/* Status Distribution */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm"
          >
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <RefreshCw className="w-4 h-4" style={{ color: THEME_COLOR }} />
              Status Distribution
            </h3>
            <div className="h-56">
              <Doughnut data={statusChartData} options={statusChartOptions} />
            </div>
          </motion.div>
        </div>

        {/* Activity Breakdown + Heatmap side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
          {/* Activity Breakdown */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm"
          >
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <BarChart3 className="w-4 h-4" style={{ color: THEME_COLOR }} />
              Activity Breakdown
            </h3>
            <div className="flex flex-wrap items-center gap-3 mb-3 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: THEME_COLOR }} />
                <span className="text-gray-600 dark:text-gray-400">Completions</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-gray-400" />
                <span className="text-gray-600 dark:text-gray-400">Skips</span>
              </div>
            </div>
            <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
              <div className="h-48 sm:h-56" style={{ minWidth: weekLabels.length > 6 ? `${Math.max(weekLabels.length * 60, 300)}px` : '100%' }}>
                <Bar data={weeklyChartData} options={weeklyChartOptions} />
              </div>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
              {weekLabels[0]} to {weekLabels[weekLabels.length - 1]}
            </div>
          </motion.div>

          {/* Activity Heatmap */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65 }}
            className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm relative"
            ref={heatmapRef}
          >
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <LayoutGrid className="w-4 h-4" style={{ color: THEME_COLOR }} />
              Activity Heatmap
            </h3>
            <div className="flex items-center gap-2 mb-2 text-xs text-gray-500 dark:text-gray-400">
              <span>Less</span>
              <div className="flex-1 h-2 rounded-full overflow-hidden flex">
                <div className="flex-1" style={{ backgroundColor: 'rgba(76, 153, 230, 0.25)' }} />
                <div className="flex-1" style={{ backgroundColor: 'rgba(76, 153, 230, 0.5)' }} />
                <div className="flex-1" style={{ backgroundColor: 'rgba(76, 153, 230, 0.75)' }} />
                <div className="flex-1" style={{ backgroundColor: THEME_COLOR }} />
              </div>
              <span>More</span>
            </div>
          
          {/* Heatmap grid grouped by month */}
          <div className="overflow-x-auto relative">
            <div className="inline-flex gap-3">
              {heatmapMonths.map((month, monthIdx) => (
                <div key={monthIdx} className="flex flex-col">
                  {/* Month label */}
                  <div className="text-[10px] font-medium text-gray-600 dark:text-gray-400 mb-1 text-center">
                    {month.label} {month.year !== new Date().getFullYear() ? `'${String(month.year).slice(-2)}` : ''}
                  </div>
                  {/* Weeks in this month */}
                  <div className="flex gap-0.5">
                    {month.weeks.map((week, weekIdx) => (
                      <div key={weekIdx} className="flex flex-col gap-0.5">
                        {/* Pad the first week with empty cells if needed */}
                        {weekIdx === 0 && week[0]?.dayOfWeek > 0 && 
                          Array.from({ length: week[0].dayOfWeek }).map((_, i) => (
                            <div key={`empty-${i}`} className="w-3 h-3" />
                          ))
                        }
                        {week.map((day, dayIdx) => (
                          <div
                            key={dayIdx}
                            onClick={(e) => handleDayClick(day, e)}
                            className={`w-3 h-3 rounded-sm ${getHeatmapColor(day)} cursor-pointer hover:ring-2 hover:ring-offset-1 transition-all`}
                            style={getHeatmapStyle(day)}
                            title={`${day.date} - ${day.completionCount} completion${day.completionCount !== 1 ? 's' : ''}`}
                          />
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Selected Day Popup Card - positioned over heatmap */}
          <AnimatePresence>
            {selectedDay && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="absolute inset-0 flex items-center justify-center z-10"
                onClick={() => setSelectedDay(null)}
              >
                <div 
                  className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-3"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => setSelectedDay(null)}
                    className="absolute -top-2 -right-2 p-1 bg-gray-100 dark:bg-gray-700 rounded-full text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 shadow-sm"
                  >
                    <X className="w-3 h-3" />
                  </button>
                  
                  <div className="text-sm font-semibold text-gray-900 dark:text-white mb-2 pr-4">
                    {formatDate(selectedDay.date)}
                  </div>
                  
                  {/* Status */}
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`w-3 h-3 rounded-sm ${getHeatmapColor(selectedDay)}`} style={getHeatmapStyle(selectedDay)} />
                    <span className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                      {selectedDay.status === 'none' ? 'No Activity' : selectedDay.status}
                    </span>
                  </div>
                  
                  {/* Completion count - only show if done */}
                  {selectedDay.status === 'done' && selectedDay.completionCount > 0 && (
                    <div className="text-sm text-gray-700 dark:text-gray-300">
                      Completions: <span className="font-medium text-green-600 dark:text-green-400">{selectedDay.completionCount}</span>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Legend */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-4 text-xs text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-gray-200 dark:bg-gray-700" />
              <span>No Activity</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-amber-400 dark:bg-amber-500" />
              <span>Skipped</span>
            </div>
            <div className="flex items-center gap-0.5">
              <span className="mr-1">Completions:</span>
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: THEME_COLOR, opacity: 0.35 }} title="1" />
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: THEME_COLOR, opacity: 0.55 }} title="2" />
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: THEME_COLOR, opacity: 0.75 }} title="3" />
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: THEME_COLOR, opacity: 0.9 }} title="4" />
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: THEME_COLOR }} title="5+" />
            </div>
          </div>
        </motion.div>
        </div>

        {/* Habit Logs List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.5 }}
          className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Calendar className="h-6 w-6" style={{ color: THEME_COLOR }} />
              Daily Logs
            </h3>
            {logsPagination && (
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {logsPagination.total} total logs
              </span>
            )}
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {logs && logs.length > 0 ? (
              <>
                {logs.map((log, idx) => {
                const statusColors = {
                  done: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
                  skipped: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
                  missed: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
                  none: 'bg-gray-50 dark:bg-gray-800/40 border-gray-200 dark:border-gray-700'
                };

                const statusIcons = {
                  done: <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />,
                  skipped: <SkipForward className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />,
                  missed: <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                };

                const moodIcons = {
                  great: { icon: <Heart className="h-4 w-4 text-pink-600 dark:text-pink-400" />, label: 'Great', color: 'text-pink-600 dark:text-pink-400' },
                  good: { icon: <Smile className="h-4 w-4 text-green-600 dark:text-green-400" />, label: 'Good', color: 'text-green-600 dark:text-green-400' },
                  okay: { icon: <Meh className="h-4 w-4 text-blue-600 dark:text-blue-400" />, label: 'Okay', color: 'text-blue-600 dark:text-blue-400' },
                  neutral: { icon: <Meh className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />, label: 'Neutral', color: 'text-yellow-600 dark:text-yellow-400' },
                  challenging: { icon: <Frown className="h-4 w-4 text-orange-600 dark:text-orange-400" />, label: 'Challenging', color: 'text-orange-600 dark:text-orange-400' }
                };

                const formatDate = (dateStr) => {
                  const date = new Date(dateStr + 'T12:00:00Z');
                  const today = new Date();
                  const yesterday = new Date(today);
                  yesterday.setDate(yesterday.getDate() - 1);
                  
                  const dateKey = date.toISOString().split('T')[0];
                  const todayKey = today.toISOString().split('T')[0];
                  const yesterdayKey = yesterday.toISOString().split('T')[0];
                  
                  if (dateKey === todayKey) return 'Today';
                  if (dateKey === yesterdayKey) return 'Yesterday';
                  
                  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                };

                const formatTime = (timestamp) => {
                  if (!timestamp) return '';
                  const date = new Date(timestamp);
                  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                };
                
                const averageMoodData = log.averageMood ? moodIcons[log.averageMood] : null;
                  const isExpanded = expandedLogIds.has(log.id);

                  return (
                    <div
                      key={log.id || idx}
                      className={`p-4 rounded-xl border transition-all hover:shadow-md ${statusColors[log.status] || statusColors.none}`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        {/* Left: Date and Status */}
                        <div className="flex items-start gap-3 flex-1">
                          <div className="flex-shrink-0 mt-1">
                            {statusIcons[log.status]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="font-semibold text-gray-900 dark:text-white">
                                {formatDate(log.dateKey)}
                              </span>
                              <span className="text-xs px-2 py-0.5 rounded-full bg-white dark:bg-gray-900/50 text-gray-600 dark:text-gray-400 capitalize font-medium">
                                {log.status}
                              </span>
                              {/* Average Mood Badge */}
                              {averageMoodData && log.completionCount > 0 && (
                                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700">
                                  {averageMoodData.icon}
                                  <span className={`text-xs font-medium ${averageMoodData.color}`}>
                                    Avg: {averageMoodData.label}
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Completion details */}
                            {log.status === 'done' && (
                              <div className="space-y-2 mt-2">
                                {/* Completion count with expand button */}
                                {log.completionCount > 0 && (
                                  <button
                                    onClick={() => toggleLogExpanded(log.id)}
                                    className="flex items-center gap-2 text-sm hover:bg-white/50 dark:hover:bg-gray-900/50 rounded-lg p-1 -ml-1 transition-colors group w-full text-left"
                                  >
                                    <CheckCircle className="h-3.5 w-3.5 text-green-600 dark:text-green-400 flex-shrink-0" />
                                    <span className="text-gray-700 dark:text-gray-300 flex-1">
                                      <span className="font-semibold">{log.completionCount}</span> completion{log.completionCount !== 1 ? 's' : ''}
                                    </span>
                                    {log.completionTimesMood && log.completionTimesMood.length > 0 && (
                                      <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                                        <Clock className="h-3 w-3" />
                                        <span className="group-hover:text-primary-600 dark:group-hover:text-primary-400">
                                          {isExpanded ? 'Hide' : 'Show'} times
                                        </span>
                                        {isExpanded ? (
                                          <ChevronUp className="h-3.5 w-3.5" />
                                        ) : (
                                          <ChevronDown className="h-3.5 w-3.5" />
                                        )}
                                      </div>
                                    )}
                                  </button>
                                )}

                                {/* Completion times - Collapsible */}
                                <AnimatePresence>
                                  {isExpanded && log.completionTimesMood && log.completionTimesMood.length > 0 && (
                                    <motion.div
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: 'auto', opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
                                      transition={{ duration: 0.2 }}
                                      className="space-y-2 overflow-hidden"
                                    >
                                      {log.completionTimesMood.map((completion, timeIdx) => {
                                        const timestamp = completion.timestamp || completion;
                                        const mood = completion.mood || 'neutral';
                                        const moodData = moodIcons[mood];
                                        
                                        return (
                                          <div key={timeIdx} className="flex items-center gap-3 p-2 rounded-lg bg-white/50 dark:bg-gray-900/30 ml-6">
                                            <Clock className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                                            <span className="px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium">
                                              {formatTime(timestamp)}
                                            </span>
                                            {moodData && (
                                              <div className="flex items-center gap-1.5">
                                                {moodData.icon}
                                                <span className={`text-xs font-medium ${moodData.color}`}>
                                                  {moodData.label}
                                                </span>
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              {/* Note */}
                              {log.note && (
                                <div className="mt-2 p-2 rounded-lg bg-white/50 dark:bg-gray-900/30">
                                  <p className="text-sm text-gray-600 dark:text-gray-400 italic">
                                    "{log.note}"
                                  </p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {/* Load More Button */}
              {logsPagination && logsPagination.hasMore && (
                <button
                  onClick={loadMoreLogs}
                  disabled={logsLoading}
                  className="w-full py-3 mt-4 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-[#4c99e6] hover:text-[#4c99e6] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {logsLoading ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-500" />
                      Loading...
                    </div>
                  ) : (
                    `Load More (${logsPagination.total - logs.length} remaining)`
                  )}
                </button>
              )}
            </>
            ) : logsLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto" />
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No log data available</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
