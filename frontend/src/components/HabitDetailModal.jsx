import { useEffect } from 'react';
import { CheckCircle, SkipForward, Clock, Pencil, X, Trash2, Calendar, Bell } from 'lucide-react';
import { lockBodyScroll, unlockBodyScroll } from '../utils/scrollLock';

export default function HabitDetailModal({ habit, isOpen, onClose, onLog, onEdit, onDelete }) {
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
  return (
    <div className="fixed inset-0 z-[101] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-br from-primary-500 to-primary-600 dark:from-primary-600 dark:to-primary-700 px-8 py-6 text-white">
          <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/20 transition-colors" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
          <h3 className="text-2xl font-bold mb-2 pr-10">{habit.name}</h3>
          <div className="flex items-center gap-4 text-sm text-white/90">
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="h-4 w-4" /> {schedule}
            </span>
            {isScheduledToday && (
              <span className="inline-flex items-center gap-1.5 bg-white/20 px-2 py-0.5 rounded-full font-medium">
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
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl p-4 text-center">
                <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">{habit.currentStreak || 0}</div>
                <div className="text-xs font-medium text-gray-600 dark:text-gray-400">Current Streak</div>
              </div>
              <div className="bg-gradient-to-br from-primary-50 to-primary-100 dark:from-primary-900/20 dark:to-primary-900/10 border border-primary-200 dark:border-primary-800 rounded-xl p-4 text-center">
                <div className="text-3xl font-bold text-primary-600 dark:text-primary-400 mb-1">{habit.longestStreak || 0}</div>
                <div className="text-xs font-medium text-primary-700 dark:text-primary-300">Best Streak</div>
              </div>
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl p-4 text-center">
                <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">{habit.totalCompletions || 0}</div>
                <div className="text-xs font-medium text-gray-600 dark:text-gray-400">Total Completions</div>
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
        <div className="bg-gray-50 dark:bg-gray-800/50 px-8 py-5 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between gap-3">
            {/* Left: Management Actions */}
            <div className="flex items-center gap-2">
              <button 
                onClick={() => onEdit?.(habit)} 
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <Pencil className="h-4 w-4" /> Edit
              </button>
              <button 
                onClick={() => onDelete?.(habit)} 
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white dark:bg-gray-800 border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                <Trash2 className="h-4 w-4" /> Delete
              </button>
            </div>

            {/* Right: Log Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => onLog?.('skipped')}
                disabled={!isScheduledToday}
                className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-white text-sm font-medium transition-all ${isScheduledToday ? 'bg-yellow-500 hover:bg-yellow-600 shadow-lg shadow-yellow-500/30' : 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed opacity-50'}`}
                title={isScheduledToday ? 'Skip today' : 'Not scheduled today'}
              >
                <SkipForward className="h-4 w-4" /> Skip
              </button>
              <button
                onClick={() => onLog?.('done')}
                disabled={!isScheduledToday}
                className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-white text-sm font-medium transition-all ${isScheduledToday ? 'bg-green-500 hover:bg-green-600 shadow-lg shadow-green-500/30' : 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed opacity-50'}`}
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


