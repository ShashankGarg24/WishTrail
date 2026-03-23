import { useEffect, useRef, useState } from 'react';
import { Clock, X, Calendar, BarChart3, Smile, Meh, Frown, Heart, CircleSlash2, ChevronDown } from 'lucide-react';
import { lockBodyScroll, unlockBodyScroll } from '../utils/scrollLock';
import { useNavigate } from 'react-router-dom';
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

  const handleMarkDone = async () => {
    if (!onLog || actionLoading) return;
    const wasFirstLogToday = todayCompletionCount === 0;
    setActionLoading('done');
    try {
      const result = await Promise.resolve(onLog('done', selectedEmotion || 'neutral'));
      if (result?.success === false) return;

      setTodayCompletionCount((prev) => Math.max(0, prev + 1));
      if (wasFirstLogToday) {
        setShowLoggedTooltip(true);
      }
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
          {/* Description */}
          {habit.description && (
            <div>
              <h4 className="text-[10px] sm:text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">Description</h4>
              <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{habit.description}</p>
            </div>
          )}

          {/* Progress Cards */}
          <div>
            <h4 className="text-[10px] sm:text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 sm:mb-3 uppercase tracking-wide">Progress</h4>
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              <div className="rounded-xl p-3 sm:p-4 text-center border" style={{ backgroundColor: 'rgba(76, 153, 230, 0.08)', borderColor: 'rgba(76, 153, 230, 0.2)' }}>
                <div className="text-xl sm:text-2xl font-bold mb-1" style={{ color: THEME_COLOR }}>{todayCompletionCount}</div>
                <div className="text-[10px] sm:text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Today's Count</div>
                {habit.targetCompletions && (
                  <div className="text-[10px] sm:text-xs" style={{ color: THEME_COLOR }}>Goal: {habit.targetCompletions}</div>
                )}
              </div>
              <div className="rounded-xl p-3 sm:p-4 text-center border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30">
                <div className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-1">{habit.totalDays || 0}</div>
                <div className="text-[10px] sm:text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Active Days</div>
              </div>
            </div>
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
