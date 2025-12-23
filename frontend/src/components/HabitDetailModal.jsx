import { useEffect } from 'react';
import { CheckCircle, SkipForward, Clock, Pencil, X, Trash2, Calendar, Bell, BarChart3 } from 'lucide-react';
import { lockBodyScroll, unlockBodyScroll } from '../utils/scrollLock';
import { useNavigate } from 'react-router-dom';

export default function HabitDetailModal({ habit, isOpen, onClose, onLog, onEdit, onDelete }) {
  const navigate = useNavigate();
  useEffect(() => {
    if (isOpen) {
      lockBodyScroll();
      return () => unlockBodyScroll();
    }
    return undefined;
  }, [isOpen]);
  if (!isOpen || !habit) return null;
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const schedule = habit.frequency === 'daily' ? 'Every day' : (habit.daysOfWeek || []).sort().map(d => days[d]).join(', ') || 'Weekly';
  const isScheduledToday = (() => {
    if (!habit) return false;
    if (habit.frequency === 'daily') return true;
    const day = new Date().getDay();
    return Array.isArray(habit.daysOfWeek) && habit.daysOfWeek.includes(day);
  })();
  
  const handleAnalyticsClick = () => {
    onClose();
    navigate(`/habits/${habit.id}/analytics`);
  };
  
  return (
    <div className="fixed inset-0 z-[101] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 px-8 py-6 border-b border-gray-200 dark:border-gray-700">
          <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors" aria-label="Close">
            <X className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          </button>
          <h3 className="text-2xl font-bold mb-2 pr-10 text-gray-900 dark:text-white">{habit.name}</h3>
          <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="h-4 w-4" /> {schedule}
            </span>
            {isScheduledToday && (
              <span className="inline-flex items-center gap-1.5 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 px-2.5 py-1 rounded-full font-medium">
                <Clock className="h-3.5 w-3.5" /> Scheduled today
              </span>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="px-8 py-6 space-y-6">
          {/* Description */}
          {habit.description && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Description</h4>
              <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap leading-relaxed">{habit.description}</p>
            </div>
          )}

          {/* Stats Grid */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Progress</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl p-4 text-center">
                <div className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-1">{habit.currentStreak || 0}</div>
                <div className="text-xs font-medium text-gray-600 dark:text-gray-400">Current Streak</div>
              </div>
              <div className="bg-gradient-to-br from-primary-50 to-primary-100 dark:from-primary-900/20 dark:to-primary-900/10 border border-primary-200 dark:border-primary-800 rounded-xl p-4 text-center">
                <div className="text-2xl sm:text-3xl font-bold text-primary-600 dark:text-primary-400 mb-1">{habit.longestStreak || 0}</div>
                <div className="text-xs font-medium text-primary-700 dark:text-primary-300">Best Streak</div>
              </div>
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl p-4 text-center">
                <div className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-1">{habit.totalCompletions || 0}</div>
                <div className="text-xs font-medium text-gray-600 dark:text-gray-400">Total Count</div>
                {habit.targetCompletions && (
                  <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    Goal: {habit.targetCompletions}
                  </div>
                )}
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-900/10 border border-green-200 dark:border-green-800 rounded-xl p-4 text-center">
                <div className="text-2xl sm:text-3xl font-bold text-green-600 dark:text-green-400 mb-1">{habit.totalDays || 0}</div>
                <div className="text-xs font-medium text-green-700 dark:text-green-300">Active Days</div>
                {habit.targetDays && (
                  <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    Goal: {habit.targetDays}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Reminders */}
          {Array.isArray(habit.reminders) && habit.reminders.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Reminders</h4>
              <div className="flex flex-wrap gap-2">
                {habit.reminders.map((r, idx) => (
                  <span key={idx} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-medium border border-gray-200 dark:border-gray-700">
                    <Bell className="h-3.5 w-3.5" /> {r.time}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Additional Info */}
          <div className="text-xs text-gray-500 dark:text-gray-500">
            <span>Timezone: {habit.timezone || 'UTC'}</span>
          </div>
        </div>

        {/* Actions Footer */}
        <div className="bg-gray-50 dark:bg-gray-800/50 px-4 sm:px-8 py-4 sm:py-5 border-t border-gray-200 dark:border-gray-700">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* Analytics Button */}
            <button
              onClick={handleAnalyticsClick}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white text-sm font-medium transition-all shadow-lg shadow-indigo-500/20"
            >
              <BarChart3 className="h-4 w-4" /> View Analytics
            </button>
            
            {/* Log Actions */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={() => onLog?.('skipped')}
                disabled={!isScheduledToday}
                className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${isScheduledToday ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg shadow-amber-500/20' : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed opacity-60'}`}
                title={isScheduledToday ? 'Skip today' : 'Not scheduled today'}
              >
                <SkipForward className="h-4 w-4" /> Skip
              </button>
              <button
                onClick={() => onLog?.('done')}
                disabled={!isScheduledToday}
                className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${isScheduledToday ? 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-lg shadow-green-500/20' : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed opacity-60'}`}
                title={isScheduledToday ? 'Mark done today' : 'Not scheduled today'}
              >
                <CheckCircle className="h-4 w-4" /> Mark Done
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
