import { useEffect, useState } from 'react';
import { CheckCircle, SkipForward, Clock, X, Calendar, BarChart3, Smile, Meh, Frown, Heart, Sparkles } from 'lucide-react';
import { lockBodyScroll, unlockBodyScroll } from '../utils/scrollLock';
import { useNavigate } from 'react-router-dom';

const THEME_COLOR = '#4c99e6';

export default function HabitDetailModal({ habit, isOpen, onClose, onLog, onEdit, onDelete }) {
  const navigate = useNavigate();
  const [showFeelingSelection, setShowFeelingSelection] = useState(false);
  
  useEffect(() => {
    if (isOpen) {
      lockBodyScroll();
      return () => unlockBodyScroll();
    }
    return undefined;
  }, [isOpen]);
  
  useEffect(() => {
    if (!isOpen) {
      setShowFeelingSelection(false);
    }
  }, [isOpen]);
  
  if (!isOpen || !habit) return null;
  
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const schedule = habit.frequency === 'daily' ? 'Daily habit' : (habit.daysOfWeek || []).sort().map(d => days[d]).join(', ') || 'Weekly';
  const isScheduledToday = (() => {
    if (!habit) return false;
    if (habit.frequency === 'daily') return true;
    const day = new Date().getDay();
    return Array.isArray(habit.daysOfWeek) && habit.daysOfWeek.includes(day);
  })();

  const handleMarkDone = () => {
    setShowFeelingSelection(true);
  };

  const handleFeelingSelect = (feeling) => {
    onLog?.('done', feeling);
    setShowFeelingSelection(false);
  };

  const feelings = [
    { id: 'great', label: 'GREAT', icon: Heart, color: '#ec4899', bgColor: 'bg-pink-500' },
    { id: 'good', label: 'GOOD', icon: Smile, color: '#22c55e', bgColor: 'bg-green-500' },
    { id: 'okay', label: 'OKAY', icon: Meh, color: '#f59e0b', bgColor: 'bg-orange-500' },
    { id: 'challenging', label: 'TOUGH', icon: Frown, color: '#ef4444', bgColor: 'bg-red-500' },
    { id: 'neutral', label: 'SKIP', icon: Sparkles, color: '#6b7280', bgColor: 'bg-gray-500' }
  ];
  
  const handleAnalyticsClick = () => {
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
              <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{habit.description}</p>
            </div>
          )}

          {/* Progress Cards */}
          <div>
            <h4 className="text-[10px] sm:text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 sm:mb-3 uppercase tracking-wide">Progress</h4>
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              <div className="rounded-xl p-3 sm:p-4 text-center border" style={{ backgroundColor: 'rgba(76, 153, 230, 0.08)', borderColor: 'rgba(76, 153, 230, 0.2)' }}>
                <div className="text-xl sm:text-2xl font-bold mb-1" style={{ color: THEME_COLOR }}>{habit.totalCompletions || 0}</div>
                <div className="text-[10px] sm:text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Total Count</div>
                {habit.targetCompletions && (
                  <div className="text-[10px] sm:text-xs" style={{ color: THEME_COLOR }}>Goal: {habit.targetCompletions}</div>
                )}
              </div>
              <div className="rounded-xl p-3 sm:p-4 text-center border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30">
                <div className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-1">{habit.currentStreak || habit.totalDays || 0}</div>
                <div className="text-[10px] sm:text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Active Days</div>
                <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">Current streak</div>
              </div>
            </div>
          </div>
        </div>

        {/* Actions Footer */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-100 dark:border-gray-700 flex-shrink-0">
          {showFeelingSelection ? (
            /* Feeling Selection View - only shown after clicking Mark as Done */
            <div className="space-y-3 sm:space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-[10px] sm:text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">How did you feel?</h4>
                <button
                  type="button"
                  onClick={() => setShowFeelingSelection(false)}
                  className="p-1 sm:p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors"
                  aria-label="Close"
                >
                  <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </button>
              </div>
              <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                {feelings.map((feeling) => {
                  const Icon = feeling.icon;
                  return (
                    <button
                      key={feeling.id}
                      type="button"
                      onClick={() => handleFeelingSelect(feeling.id)}
                      className="flex flex-col items-center gap-1.5 sm:gap-2 p-2 sm:p-3 rounded-full transition-all hover:scale-105 active:scale-95"
                      style={{ backgroundColor: feeling.color }}
                    >
                      <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                      <span className="text-[9px] sm:text-xs font-medium text-white">{feeling.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Normal Action Buttons */
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-3">
              <button
                type="button"
                onClick={handleAnalyticsClick}
                className="inline-flex items-center justify-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs sm:text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <BarChart3 className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> View Analytics
              </button>
              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={() => onLog?.('skipped')}
                  disabled={!isScheduledToday}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs sm:text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <SkipForward className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Skip Day
                </button>
                <button
                  type="button"
                  onClick={handleMarkDone}
                  disabled={!isScheduledToday}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-white text-xs sm:text-sm font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                  style={{ backgroundColor: THEME_COLOR }}
                >
                  <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Mark as Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
