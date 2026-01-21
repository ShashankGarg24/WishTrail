import { TrendingUp, Flame, CheckCircle, XCircle, SkipForward, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function HabitAnalyticsCard({ analytics, days = 30, embedded = false, showHabits = true }) {
  const navigate = useNavigate();
  if (!analytics) {
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

  const totals = analytics.habits || { done: 0, missed: 0, skipped: 0 };
  const top = Array.isArray(analytics.topHabits) ? analytics.topHabits : [];

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
      {showHabits && top.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 inline-flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-500" /> 
              Top Habits
            </div>
            <button
              onClick={() => navigate('?tab=habits')}
              className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 inline-flex items-center gap-1 transition-colors"
            >
              View All <ArrowRight className="h-3 w-3" />
            </button>
          </div>
          <div className="space-y-2">
            {top.map((h) => (
              <div 
                key={h.id} 
                className="flex items-center justify-between p-3 bg-gradient-to-r from-gray-50 to-gray-100/50 dark:from-gray-800/40 dark:to-gray-800/20 rounded-lg hover:from-emerald-50 hover:to-teal-50 dark:hover:from-emerald-900/20 dark:hover:to-teal-900/20 transition-all duration-200 cursor-pointer border border-transparent hover:border-emerald-200 dark:hover:border-emerald-800/30"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-gray-900 dark:text-white truncate">{h.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Completed {h.totalCompletions || 0} {(h.totalCompletions || 0) === 1 ? 'time' : 'times'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="text-right">
                    <div className="inline-flex items-center gap-1 text-orange-600 dark:text-orange-400">
                      <Flame className="h-4 w-4" />
                      <span className="text-sm font-bold">{h.currentStreak || 0}</span>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">current</div>
                  </div>
                  {h.longestStreak > 0 && (
                    <div className="text-right border-l border-gray-300 dark:border-gray-600 pl-3">
                      <div className="text-sm font-semibold text-gray-700 dark:text-gray-300">{h.longestStreak}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">best</div>
                    </div>
                  )}
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


