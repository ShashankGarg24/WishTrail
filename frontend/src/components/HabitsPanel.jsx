import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Circle, Plus, Clock } from 'lucide-react';
import { habitsAPI } from '../services/api';

const weekdayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

export default function HabitsPanel({ onCreate }) {
  const [habits, setHabits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [marking, setMarking] = useState({});

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const res = await habitsAPI.list();
        if (!active) return;
        setHabits(res?.data?.data?.habits || []);
      } catch (e) {
        if (!active) return;
        setError('Failed to load habits');
      } finally { if (active) setLoading(false); }
    };
    load();
    return () => { active = false; };
  }, []);

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
      await habitsAPI.log(id, { status: 'done' });
      // optimistic update: increment streak and total
      setHabits(prev => prev.map(h => {
        if (h._id !== id) return h;
        const nextStreak = (h.currentStreak || 0) + 1;
        const longest = Math.max(h.longestStreak || 0, nextStreak);
        return { ...h, currentStreak: nextStreak, longestStreak: longest, totalCompletions: (h.totalCompletions || 0) + 1 };
      }));
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
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <div className="font-medium text-gray-900 dark:text-white truncate">{h.name}</div>
                  <div className="text-xs px-2 py-0.5 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                    {h.frequency === 'daily' ? 'Daily' : (h.daysOfWeek || []).sort().map(d => weekdayNames[d]).join(', ') || 'Weekly'}
                  </div>
                </div>
                {h.description && (
                  <div className="text-sm text-gray-600 dark:text-gray-400 truncate max-w-md">{h.description}</div>
                )}
                <div className="flex items-center gap-4 mt-1 text-xs text-gray-500 dark:text-gray-400">
                  <span>🔥 {h.currentStreak || 0} / Best {h.longestStreak || 0}</span>
                  <span>✅ {h.totalCompletions || 0}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {isScheduledToday(h) ? (
                  <button
                    onClick={() => toggleDoneToday(h)}
                    disabled={!!marking[h._id]}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white text-sm disabled:opacity-70"
                  >
                    <CheckCircle className="h-4 w-4" /> Done today
                  </button>
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


