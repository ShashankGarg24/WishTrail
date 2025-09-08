import { useEffect } from 'react';
import { CheckCircle, SkipForward, Clock, Pencil, X, Trash2 } from 'lucide-react';
import { lockBodyScroll, unlockBodyScroll } from '../utils/scrollLock';

export default function HabitDetailModal({ habit, isOpen, onClose, onLog, onEdit, onDelete }) {
  if (!isOpen || !habit) return null;
  useEffect(() => { lockBodyScroll(); return () => unlockBodyScroll(); }, []);
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const schedule = habit.frequency === 'daily' ? 'Every day' : (habit.daysOfWeek || []).sort().map(d => days[d]).join(', ') || 'Weekly';
  const isScheduledToday = (() => {
    if (!habit) return false;
    if (habit.frequency === 'daily') return true;
    const day = new Date().getDay();
    return Array.isArray(habit.daysOfWeek) && habit.daysOfWeek.includes(day);
  })();
  return (
    <div className="fixed inset-0 z-[101] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-lg mx-4 p-6 border border-gray-200 dark:border-gray-800">
        <button onClick={onClose} className="absolute top-3 right-3 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300" aria-label="Close">
          <X className="h-5 w-5" />
        </button>
        <div className="mb-4">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{habit.name}</h3>
          <div className="text-sm text-gray-500 dark:text-gray-400">{schedule} • Timezone: {habit.timezone || 'UTC'}</div>
        </div>
        {habit.description && (
          <p className="text-gray-700 dark:text-gray-300 mb-4 whitespace-pre-wrap">{habit.description}</p>
        )}
        {Array.isArray(habit.reminders) && habit.reminders.length > 0 && (
          <div className="mb-4">
            <div className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-1">Reminders</div>
            <div className="flex flex-wrap gap-2">
              {habit.reminders.map((r, idx) => (
                <span key={idx} className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs">
                  <Clock className="h-3 w-3" /> {r.time}
                </span>
              ))}
            </div>
          </div>
        )}
        <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-6">
          <span>🔥 Current: {habit.currentStreak || 0}</span>
          <span>🏆 Best: {habit.longestStreak || 0}</span>
          <span>✅ Total: {habit.totalCompletions || 0}</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button onClick={() => onEdit?.(habit)} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 text-sm"><Pencil className="h-4 w-4" /> Edit</button>
            <button onClick={() => onDelete?.(habit)} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-sm"><Trash2 className="h-4 w-4" /> Delete</button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onLog?.('skipped')}
              disabled={!isScheduledToday}
              className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-white text-sm ${isScheduledToday ? 'bg-yellow-600/90 hover:bg-yellow-600' : 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed'}`}
              title={isScheduledToday ? 'Skip today' : 'Not scheduled today'}
            >
              <SkipForward className="h-4 w-4" /> Skip
            </button>
            <button
              onClick={() => onLog?.('done')}
              disabled={!isScheduledToday}
              className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-white text-sm ${isScheduledToday ? 'bg-green-600/90 hover:bg-green-600' : 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed'}`}
              title={isScheduledToday ? 'Mark done today' : 'Not scheduled today'}
            >
              <CheckCircle className="h-4 w-4" /> Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


