import { useEffect, useRef, useState } from 'react';
import { Clock, X, Calendar, BarChart3, Smile, Meh, Frown, Heart, CircleSlash2, ChevronDown } from 'lucide-react';
import { lockBodyScroll, unlockBodyScroll } from '../utils/scrollLock';
import { useNavigate } from 'react-router-dom';
import { habitsAPI } from '../services/api';
import ConfirmActionModal from './ConfirmActionModal';

const THEME_COLOR = '#4c99e6';
const EMOTIONS = [
  { id: 'great', label: 'GREAT', icon: Heart },
  { id: 'good', label: 'GOOD', icon: Smile },
  { id: 'okay', label: 'OKAY', icon: Meh },
  { id: 'challenging', label: 'TOUGH', icon: Frown },
  { id: 'neutral', label: 'SKIP', icon: CircleSlash2 }
];

export default function HabitDetailModal({ habit, isOpen, onClose, onLog, onEdit, onDelete }) {
  const navigate = useNavigate();
  const [selectedEmotion, setSelectedEmotion] = useState(null);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [isSkipConfirmOpen, setIsSkipConfirmOpen] = useState(false);
  const [todayCompletionCount, setTodayCompletionCount] = useState(0);
  const [showLoggedTooltip, setShowLoggedTooltip] = useState(false);
  const [todayLog, setTodayLog] = useState(null);
  const [todayEntries, setTodayEntries] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [entrySavingIndex, setEntrySavingIndex] = useState(null);
  const [logsError, setLogsError] = useState('');
  const moreMenuRef = useRef(null);
  
  useEffect(() => {
    if (isOpen) {
      lockBodyScroll();
      return () => unlockBodyScroll();
    }
    return undefined;
  }, [isOpen]);
  
  useEffect(() => {
    if (!isOpen) {
      setSelectedEmotion(null);
      setIsMoreMenuOpen(false);
      setActionLoading(null);
      setIsSkipConfirmOpen(false);
      setTodayCompletionCount(0);
      setShowLoggedTooltip(false);
      setTodayLog(null);
      setTodayEntries([]);
      setLogsLoading(false);
      setEntrySavingIndex(null);
      setLogsError('');
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !habit) return;
    const derivedTodayCount = Number.isFinite(habit.todayCompletionCount)
      ? Number(habit.todayCompletionCount)
      : (habit.todayStatus === 'done' ? 1 : 0);
    setTodayCompletionCount(Math.max(0, derivedTodayCount));
  }, [isOpen, habit]);

  useEffect(() => {
    if (!showLoggedTooltip) return;
    const timer = setTimeout(() => setShowLoggedTooltip(false), 2600);
    return () => clearTimeout(timer);
  }, [showLoggedTooltip]);

  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (event) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target)) {
        setIsMoreMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen]);
  
  if (!isOpen || !habit) return null;
  
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const schedule = habit.frequency === 'daily' ? 'Daily habit' : (habit.daysOfWeek || []).sort().map(d => days[d]).join(', ') || 'Custom';
  const isScheduledToday = (() => {
    if (!habit) return false;
    if (habit.frequency === 'daily') return true;
    const day = new Date().getDay();
    return Array.isArray(habit.daysOfWeek) && habit.daysOfWeek.includes(day);
  })();

  const getTodayDateKey = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const toTimeValue = (timestamp) => {
    if (!timestamp) return '';
    const dt = new Date(timestamp);
    if (Number.isNaN(dt.getTime())) return '';
    const hh = String(dt.getHours()).padStart(2, '0');
    const mm = String(dt.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  };

  const withUpdatedTime = (originalTimestamp, timeValue) => {
    const baseDate = originalTimestamp ? new Date(originalTimestamp) : new Date();
    if (Number.isNaN(baseDate.getTime())) return null;
    const [h, m] = String(timeValue || '').split(':').map((v) => parseInt(v, 10));
    if (Number.isNaN(h) || Number.isNaN(m)) return null;
    const next = new Date(baseDate);
    next.setHours(h, m, 0, 0);
    return next.toISOString();
  };

  const loadTodayLog = async () => {
    const habitId = habit?.id || habit?._id;
    if (!habitId) return;
    setLogsLoading(true);
    setLogsError('');
    try {
      const response = await habitsAPI.logs(habitId, { page: 1, limit: 10 });
      const logs = response?.data?.data?.logs || [];
      const todayKey = getTodayDateKey();
      const found = logs.find((log) => log?.dateKey === todayKey) || null;
      setTodayLog(found);
      if (found) {
        setTodayCompletionCount(Number(found.completionCount || 0));
      }
    } catch (error) {
      setLogsError('Could not load today logs');
    } finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen || !habit) return;
    loadTodayLog();
  }, [isOpen, habit?.id, habit?._id]);

  useEffect(() => {
    if (!todayLog || !Array.isArray(todayLog.completionTimesMood)) {
      setTodayEntries([]);
      return;
    }
    setTodayEntries(todayLog.completionTimesMood.map((entry) => ({
      timestamp: entry?.timestamp || null,
      mood: entry?.mood || 'neutral',
      timeValue: toTimeValue(entry?.timestamp),
      dirty: false
    })));
  }, [todayLog]);

  const handleUpdateCompletionEntry = async (index) => {
    const habitId = habit?.id || habit?._id;
    const logId = todayLog?.id;
    const target = todayEntries[index];
    if (!habitId || !logId || !target) return;

    const nextTimestamp = withUpdatedTime(target.timestamp, target.timeValue);
    if (!nextTimestamp) return;

    setEntrySavingIndex(index);
    try {
      const response = await habitsAPI.updateLogCompletionEntry(habitId, logId, index, {
        timestamp: nextTimestamp,
        mood: target.mood || 'neutral'
      });
      const updatedLog = response?.data?.data?.log;
      if (updatedLog) {
        setTodayLog((prev) => ({ ...(prev || {}), ...updatedLog }));
      }
    } finally {
      setEntrySavingIndex(null);
    }
  };

  const handleMarkDone = async () => {
    if (!onLog || actionLoading) return;
    const wasFirstLogToday = todayCompletionCount === 0;
    setActionLoading('done');
    try {
      const result = await Promise.resolve(onLog('done', selectedEmotion || 'neutral'));
      if (result?.success === false) return;

      const nextTodayCount = Number.isFinite(result?.todayCompletionCount)
        ? Number(result.todayCompletionCount)
        : (Number.isFinite(result?.log?.completionCount) ? Number(result.log.completionCount) : null);

      if (nextTodayCount !== null) {
        setTodayCompletionCount(Math.max(0, nextTodayCount));
      }
      if (wasFirstLogToday) {
        setShowLoggedTooltip(true);
      }
      await loadTodayLog();
    } finally {
      setActionLoading(null);
    }
  };

  const confirmSkip = async () => {
    if (!onLog || actionLoading) return;
    setActionLoading('skipped');
    try {
      const result = await Promise.resolve(onLog('skipped'));
      if (result?.success === false) return;

      setTodayCompletionCount(0);
      setShowLoggedTooltip(false);
      setIsSkipConfirmOpen(false);
      await loadTodayLog();
    } finally {
      setActionLoading(null);
    }
  };
  
  const handleAnalyticsClick = () => {
    setIsMoreMenuOpen(false);
    onClose();
    navigate(`/habits/${habit.id}/analytics`);
  };
  
  return (
    <div className="fixed inset-0 z-[101] flex items-center justify-center p-4" style={{ zIndex: 1000 }}>
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div
        className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col"
        style={{ fontFamily: 'Manrope, ui-sans-serif, system-ui', maxHeight: '90vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-100 dark:border-gray-700 flex-shrink-0 relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 sm:top-5 right-4 sm:right-5 p-1.5 sm:p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
          <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-2 sm:mb-3 pr-10">{habit.name}</h3>
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700">
              <Calendar className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> {schedule}
            </span>
            {isScheduledToday && (
              <span className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium text-white" style={{ backgroundColor: THEME_COLOR }}>
                <Clock className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> Scheduled for today
              </span>
            )}
          </div>
        </div>

        {/* Content - Scrollable */}
        <div className="px-4 sm:px-6 py-4 sm:py-5 space-y-4 sm:space-y-5 overflow-y-auto scrollbar-hide flex-1 min-h-0">
          {/* Today's Logs */}
          <div>
            <div className="flex items-center justify-between gap-2 mb-2 sm:mb-3">
              <h4 className="text-[10px] sm:text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Today's Logs</h4>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700">
                {todayCompletionCount} logged
              </span>
            </div>

            {logsLoading ? (
              <div className="rounded-xl p-3 sm:p-4 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                Loading today's logs...
              </div>
            ) : logsError ? (
              <div className="rounded-xl p-3 sm:p-4 border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-xs sm:text-sm text-red-600 dark:text-red-300">
                {logsError}
              </div>
            ) : !todayLog ? (
              <div className="rounded-xl p-3 sm:p-4 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                No logs for today yet.
              </div>
            ) : todayLog.status === 'skipped' ? (
              <div className="rounded-xl p-3 sm:p-4 border border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20 text-xs sm:text-sm text-yellow-700 dark:text-yellow-300 inline-flex items-center gap-2">
                <CircleSlash2 className="w-4 h-4" /> Skipped today
              </div>
            ) : (
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30 p-2 sm:p-3 max-h-48 overflow-y-auto scrollbar-hide space-y-2">
                {todayEntries.length > 0 ? todayEntries.map((entry, idx) => (
                  <div key={`${todayLog.id}-${idx}`} className="rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 p-2 sm:p-3">
                    <div className="grid grid-cols-1 sm:grid-cols-[100px_1fr_auto] gap-2 items-center">
                      <input
                        type="time"
                        value={entry.timeValue || ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          setTodayEntries((prev) => prev.map((item, index) => (
                            index === idx ? { ...item, timeValue: value, dirty: true } : item
                          )));
                        }}
                        className="px-2.5 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#4c99e6]/40"
                      />
                      <select
                        value={entry.mood || 'neutral'}
                        onChange={(e) => {
                          const value = e.target.value;
                          setTodayEntries((prev) => prev.map((item, index) => (
                            index === idx ? { ...item, mood: value, dirty: true } : item
                          )));
                        }}
                        className="px-2.5 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#4c99e6]/40"
                      >
                        <option value="great">Great</option>
                        <option value="good">Good</option>
                        <option value="okay">Okay</option>
                        <option value="challenging">Tough</option>
                        <option value="neutral">Neutral</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => handleUpdateCompletionEntry(idx)}
                        disabled={!entry.dirty || entrySavingIndex === idx}
                        className="px-3 py-2 rounded-lg text-xs sm:text-sm font-medium text-white disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{ backgroundColor: THEME_COLOR }}
                      >
                        {entrySavingIndex === idx ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  </div>
                )) : (
                  <div className="px-2 py-1 text-xs sm:text-sm text-gray-500 dark:text-gray-400">No completion entries found.</div>
                )}
              </div>
            )}
          </div>

          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white mb-3 text-center">How are you feeling about your progress?</p>
            <div className="grid grid-cols-5 gap-3">
              {EMOTIONS.map((emotion) => {
                const Icon = emotion.icon;
                const isSelected = selectedEmotion === emotion.id;

                return (
                  <button
                    key={emotion.id}
                    type="button"
                    onClick={() => setSelectedEmotion((prev) => (prev === emotion.id ? null : emotion.id))}
                    className="flex flex-col items-center gap-1.5"
                  >
                    <span
                      className={`w-10 h-10 rounded-full border flex items-center justify-center transition-colors ${
                        isSelected
                          ? 'bg-[#4c99e6] border-[#4c99e6] text-white'
                          : 'bg-gray-100 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-300'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className={`text-[11px] font-medium ${isSelected ? 'text-[#4c99e6]' : 'text-gray-400'}`}>
                      {emotion.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Actions Footer */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-100 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setIsSkipConfirmOpen(true)}
              disabled={!isScheduledToday || !!actionLoading}
              className="px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {actionLoading === 'skipped' ? 'Skipping...' : 'Skip'}
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsMoreMenuOpen((prev) => !prev)}
                className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                More <ChevronDown className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={handleMarkDone}
                disabled={!isScheduledToday || !!actionLoading}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                style={{ backgroundColor: THEME_COLOR }}
              >
                {actionLoading === 'done' ? 'Marking...' : (todayCompletionCount > 0 ? 'Mark Again' : 'Mark as done')}
              </button>
            </div>
          </div>

          {showLoggedTooltip && (
            <div className="mt-2 inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium text-[#4c99e6] bg-[#4c99e6]/10 border border-[#4c99e6]/20">
              Logged! You can log again anytime today
            </div>
          )}

          {isMoreMenuOpen && (
            <div ref={moreMenuRef} className="absolute right-6 bottom-20 w-48 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg overflow-hidden">
              <button
                type="button"
                onClick={handleAnalyticsClick}
                className="w-full px-3 py-2.5 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 inline-flex items-center gap-2"
              >
                <BarChart3 className="h-4 w-4" /> Analytics
              </button>
            </div>
          )}
        </div>
      </div>

      <ConfirmActionModal
        isOpen={isSkipConfirmOpen}
        onClose={() => setIsSkipConfirmOpen(false)}
        onConfirm={confirmSkip}
        title="Skip today?"
        message="All your progress will be lost for the day."
        confirmText="Skip"
        isLoading={actionLoading === 'skipped'}
      />
    </div>
  );
}
