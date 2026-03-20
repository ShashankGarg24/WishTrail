import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, Smile, Meh, Frown, AlertTriangle, Sparkles, Angry, Send, History } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import useApiStore from '../store/apiStore';
import { lockBodyScroll, unlockBodyScroll } from '../utils/scrollLock';
import ConfirmActionModal from './ConfirmActionModal';

const THEME_COLOR = '#4c99e6';

const moodOptions = [
  { value: 'happy', label: 'Happy', Icon: Smile },
  { value: 'motivated', label: 'Motivated', Icon: Sparkles },
  { value: 'okay', label: 'Okay', Icon: Meh },
  { value: 'stressed', label: 'Stressed', Icon: AlertTriangle },
  { value: 'sad', label: 'Sad', Icon: Frown },
  { value: 'angry', label: 'Angry', Icon: Angry },
];

const DailyLogsPromptModal = ({ isOpen, onClose, onSubmitted, existingEntry = null }) => {
  const navigate = useNavigate();
  const { user, createDailyLogsEntry, updateDailyLogsEntry, clearDailyLogsEntry } = useApiStore();
  const maxChars = 300;
  const [content, setContent] = useState('');
  const [mood, setMood] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const chars = content.length;
  const overLimit = chars > maxChars;
  const canSubmit = useMemo(() => {
    const hasText = content.trim().length > 0;
    const hasMood = Boolean(mood);
    return !submitting && !overLimit && (hasText || hasMood);
  }, [content, mood, overLimit, submitting]);

  useEffect(() => {
    if (!isOpen) return;

    if (existingEntry) {
      setContent(existingEntry.content || '');
      setMood(existingEntry.mood || null);
      return;
    }

    setContent('');
    setMood(null);
    setIsClearConfirmOpen(false);
  }, [isOpen, existingEntry]);

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    if (!canSubmit) return;

    const existingEntryId = existingEntry?.id || existingEntry?._id;

    const payload = {
      content: content.trim(),
      tags: []
    };

    if (existingEntryId) {
      payload.mood = mood ?? null;
    } else if (mood) {
      payload.mood = mood;
    }

    setSubmitting(true);
    try {
      const res = existingEntryId
        ? await updateDailyLogsEntry(existingEntryId, payload)
        : await createDailyLogsEntry(payload);

      if (!res?.success) {
        throw new Error(res?.error || 'Failed to save daily log');
      }

      setContent('');
      setMood(null);
      onSubmitted?.(res.entry);
      onClose();
    } catch (error) {
      const msg = error?.response?.data?.message || error?.message || 'Failed to save daily log';
      window.dispatchEvent(new CustomEvent('wt_toast', { detail: { message: msg, type: 'error' } }));
    } finally {
      setSubmitting(false);
    }
  };

  const handleClearToday = async () => {
    const existingEntryId = existingEntry?.id || existingEntry?._id;
    if (!existingEntryId || submitting) return;

    setIsClearConfirmOpen(true);
  };

  const confirmClearToday = async () => {
    const existingEntryId = existingEntry?.id || existingEntry?._id;
    if (!existingEntryId || submitting) return;

    setSubmitting(true);
    try {
      const res = await clearDailyLogsEntry(existingEntryId);
      if (!res?.success) {
        throw new Error(res?.error || 'Failed to clear daily log');
      }

      setContent('');
      setMood(null);
      setIsClearConfirmOpen(false);
      onSubmitted?.(null);
      onClose();
      window.dispatchEvent(new CustomEvent('wt_toast', { detail: { message: 'Daily log cleared successfully', type: 'success' } }));
    } catch (error) {
      const msg = error?.response?.data?.message || error?.message || 'Failed to clear daily log';
      window.dispatchEvent(new CustomEvent('wt_toast', { detail: { message: msg, type: 'error' } }));
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      lockBodyScroll();
      return () => unlockBodyScroll();
    }
    return undefined;
  }, [isOpen]);
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ zIndex: 1000 }}>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/50" onClick={onClose} />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto scrollbar-hide bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-xl border border-gray-200 dark:border-gray-700 font-manrope"
          style={{ fontFamily: 'Manrope, ui-sans-serif, system-ui' }}
        >
          <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <span className="flex items-center justify-center w-9 h-9 rounded-lg" style={{ backgroundColor: 'rgba(76, 153, 230, 0.12)' }}>
                <CheckCircle className="h-5 w-5" style={{ color: THEME_COLOR }} />
              </span>
              Update Daily Log
            </h3>
            <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors" aria-label="Close">
              <X className="h-5 w-5" />
            </button>
          </div>
          <>

              <form onSubmit={handleSubmit} className="space-y-5 pt-2">
                <div>
                  <label className="text-sm font-medium text-gray-900 dark:text-white mb-2 block">What did you accomplish today?</label>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Share your progress, small wins, or lessons learned..."
                    rows={4}
                    maxLength={maxChars}
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:border-transparent bg-white dark:bg-gray-900/50 text-sm text-gray-900 dark:text-white placeholder-gray-400 resize-none ${overLimit ? 'border-red-400 focus:ring-red-300' : 'border-gray-300 dark:border-gray-600 focus:ring-wt'}`}
                  />
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-xs text-gray-400 dark:text-gray-500">{chars}/{maxChars}</span>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white text-center mb-3">How are you feeling about your progress?</p>
                  <div className="grid grid-cols-6 sm:grid-cols-6 gap-2">
                    {moodOptions.map((option) => {
                      const selected = mood === option.value;
                      const Icon = option.Icon;
                      return (
                        <button
                          key={option.label}
                          type="button"
                          onClick={() => setMood(prev => (prev === option.value ? null : option.value))}
                          className="flex flex-col items-center gap-1"
                        >
                          <span
                            className={`w-11 h-11 rounded-full border flex items-center justify-center transition-all ${selected ? 'text-white border-transparent shadow-sm' : 'text-gray-500 dark:text-gray-300 border-gray-200 dark:border-gray-600 bg-gray-100 dark:bg-gray-800'}`}
                            style={selected ? { backgroundColor: THEME_COLOR } : undefined}
                          >
                            <Icon className="h-4 w-4" />
                          </span>
                          <span className={`text-[10px] tracking-wide ${selected ? 'text-[#4c99e6] font-semibold' : 'text-gray-400 dark:text-gray-500'}`}>{option.label}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700">
                  {existingEntry ? (
                    <button
                      type="button"
                      onClick={handleClearToday}
                      disabled={submitting}
                      className="px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      Clear today
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={!canSubmit}
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-white rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold transition-opacity"
                    style={{ backgroundColor: THEME_COLOR }}
                  >
                    {submitting ? 'Saving...' : (existingEntry ? 'Save Changes' : 'Update Log')}
                  </button>
                </div>
              </form>

              <button
                type="button"
                onClick={() => {
                  if (user?.username) {
                    navigate(`/profile/@${user.username}?tab=daily-logs`);
                    return;
                  }
                  navigate('/dashboard');
                }}
                className="mt-4 w-full inline-flex items-center justify-center gap-2 border border-[#4c99e6]/35 text-[#4c99e6] rounded-xl py-2.5 text-sm font-semibold hover:bg-[#4c99e6]/5"
              >
                <History className="h-4 w-4" />
                See All History Logs
              </button>

              <ConfirmActionModal
                isOpen={isClearConfirmOpen}
                onClose={() => setIsClearConfirmOpen(false)}
                onConfirm={confirmClearToday}
                title="Clear today's daily log?"
                message="This will remove your current daily log entry for today."
                confirmText="Clear today"
                isLoading={submitting}
              />
            </>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default DailyLogsPromptModal;


