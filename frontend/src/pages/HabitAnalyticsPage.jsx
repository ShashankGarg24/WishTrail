import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, TrendingUp, Target, Calendar, BarChart3, Activity
} from 'lucide-react';
import { habitsAPI } from '../services/api';
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
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(90);

  useEffect(() => {
    loadAnalytics();
  }, [id, days]);

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

  const { habit, stats, consistency, statusCounts, timeline } = analytics;

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

  // Create weekly data for charts
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
      
      const weekCompletions = timeline.filter(entry => 
        entry.status === 'done' && entry.date >= weekStartKey && entry.date <= weekEndKey
      ).length;
      
      const weekSkip = timeline.filter(entry => 
        entry.status === 'skipped' && entry.date >= weekStartKey && entry.date <= weekEndKey
      ).length;
      
      let expectedThisWeek = 0;
      if (habit.frequency === 'daily') {
        expectedThisWeek = 7;
      } else if (habit.frequency === 'weekly' && Array.isArray(habit.daysOfWeek)) {
        expectedThisWeek = habit.daysOfWeek.length;
      } else {
        expectedThisWeek = 1;
      }
      
      weeklyCompletions.push(weekCompletions);
      weeklyExpected.push(expectedThisWeek);
      weeklySkipped.push(weekSkip);
      weekLabels.push(`${weekStart.getMonth() + 1}/${weekStart.getDate()}`);
    }
    
    return { weeklyCompletions, weeklyExpected, weeklySkipped, weekLabels };
  };

  const { weeklyCompletions, weeklyExpected, weeklySkipped, weekLabels } = createWeeklyData();

  // Weekly breakdown bar chart
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

  // Weekly trend line chart
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
      legend: { display: false }
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

  // Create heatmap data
  const createHeatmapData = () => {
    const today = new Date();
    const daysArray = [];
    const map = {};
    
    timeline.forEach(entry => {
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
  const heatmapWeeks = [];
  for (let i = 0; i < heatmapDays.length; i += 7) {
    heatmapWeeks.push(heatmapDays.slice(i, i + 7));
  }

  const getStatusColor = (status) => {
    switch(status) {
      case 'done': return 'bg-green-500';
      default: return 'bg-gray-200 dark:bg-gray-700';
    }
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
            <div className="flex items-start justify-between">
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
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                  Created {new Date(habit.createdAt).toLocaleDateString()}
                </p>
              </div>
              
              <select
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                className="px-3 py-1.5 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value={30}>Last 30 days</option>
                <option value={60}>Last 60 days</option>
                <option value={90}>Last 90 days</option>
                <option value={180}>Last 6 months</option>
                <option value={365}>Last year</option>
              </select>
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
            className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg p-3 shadow-sm border border-blue-200 dark:border-blue-800"
          >
            <div className="flex items-center gap-2 mb-1.5">
              <div className="p-1.5 bg-blue-500 rounded-lg">
                <Calendar className="w-4 h-4 text-white" />
              </div>
              <span className="text-xs font-medium text-blue-900 dark:text-blue-300">Active Days</span>
            </div>
            <p className="text-xl font-bold text-blue-900 dark:text-white">{activeDays}</p>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">Days with activity</p>
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
          {/* Weekly Trend */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="glass-card-hover p-4 rounded-xl"
          >
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-500" />
              Weekly Trend
            </h3>
            <div className="h-56">
              <Line data={weeklyTrendData} options={weeklyTrendOptions} />
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

          {/* Weekly Breakdown */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="glass-card-hover p-4 rounded-xl lg:col-span-2"
          >
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-purple-500" />
              Weekly Breakdown
            </h3>
            <div className="h-56">
              <Bar data={weeklyChartData} options={weeklyChartOptions} />
            </div>
          </motion.div>
        </div>

        {/* Activity Heatmap */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="glass-card-hover p-4 rounded-xl mb-5"
        >
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-500" />
            Activity Heatmap
          </h3>
          <div className="overflow-x-auto">
            <div className="inline-flex gap-1">
              {heatmapWeeks.map((week, weekIdx) => (
                <div key={weekIdx} className="flex flex-col gap-1">
                  {week.map((day, dayIdx) => (
                    <div
                      key={dayIdx}
                      className={`w-3 h-3 rounded-sm ${getStatusColor(day.status)} transition-colors`}
                      title={`${day.date} - ${day.status === 'done' ? 'Completed' : 'No activity'}`}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-4 mt-4 text-xs text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm bg-gray-200 dark:bg-gray-700" />
              <span>No Activity</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm bg-green-500" />
              <span>Completed</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
