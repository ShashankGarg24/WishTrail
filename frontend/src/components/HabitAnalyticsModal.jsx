import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  X, TrendingUp, Target, Calendar, Flame, CheckCircle, 
  XCircle, SkipForward, Award, BarChart3, Activity
} from 'lucide-react';
import { habitsAPI } from '../services/api';
import { Doughnut, Bar, Line } from 'react-chartjs-2';
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
import { lockBodyScroll, unlockBodyScroll } from '../utils/scrollLock';

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

export default function HabitAnalyticsModal({ habit, isOpen, onClose }) {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [days, setDays] = useState(90);

  console.log('HabitAnalyticsModal render:', { isOpen, habitId: habit?.id, loading, hasAnalytics: !!analytics });

  useEffect(() => {
    if (isOpen) {
      lockBodyScroll();
      return () => unlockBodyScroll();
    }
    return undefined;
  }, [isOpen]);

  useEffect(() => {
    console.log('useEffect triggered:', { isOpen, habitId: habit?.id, days });
    if (isOpen && habit?.id) {
      console.log('Resetting state and calling loadAnalytics');
      setAnalytics(null);
      setLoading(true);
      loadAnalytics();
    }
  }, [isOpen, habit?.id, days]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      console.log('Loading analytics for habit:', habit.id, 'days:', days);
      const response = await habitsAPI.analytics(habit.id, { days });
      console.log('Analytics response:', response);
      if (response.data?.success) {
        setAnalytics(response.data.data.analytics);
      } else {
        console.error('Analytics API returned unsuccessful response:', response);
        window.dispatchEvent(new CustomEvent('wt_toast', {
          detail: { message: 'Failed to load analytics', type: 'error' }
        }));
      }
    } catch (err) {
      console.error('Analytics API error:', err);
      window.dispatchEvent(new CustomEvent('wt_toast', {
        detail: { message: err.message || 'Failed to load analytics', type: 'error' }
      }));
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !habit) return null;

  if (loading) {
    return (
      <div className="fixed inset-0 z-[102] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <div className="relative bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-6xl p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto" />
        </div>
      </div>
    );
  }

  if (!analytics && !loading) {
    return (
      <div className="fixed inset-0 z-[102] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <div className="relative bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-2xl p-8">
          <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
          <div className="text-center py-8">
            <p className="text-gray-600 dark:text-gray-400 mb-4">Analytics not found</p>
            <button onClick={onClose} className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!analytics) return null;

  const { stats, consistency, statusCounts, timeline } = analytics;

  // Calculate expected occurrences based on habit frequency and date range
  const calculateExpectedOccurrences = () => {
    const daysInRange = days || 90;
    
    if (habit.frequency === 'daily') {
      // For daily habits, every day in range is expected
      return daysInRange;
    } else if (habit.frequency === 'weekly' && Array.isArray(habit.daysOfWeek) && habit.daysOfWeek.length > 0) {
      // Calculate how many times the scheduled days appear in the range
      const scheduledDaysPerWeek = habit.daysOfWeek.length;
      const fullWeeks = Math.floor(daysInRange / 7);
      const remainingDays = daysInRange % 7;
      
      // Count full weeks
      let expected = fullWeeks * scheduledDaysPerWeek;
      
      // Count remaining days at the end of the period
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
      // Fallback: assume weekly (once per week)
      return Math.ceil(daysInRange / 7);
    }
  };

  const expectedOccurrences = calculateExpectedOccurrences();
  const activeDays = statusCounts.done;
  const skippedDays = statusCounts.skipped;
  
  // Completion rate = active days / (expected days - skipped days)
  // We exclude skipped days because they represent user's choice not to do the habit
  const expectedDaysAdjusted = Math.max(0, expectedOccurrences - skippedDays);
  const completionRate = expectedDaysAdjusted > 0 
    ? Math.round((activeDays / expectedDaysAdjusted) * 100) 
    : 0;

  // Doughnut chart for status distribution
  const statusChartData = {
    labels: ['Completed', 'Missed', 'Skipped'],
    datasets: [{
      data: [statusCounts.done, statusCounts.missed, statusCounts.skipped],
      backgroundColor: [
        'rgba(34, 197, 94, 0.8)',  // Green for completed
        'rgba(239, 68, 68, 0.8)',   // Red for missed
        'rgba(251, 191, 36, 0.8)'   // Yellow for skipped
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

  // Create heatmap data - show only active days (completed)
  const createHeatmapData = () => {
    const today = new Date();
    const daysArray = [];
    const map = {};
    
    timeline.forEach(entry => {
      // Only show completed days in heatmap
      if (entry.status === 'done') {
        map[entry.date] = 'done';
      }
    });

    const totalDaysToShow = days || 90;
    for (let i = totalDaysToShow - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split('T')[0];
      daysArray.push({
        date: dateKey,
        status: map[dateKey] || 'none',
        day: date.getDate(),
        month: date.getMonth()
      });
    }
    return daysArray;
  };

  const heatmapDays = createHeatmapData();

  // Group heatmap by weeks (7 days per row)
  const heatmapWeeks = [];
  for (let i = 0; i < heatmapDays.length; i += 7) {
    heatmapWeeks.push(heatmapDays.slice(i, i + 7));
  }

  // Weekly completions bar chart: completed vs expected per week
  const createWeeklyData = () => {
    const weeksToShow = Math.min(12, Math.ceil((days || 90) / 7));
    const weeklyCompletions = [];
    const weeklyExpected = [];
    const weeklySkipped = [];
    const weekLabels = [];
    
    for (let weekIdx = weeksToShow - 1; weekIdx >= 0; weekIdx--) {
      const weekEnd = new Date();
      weekEnd.setDate(weekEnd.getDate() - (weekIdx * 7));
      const weekStart = new Date(weekEnd);
      weekStart.setDate(weekStart.getDate() - 6);
      
      const weekStartKey = weekStart.toISOString().split('T')[0];
      const weekEndKey = weekEnd.toISOString().split('T')[0];
      
      // Count completions in this week
      const weekCompletions = timeline.filter(entry => 
        entry.status === 'done' && entry.date >= weekStartKey && entry.date <= weekEndKey
      ).length;
      
      // Count skipped days in this week
      const weekSkip = timeline.filter(entry => 
        entry.status === 'skipped' && entry.date >= weekStartKey && entry.date <= weekEndKey
      ).length;
      
      // Calculate expected for this week based on frequency
      let expectedThisWeek = 0;
      if (habit.frequency === 'daily') {
        expectedThisWeek = 7;
      } else if (habit.frequency === 'weekly' && Array.isArray(habit.daysOfWeek)) {
        expectedThisWeek = habit.daysOfWeek.length;
      } else {
        expectedThisWeek = 1;
      }
      
      // Don't subtract skipped from expected - show it separately
      weeklyCompletions.push(weekCompletions);
      weeklyExpected.push(expectedThisWeek);
      weeklySkipped.push(weekSkip);
      weekLabels.push(`${weekStart.getMonth() + 1}/${weekStart.getDate()}`);
    }
    
    return { weeklyCompletions, weeklyExpected, weeklySkipped, weekLabels };
  };

  const { weeklyCompletions, weeklyExpected, weeklySkipped, weekLabels } = createWeeklyData();

  const weeklyChartData = {
    labels: weekLabels,
    datasets: [
      {
        label: 'Completed',
        data: weeklyCompletions,
        backgroundColor: 'rgba(34, 197, 94, 0.7)',
        borderColor: 'rgb(34, 197, 94)',
        borderWidth: 2,
        borderRadius: 6
      },
      {
        label: 'Skipped',
        data: weeklySkipped,
        backgroundColor: 'rgba(251, 191, 36, 0.6)',
        borderColor: 'rgb(251, 191, 36)',
        borderWidth: 2,
        borderRadius: 6
      },
      {
        label: 'Expected',
        data: weeklyExpected,
        backgroundColor: 'rgba(156, 163, 175, 0.4)',
        borderColor: 'rgb(156, 163, 175)',
        borderWidth: 2,
        borderRadius: 6
      }
    ]
  };

  const weeklyChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          font: { size: 12 },
          color: document.documentElement.classList.contains('dark') ? '#e5e7eb' : '#374151'
        }
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const label = context.dataset.label || '';
            const value = context.parsed.y || 0;
            return `${label}: ${value}`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1,
          color: document.documentElement.classList.contains('dark') ? '#9ca3af' : '#6b7280'
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

  // Weekly trend line chart - total completions per week
  const weeklyTrendData = {
    labels: weekLabels,
    datasets: [{
      label: 'Weekly Completions',
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
          label: (context) => `Total: ${context.parsed.y} completions`
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
        },
        title: {
          display: true,
          text: 'Total Completions',
          color: document.documentElement.classList.contains('dark') ? '#9ca3af' : '#6b7280',
          font: {
            size: 12,
            weight: 'bold'
          }
        }
      },
      x: {
        ticks: {
          color: document.documentElement.classList.contains('dark') ? '#9ca3af' : '#6b7280'
        },
        grid: { display: false },
        title: {
          display: true,
          text: 'Week Starting',
          color: document.documentElement.classList.contains('dark') ? '#9ca3af' : '#6b7280',
          font: {
            size: 12,
            weight: 'bold'
          }
        }
      }
    }
  };

  const getStatusColor = (status) => {
    // For heatmap showing only active days
    switch(status) {
      case 'done': return 'bg-green-500';
      default: return 'bg-gray-200 dark:bg-gray-700';
    }
  };

  return (
    <div className="fixed inset-0 z-[102] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-7xl max-h-[90vh] overflow-hidden flex flex-col border border-gray-200/50 dark:border-gray-800/50">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 dark:from-indigo-600 dark:via-purple-600 dark:to-pink-600 px-8 py-6 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
              <Activity className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white tracking-tight">{habit.name}</h3>
              <p className="text-sm text-white/80 mt-0.5">Comprehensive Analytics & Insights</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="px-4 py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-white/40 hover:bg-white/20 transition-all cursor-pointer"
            >
              <option value={30} className="bg-gray-900 text-white">Last 30 days</option>
              <option value={60} className="bg-gray-900 text-white">Last 60 days</option>
              <option value={90} className="bg-gray-900 text-white">Last 90 days</option>
              <option value={180} className="bg-gray-900 text-white">Last 6 months</option>
              <option value={365} className="bg-gray-900 text-white">Last year</option>
            </select>
            <button 
              onClick={onClose} 
              className="p-2.5 rounded-xl hover:bg-white/20 transition-all backdrop-blur-sm" 
              aria-label="Close"
            >
              <X className="h-5 w-5 text-white" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto bg-gray-50/50 dark:bg-gray-900/50">
          <div className="p-8 space-y-6">
            {/* Key Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Total Completions */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200/50 dark:border-gray-700/50 hover:shadow-lg transition-all group">
                <div className="flex items-start justify-between mb-3">
                  <div className="p-2.5 bg-blue-500/10 rounded-lg group-hover:scale-110 transition-transform">
                    <CheckCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  {stats.targetCompletions && (
                    <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-full">
                      {stats.completionPercentage}%
                    </span>
                  )}
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Total Completions</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.totalCompletions}</p>
                  {stats.targetCompletions && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">of {stats.targetCompletions} goal</p>
                  )}
                </div>
              </div>

              {/* Total Days */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200/50 dark:border-gray-700/50 hover:shadow-lg transition-all group">
                <div className="flex items-start justify-between mb-3">
                  <div className="p-2.5 bg-green-500/10 rounded-lg group-hover:scale-110 transition-transform">
                    <Calendar className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  {stats.targetDays && (
                    <span className="text-xs font-semibold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-full">
                      {stats.daysPercentage}%
                    </span>
                  )}
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Active Days</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.totalDays}</p>
                  {stats.targetDays && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">of {stats.targetDays} goal</p>
                  )}
                </div>
              </div>

              {/* Current Streak */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200/50 dark:border-gray-700/50 hover:shadow-lg transition-all group">
                <div className="flex items-start justify-between mb-3">
                  <div className="p-2.5 bg-orange-500/10 rounded-lg group-hover:scale-110 transition-transform">
                    <Flame className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Current Streak</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.currentStreak}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Best: {stats.longestStreak} days</p>
                </div>
              </div>

              {/* Completion Rate */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200/50 dark:border-gray-700/50 hover:shadow-lg transition-all group">
                <div className="flex items-start justify-between mb-3">
                  <div className="p-2.5 bg-purple-500/10 rounded-lg group-hover:scale-110 transition-transform">
                    <Target className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Completion Rate</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">{completionRate}%</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Excluding skipped days</p>
                </div>
              </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Weekly Trend Line */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200/50 dark:border-gray-700/50 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-1 h-8 bg-gradient-to-b from-indigo-500 to-purple-500 rounded-full"></div>
                    <div>
                      <h4 className="text-lg font-bold text-gray-900 dark:text-white">Weekly Trend</h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Completions over time</p>
                    </div>
                  </div>
                </div>
                <div className="h-72">
                  <Line data={weeklyTrendData} options={weeklyTrendOptions} />
                </div>
              </div>

              {/* Status Distribution */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200/50 dark:border-gray-700/50 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-1 h-8 bg-gradient-to-b from-indigo-500 to-purple-500 rounded-full"></div>
                    <div>
                      <h4 className="text-lg font-bold text-gray-900 dark:text-white">Status Overview</h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Activity breakdown</p>
                    </div>
                  </div>
                </div>
                <div className="h-72 flex items-center justify-center">
                  <div className="w-full max-w-xs">
                    <Doughnut data={statusChartData} options={statusChartOptions} />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 mt-6">
                  <div className="text-center p-3 bg-green-50 dark:bg-green-900/10 rounded-lg border border-green-200/50 dark:border-green-800/50">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">{statusCounts.done}</div>
                    <div className="text-xs font-medium text-green-700 dark:text-green-300 mt-1">Completed</div>
                  </div>
                  <div className="text-center p-3 bg-red-50 dark:bg-red-900/10 rounded-lg border border-red-200/50 dark:border-red-800/50">
                    <div className="text-2xl font-bold text-red-600 dark:text-red-400">{statusCounts.missed}</div>
                    <div className="text-xs font-medium text-red-700 dark:text-red-300 mt-1">Missed</div>
                  </div>
                  <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-900/10 rounded-lg border border-yellow-200/50 dark:border-yellow-800/50">
                    <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{statusCounts.skipped}</div>
                    <div className="text-xs font-medium text-yellow-700 dark:text-yellow-300 mt-1">Skipped</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Weekly Breakdown Bar Chart */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200/50 dark:border-gray-700/50 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-1 h-8 bg-gradient-to-b from-indigo-500 to-purple-500 rounded-full"></div>
                  <div>
                    <h4 className="text-lg font-bold text-gray-900 dark:text-white">Weekly Breakdown</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Completed vs Expected vs Skipped</p>
                  </div>
                </div>
              </div>
              <div className="h-80">
                <Bar data={weeklyChartData} options={weeklyChartOptions} />
              </div>
            </div>

            {/* Heatmap */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200/50 dark:border-gray-700/50 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-1 h-8 bg-gradient-to-b from-indigo-500 to-purple-500 rounded-full"></div>
                  <div>
                    <h4 className="text-lg font-bold text-gray-900 dark:text-white">Activity Heatmap</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Last {days} days visualization</p>
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto pb-2">
                <div className="inline-block min-w-full">
                  <div className="flex flex-col gap-1.5">
                    {heatmapWeeks.map((week, weekIdx) => (
                      <div key={weekIdx} className="flex gap-1.5">
                        {week.map((day, dayIdx) => (
                          <div
                            key={dayIdx}
                            className={`w-4 h-4 rounded ${getStatusColor(day.status)} transition-all hover:scale-125 hover:ring-2 hover:ring-offset-2 hover:ring-indigo-500 cursor-pointer`}
                            title={`${day.date}: ${day.status === 'done' ? 'Completed' : 'No activity'}`}
                          />
                        ))}
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-6 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                      <span className="font-medium">Less</span>
                      <div className="flex gap-1">
                        <div className="w-4 h-4 rounded bg-gray-200 dark:bg-gray-700"></div>
                        <div className="w-4 h-4 rounded bg-green-500"></div>
                      </div>
                      <span className="font-medium">More</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="inline-block w-4 h-4 rounded bg-green-500"></span>
                      <span className="font-medium text-gray-700 dark:text-gray-300">Active day</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
