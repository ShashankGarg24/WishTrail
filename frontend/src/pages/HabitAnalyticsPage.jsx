import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, TrendingUp, Target, Calendar, BarChart3, Activity, X
} from 'lucide-react';
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

export default function HabitAnalyticsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isPremium } = usePremiumStatus();
  const maxDays = isPremium ? 365 : 60;
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(Math.min(90, maxDays));
  const [selectedDay, setSelectedDay] = useState(null);
  const heatmapRef = useRef(null);

  useEffect(() => {
    loadAnalytics();
  }, [id, days]);

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
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mt-20" />
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-20">
            <p className="text-gray-600 dark:text-gray-400 mb-4">Analytics not found</p>
            <button
              onClick={() => navigate(-1)}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
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

  // Chart configurations
  // Status distribution doughnut
  const statusChartData = {
    labels: ['Completed', 'Missed', 'Skipped'],
    datasets: [{
      data: [statusCounts.done, statusCounts.missed, statusCounts.skipped],
      backgroundColor: [
        'rgba(34, 197, 94, 0.8)',
        'rgba(239, 68, 68, 0.8)',
        'rgba(251, 191, 36, 0.8)'
      ],
      borderColor: [
        'rgb(34, 197, 94)',
        'rgb(239, 68, 68)',
        'rgb(251, 191, 36)'
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

  // Weekly breakdown bar chart - stacked bars showing days (Active + Skipped + Remaining = Expected)
  const weeklyChartData = {
    labels: weekLabels,
    datasets: [
      {
        label: 'Active Days',
        data: weeklyActiveDays,
        backgroundColor: 'rgba(34, 197, 94, 0.8)',
        borderColor: 'rgb(34, 197, 94)',
        borderWidth: 0,
        borderRadius: 0,
        stack: 'stack1'
      },
      {
        label: 'Skipped',
        data: weeklySkipped,
        backgroundColor: 'rgba(251, 191, 36, 0.8)',
        borderColor: 'rgb(251, 191, 36)',
        borderWidth: 0,
        borderRadius: 0,
        stack: 'stack1'
      },
      {
        label: 'Remaining',
        data: weeklyRemaining,
        backgroundColor: 'rgba(156, 163, 175, 0.5)',
        borderColor: 'rgb(156, 163, 175)',
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

  // Weekly trend line chart (Activity Trends - shows total completed per week)
  const weeklyTrendData = {
    labels: weekLabels,
    datasets: [{
      label: 'Completed',
      data: weeklyCompletions,
      borderColor: 'rgb(99, 102, 241)',
      backgroundColor: 'rgba(99, 102, 241, 0.1)',
      borderWidth: 3,
      fill: true,
      tension: 0.4,
      pointRadius: 4,
      pointHoverRadius: 6,
      pointBackgroundColor: 'rgb(99, 102, 241)',
      pointBorderColor: '#fff',
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
        completionTimes: entry.completionTimes || [],
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
        completionTimes: dayData.completionTimes || [],
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

  // Get color intensity based on completion count
  const getHeatmapColor = (day) => {
    if (day.status === 'skipped') return 'bg-amber-400 dark:bg-amber-500';
    if (day.status !== 'done' || day.completionCount === 0) return 'bg-gray-200 dark:bg-gray-700';
    
    // Different shades based on completions
    const count = day.completionCount;
    if (count >= 5) return 'bg-green-700 dark:bg-green-500';
    if (count >= 4) return 'bg-green-600 dark:bg-green-400';
    if (count >= 3) return 'bg-green-500 dark:bg-green-400';
    if (count >= 2) return 'bg-green-400 dark:bg-green-500/80';
    return 'bg-green-300 dark:bg-green-600/70';
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4 pb-16">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-5">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors mb-3"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          
          <div className="glass-card-hover p-4 rounded-xl">
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-1.5">
                {habit.name}
              </h1>
              {habit.description && (
                <div className="mb-2">
                  <ExpandableText
                    text={habit.description}
                    maxLength={200}
                    className="text-sm text-gray-600 dark:text-gray-400"
                  />
                </div>
              )}
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-500">
                  Created {new Date(habit.createdAt).toLocaleDateString()}
                </p>
                
                <select
                  value={days}
                  onChange={(e) => {
                    const newDays = Number(e.target.value);
                    setDays(Math.min(newDays, maxDays));
                  }}
                  className="px-3 py-1.5 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
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

        {/* Key Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          {/* Target Progress - Count Based */}
          {habit.targetCompletions && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/20 dark:to-indigo-800/20 rounded-lg p-3 shadow-sm border border-indigo-200 dark:border-indigo-800"
            >
              <div className="flex items-center gap-2 mb-1.5">
                <div className="p-1.5 bg-indigo-500 rounded-lg">
                  <Target className="w-4 h-4 text-white" />
                </div>
                <span className="text-xs font-medium text-indigo-900 dark:text-indigo-300">Target Progress</span>
              </div>
              <p className="text-xl font-bold text-indigo-900 dark:text-white">
                {stats?.totalCompletions || 0}/{habit.targetCompletions}
              </p>
              <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1">
                {Math.round(((stats?.totalCompletions || 0) / habit.targetCompletions) * 100)}% to goal
              </p>
            </motion.div>
          )}

          {/* Target Progress - Days Based */}
          {habit.targetDays && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/20 dark:to-indigo-800/20 rounded-lg p-3 shadow-sm border border-indigo-200 dark:border-indigo-800"
            >
              <div className="flex items-center gap-2 mb-1.5">
                <div className="p-1.5 bg-indigo-500 rounded-lg">
                  <Target className="w-4 h-4 text-white" />
                </div>
                <span className="text-xs font-medium text-indigo-900 dark:text-indigo-300">Target Progress</span>
              </div>
              <p className="text-xl font-bold text-indigo-900 dark:text-white">
                {stats?.totalDays || 0}/{habit.targetDays}
              </p>
              <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1">
                {Math.round(((stats?.totalDays || 0) / habit.targetDays) * 100)}% to goal
              </p>
            </motion.div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-purple-50 to-blue-100 dark:from-purple-900/20 dark:to-blue-800/20 rounded-lg p-3 shadow-sm border border-purple-200 dark:border-purple-800"
          >
            <div className="flex items-center gap-2 mb-1.5">
              <div className="p-1.5 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
                <Calendar className="w-4 h-4 text-white" />
              </div>
              <span className="text-xs font-medium text-purple-900 dark:text-purple-300">Active Days</span>
            </div>
            <p className="text-xl font-bold text-purple-900 dark:text-white">{activeDays}</p>
            <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">Days with activity</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg p-3 shadow-sm border border-green-200 dark:border-green-800"
          >
            <div className="flex items-center gap-2 mb-1.5">
              <div className="p-1.5 bg-green-500 rounded-lg">
                <Activity className="w-4 h-4 text-white" />
              </div>
              <span className="text-xs font-medium text-green-900 dark:text-green-300">Completion Rate</span>
            </div>
            <p className="text-xl font-bold text-green-900 dark:text-white">{completionRate}%</p>
            <p className="text-xs text-green-600 dark:text-green-400 mt-1">
              {activeDays} of {expectedDaysAdjusted} expected
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-lg p-3 shadow-sm border border-purple-200 dark:border-purple-800"
          >
            <div className="flex items-center gap-2 mb-1.5">
              <div className="p-1.5 bg-purple-500 rounded-lg">
                <TrendingUp className="w-4 h-4 text-white" />
              </div>
              <span className="text-xs font-medium text-purple-900 dark:text-purple-300">Current Streak</span>
            </div>
            <p className="text-xl font-bold text-purple-900 dark:text-white">{currentStreak}</p>
            <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">days in a row</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 rounded-lg p-3 shadow-sm border border-amber-200 dark:border-amber-800"
          >
            <div className="flex items-center gap-2 mb-1.5">
              <div className="p-1.5 bg-amber-500 rounded-lg">
                <Target className="w-4 h-4 text-white" />
              </div>
              <span className="text-xs font-medium text-amber-900 dark:text-amber-300">Longest Streak</span>
            </div>
            <p className="text-xl font-bold text-amber-900 dark:text-white">{longestStreak}</p>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">best performance</p>
          </motion.div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
          {/* Activity Trends */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="glass-card-hover p-4 rounded-xl"
          >
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-500" />
              Activity Trends
            </h3>
            {/* Fixed Y-axis label */}
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 text-center sm:text-left">Times Completed</div>
            <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
              <div className="h-48 sm:h-56" style={{ minWidth: weekLabels.length > 6 ? `${Math.max(weekLabels.length * 50, 300)}px` : '100%' }}>
                <Line data={weeklyTrendData} options={weeklyTrendOptions} />
              </div>
            </div>
            {/* Fixed X-axis range label */}
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
              {weekLabels[0]} to {weekLabels[weekLabels.length - 1]}
            </div>
          </motion.div>

          {/* Status Distribution */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="glass-card-hover p-4 rounded-xl"
          >
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <Target className="w-4 h-4 text-green-500" />
              Status Distribution
            </h3>
            <div className="h-56">
              <Doughnut data={statusChartData} options={statusChartOptions} />
            </div>
          </motion.div>

          {/* Activity Breakdown */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="glass-card-hover p-4 rounded-xl lg:col-span-2"
          >
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-purple-500" />
              Activity Breakdown
            </h3>
            {/* Fixed Legend */}
            <div className="flex flex-wrap items-center gap-3 sm:gap-4 mb-3 text-xs sm:text-sm">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-green-500"></div>
                <span className="text-gray-600 dark:text-gray-400">Active Days</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-yellow-400"></div>
                <span className="text-gray-600 dark:text-gray-400">Skipped</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-gray-400"></div>
                <span className="text-gray-600 dark:text-gray-400">Remaining</span>
              </div>
            </div>
            <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
              <div className="h-48 sm:h-56" style={{ minWidth: weekLabels.length > 6 ? `${Math.max(weekLabels.length * 60, 300)}px` : '100%' }}>
                <Bar data={weeklyChartData} options={weeklyChartOptions} />
              </div>
            </div>
            {/* Fixed X-axis range label */}
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
              {weekLabels[0]} to {weekLabels[weekLabels.length - 1]}
            </div>
          </motion.div>
        </div>

        {/* Activity Heatmap */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="glass-card-hover p-4 rounded-xl mb-5 relative"
          ref={heatmapRef}
        >
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-500" />
            Activity Heatmap
          </h3>
          
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
                            className={`w-3 h-3 rounded-sm ${getHeatmapColor(day)} cursor-pointer hover:ring-2 hover:ring-primary-400 hover:ring-offset-1 transition-all`}
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
                    <div className={`w-3 h-3 rounded-sm ${getHeatmapColor(selectedDay)}`} />
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
              <div className="w-3 h-3 rounded-sm bg-green-300 dark:bg-green-600/70" title="1" />
              <div className="w-3 h-3 rounded-sm bg-green-400 dark:bg-green-500/80" title="2" />
              <div className="w-3 h-3 rounded-sm bg-green-500 dark:bg-green-400" title="3" />
              <div className="w-3 h-3 rounded-sm bg-green-600 dark:bg-green-400" title="4" />
              <div className="w-3 h-3 rounded-sm bg-green-700 dark:bg-green-500" title="5+" />
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
