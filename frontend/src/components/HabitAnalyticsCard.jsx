import { useEffect, useState } from 'react';
import useApiStore from '../store/apiStore';
import { TrendingUp, Flame, CheckCircle, XCircle, SkipForward } from 'lucide-react';

export default function HabitAnalyticsCard({ days = 30, embedded = false }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  const { loadHabitAnalytics, habitAnalytics } = useApiStore();
  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true); setError(null);
      const res = await loadHabitAnalytics({ force: false });
      if (!active) return;
      if (res.success) setData(res.data || null);
      else setError(res.error || 'Failed to load habit analytics');
      setLoading(false);
    };
    load();
    return () => { active = false; };
  }, [loadHabitAnalytics]);

  if (loading) {
    return embedded ? (
      <div className="grid grid-cols-3 gap-4">
        {[0,1,2].map(i => <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded" />)}
      </div>
    ) : (
      <div className="glass-card-hover p-6 rounded-xl">
        <div className="animate-pulse h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded mb-4" />
        <div className="grid grid-cols-3 gap-4">
          {[0,1,2].map(i => <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded" />)}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return embedded ? (
      <div className="text-sm text-gray-500 dark:text-gray-400">{error || 'No analytics yet.'}</div>
    ) : (
      <div className="glass-card-hover p-6 rounded-xl">
        <div className="text-sm text-gray-500 dark:text-gray-400">{error || 'No analytics yet.'}</div>
      </div>
    );
  }

  const totals = habitAnalytics.analytics.totals || { done: 0, missed: 0, skipped: 0 };
  const top = Array.isArray(data.topHabits) ? data.topHabits : [];

  const Inner = (
    <>
      {!embedded && (
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Habit Analytics</h3>
          <span className="text-xs text-gray-500">Last {days} days</span>
        </div>
      )}
      {embedded && (
        <div className="text-right text-xs text-gray-500 mb-2">Last {days} days</div>
      )}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="p-4 bg-gray-50 dark:bg-gray-800/40 rounded-xl text-center">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">{totals.done}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400 inline-flex items-center gap-1 justify-center"><CheckCircle className="h-4 w-4"/> Done</div>
        </div>
        <div className="p-4 bg-gray-50 dark:bg-gray-800/40 rounded-xl text-center">
          <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{totals.skipped}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400 inline-flex items-center gap-1 justify-center"><SkipForward className="h-4 w-4"/> Skipped</div>
        </div>
        <div className="p-4 bg-gray-50 dark:bg-gray-800/40 rounded-xl text-center">
          <div className="text-2xl font-bold text-red-600 dark:text-red-400">{totals.missed}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400 inline-flex items-center gap-1 justify-center"><XCircle className="h-4 w-4"/> Missed</div>
        </div>
      </div>
      {top.length > 0 && (
        <div>
          <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 inline-flex items-center gap-2"><TrendingUp className="h-4 w-4"/> Top Streaks</div>
          <div className="space-y-2">
            {top.map(h => (
              <div key={h._id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/40 rounded-lg">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-gray-900 dark:text-white truncate">{h.name}</div>
                  <div className="text-xs text-gray-500">Total: {h.totalCompletions || 0}</div>
                </div>
                <div className="inline-flex items-center gap-2 text-orange-600 dark:text-orange-400">
                  <Flame className="h-4 w-4" />
                  <span className="text-sm">{h.currentStreak || 0}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );

  return embedded ? (
    <div>{Inner}</div>
  ) : (
    <div className="glass-card-hover p-6 rounded-xl">{Inner}</div>
  );
}


