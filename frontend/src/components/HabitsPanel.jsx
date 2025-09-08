import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Circle, Plus, Clock, Flame, Sparkles } from 'lucide-react';
import useApiStore from '../store/apiStore';
import { habitsAPI } from '../services/api';

const weekdayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

export default function HabitsPanel({ onCreate, onOpenHabit }) {
  const { habits: storeHabits, loadHabits, logHabit } = useApiStore();
  const [habits, setHabits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [marking, setMarking] = useState({});
  const [funBurst, setFunBurst] = useState(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const res = await loadHabits();
        if (!active) return;
        if (res.success) setHabits(res.habits || []);
        else setError(res.error || 'Failed to load habits');
      } finally { if (active) setLoading(false); }
    };
    load();
    return () => { active = false; };
  }, [storeHabits?.length]);

  const isScheduledToday = (habit) => {
    if (!habit) return false;
    if (habit.frequency === 'daily') return true;
    const day = new Date().getDay();
    return Array.isArray(habit.daysOfWeek) && habit.daysOfWeek.includes(day);
  };

  const toggleDoneToday = async (habit) => {
    if (!habit?._id) return;
    const id = habit._id;
    if (marking[id]) return;
    setMarking(p => ({ ...p, [id]: true }));
    try {
      await logHabit(id, 'done');
      // Only celebrate if it's the first completion today (when lastLoggedDateKey != today)
      const todayKey = new Date(Date.now() - (new Date()).getTimezoneOffset()*60000).toISOString().split('T')[0];
      const updated = [];
      let celebrate = false;
      setHabits(prev => prev.map(h => {
        if (h._id !== id) return h;
        const nextStreak = (h.currentStreak || 0) + 1;
        const longest = Math.max(h.longestStreak || 0, nextStreak);
        if (h.lastLoggedDateKey !== todayKey) celebrate = true;
        return { ...h, currentStreak: nextStreak, longestStreak: longest, totalCompletions: (h.totalCompletions || 0) + 1, lastLoggedDateKey: todayKey };
      }));
      if (celebrate) setFunBurst({ id, time: Date.now() });
    } catch (_) {}
    finally { setMarking(p => ({ ...p, [id]: false })); }
  };

  const logStatus = async (habit, status) => {
    if (!habit?._id) return;
    const id = habit._id;
    if (marking[id]) return;
    setMarking(p => ({ ...p, [id]: true }));
    try {
      await logHabit(id, status);
      setHabits(prev => prev.map(h => {
        if (h._id !== id) return h;
        if (status === 'done') {
          const nextStreak = (h.currentStreak || 0) + 1;
          const longest = Math.max(h.longestStreak || 0, nextStreak);
          return { ...h, currentStreak: nextStreak, longestStreak: longest, totalCompletions: (h.totalCompletions || 0) + 1 };
        }
        return { ...h, currentStreak: 0 };
      }));
      if (status === 'done') setFunBurst({ id, time: Date.now() });
    } catch (_) {}
    finally { setMarking(p => ({ ...p, [id]: false })); }
  };

  if (loading) {
    return (
      <div className="glass-card-hover p-6 rounded-xl">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto" />
      </div>
    );
  }

  return (
    <div className="glass-card-hover p-6 rounded-xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Habits</h3>
        <button onClick={onCreate} className="btn-primary">
          <Plus className="h-4 w-4 mr-1" /> New Habit
        </button>
      </div>
      {error && <div className="text-sm text-red-600 dark:text-red-400 mb-3">{error}</div>}
      {habits.length === 0 ? (
        <div className="text-center py-8 text-gray-600 dark:text-gray-400">
          No habits yet. Create your first habit!
        </div>
      ) : (
        <div className="space-y-3">
          {habits.map((h, idx) => (
            <motion.div
              key={h._id || idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: idx * 0.03 }}
              className="p-4 bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-gray-200 dark:border-gray-700 flex items-center justify-between"
            >
              <div className="min-w-0" onClick={() => onOpenHabit?.(h)}>
                <div className="flex items-center gap-2 cursor-pointer">
                  <div className="font-medium text-gray-900 dark:text-white truncate" title={h.name}>{h.name}</div>
                  <div className="text-xs px-2 py-0.5 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                    {h.frequency === 'daily' ? 'Daily' : (h.daysOfWeek || []).sort().map(d => weekdayNames[d]).join(', ') || 'Weekly'}
                  </div>
                </div>
                {h.description && (
                  <div className="text-sm text-gray-600 dark:text-gray-400 truncate max-w-md" title={h.description}>{h.description}</div>
                )}
                <div className="flex items-center gap-4 mt-1 text-xs text-gray-500 dark:text-gray-400">
                  <span>🔥 {h.currentStreak || 0} / Best {h.longestStreak || 0}</span>
                  <span>✅ {h.totalCompletions || 0}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 relative">
                {isScheduledToday(h) ? (
                  (funBurst && funBurst.id === h._id) && (
                    <motion.div
                      key={`${h._id}-${funBurst.time}`}
                      initial={{ scale: 0.6, opacity: 0 }}
                      animate={{ scale: 1.1, opacity: 1 }}
                      transition={{ duration: 0.45 }}
                      className="text-orange-500"
                      title="Great job!"
                    >
                      <Sparkles className="h-5 w-5" />
                    </motion.div>
                  )
                ) : (
                  <div className="text-xs text-gray-500 dark:text-gray-400 inline-flex items-center gap-1">
                    <Clock className="h-4 w-4" /> Not scheduled today
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}


